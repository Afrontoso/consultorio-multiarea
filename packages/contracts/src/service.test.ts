import { describe, expect, it } from 'vitest';
import { CreateServiceSchema } from './service';

const valid = { name: 'Sessão', duration: 50, price: 180 };

describe('CreateServiceSchema', () => {
  it('accepts a valid payload', () => {
    const parsed = CreateServiceSchema.parse(valid);
    expect(parsed.duration).toBe(50);
    expect(parsed.price).toBe(180);
  });

  it('rejects negative price', () => {
    expect(() => CreateServiceSchema.parse({ ...valid, price: -1 })).toThrow();
  });

  it('rejects duration below 5 minutes', () => {
    expect(() => CreateServiceSchema.parse({ ...valid, duration: 4 })).toThrow();
  });

  it('rejects duration above 480 minutes', () => {
    expect(() => CreateServiceSchema.parse({ ...valid, duration: 481 })).toThrow();
  });

  it('rejects non-integer duration', () => {
    expect(() => CreateServiceSchema.parse({ ...valid, duration: 10.5 })).toThrow();
  });

  it('rejects price beyond decimal(10,2) limit', () => {
    expect(() => CreateServiceSchema.parse({ ...valid, price: 100000 })).toThrow();
  });
});
