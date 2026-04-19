import { z } from 'zod';

export const AppointmentStatusSchema = z.enum([
  'CONFIRMED',
  'PENDING',
  'CANCELED',
  'COMPLETED',
  'NO_SHOW',
]);
export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>;

export const CreateAppointmentSchema = z.object({
  date: z.coerce.date(),
  professionalId: z.string().cuid(),
  patientId: z.string().cuid(),
  serviceId: z.string().cuid(),
  notes: z.string().max(2000).optional(),
  recurrence: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY']).optional(),
});
export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;
