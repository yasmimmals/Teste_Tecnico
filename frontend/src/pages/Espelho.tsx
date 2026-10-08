import { useAuth } from '../auth/AuthContext';
import Header from '../components/Header';
import TimeSheet from '../components/TimeSheet';

export default function Espelho() {
  const { user } = useAuth();

  return (
    <>
      <Header title="Espelho de Ponto" />
      <main className="page">
        <TimeSheet homeTz={user!.timezone} />
      </main>
    </>
  );
}
