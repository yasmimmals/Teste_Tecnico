from datetime import datetime, timezone

from models import EventType, TimeRecord
from services import summarize_day
from tests.conftest import make_user


def bater(client, headers, event, tz="America/Sao_Paulo", location=None):
    body = {"event_type": event, "timezone": tz}
    if location:
        body["location"] = location
    return client.post("/records", json=body, headers=headers)


def test_sem_token_nao_entra(client):
    assert client.get("/records/status").status_code == 401


def test_dia_completo(client):
    h = make_user(client)
    assert client.get("/records/status", headers=h).json()["state"] == "off"

    for event in ["clock_in", "break_start", "break_end", "clock_out"]:
        assert bater(client, h, event).status_code == 201

    assert client.get("/records/status", headers=h).json()["state"] == "off"


def test_marcacoes_fora_de_ordem(client):
    h = make_user(client)
    assert bater(client, h, "clock_out").status_code == 409
    bater(client, h, "clock_in")
    assert bater(client, h, "clock_in").status_code == 409  # clique duplo
    bater(client, h, "break_start")
    assert bater(client, h, "clock_out").status_code == 409  # tem que voltar do intervalo antes


def test_salva_localizacao(client):
    h = make_user(client)
    r = bater(client, h, "clock_in", location={"latitude": -23.55, "longitude": -46.63, "accuracy_m": 15})
    assert r.json()["location"]["latitude"] == -23.55


def test_localizacao_invalida(client):
    h = make_user(client)
    assert bater(client, h, "clock_in", location={"latitude": 200, "longitude": 0}).status_code == 422


def test_fuso_invalido(client):
    h = make_user(client)
    assert bater(client, h, "clock_in", tz="Marte/Base").status_code == 422


def test_colaborador_nao_ve_ponto_dos_outros(client):
    h = make_user(client, "a@ddgroup.com")
    assert client.get("/records?user_id=999", headers=h).status_code == 403


def test_admin_ve_ponto_dos_outros(client):
    make_user(client, "b@ddgroup.com")
    r = client.post("/auth/login", data={"username": "admin@ddgroup.com", "password": "admin12345"})
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}
    outro = next(u for u in client.get("/auth/users", headers=h).json() if u["email"] == "b@ddgroup.com")
    assert client.get(f"/records/summary?user_id={outro['id']}", headers=h).status_code == 200


def marcacao(event, iso, tz):
    t = datetime.fromisoformat(iso)
    return TimeRecord(id=1, user_id=1, event_type=event, occurred_at=t, timezone=tz, work_date=t.date())


def test_viagem_sp_lisboa():
    # entrou em SP e bateu a saída já em Lisboa
    dia = [
        marcacao(EventType.CLOCK_IN, "2026-03-10T11:00:00+00:00", "America/Sao_Paulo"),
        marcacao(EventType.BREAK_START, "2026-03-10T15:00:00+00:00", "America/Sao_Paulo"),
        marcacao(EventType.BREAK_END, "2026-03-10T16:00:00+00:00", "America/Sao_Paulo"),
        marcacao(EventType.CLOCK_OUT, "2026-03-10T20:00:00+00:00", "Europe/Lisbon"),
    ]
    resumo = summarize_day(dia, now=datetime(2026, 3, 11, tzinfo=timezone.utc))
    assert resumo.worked_minutes == 8 * 60
    assert resumo.break_minutes == 60
    assert resumo.timezones == ["America/Sao_Paulo", "Europe/Lisbon"]
    assert not resumo.is_open
