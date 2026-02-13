#!/bin/bash

# GAWDESY CPANEL Deployment Script
# Usage: ./deploy-cpanel.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend/apps/web-gawdesy"
DEPLOY_DIR="$SCRIPT_DIR/cpanel-deploy"

print_status() { echo -e "${YELLOW}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo "========================================"
echo "  GAWDESY CPANEL DEPLOYMENT"
echo "========================================"
echo ""

# Clean previous deploy
print_status "Cleaning previous deploy..."
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR/frontend"
mkdir -p "$DEPLOY_DIR/backend"

# Build frontend
print_status "Building frontend..."
cd "$FRONTEND_DIR"

if command_exists pnpm; then
    pnpm build
else
    npm run build
fi

# Copy frontend build
print_status "Preparing frontend..."
cp -r dist/* "$DEPLOY_DIR/frontend/"

# Copy .htaccess from source
if [ -f "$SCRIPT_DIR/frontend/apps/web-gawdesy/dist/.htaccess" ]; then
    cp "$SCRIPT_DIR/frontend/apps/web-gawdesy/dist/.htaccess" "$DEPLOY_DIR/frontend/.htaccess"
elif [ -f "$SCRIPT_DIR/nginx.conf" ]; then
    # Create .htaccess from nginx.conf template
    cat > "$DEPLOY_DIR/frontend/.htaccess" << 'HTACCESS'
# GAWDESY - Vue.js SPA Routing for cPanel
RewriteEngine On
RewriteBase /

# Gzip Compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css application/javascript application/json
</IfModule>

# Browser Caching
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/pdf "access plus 1 month"
    ExpiresByType text/x-javascript "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType image/x-icon "access plus 1 year"
    ExpiresDefault "access plus 2 days"
</IfModule>

# Security Headers
<IfModule mod_headers.c>
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set X-Content-Type-Options "nosniff"
</IfModule>

# If the request is for an existing file, serve it
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -l [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# SPA Routing - All other requests go to index.html
RewriteRule ^ /index.html [L]
HTACCESS
fi

# Ensure .htaccess exists
if [ ! -f "$DEPLOY_DIR/frontend/.htaccess" ]; then
    print_error ".htaccess not found"
    exit 1
fi

print_success ".htaccess created"

# Prepare backend
print_status "Preparing backend..."
cd "$BACKEND_DIR"
cp package.json "$DEPLOY_DIR/backend/"
cp .env.production "$DEPLOY_DIR/backend/.env"
cp -r src "$DEPLOY_DIR/backend/"

# Create upload directories
mkdir -p "$DEPLOY_DIR/backend/uploads"
mkdir -p "$DEPLOY_DIR/backend/logs"

# Copy deployment guide
cp "$SCRIPT_DIR/DEPLOYMENT.md" "$DEPLOY_DIR/"

# Create zip files
print_status "Creating deployment packages..."
cd "$DEPLOY_DIR"

# Frontend zip
zip -r frontend.zip frontend/ .htaccess
mv frontend.zip "$SCRIPT_DIR/frontend-cpanel.zip"

# Backend zip
zip -r backend.zip backend/
mv backend.zip "$SCRIPT_DIR/backend-cpanel.zip"

# Clean up
rm -rf "$DEPLOY_DIR"

print_success "Deployment packages created!"
echo ""
echo "========================================"
echo "  DEPLOYMENT PACKAGES READY"
echo "========================================"
echo ""
echo -e "${GREEN}Frontend:${NC} $SCRIPT_DIR/frontend-cpanel.zip"
echo "  - Upload to public_html/"
echo "  - Ensure .htaccess is in root"
echo ""
echo -e "${GREEN}Backend:${NC} $SCRIPT_DIR/backend-cpanel.zip"
echo "  - Upload to api subdomain root"
echo "  - Configure Node.js app in cPanel"
echo ""
echo -e "${GREEN}Guide:${NC} $SCRIPT_DIR/DEPLOYMENT.md"
echo ""
