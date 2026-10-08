import enum
from datetime import date, datetime, timezone

from sqlalchemy import Boolean, Date, DateTime, Enum, Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Role(str, enum.Enum):
    EMPLOYEE = "employee"
    MANAGER = "manager"
    ADMIN = "admin"


class EventType(str, enum.Enum):
    CLOCK_IN = "clock_in"
    BREAK_START = "break_start"
    BREAK_END = "break_end"
    CLOCK_OUT = "clock_out"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(Enum(Role), default=Role.EMPLOYEE)
    # fuso de casa da pessoa (ex: America/Sao_Paulo). nos registros o fuso é salvo separado
    timezone: Mapped[str] = mapped_column(String(64), default="America/Sao_Paulo")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    records: Mapped[list["TimeRecord"]] = relationship(back_populates="user")


class TimeRecord(Base):
    __tablename__ = "time_records"
    __table_args__ = (
        Index("ix_records_user_occurred", "user_id", "occurred_at"),
        Index("ix_records_user_workdate", "user_id", "work_date"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    event_type: Mapped[EventType] = mapped_column(Enum(EventType))

    # sempre em UTC e sempre o horário do servidor (o cliente não manda hora)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    # fuso onde a pessoa estava na hora da marcação, vem do navegador
    timezone: Mapped[str] = mapped_column(String(64))
    # dia ao qual a marcação pertence. ver register_event em services.py
    work_date: Mapped[date] = mapped_column(Date)

    # localização é opcional: se a pessoa negar a permissão o ponto é registrado mesmo assim
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    accuracy_m: Mapped[float | None] = mapped_column(Float, nullable=True)

    note: Mapped[str | None] = mapped_column(String(280), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user: Mapped[User] = relationship(back_populates="records")
