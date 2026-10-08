from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from models import Role, User
from schemas import Token, UserCreate, UserOut, UserUpdate
from security import create_access_token, get_current_user, hash_password, require_roles, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    email = payload.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Já existe uma conta com esse e-mail.")

    # cadastro aberto sempre cria colaborador. gestor/admin só um admin promove
    user = User(
        name=payload.name.strip(),
        email=email,
        password_hash=hash_password(payload.password),
        timezone=payload.timezone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# usei o form padrão do OAuth2 (username/password) pra dar pra logar direto pelo /docs
@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == form.username.lower()))
    if not user or not verify_password(form.password, user.password_hash):
        # mesma msg pros dois casos pra não entregar quais e-mails existem
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "E-mail ou senha incorretos.")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Conta desativada. Fale com o RH.")

    return Token(access_token=create_access_token(user), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserOut)
def update_me(payload: UserUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.get("/users", response_model=list[UserOut])
def list_users(_=Depends(require_roles(Role.MANAGER, Role.ADMIN)), db: Session = Depends(get_db)):
    return db.scalars(select(User).where(User.is_active).order_by(User.name)).all()


@router.patch("/users/{user_id}/role", response_model=UserOut)
def change_role(user_id: int, role: Role, admin: User = Depends(require_roles(Role.ADMIN)),
                db: Session = Depends(get_db)):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuário não encontrado.")
    if target.id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Não dá pra mudar o próprio perfil.")

    target.role = role
    db.commit()
    db.refresh(target)
    return target
