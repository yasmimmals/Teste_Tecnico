import { useEffect, useState } from 'react';
import Header from '../components/Header';
import TimeSheet from '../components/TimeSheet';
import { api } from '../lib/api';
import { city } from '../lib/format';
import type { User } from '../lib/types';

export default function Equipe() {
  const [people, setPeople] = useState<User[]>([]);
  const [selectedId, setSelectedId] = useState<number>();
  const [error, setError] = useState('');

  useEffect(() => {
    api.users()
      .then((list) => {
        setPeople(list);
        setSelectedId(list[0]?.id);
      })
      .catch((e) => setError(e.message));
  }, []);

  const selected = people.find((p) => p.id === selectedId);

  return (
    <>
      <Header title="Minha Equipe" />
      <main className="page">
        <section className="card">
          <h2 className="card-title">Colaborador</h2>
          {error && <p className="msg error">{error}</p>}
          <select value={selectedId ?? ''} onChange={(e) => setSelectedId(Number(e.target.value))}>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({city(p.timezone)})</option>
            ))}
          </select>
        </section>

        {/* key força remontar e buscar de novo quando troca a pessoa */}
        {selected && <TimeSheet key={selected.id} userId={selected.id} homeTz={selected.timezone} />}
      </main>
    </>
  );
}
