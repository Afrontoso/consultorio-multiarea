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

export interface Professional {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  bio: string | null;
  photoUrl: string | null;
  color: string;
  services: { id: string; name: string }[];
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
  professionals: { id: string; name: string }[];
}
