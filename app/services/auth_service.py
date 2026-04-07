"""
Servicio de autenticación.

Maneja login, tokens de sesión y validación de usuarios.
"""
import hashlib
import secrets
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from app.models.user import User, Session
from app.schemas.auth import LoginRequest

SESSION_HOURS = 12


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


class AuthService:

    @staticmethod
    def create_default_user(db: DBSession) -> None:
        """Crea el usuario admin por defecto si no existe ningún usuario."""
        count = db.scalar(select(User).limit(1))
        if count is None:
            user = User(
                username="admin",
                password_hash=_hash_password("1234"),
                is_admin=True,
            )
            db.add(user)
            db.commit()

    @staticmethod
    def login(db: DBSession, data: LoginRequest) -> str | None:
        """Valida credenciales y devuelve un token de sesión, o None si falla."""
        user = db.scalar(select(User).where(User.username == data.username))
        if not user:
            return None
        if user.password_hash != _hash_password(data.password):
            return None

        token = secrets.token_hex(32)
        session = Session(
            token=token,
            user_id=user.id,
            expires_at=datetime.utcnow() + timedelta(hours=SESSION_HOURS),
        )
        db.add(session)
        db.commit()
        return token

    @staticmethod
    def get_user_by_token(db: DBSession, token: str) -> User | None:
        """Valida el token y devuelve el usuario si es válido."""
        session = db.scalar(select(Session).where(Session.token == token))
        if not session:
            return None
        if session.expires_at < datetime.utcnow():
            db.delete(session)
            db.commit()
            return None
        return db.get(User, session.user_id)

    @staticmethod
    def logout(db: DBSession, token: str) -> None:
        session = db.scalar(select(Session).where(Session.token == token))
        if session:
            db.delete(session)
            db.commit()

    @staticmethod
    def change_password(db: DBSession, user: User, new_password: str) -> None:
        user.password_hash = _hash_password(new_password)
        db.add(user)
        db.commit()
