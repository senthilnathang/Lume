import { Sequence } from '~/server/modules/base/models/sequence.model';

/**
 * GET /api/v1/sequences — List all sequences
 */
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system.settings');

  const sequences = await Sequence.findAll({
    where: { is_active: true },
    order: [['name', 'ASC']],
  });

  return {
    success: true,
    data: sequences,
  };
});
