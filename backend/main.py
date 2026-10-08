import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from database import Base, SessionLocal, engine
from models import Role, User
from routers import auth, records
from security import hash_password


def create_first_admin():
    # se o banco tá vazio cria um admin, senão ninguém consegue acessar a parte de equipe
    with SessionLocal() as db:
        if db.scalar(select(User).limit(1)):
            return
        db.add(User(
            name="Administrador",
            email=os.getenv("ADMIN_EMAIL", "admin@ddgroup.com"),
            password_hash=hash_password(os.getenv("ADMIN_PASSWORD", "admin12345")),
            role=Role.ADMIN,
        ))
        db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # TODO: trocar por migrations (alembic) quando for pra produção
    Base.metadata.create_all(bind=engine)
    create_first_admin()
    yield


app = FastAPI(title="D&D Group - Ponto", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(records.router)


@app.get("/health")
def health():
    return {"status": "ok"}
