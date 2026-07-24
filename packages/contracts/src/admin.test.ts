import { describe, expect, it } from 'vitest';
import { AdminUpdateTenantSchema } from './admin';

const cuid = 'c' + 'x'.repeat(24);

describe('AdminUpdateTenantSchema', () => {
  it('aceita só status', () => {
    expect(AdminUpdateTenantSchema.parse({ status: 'SUSPENDED' }).status).toBe('SUSPENDED');
  });

  it('aceita só planId', () => {
    expect(AdminUpdateTenantSchema.parse({ planId: cuid }).planId).toBe(cuid);
  });

  it('rejeita objeto vazio', () => {
    expect(() => AdminUpdateTenantSchema.parse({})).toThrow();
  });

  it('rejeita status inválido', () => {
    expect(() => AdminUpdateTenantSchema.parse({ status: 'PAUSED' })).toThrow();
  });

  it('rejeita planId não-cuid', () => {
    expect(() => AdminUpdateTenantSchema.parse({ planId: 'abc' })).toThrow();
  });
});
