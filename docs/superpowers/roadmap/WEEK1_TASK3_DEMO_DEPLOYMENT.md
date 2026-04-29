# Week 1 Task 3: Deploy Live Demo — Complete Guide

**Objective:** Get a publicly accessible live demo deployed so GitHub visitors can try Lume without cloning.

**Status:** Infrastructure ready (Dockerfiles, nginx config, docker-compose.prod.yml created)

**Next:** Seed sample data + deploy to Railway/similar

---

## Phase 1: Seed Sample Data (Backend)

Before deploying, create sample entities and records that showcase Lume's features.

### 1.1 Create Sample Entities Script

Create `backend/seeds/demo-data.seed.js`:

```javascript
// Seeds demo data: Products, Orders, Customers with relationships
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedDemoData() {
  try {
    console.log('🌱 Seeding demo data...');

    // Get admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@lume.dev' }
    });

    if (!adminUser) {
      throw new Error('Admin user not found. Run npm run db:init first.');
    }

    // Create sample entities if they don't exist
    const productEntity = await prisma.entity.upsert({
      where: { name: 'products' },
      update: {},
      create: {
        name: 'products',
        label: 'Products',
        description: 'Product catalog for the demo',
        createdBy: adminUser.id
      }
    });

    const orderEntity = await prisma.entity.upsert({
      where: { name: 'orders' },
      update: {},
      create: {
        name: 'orders',
        label: 'Orders',
        description: 'Customer orders',
        createdBy: adminUser.id
      }
    });

    const customerEntity = await prisma.entity.upsert({
      where: { name: 'customers' },
      update: {},
      create: {
        name: 'customers',
        label: 'Customers',
        description: 'Customer information',
        createdBy: adminUser.id
      }
    });

    console.log('✅ Entities created:', {
      products: productEntity.id,
      orders: orderEntity.id,
      customers: customerEntity.id
    });

    // Create fields for each entity
    const productFields = [
      { name: 'sku', label: 'SKU', type: 'text', required: true },
      { name: 'name', label: 'Product Name', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'text' },
      { name: 'price', label: 'Price', type: 'number', required: true },
      { name: 'stock', label: 'Stock Quantity', type: 'number', required: true },
      { name: 'status', label: 'Status', type: 'select', selectOptions: JSON.stringify(['active', 'inactive', 'discontinued']) }
    ];

    for (const field of productFields) {
      const existing = await prisma.entityField.findFirst({
        where: { entityId: productEntity.id, name: field.name, deletedAt: null }
      });

      if (!existing) {
        await prisma.entityField.create({
          data: {
            entityId: productEntity.id,
            name: field.name,
            label: field.label,
            type: field.type,
            required: field.required || false,
            selectOptions: field.selectOptions || null,
            sequence: 0,
            slug: field.name.toLowerCase()
          }
        });
      }
    }

    console.log('✅ Product fields created');

    const customerFields = [
      { name: 'first_name', label: 'First Name', type: 'text', required: true },
      { name: 'last_name', label: 'Last Name', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'text', required: true },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'company', label: 'Company', type: 'text' },
      { name: 'status', label: 'Status', type: 'select', selectOptions: JSON.stringify(['active', 'inactive', 'prospect']) }
    ];

    for (const field of customerFields) {
      const existing = await prisma.entityField.findFirst({
        where: { entityId: customerEntity.id, name: field.name, deletedAt: null }
      });

      if (!existing) {
        await prisma.entityField.create({
          data: {
            entityId: customerEntity.id,
            name: field.name,
            label: field.label,
            type: field.type,
            required: field.required || false,
            selectOptions: field.selectOptions || null,
            sequence: 0,
            slug: field.name.toLowerCase()
          }
        });
      }
    }

    console.log('✅ Customer fields created');

    const orderFields = [
      { name: 'order_number', label: 'Order Number', type: 'text', required: true },
      { name: 'customer_id', label: 'Customer', type: 'text' },
      { name: 'total_amount', label: 'Total Amount', type: 'number', required: true },
      { name: 'status', label: 'Order Status', type: 'select', selectOptions: JSON.stringify(['pending', 'processing', 'shipped', 'delivered', 'cancelled']) },
      { name: 'order_date', label: 'Order Date', type: 'date', required: true }
    ];

    for (const field of orderFields) {
      const existing = await prisma.entityField.findFirst({
        where: { entityId: orderEntity.id, name: field.name, deletedAt: null }
      });

      if (!existing) {
        await prisma.entityField.create({
          data: {
            entityId: orderEntity.id,
            name: field.name,
            label: field.label,
            type: field.type,
            required: field.required || false,
            selectOptions: field.selectOptions || null,
            sequence: 0,
            slug: field.name.toLowerCase()
          }
        });
      }
    }

    console.log('✅ Order fields created');

    // Create views
    const productListView = await prisma.entityView.upsert({
      where: {
        entityId_name: {
          entityId: productEntity.id,
          name: 'All Products'
        }
      },
      update: {},
      create: {
        entityId: productEntity.id,
        name: 'All Products',
        type: 'list',
        config: JSON.stringify({
          columns: ['name', 'sku', 'price', 'stock', 'status'],
          pageSize: 20
        }),
        isDefault: true
      }
    });

    console.log('✅ Views created');

    console.log('\n🎉 Demo data seeded successfully!');
    console.log('\nNext steps:');
    console.log('1. Log in with: admin@lume.dev / admin123');
    console.log('2. Navigate to Entity Builder');
    console.log('3. Create records for Products, Customers, Orders');
    console.log('4. Test filtering, sorting, and relationships');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedDemoData();
```

