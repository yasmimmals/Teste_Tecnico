export type Role = 'employee' | 'manager' | 'admin';
export type EventType = 'clock_in' | 'break_start' | 'break_end' | 'clock_out';
export type State = 'off' | 'working' | 'on_break';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  timezone: string;
  created_at: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
}

export interface Marking {
  id: number;
  user_id: number;
  event_type: EventType;
  occurred_at: string;
  occurred_at_local: string;
  timezone: string;
  work_date: string;
  location: Location | null;
  note: string | null;
}

export interface Status {
  state: State;
  last_record: Marking | null;
  allowed_actions: EventType[];
  worked_minutes_today: number;
}

export interface Day {
  work_date: string;
  worked_minutes: number;
  break_minutes: number;
  is_open: boolean;
  timezones: string[];
  records: Marking[];
}

export interface Summary {
  user: User;
  start: string;
  end: string;
  total_worked_minutes: number;
  open_days: string[];
  days: Day[];
}
