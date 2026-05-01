import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Get user role
    const userRole = await prisma.role.findUnique({ where: { name: 'user' } });
    
    if (!userRole) {
      console.error('❌ User role not found');
      process.exit(1);
    }
    
    // Create or update test user
    const user = await prisma.user.upsert({
      where: { email: 'user@lume.dev' },
      create: {
        email: 'user@lume.dev',
        password: 'User@123',
        firstName: 'Test',
        lastName: 'User',
        role: { connect: { id: userRole.id } },
        isActive: true,
        createdAt: new Date()
      },
      update: {
        password: 'User@123'
      }
    });
    
    console.log('✅ Test user created/updated:', user.email);
    console.log('   Email: user@lume.dev');
    console.log('   Password: User@123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createTestUser();
