from collections import defaultdict
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from models import EventType, TimeRecord, User, utcnow
from schemas import DaySummary, Location, RecordOut

# o que pode ser batido depois de cada tipo de marcação
# None = pessoa nunca bateu ponto
NEXT_ACTIONS = {
    None: [EventType.CLOCK_IN],
    EventType.CLOCK_OUT: [EventType.CLOCK_IN],
    EventType.CLOCK_IN: [EventType.BREAK_START, EventType.CLOCK_OUT],
    EventType.BREAK_END: [EventType.BREAK_START, EventType.CLOCK_OUT],
    EventType.BREAK_START: [EventType.BREAK_END],
}

STATE_BY_LAST = {
    None: "off",
    EventType.CLOCK_OUT: "off",
    EventType.CLOCK_IN: "working",
    EventType.BREAK_END: "working",
    EventType.BREAK_START: "on_break",
}

NAMES = {
    EventType.CLOCK_IN: "entrada",
    EventType.BREAK_START: "saída para intervalo",
    EventType.BREAK_END: "volta do intervalo",
    EventType.CLOCK_OUT: "saída",
}


class InvalidMarking(Exception):
    pass


def as_utc(dt: datetime):
    # o sqlite devolve sem tzinfo, mas tudo que salvo é utc
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def today_in(tz_name):
    return datetime.now(ZoneInfo(tz_name)).date()


def to_out(r: TimeRecord) -> RecordOut:
    occurred = as_utc(r.occurred_at)
    location = None
    if r.latitude is not None and r.longitude is not None:
        location = Location(latitude=r.latitude, longitude=r.longitude, accuracy_m=r.accuracy_m)

    return RecordOut(
        id=r.id,
        user_id=r.user_id,
        event_type=r.event_type,
        occurred_at=occurred,
        occurred_at_local=occurred.astimezone(ZoneInfo(r.timezone)),
        timezone=r.timezone,
        work_date=r.work_date,
        location=location,
        note=r.note,
    )


def last_record(db: Session, user_id: int):
    q = (
        select(TimeRecord)
        .where(TimeRecord.user_id == user_id)
        .order_by(TimeRecord.occurred_at.desc(), TimeRecord.id.desc())
        .limit(1)
    )
    return db.scalars(q).first()


def next_actions(last):
    return NEXT_ACTIONS[last.event_type if last else None]


def state_of(last):
    return STATE_BY_LAST[last.event_type if last else None]


def register_event(db: Session, user: User, event_type: EventType, tz_name: str,
                   location: Location | None = None, note: str | None = None, now=None):
    last = last_record(db, user.id)
    allowed = next_actions(last)

    if event_type not in allowed:
        options = " ou ".join(NAMES[a] for a in allowed)
        raise InvalidMarking(f"Agora não dá para registrar {NAMES[event_type]}. Próxima marcação: {options}.")

    now = now or utcnow()

    # o turno inteiro fica no dia em que a entrada foi batida (no fuso local).
    # assim quem sai depois da meia-noite, ou bate a saída em outro país depois
    # de um voo, não fica com o dia quebrado em dois no espelho
    if event_type == EventType.CLOCK_IN:
        work_date = now.astimezone(ZoneInfo(tz_name)).date()
    else:
        work_date = last.work_date

    record = TimeRecord(
        user_id=user.id,
        event_type=event_type,
        occurred_at=now,
        timezone=tz_name,
        work_date=work_date,
        note=(note or "").strip() or None,
    )
    if location:
        record.latitude = location.latitude
        record.longitude = location.longitude
        record.accuracy_m = location.accuracy_m

    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def records_between(db: Session, user_id: int, start: date, end: date):
    q = (
        select(TimeRecord)
        .where(TimeRecord.user_id == user_id, TimeRecord.work_date >= start, TimeRecord.work_date <= end)
        .order_by(TimeRecord.occurred_at, TimeRecord.id)
    )
    return list(db.scalars(q))


def summarize_day(records: list[TimeRecord], now=None) -> DaySummary:
    now = now or utcnow()
    worked = 0.0
    on_break = 0.0
    working_since = None
    break_since = None

    for r in records:
        t = as_utc(r.occurred_at)
        if r.event_type == EventType.CLOCK_IN:
            working_since = t
        elif r.event_type == EventType.BREAK_START:
            if working_since:
                worked += (t - working_since).total_seconds()
            working_since, break_since = None, t
        elif r.event_type == EventType.BREAK_END:
            if break_since:
                on_break += (t - break_since).total_seconds()
            break_since, working_since = None, t
        elif r.event_type == EventType.CLOCK_OUT:
            if working_since:
                worked += (t - working_since).total_seconds()
            working_since = None

    # se o dia ainda está aberto conta até agora, pra tela de ponto mostrar o tempo correndo
    is_open = working_since is not None or break_since is not None
    if working_since:
        worked += (now - working_since).total_seconds()
    if break_since:
        on_break += (now - break_since).total_seconds()

    return DaySummary(
        work_date=records[0].work_date,
        worked_minutes=int(worked // 60),
        break_minutes=int(on_break // 60),
        is_open=is_open,
        timezones=sorted({r.timezone for r in records}),
        records=[to_out(r) for r in records],
    )


def summarize(records: list[TimeRecord], now=None):
    by_day = defaultdict(list)
    for r in records:
        by_day[r.work_date].append(r)
    return [summarize_day(by_day[d], now) for d in sorted(by_day)]
