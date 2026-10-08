import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { dayLabel, duration, MARKING_NAME, hour, MONTHS, todayISO } from '../lib/format';
import type { Summary } from '../lib/types';
import MarkingTime from './MarkingTime';

function lastDayOfMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function downloadCsv(data: Summary) {
  const lines = ['data;tipo;hora;fuso;latitude;longitude;observacao'];
  for (const day of data.days) {
    for (const m of day.records) {
      lines.push([
        day.work_date,
        MARKING_NAME[m.event_type],
        hour(m.occurred_at, m.timezone),
        m.timezone,
        m.location?.latitude ?? '',
        m.location?.longitude ?? '',
        (m.note ?? '').replace(/;/g, ','),
      ].join(';'));
    }
  }
  // o \ufeff é pro excel abrir os acentos certinho
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `espelho_${data.user.name.split(' ')[0].toLowerCase()}_${data.start.slice(0, 7)}.csv`;
  link.click();
}

export default function TimeSheet({ userId, homeTz }: { userId?: number; homeTz: string }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(String(now.getFullYear()));
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function search() {
    const y = Number(year);
    if (!y || y < 2000 || y > 2100) {
      setError('Digite um ano válido.');
      return;
    }
    const mm = String(month + 1).padStart(2, '0');
    const start = `${y}-${mm}-01`;
    let end = `${y}-${mm}-${lastDayOfMonth(y, month)}`;
    if (end > todayISO(homeTz)) end = todayISO(homeTz);

    setLoading(true);
    setError('');
    try {
      setData(await api.summary(start, end < start ? start : end, userId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // já abre mostrando o mês atual
  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <>
      <section className="card">
        <h2 className="card-title">Dias sem saída registrada</h2>
        <div className="box">
          {data && data.open_days.length > 0
            ? data.open_days.map((d) => <span key={d} className="pending">{dayLabel(d)}</span>)
            : 'Nenhum'}
        </div>

        <h2 className="card-title">Consultar período</h2>
        <div className="filters">
          <label>
            Mês
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
          </label>
          <label className="year">
            Ano
            <input inputMode="numeric" maxLength={4} value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))} />
          </label>
          <button className="btn" onClick={search} disabled={loading}>
            {loading ? 'Consultando...' : 'Consultar'}
          </button>
        </div>
        {error && <p className="msg error">{error}</p>}
      </section>

      {data && (
        <section className="card">
          <div className="sheet-head">
            <h2 className="card-title">
              {MONTHS[Number(data.start.slice(5, 7)) - 1]} de {data.start.slice(0, 4)}
            </h2>
            {data.days.length > 0 && (
              <button className="btn-outline" onClick={() => downloadCsv(data)}>Exportar CSV</button>
            )}
          </div>

          {data.days.length === 0 ? (
            <p className="muted">Nenhuma marcação nesse mês.</p>
          ) : (
            <div className="table-wrap">
              <table className="sheet">
                <thead>
                  <tr>
                    <th>Dia</th>
                    <th>Marcações</th>
                    <th className="num">Intervalo</th>
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.days.map((day) => (
                    <tr key={day.work_date} className={day.is_open ? 'open' : ''}>
                      <td className="sheet-day">{dayLabel(day.work_date)}</td>
                      <td>
                        <div className="markings">
                          {day.records.map((m) => <MarkingTime key={m.id} marking={m} homeTz={data.user.timezone} />)}
                        </div>
                      </td>
                      <td className="num">{duration(day.break_minutes)}</td>
                      <td className="num strong">{duration(day.worked_minutes)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3}>Total no período</td>
                    <td className="num strong">{duration(data.total_worked_minutes)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      )}
    </>
  );
}
