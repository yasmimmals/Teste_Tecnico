from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import RecordCreate, RecordOut, StatusOut, SummaryOut, UserOut
from security import get_current_user, is_manager
import services

router = APIRouter(prefix="/records", tags=["ponto"])


def pick_user(user_id, current: User, db: Session) -> User:
    # colaborador só vê o próprio ponto. gestor/admin pode ver de qualquer um
    if user_id is None or user_id == current.id:
        return current
    if not is_manager(current):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Você só pode ver o seu próprio ponto.")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Colaborador não encontrado.")
    return user


def check_period(start, end, tz):
    end = end or services.today_in(tz)
    start = start or end - timedelta(days=29)
    if start > end:
        raise HTTPException(400, "A data inicial precisa ser antes da final.")
    if (end - start).days > 366:
        raise HTTPException(400, "Dá pra consultar no máximo 1 ano por vez.")
    return start, end


@router.post("", response_model=RecordOut, status_code=201)
def create(payload: RecordCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        record = services.register_event(
            db, user, payload.event_type, payload.timezone, payload.location, payload.note
        )
    except services.InvalidMarking as e:
        raise HTTPException(status.HTTP_409_CONFLICT, str(e))
    return services.to_out(record)


@router.get("/status", response_model=StatusOut)
def get_status(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    last = services.last_record(db, user.id)
    state = services.state_of(last)

    worked = 0
    # só mostra horas se o turno ainda tá aberto ou se foi hoje
    if last and (state != "off" or last.work_date == services.today_in(user.timezone)):
        day = services.records_between(db, user.id, last.work_date, last.work_date)
        worked = services.summarize_day(day).worked_minutes

    return StatusOut(
        state=state,
        last_record=services.to_out(last) if last else None,
        allowed_actions=services.next_actions(last),
        worked_minutes_today=worked,
    )


@router.get("", response_model=list[RecordOut])
def list_records(start: date | None = None, end: date | None = None, user_id: int | None = None,
                 current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user = pick_user(user_id, current, db)
    start, end = check_period(start, end, user.timezone)
    return [services.to_out(r) for r in services.records_between(db, user.id, start, end)]


@router.get("/summary", response_model=SummaryOut)
def summary(start: date | None = None, end: date | None = None, user_id: int | None = None,
            current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user = pick_user(user_id, current, db)
    start, end = check_period(start, end, user.timezone)
    days = services.summarize(services.records_between(db, user.id, start, end))

    # dia aberto que não é hoje = esqueceu de bater a saída
    today = services.today_in(user.timezone)
    open_days = [d.work_date for d in days if d.is_open and d.work_date < today]

    return SummaryOut(
        user=UserOut.model_validate(user),
        start=start,
        end=end,
        total_worked_minutes=sum(d.worked_minutes for d in days),
        open_days=open_days,
        days=days,
    )
