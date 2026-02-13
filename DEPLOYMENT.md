# CPANEL DEPLOYMENT GUIDE
# ========================

## Architecture
- Frontend: gawdesy.org (public_html)
- Backend:  api.gawdesy.org (subdomain with Node.js selector)

## 1. FRONTEND DEPLOYMENT (Main Domain)
========================================

### Step 1: Build Frontend
```bash
cd /opt/gawdesy.com/frontend/apps/web-gawdesy
pnpm build
```

### Step 2: Upload to cPanel
1. Copy the `dist/` folder contents to your local machine
2. In cPanel → File Manager → public_html
3. Upload all files/folders from dist/
4. Ensure .htaccess is in public_html/

### Step 3: Configure Environment
Edit the uploaded `.env.production` or create `config.js`:

```javascript
// Create config.js in public_html/
window.ENV = {
  VITE_API_URL: 'https://api.gawdesy.org/api/v1'
};
```

Or update index.html:
```html
<head>
  <script>
    window.ENV = { VITE_API_URL: 'https://api.gawdesy.org/api/v1' };
  </script>
</head>
```

## 2. BACKEND DEPLOYMENT (API Subdomain)
========================================

### Step 1: Create Subdomain
In cPanel:
1. Domains → Create A New Domain
2. Enter: api.gawdesy.org
3. Document Root: public_html/api (or create separate folder)

### Step 2: Setup Node.js on Subdomain
In cPanel:
1. Setup Node.js App
2. Create Application:
   - Domain: api.gawdesy.org
   - Root: /home/username/api.gawdesy.org
   - Mode: Production
   - Node.js Version: 20.x
3. Start App

### Step 3: Upload Backend
```bash
# Compress backend
cd /opt/gawdesy.com/backend
zip -r backend.zip src package.json .env.production
```

Upload to cPanel and extract to api subdomain root.

### Step 4: Install Dependencies
In cPanel Node.js App:
1. Stop App
2. Run npm install
3. Start App

## 3. DATABASE SETUP
===================

### Step 1: Create MySQL Database
In cPanel:
1. MySQL Databases → Create Database: gawdesy_db
2. MySQL Users → Create User
3. Add User to Database (ALL PRIVILEGES)

### Step 2: Import Schema
```bash
mysql -u gawdesy_user -p gawdesy_db < database/schema.sql
```

### Step 3: Update Backend .env
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=gawdesy_db
DB_USER=gawdesy_user
DB_PASSWORD=your_password
```

## 4. FILE UPLOADS
=================

### Setup Uploads Directory
In cPanel File Manager:
1. Create folder: api.gawdesy.org/uploads
2. Set permissions to 755

## 5. SSL/HTTPS
==============

In cPanel:
1. SSL/TLS Status → AutoSSL
2. Ensure both domains have valid SSL:
   - gawdesy.org
   - api.gawdesy.org

## 6. TESTING
============

### Health Check
```bash
curl https://api.gawdesy.org/api/health
# Should return: {"status":"ok","timestamp":"..."}
```

### Frontend Test
```bash
curl https://gawdesy.org
# Should return HTML with Vue app
```

## 7. TROUBLESHOOTING
====================

### CORS Errors
Ensure backend .env has:
```
FRONTEND_URL=https://gawdesy.org
```

### API Not Reaching
- Check Node.js app is running in cPanel
- Verify .env has correct DB credentials
- Check error logs in cPanel

### Static Files 404
- Ensure .htaccess is in public_html/
- Check file permissions (644)

## QUICK DEPLOYMENT CHECKLIST
=============================
- [ ] Frontend built with `pnpm build`
- [ ] Frontend uploaded to public_html/
- [ ] .htaccess present in public_html/
- [ ] Backend uploaded to api subdomain
- [ ] Node.js app configured and running
- [ ] Database created and imported
- [ ] .env files updated with real credentials
- [ ] SSL certificates active
- [ ] Health check: https://api.gawdesy.org/api/health
- [ ] Frontend loads: https://gawdesy.org
