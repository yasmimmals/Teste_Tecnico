import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const cameFromRegister = (location.state as any)?.registered;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      await login(email, password);
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
        <span>Ponto eletrônico</span>
      </div>
      <form className="auth-form" onSubmit={submit}>
        {cameFromRegister && <p className="msg ok">Conta criada! Agora é só entrar.</p>}
        {error && <p className="msg error">{error}</p>}

        <label>
          E-mail
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Senha
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>

        <button className="btn full" disabled={sending}>{sending ? 'Entrando...' : 'Entrar'}</button>
        <p className="auth-alt">Primeiro acesso? <Link to="/cadastro">Criar conta</Link></p>
      </form>
    </div>
  );
}
