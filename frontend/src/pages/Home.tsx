import { CalendarDays, Fingerprint, LogOut, UserRound, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { isManager, useAuth } from '../auth/AuthContext';
import Header from '../components/Header';

export default function Home() {
  const { user, logout } = useAuth();
  const firstName = user!.name.split(' ')[0];

  const shortcuts = [
    { to: '/ponto', label: 'Meu Ponto', icon: Fingerprint },
    { to: '/espelho', label: 'Espelho de Ponto', icon: CalendarDays },
    { to: '/meus-dados', label: 'Meus Dados', icon: UserRound },
  ];
  if (isManager(user)) {
    shortcuts.push({ to: '/equipe', label: 'Minha Equipe', icon: Users });
  }

  return (
    <>
      <Header title="D&D Group" back={false} />
      <main className="home">
        <p className="welcome">Bem-vindo(a), {firstName}!</p>
        <nav className="shortcuts">
          {shortcuts.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="shortcut">
              <span className="shortcut-icon"><Icon size={26} /></span>
              {label}
            </Link>
          ))}
          <button className="shortcut" onClick={logout}>
            <span className="shortcut-icon"><LogOut size={24} /></span>
            Sair
          </button>
        </nav>
      </main>
    </>
  );
}
