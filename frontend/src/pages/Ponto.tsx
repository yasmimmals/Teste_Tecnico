import { Fingerprint } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import Header from '../components/Header';
import MarkingTime from '../components/MarkingTime';
import { api } from '../lib/api';
import { city, duration, hour, MARKING_NAME, myTimezone, offset, STATE_NAME, todayISO } from '../lib/format';
import { getLocation } from '../lib/geo';
import type { Day, EventType, Status } from '../lib/types';

export default function Ponto() {
  const { user, setUser } = useAuth();
  const tz = myTimezone();
  const traveling = tz !== user!.timezone;

  const [now, setNow] = useState(new Date());
  const [status, setStatus] = useState<Status | null>(null);
  const [today, setToday] = useState<Day | null>(null);
  const [chosen, setChosen] = useState<EventType | null>(null);
  const [note, setNote] = useState('');
  const [step, setStep] = useState<'idle' | 'locating' | 'saving'>('idle');
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  async function load() {
    try {
      const s = await api.status();
      setStatus(s);

      // se o turno ainda tá aberto mostra o dia dele (pode ter começado ontem)
      const day = s.state !== 'off' && s.last_record ? s.last_record.work_date : todayISO(user!.timezone);
      const summary = await api.summary(day, day);
      setToday(summary.days[0] ?? null);

      // quando pode escolher entre intervalo e saída, sugere intervalo se ainda não teve nenhum
      const tookBreak = summary.days[0]?.records.some((r) => r.event_type === 'break_start');
      if (s.allowed_actions.length > 1) {
        setChosen(tookBreak ? 'clock_out' : 'break_start');
      } else {
        setChosen(s.allowed_actions[0]);
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function register() {
    if (!chosen) return;
    setMessage(null);
    setStep('locating');
    const location = await getLocation();

    setStep('saving');
    try {
      const marking = await api.mark(chosen, tz, location, note.trim());
      let text = `${MARKING_NAME[chosen]} registrada às ${hour(marking.occurred_at, marking.timezone)}.`;
      if (!location) text += ' Sem localização (permissão negada ou indisponível).';
      setMessage({ type: 'ok', text });
      setNote('');
      await load();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setStep('idle');
    }
  }

  async function changeBase() {
    try {
      setUser(await api.updateMe({ timezone: tz }));
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    }
  }

  const [hh, mm, ss] = hour(now, tz, true).split(':');
  const options = status?.allowed_actions ?? [];

  let statusText = status ? STATE_NAME[status.state] : '';
  if (status && status.state !== 'off') statusText += ` (${duration(status.worked_minutes_today)} trabalhadas)`;

  return (
    <>
      <Header title="Meu Ponto" />
      <main className="ponto">
        <div className="row-label">Marcações do dia</div>
        <div className="row-value">
          {today?.records.length ? (
            <div className="markings">
              {today.records.map((m) => <MarkingTime key={m.id} marking={m} homeTz={user!.timezone} />)}
            </div>
          ) : (
            <span className="muted">Nenhuma marcação ainda</span>
          )}
        </div>

        <div className="row-label">Status</div>
        <div className="row-value">
          <span className={`dot ${status?.state ?? 'off'}`} />
          {statusText}
        </div>

        <div className="row-label">Local</div>
        <div className="row-value">
          {city(tz)} ({offset(tz, now)})
          {traveling && (
            <span className="travel">
              Fora da sua base. Em {city(user!.timezone)} são {hour(now, user!.timezone)}.{' '}
              <button className="link" onClick={changeBase}>Usar {city(tz)} como base</button>
            </span>
          )}
        </div>

        <div className="clock-area">
          <div className="clock">
            <span className="clock-time">{hh}:{mm}:{ss}</span>
            <span className="clock-label">Hora atual</span>
          </div>

          <div className="register">
            {options.length > 1 && (
              <div className="choice" role="radiogroup" aria-label="Tipo de marcação">
                {options.map((o) => (
                  <button
                    key={o}
                    role="radio"
                    aria-checked={chosen === o}
                    className={chosen === o ? 'selected' : ''}
                    onClick={() => setChosen(o)}
                  >
                    {o === 'break_start' ? 'Intervalo' : 'Saída'}
                  </button>
                ))}
              </div>
            )}

            <button className="register-btn" onClick={register} disabled={!status || step !== 'idle'}>
              <Fingerprint size={44} strokeWidth={1.5} />
              <span>
                {step === 'locating' ? 'Localizando...' : step === 'saving' ? 'Registrando...' : 'Registrar'}
              </span>
            </button>
            {chosen && <span className="register-hint">{MARKING_NAME[chosen]}</span>}
          </div>
        </div>

        <div className="note">
          <input
            placeholder="Observação (opcional)"
            maxLength={280}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {message && <p className={`msg ${message.type} center`}>{message.text}</p>}
      </main>
    </>
  );
}
