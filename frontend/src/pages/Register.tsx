import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../lib/api';
import { myTimezone, offset, timezones } from '../lib/format';

export default function Register() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [timezone, setTimezone] = useState(myTimezone());
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    setSending(true);
    setError('');
    try {
      await api.register({ name, email, password, timezone });
      navigate('/login', { state: { registered: true } });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth-top">
        <span className="logo">D&amp;D Group</span>
        <span>Criar conta</span>
      </div>
      <form className="auth-form" onSubmit={submit}>
        {error && <p className="msg error">{error}</p>}

        <label>
          Nome completo
          <input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          E-mail
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Senha
          <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <small>Mínimo de 8 caracteres</small>
        </label>
        <label>
          Fuso horário da sua base
          <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {timezones().map((tz) => (
              <option key={tz} value={tz}>{tz.replace(/_/g, ' ')} ({offset(tz)})</option>
            ))}
          </select>
          <small>Em viagem, cada marcação salva o fuso de onde você estiver.</small>
        </label>

        <button className="btn full" disabled={sending}>{sending ? 'Criando...' : 'Criar conta'}</button>
        <p className="auth-alt">Já tem conta? <Link to="/login">Entrar</Link></p>
      </form>
    </div>
  );
}
