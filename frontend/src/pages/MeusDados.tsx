import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import Header from '../components/Header';
import { api } from '../lib/api';
import { offset, timezones } from '../lib/format';

const ROLES = { employee: 'Colaborador', manager: 'Gestor', admin: 'Administrador' };

export default function MeusDados() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user!.name);
  const [timezone, setTimezone] = useState(user!.timezone);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      setUser(await api.updateMe({ name, timezone }));
      setMessage({ type: 'ok', text: 'Dados salvos.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  return (
    <>
      <Header title="Meus Dados" />
      <main className="page">
        <form className="card form" onSubmit={save}>
          <label>
            Nome
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            E-mail
            <input value={user!.email} disabled />
          </label>
          <label>
            Perfil
            <input value={ROLES[user!.role]} disabled />
          </label>
          <label>
            Fuso horário da base
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {timezones().map((tz) => (
                <option key={tz} value={tz}>{tz.replace(/_/g, ' ')} ({offset(tz)})</option>
              ))}
            </select>
          </label>
          {message && <p className={`msg ${message.type}`}>{message.text}</p>}
          <button className="btn">Salvar</button>
        </form>
      </main>
    </>
  );
}
