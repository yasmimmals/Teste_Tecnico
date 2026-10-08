import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ["DATABASE_URL"] = "sqlite:///./test_jornada.db"

import pytest
from fastapi.testclient import TestClient

from database import Base, engine


@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=engine)
    from main import app

    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(bind=engine)


def make_user(client, email="ana@ddgroup.com", tz="America/Sao_Paulo"):
    client.post("/auth/register", json={"name": "Ana", "email": email, "password": "senha1234", "timezone": tz})
    r = client.post("/auth/login", data={"username": email, "password": "senha1234"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
