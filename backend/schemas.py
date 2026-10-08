from datetime import date, datetime
from zoneinfo import ZoneInfo

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from models import EventType, Role


def check_timezone(value: str) -> str:
    try:
        ZoneInfo(value)
    except Exception:
        raise ValueError(f"Fuso horário inválido: {value}")
    return value


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)  # 72 é o limite do bcrypt
    timezone: str = "America/Sao_Paulo"

    _tz = field_validator("timezone")(check_timezone)


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    timezone: str | None = None

    @field_validator("timezone")
    @classmethod
    def _tz(cls, v):
        if v is None:
            return v
        return check_timezone(v)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    role: Role
    timezone: str
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class Location(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    accuracy_m: float | None = Field(default=None, ge=0)


class RecordCreate(BaseModel):
    event_type: EventType
    timezone: str
    location: Location | None = None
    note: str | None = Field(default=None, max_length=280)

    _tz = field_validator("timezone")(check_timezone)


class RecordOut(BaseModel):
    id: int
    user_id: int
    event_type: EventType
    occurred_at: datetime        # utc
    occurred_at_local: datetime  # mesmo horário com o offset de onde foi batido
    timezone: str
    work_date: date
    location: Location | None
    note: str | None


class StatusOut(BaseModel):
    state: str  # off | working | on_break
    last_record: RecordOut | None
    allowed_actions: list[EventType]
    worked_minutes_today: int


class DaySummary(BaseModel):
    work_date: date
    worked_minutes: int
    break_minutes: int
    is_open: bool
    timezones: list[str]
    records: list[RecordOut]


class SummaryOut(BaseModel):
    user: UserOut
    start: date
    end: date
    total_worked_minutes: int
    open_days: list[date]
    days: list[DaySummary]
