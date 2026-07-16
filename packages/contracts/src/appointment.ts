import { z } from 'zod';
import { PhoneSchema } from './patient';

export const AppointmentStatusSchema = z.enum([
  'CONFIRMED',
  'PENDING',
  'CANCELED',
  'COMPLETED',
  'NO_SHOW',
]);
export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>;

// Paciente inline: criado (ou reaproveitado pelo telefone) junto com o agendamento.
export const InlinePatientSchema = z.object({
  name: z.string().min(2).max(120),
  phone: PhoneSchema,
  email: z.string().email().optional(),
});
export type InlinePatientInput = z.infer<typeof InlinePatientSchema>;

export const CreateAppointmentSchema = z
  .object({
    date: z.coerce.date(),
    professionalId: z.string().cuid(),
    serviceId: z.string().cuid(),
    patientId: z.string().cuid().optional(),
    patient: InlinePatientSchema.optional(),
    notes: z.string().max(2000).optional(),
    recurrence: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY']).optional(),
  })
  .refine((data) => Boolean(data.patientId) !== Boolean(data.patient), {
    message: 'Informe patientId ou os dados do paciente (exatamente um dos dois)',
  });
export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;

// Agendamento vindo da página pública: paciente sempre inline, sem recorrência.
export const PublicCreateAppointmentSchema = z.object({
  date: z.coerce.date(),
  professionalId: z.string().cuid(),
  serviceId: z.string().cuid(),
  patient: InlinePatientSchema,
  notes: z.string().max(500).optional(),
});
export type PublicCreateAppointmentInput = z.infer<typeof PublicCreateAppointmentSchema>;

export const UpdateAppointmentSchema = z.object({
  date: z.coerce.date().optional(),
  status: AppointmentStatusSchema.optional(),
  notes: z.string().max(2000).optional(),
});
export type UpdateAppointmentInput = z.infer<typeof UpdateAppointmentSchema>;

export const ListAppointmentsQuerySchema = z.object({
  professionalId: z.string().cuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  status: AppointmentStatusSchema.optional(),
});
export type ListAppointmentsQuery = z.infer<typeof ListAppointmentsQuerySchema>;
