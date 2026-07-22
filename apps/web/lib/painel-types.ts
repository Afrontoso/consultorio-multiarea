export interface Me {
  user: { id: string; email: string; role: 'OWNER' | 'STAFF' | 'PROFESSIONAL' | 'PATIENT' };
  tenant: {
    id: string;
    slug: string;
    name: string;
    category: string;
    status: string;
    trialEndsAt: string | null;
    plan: { code: string; maxProfessionals: number; maxAppointmentsPerMonth: number };
  };
}

export interface PlanUsage {
  planCode: string;
  used: number;
  limit: number;
}

export interface Professional {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  bio: string | null;
  photoUrl: string | null;
  color: string;
  services: { id: string; name: string }[];
  user: { id: string } | null;
}

export type AppointmentStatus = 'CONFIRMED' | 'PENDING' | 'CANCELED' | 'COMPLETED' | 'NO_SHOW';

export interface AppointmentItem {
  id: string;
  date: string;
  status: AppointmentStatus;
  notes: string | null;
  professional: { id: string; name: string; color: string };
  patient: { id: string; name: string; phone: string };
  service: { id: string; name: string; duration: number };
}

export interface WorkingHourRange {
  id: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
}

export interface ScheduleBlockItem {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
}

export interface PatientItem {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  birthDate: string | null;
  notes: string | null;
  createdAt: string;
}

export interface PatientDetail extends PatientItem {
  appointments: {
    id: string;
    date: string;
    status: AppointmentStatus;
    professional: { id: string; name: string; color: string };
    service: { id: string; name: string; duration: number };
  }[];
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
  professionals: { id: string; name: string }[];
}
