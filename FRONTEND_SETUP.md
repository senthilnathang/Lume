# Frontend Setup & Development Guide

## Architecture

The Lume Framework frontend consists of two separate applications:

### 1. Admin Panel (Vue.js + Vite)
- **Location**: `/apps/web-lume/`
- **Framework**: Vue 3 + TypeScript
- **Build Tool**: Vite
- **Port**: 5173 (development)
- **UI Library**: Ant Design Vue
- **State Management**: Pinia
- **API Client**: Axios with auto-unwrapping interceptor
- **Icons**: lucide-vue-next

### 2. Public Website (Nuxt.js SSR)
- **Location**: `/apps/riagri-website/`
- **Framework**: Nuxt 3 (Vue 3)
- **Rendering**: SSR + Static Generation
- **Port**: 3000 (development)
- **CSS Framework**: Tailwind CSS
- **State Management**: Pinia + Composables
- **Content**: TipTap JSON + Markdown

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- MySQL database (for backend)

### Installation

```bash
# Install dependencies for all packages
npm install

# Or specific services:
cd apps/web-lume && npm install      # Admin Panel
cd apps/riagri-website && npm install # Website
cd backend/lume-nestjs && npm install # Backend API
```

## Development Workflow

### Start All Services

```bash
# Terminal 1: Backend API
cd backend/lume-nestjs
npm run start

# Terminal 2: Admin Panel
cd apps/web-lume
npm run dev

# Terminal 3: Website
cd apps/riagri-website
npm run dev
```

Or use a single command from root to start all (if configured):
```bash
npm run dev  # Starts all services in parallel
```

### Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Backend API | http://localhost:3001 | NestJS REST API |
| Admin Panel | http://localhost:5173 | Vue.js management dashboard |
| Public Website | http://localhost:3000 | Nuxt.js SSR website |

### Login Credentials (Development)

```
Email: admin@lume.dev
Password: Admin@123
```

## Admin Panel (Vue.js)

### Directory Structure

```
apps/web-lume/
├── src/
│   ├── main.ts                 # Vue app entry
│   ├── App.vue                 # Root component
│   ├── api/
│   │   ├── request.ts          # Axios interceptor
│   │   └── auth.ts             # Authentication API
│   ├── stores/                 # Pinia stores
│   │   ├── auth.ts             # Auth state
│   │   └── user.ts             # User state
│   ├── router/
│   │   └── index.ts            # Vue Router config
│   ├── views/                  # Page components
│   ├── components/             # Reusable components
│   ├── layouts/                # Layout components
│   └── assets/                 # Static assets
├── vite.config.ts              # Vite configuration
├── tailwind.config.js          # Tailwind CSS config
└── package.json
```

### Key Features

- **Ant Design Vue Components**: Global registration for `<a-*>` components
- **Module-Specific Views**: Each backend module has custom admin views at `/backend/src/modules/{name}/static/views/`
- **Dynamic Routing**: Routes auto-load from module manifests
- **API Client**: Unwraps `{success, data}` responses automatically
- **Responsive Design**: Mobile-first with Tailwind CSS

### Running Admin Panel

```bash
cd apps/web-lume
npm run dev        # Start dev server (port 5173)
npm run build      # Production build
npm run preview    # Preview production build
npm run typecheck  # Check TypeScript
```

### Module Frontend Organization

All module-specific admin code lives in the backend:

```
backend/src/modules/{module}/static/
├── views/           # Vue components for admin
├── api/            # API client hooks
└── components/     # Module-specific components
```

Import using the `@modules` alias:
```typescript
import { ModuleView } from '@modules/module-name/static/views'
```

## Public Website (Nuxt.js)

### Directory Structure

```
apps/riagri-website/
├── app.vue                     # Root layout
├── pages/
│   ├── index.vue               # Home page
│   ├── products.vue            # Products listing
│   ├── services.vue            # Services page
│   ├── about.vue               # About page
│   ├── contact.vue             # Contact page
│   └── [...slug].vue           # Dynamic CMS pages
├── components/
│   ├── Header.vue              # Site header
│   ├── Footer.vue              # Site footer
│   └── **/                     # Section components
├── layouts/
│   └── default.vue             # Main layout
├── composables/
│   ├── useWebsiteData.ts       # Fetch menus/settings
│   └── usePageContent.ts       # Fetch page content
├── app/
│   └── PageRenderer.vue        # Render TipTap JSON
├── public/                     # Static assets
└── nuxt.config.ts              # Nuxt configuration
```

### Key Features

