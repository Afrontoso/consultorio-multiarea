import { HealthController } from './health.controller';

describe('HealthController', () => {
  const controller = new HealthController();

  it('returns ok status and service name', () => {
    const result = controller.check();
    expect(result.status).toBe('ok');
    expect(result.service).toBe('consultorio-api');
  });

  it('returns an ISO-8601 timestamp', () => {
    const result = controller.check();
    expect(() => new Date(result.timestamp).toISOString()).not.toThrow();
    expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date');
  });
});
