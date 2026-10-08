import type { EventType, State } from './types';

export const myTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function timezones(): string[] {
  if (typeof Intl.supportedValuesOf === 'function') return Intl.supportedValuesOf('timeZone');
  return ['America/Sao_Paulo', 'Europe/Lisbon', 'Europe/Madrid', 'Europe/London', 'UTC'];
}

// importante: formata no fuso da marcação e não no do navegador,
// senão um ponto batido em Lisboa apareceria com a hora do Brasil
export function hour(date: string | Date, tz: string, withSeconds = false) {
  return new Date(date).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: withSeconds ? '2-digit' : undefined,
    timeZone: tz,
  });
}

export function offset(tz: string, at = new Date()) {
  const part = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' })
    .formatToParts(at)
    .find((p) => p.type === 'timeZoneName');
  const value = part?.value.replace('GMT', 'UTC') ?? 'UTC';
  return value === 'UTC' ? 'UTC+0' : value;
}

export const city = (tz: string) => tz.split('/').pop()!.replace(/_/g, ' ');

export function duration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// work_date vem "2026-10-08", colocando meio-dia UTC não tem risco de virar o dia
export function dayLabel(workDate: string) {
  return new Date(workDate + 'T12:00:00Z').toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  });
}

export function todayISO(tz?: string) {
  return new Date().toLocaleDateString('en-CA', { timeZone: tz });
}

export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const MARKING_NAME: Record<EventType, string> = {
  clock_in: 'Entrada',
  break_start: 'Saída intervalo',
  break_end: 'Volta intervalo',
  clock_out: 'Saída',
};

export const STATE_NAME: Record<State, string> = {
  off: 'Fora do expediente',
  working: 'Trabalhando',
  on_break: 'Em intervalo',
};