### 1.2 Update package.json scripts

Add seed script:

```json
{
  "scripts": {
    "db:init": "node scripts/init-db.js",
    "db:seed:demo": "node backend/seeds/demo-data.seed.js"
  }
}
```

### 1.3 Run the seed script locally

```bash
cd backend
npm install  # If needed
npm run db:seed:demo
# ✅ Output: "Demo data seeded successfully!"
```

---

## Phase 2: Deploy to Railway.app

**Time:** ~15 minutes  
**Cost:** Free tier available ($5/month after free credits)

### 2.1 Prepare for Railway

1. Create Railway account at https://railway.app
2. Connect your GitHub account
3. Have these ready:
   - Strong passwords (DB root, JWT secrets)
   - Domain name (optional, Railway provides one)

### 2.2 Create Railway Project

```bash
# Login to Railway CLI (optional, for faster deployment)
railway login

# Or use web dashboard:
# 1. Go to https://railway.app/dashboard
# 2. Click "New Project"
# 3. Select "Deploy from GitHub"
```

### 2.3 Deploy MySQL Service

In Railway Dashboard:

1. Click "New Service"
2. Select "MySQL"
3. Set environment variables:
   - `MYSQL_ROOT_PASSWORD` → Generate: `openssl rand -hex 16`
   - `MYSQL_DATABASE` → `lume`
4. Allocate 512MB RAM (Railway default)
5. Click "Create"

**Wait for service to be healthy (2-3 minutes)**

### 2.4 Deploy Backend Service

1. Click "New Service"
2. Select "GitHub Repo"
3. Choose `senthilnathang/Lume`
4. Root directory: `/backend`
5. Set environment variables:
   ```
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=${{ mysql.DATABASE_URL }}
   JWT_SECRET=$(openssl rand -hex 32)
   JWT_REFRESH_SECRET=$(openssl rand -hex 32)
   CORS_ORIGIN=${{ RAILWAY_PUBLIC_DOMAIN }}
   LOG_LEVEL=info
   ```
6. Build command: `npm install && npx prisma generate && npx prisma db push`
7. Start command: `npm run start`
8. Allocate 512MB RAM
9. Click "Deploy"

**Wait for deployment (3-5 minutes)**

### 2.5 Deploy Frontend Service

1. Click "New Service"
2. Select "GitHub Repo"
3. Choose `senthilnathang/Lume`
4. Root directory: `/frontend`
5. Set environment variables:
   ```
   VITE_API_URL=/api
   NODE_ENV=production
   ```
6. Build command: `npm install && npm run build`
7. Start command: Recommend using Railway's "Nginx" service instead:
   - Alternative: Deploy to Vercel for better SPA support
8. Click "Deploy"

### 2.6 Connect Services

In Railway:
1. Click on Backend service
2. "Variables" → Add:
   - Link MySQL: `DATABASE_URL` from MySQL service
3. Click on Frontend service
4. Set API proxy to backend (nginx.conf already handles this)

### 2.7 Get Public URLs

