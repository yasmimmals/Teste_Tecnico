import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Header({ title, back = true }: { title: string; back?: boolean }) {
  const navigate = useNavigate();

  return (
    <header className="header">
      {back && (
        <button className="header-back" onClick={() => navigate('/')} aria-label="Voltar para o início">
          <ArrowLeft size={22} />
        </button>
      )}
      <h1>{title}</h1>
    </header>
  );
}
