import { jest } from '@jest/globals';
import { AdminSettingsService } from '../../../src/modules/base/services/admin-settings.service';
import { ValidatePipe } from '../../../src/core/pipes/validation.pipe';
import { MenuInput, SequenceInput } from '../../../src/modules/base/dtos/admin-settings.dto';

describe('base settings invariants', () => {
  const pipe = new ValidatePipe();
  it('validates internal menu paths and bounded sequence input', async () => {
    await expect(pipe.transform({ name: 'Menu', path: '//other.example' }, { type: 'body', metatype: MenuInput })).rejects.toThrow();
    await expect(pipe.transform({ name: 'Sequence', code: 'order', increment: 0 }, { type: 'body', metatype: SequenceInput })).rejects.toThrow();
    await expect(pipe.transform({ name: 'Sequence', code: 'order', nextNumber: 2147483648 }, { type: 'body', metatype: SequenceInput })).rejects.toThrow();
  });
  it('rejects a menu cycle and missing parents before writing', async () => {
    const update = jest.fn();
    const tx = { $queryRaw: async () => [{ id: 1, parent_id: null }, { id: 2, parent_id: 1 }], menu: { update } };
    const service = new AdminSettingsService({ $transaction: (callback: any) => callback(tx) } as any);
    await expect(service.saveMenu({ parentId: 2 }, 1)).rejects.toThrow('cycle');
    await expect(service.saveMenu({ parentId: 9 }, 1)).rejects.toThrow('Parent menu not found');
    expect(update).not.toHaveBeenCalled();
  });
  it('can clear a menu parent without changing other fields', async () => {
    const update = jest.fn(async ({ data }: any) => data);
    const tx = { $queryRaw: async () => [{ id: 1, parent_id: null }, { id: 2, parent_id: 1 }], menu: { update } };
    const service = new AdminSettingsService({ $transaction: (callback: any) => callback(tx) } as any);
    expect(await service.saveMenu({ parentId: null }, 2)).toMatchObject({ parentId: null });
  });
  it('allocates and formats the locked current value, rejecting inactive/exhausted sequences', async () => {
    const row = { id: 1, nextNumber: 8, increment: 2, prefix: 'INV-', suffix: '', padding: 3, isActive: true };
    const update = jest.fn(async () => row);
    const tx = { $queryRaw: async () => [{ id: 1 }], sequence: { findUniqueOrThrow: async () => row, update } };
    const service = new AdminSettingsService({ $transaction: (callback: any) => callback(tx) } as any);
    expect(await service.nextSequence('invoice')).toEqual({ number: 8, value: 'INV-008' });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ nextNumber: 10 }) }));
    row.isActive = false;
    await expect(service.nextSequence('invoice')).rejects.toThrow('inactive');
    row.isActive = true;
    row.nextNumber = 2147483647;
    await expect(service.nextSequence('invoice')).rejects.toThrow('exhausted');
    expect(update).toHaveBeenCalledTimes(1);
  });
});
