// Prisma Database Client
// Optimized for performance with connection pooling

import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
});

// Connection testing
prisma.$connect()
  .then(() => {
    logger.info('Prisma connected to database');
  })
  .catch((error) => {
    logger.error('Prisma connection failed:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;

// Example usage:
// const users = await prisma.user.findMany();
// const user = await prisma.user.create({ data: { email, password, ... } });
