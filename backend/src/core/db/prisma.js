import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// Password hashing middleware
prisma.$use(async (params, next) => {
  if (params.model === 'User') {
    if (params.action === 'create' || params.action === 'update') {
      if (params.args.data?.password) {
        const salt = await bcrypt.genSalt(12);
        params.args.data.password = await bcrypt.hash(params.args.data.password, salt);
      }
    }
  }
  return next(params);
});

export { prisma };
export default prisma;
