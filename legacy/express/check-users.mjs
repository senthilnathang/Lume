import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      where: { email: { in: ['admin@lume.dev', 'user@lume.dev'] } }
    });
    
    console.log('Users in database:');
    users.forEach(u => {
      console.log(`  • ${u.email}`);
    });
    
    if (users.length === 0) {
      console.log('  No users found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkUsers();