- **SSR Rendering**: Server-side rendering for SEO
- **Static Generation**: Pre-render pages at build time
- **CMS Content**: Fetch from `/api/website/public/pages/:slug`
- **TipTap JSON**: Render visual page builder content
- **Navigation Menus**: Dynamic menus from CMS
- **SEO Optimized**: Meta tags, Open Graph, Schema.org
- **Responsive**: Mobile-first design with Tailwind

### Running Website

```bash
cd apps/riagri-website
npm run dev        # Start dev server (port 3000)
npm run build      # Build for production
npm run preview    # Preview production build
npm run typecheck  # Check TypeScript
npm run lint       # Run linter
```

### Content Rendering

The website fetches content from the CMS at these endpoints:

```
GET /api/website/public/pages/:slug       # Get page by slug
GET /api/website/public/menus/:location   # Get menu items
GET /api/website/public/settings          # Get site settings
GET /api/website/public/pages             # List all pages
```

Content is stored as TipTap JSON and rendered dynamically.

## API Integration

### Axios Client (`api/request.ts`)

The frontend includes a configured Axios client with auto-unwrapping:

```typescript
// API responses like { success: true, data: {...} }
// are automatically unwrapped to just {...}
const data = await api.get('/endpoint')  // Returns data directly

// Errors are thrown automatically
try {
  await api.post('/endpoint', payload)
} catch (error) {
  // Handle error
}
```

### Authentication

```typescript
// Login
const response = await api.post('/auth/login', {
  email: 'user@example.com',
  password: 'password'
})
// Returns { accessToken, refreshToken }

// Stored in localStorage by auth store
// Automatically added to request headers via interceptor

// Logout
await api.post('/auth/logout')
```

## Environment Configuration

### Admin Panel (`.env.local`)

```env
VITE_API_URL=/api           # API proxy (dev)
VITE_APP_NAME=Lume Admin
```

### Website (`.env`)

```env
NUXT_PUBLIC_API_URL=http://localhost:3001
```

## Development Tips

### Hot Module Reload
- Vue admin panel: HMR enabled by default (Vite)
- Nuxt website: HMR enabled with auto-refresh

### Debugging

**Vue Admin Panel**:
- Use Vue DevTools browser extension
- Check console for API errors
- Check Network tab for API calls

**Nuxt Website**:
- Use Vue DevTools extension
- Check console for rendering errors
- Use `nuxi analyze` to check bundle size

### Common Issues

**Admin panel not loading modules**:
- Check that module has `static/views/` directory
- Verify `@modules` Vite alias is configured
- Check browser console for import errors

**Website not fetching content**:
- Verify backend API is running on port 3001
- Check that website is configured with correct API URL
- Verify CMS pages exist in database

**Styles not applying**:
- Admin panel: Check Tailwind config includes module paths
- Website: Ensure Tailwind CSS is imported in root layout
- Clear cache and rebuild if needed

## Testing

```bash
# Admin Panel Unit Tests
cd apps/web-lume
npm run test

# Website Tests
cd apps/riagri-website
npm run test

# E2E Testing
npm run test:e2e
```

## Building for Production

### Admin Panel

```bash
cd apps/web-lume
npm run build       # Builds to dist/

# Preview before deployment
npm run preview
```

### Website

```bash
cd apps/riagri-website
npm run build       # Builds to .output/

# Preview before deployment  
npm run preview
```

### Docker Deployment

```bash
# Build admin panel image
docker build -t lume-admin apps/web-lume/

# Build website image
docker build -t lume-website apps/riagri-website/

# Run services
docker-compose up
```

## Performance Optimization

### Admin Panel

- Code splitting via dynamic imports
- Tree-shaking of unused code
- Ant Design Vue icons optimization
- Bundle analysis: `npm run analyze`

### Website

- Image optimization via Nuxt Image module
- Automatic code splitting per route
- CSS purging with Tailwind
- Preload critical resources

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Database connected and migrations run
- [ ] Backend API health check passing
- [ ] Admin panel builds successfully
- [ ] Website builds successfully
- [ ] API endpoints accessible from frontend
- [ ] CORS configured correctly
- [ ] SSL certificates valid (production)
- [ ] Database backups enabled
- [ ] Monitoring/logging configured

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :5173    # Admin panel
lsof -i :3000    # Website
lsof -i :3001    # Backend

# Kill process
kill -9 <PID>
```

### Module Dependency Issues

```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Build Errors

```bash
# Clear Vite/Nuxt cache
rm -rf .nuxt dist .output

# Rebuild
npm run build
```

---

**For detailed backend documentation, see [MIGRATION_COMPLETE.md](backend/lume-nestjs/MIGRATION_COMPLETE.md)**
