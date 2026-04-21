import type { CreateTenantInput } from '@consultorio/contracts';
import { TenantsController } from './tenants.controller';
import type { TenantsService } from './tenants.service';

const input: CreateTenantInput = {
  slug: 'clinica-lua',
  name: 'Clínica Lua',
  category: 'NUTRICAO',
  ownerEmail: 'owner@lua.co',
  ownerName: 'Lua Owner',
};

describe('TenantsController', () => {
  it('delegates to service with uid and returns a safe projection', async () => {
    const trialEndsAt = new Date('2026-05-04T00:00:00.000Z');
    const createTenant = jest.fn().mockResolvedValue({
      id: 'tenant-1',
      slug: input.slug,
      name: input.name,
      category: input.category,
      status: 'TRIAL',
      planId: 'plan-free',
      trialEndsAt,
      secretColumn: 'hidden',
    });
    const service = { createTenant } as unknown as TenantsService;
    const controller = new TenantsController(service);

    const result = await controller.create(input, { uid: 'uid-42', email: 'o@lua.co' });

    expect(createTenant).toHaveBeenCalledWith(input, 'uid-42');
    expect(result).toEqual({
      id: 'tenant-1',
      slug: input.slug,
      name: input.name,
      category: input.category,
      status: 'TRIAL',
      trialEndsAt,
    });
    expect(result).not.toHaveProperty('secretColumn');
    expect(result).not.toHaveProperty('planId');
  });
});
