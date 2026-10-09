# Ponto D&D Group

Sistema de controle de jornada feito para o desafio técnico da Dungeons & Dragons Group.

O cenário pedia algo para uma empresa com gente no Brasil e na Europa, parte remota e parte viajando. Por isso a maior parte das decisões gira em torno de fuso horário e de onde a pessoa bateu o ponto.

**Stack:** FastAPI + SQLAlchemy + SQLite no backend, React + TypeScript (Vite) no front.

> O desafio menciona .NET e Angular como stack da empresa. Escolhi Python e React porque são stacks que tenho mais conhecimento e com python da para fazer várias integrações. Tentei deixar a API desacoplada do front e o banco configurável por variável de ambiente, então trocar qualquer um dos lados não deveria ser um problema.

## Rodando

### Backend

Precisa de Python 3.11 ou mais novo.

```
cd backend
python -m venv venv
venv\Scripts\activate          (no Linux/Mac: source venv/bin/activate)
pip install -r requirements.txt
uvicorn main:app --reload
```

A API sobe em http://localhost:8000 e a documentação fica em http://localhost:8000/docs.

Na primeira vez é criado um admin:

- e-mail: `admin@ddgroup.com`
- senha: `admin12345`

Testes: `python -m pytest` dentro da pasta backend.

### Frontend

```
cd frontend
npm install
npm run dev
```

Abre em http://localhost:5173. Se a API estiver em outro endereço, cria um `.env` com `VITE_API_URL=...` (tem um `.env.example`).

## O que dá pra fazer

- Criar conta e entrar
- **Meu Ponto:** relógio, marcações do dia, status e o botão de registrar. Quando dá pra escolher entre intervalo e saída aparece a opção
- Cada marcação salva a **localização** (com permissão do navegador). No app aparece um pino que abre o ponto no mapa
- **Espelho de Ponto:** consulta por mês e ano, total de horas, intervalos e exportação em CSV. Também mostra dias que ficaram sem saída registrada
- **Minha Equipe** (gestor e admin): o espelho de qualquer colaborador
- **Meus Dados:** nome e fuso da base

Para testar como se estivesse viajando, no Chrome dá pra mudar o fuso e a localização pelo DevTools em *More tools > Sensors*.

## Decisões que tomei

**Horário vem do servidor.** O front manda só o tipo da marcação, o fuso e a localização. A hora é sempre a do servidor, para ninguém conseguir mudar o relógio do celular e bater um ponto retroativo.

**Tudo salvo em UTC + o fuso de onde foi batido.** Assim dá pra mostrar "08:00 em Lisboa" certinho e converter para qualquer lugar. Usei nome de fuso (`Europe/Lisbon`) e não offset fixo (`+01:00`) porque a Europa tem horário de verão e o offset muda.

**Dia do turno = dia da entrada.** Se a pessoa entra às 22h e sai às 2h, ou entra em São Paulo e bate a saída em Lisboa depois do voo, tudo conta no dia da entrada. Sem isso o espelho ficaria com um dia quebrado em dois.

**Ordem das marcações.** Entrada, depois intervalo (quantos quiser) e saída. Não dá para bater saída no meio do intervalo nem bater entrada duas vezes. Isso também evita duplicar quando alguém clica duas vezes. A API responde 409 com a mensagem do que é permitido.

**Localização opcional.** Se a pessoa negar a permissão ou o GPS demorar mais de 8 segundos, o ponto é registrado mesmo assim, sem localização. Achei melhor do que impedir alguém de trabalhar. Fica registrado e o gestor consegue ver.


**Perfis.** Colaborador vê só o próprio ponto. Gestor e admin veem todo mundo. Quem se cadastra entra como colaborador, e o admin pode promover pelo endpoint `PATCH /auth/users/{id}/role`. O ideal seria cada gestor ver só o seu time, mas para essa primeira versão deixei simples.

**Autenticação** com JWT (expira em 8h) e senha com bcrypt.

## Estrutura

```
backend/
  main.py        sobe o app, cria tabelas e o admin
  database.py    conexão
  models.py      tabelas
  schemas.py     validação de entrada e saída
  security.py    senha, token e permissões
  services.py    regras do ponto (ordem das marcações, cálculo de horas)
  routers/       endpoints de auth e de ponto
  tests/

frontend/src/
  pages/         uma por tela
  components/    header, espelho, marcação
  lib/           chamadas da API, formatação de data/hora, geolocalização
  auth/          contexto de login
```

## Endpoints

| Método | Rota | O que faz |
|---|---|---|
| POST | /auth/register | cria conta |
| POST | /auth/login | login (form OAuth2) |
| GET / PATCH | /auth/me | dados do usuário logado |
| GET | /auth/users | lista colaboradores (gestor/admin) |
| POST | /records | registra uma marcação |
| GET | /records/status | situação atual e próximas marcações possíveis |
| GET | /records/summary | espelho por período |

## Se tivesse mais tempo

- Solicitação de ajuste de ponto
- Carga horária por colaborador, banco de horas e hora extra
- Feriados por país
- Alembic para migrations e Postgres em produção
- Docker Compose
- Mostrar o nome da cidade em vez de só o pino no mapa