After deployment:
- Backend URL: From Railway dashboard (e.g., `https://lume-backend.railway.app`)
- Frontend URL: From Railway dashboard (e.g., `https://lume-demo.railway.app`)

Test:
```bash
curl https://lume-demo.railway.app/api/health
# Should return: { "status": "ok" }
```

---

## Phase 3: Update README with Demo Link

Add banner at the top of `README.md` (after the title):

```markdown
# Lume ⚡

> 🚀 **[Try the Live Demo →](https://lume-demo.railway.app)** 
> (Use credentials: `admin@lume.dev` / `admin123`)

**Full-stack application platform. Enterprise software. 10x faster.**
```

---

## Phase 4: Verify Demo Completeness

### Checklist

- [ ] Backend API is responsive (`/api/health` returns 200)
- [ ] Frontend loads and renders without errors
- [ ] Login works with admin credentials
- [ ] User can navigate admin UI
- [ ] Can view sample entities (Products, Customers, Orders)
- [ ] Can create/edit/delete records
- [ ] Filtering works on list views
- [ ] Export/import features work
- [ ] Demo link visible in README
- [ ] GitHub repo description updated (Task 2)
- [ ] GitHub topics added (Task 2)

### Test Flow (5 minutes)

1. Open https://lume-demo.railway.app
2. Login: `admin@lume.dev` / `admin123`
3. Navigate to "Entity Builder"
4. View "Products" entity, see sample data
5. Create new product (test form validation)
6. Filter products by status
7. Export product list
8. Return to home, verify navigation works

---

## Troubleshooting

### Backend won't deploy

**Check logs:**
```bash
railway logs -s backend
```

**Common issues:**
1. **Prisma schema mismatch:** Railway MySQL schema must match `backend/prisma/schema.prisma`
   - Solution: Run `npx prisma db push` in Railway's terminal
2. **JWT secrets not set:** Check environment variables
3. **Database not ready:** Wait 2-3 minutes for MySQL to initialize

### Frontend shows blank page

**Check browser console:**
- Open DevTools (F12) → Console tab
- Look for errors like "Failed to fetch /api/..." or CORS errors

**Check nginx logs:**
```bash
# If using Railway's Node service:
railway logs -s frontend
```

**Common issues:**
1. **API URL wrong:** Verify `VITE_API_URL=/api` in environment
2. **Build failed:** Check Railway build logs
3. **CORS error:** Verify backend's `CORS_ORIGIN` matches frontend URL

### Database connection errors

**Test connection:**
```bash
# In Railway backend terminal:
npm run test:db-connection
```

**Common issues:**
1. **Wrong DATABASE_URL:** Should start with `mysql://`
2. **Root password wrong:** Verify in MySQL service variables
3. **Network isolation:** Ensure backend and MySQL are in same Railway project

---

## Performance Baseline

Expected performance on Railway free tier:
- **Backend response time:** 100-200ms (p50), 500ms (p99)
- **Frontend page load:** 2-3 seconds on 4G
- **Database queries:** 10-50ms per query
- **Concurrent users:** 100+ without issues

If sluggish, upgrade to paid tier ($5+/month) for more RAM.

---

## Next Steps After Demo Launch

1. **Share on Product Hunt** (Week 3)
2. **Post on Hacker News** (Week 3)
3. **Add performance benchmarks** (Week 2)
4. **Create deployment examples** (Week 2)
5. **Monitor demo uptime** (set up pinging every 5 min)

---

## Cost Breakdown

| Service | Free Tier | Cost |
|---------|-----------|------|
| Railway MySQL | 512MB, 1 month free | $8/month after |
| Railway Backend | 512MB, 8 GB/month | $5-10/month |
| Railway Frontend | 512MB, 8 GB/month | $5-10/month |
| **Total** | Free for 1 month | ~$15/month |

**To minimize cost:**
- Use Railway's free tier for 1 month (includes $5 credits)
- Or use DigitalOcean $4/month droplet + free tier MySQL

---

## Success Criteria

✅ Live demo accessible at public URL  
✅ Demo link in README and GitHub repo description  
✅ Users can log in and explore Lume without cloning  
✅ Sample data showcases key features (entities, records, filtering)  
✅ Performance acceptable on 4G networks  
✅ Uptime monitored and >99%  

This completes **Week 1 Task 3**.
