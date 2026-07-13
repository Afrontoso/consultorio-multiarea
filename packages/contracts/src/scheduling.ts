import { z } from 'zod';

// Faixa de atendimento em minutos desde 00:00 (ex.: 540–720 = 09:00–12:00).
export const WorkingHourRangeSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startMinute: z.number().int().min(0).max(1439),
    endMinute: z.number().int().min(1).max(1440),
  })
  .refine((r) => r.startMinute < r.endMinute, {
    message: 'Início deve ser antes do fim',
  });
export type WorkingHourRange = z.infer<typeof WorkingHourRangeSchema>;

// Substitui o conjunto completo de faixas do profissional.
export const SetWorkingHoursSchema = z
  .object({
    ranges: z.array(WorkingHourRangeSchema).max(50),
  })
  .refine(
    (data) => {
      for (let day = 0; day <= 6; day++) {
        const ranges = data.ranges
          .filter((r) => r.weekday === day)
          .sort((a, b) => a.startMinute - b.startMinute);
        for (let i = 1; i < ranges.length; i++) {
          const prev = ranges[i - 1];
          const curr = ranges[i];
          if (prev && curr && curr.startMinute < prev.endMinute) return false;
        }
      }
      return true;
    },
    { message: 'Faixas de horário do mesmo dia não podem se sobrepor' },
  );
export type SetWorkingHoursInput = z.infer<typeof SetWorkingHoursSchema>;

export const CreateScheduleBlockSchema = z
  .object({
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    reason: z.string().max(200).optional(),
  })
  .refine((b) => b.startsAt < b.endsAt, {
    message: 'Início do bloqueio deve ser antes do fim',
  });
export type CreateScheduleBlockInput = z.infer<typeof CreateScheduleBlockSchema>;

// Consulta de disponibilidade pública: um dia por vez.
export const AvailabilityQuerySchema = z.object({
  professionalId: z.string().cuid(),
  serviceId: z.string().cuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato YYYY-MM-DD'),
});
export type AvailabilityQuery = z.infer<typeof AvailabilityQuerySchema>;
