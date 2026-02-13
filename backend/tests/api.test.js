const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'gawdesy-secret-key';

const createTestApp = () => {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (email === 'admin@gawdesy.org' && password === 'Admin@123') {
      const token = jwt.sign(
        { id: 1, email, role: 'admin' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      const refreshToken = jwt.sign({ id: 1 }, JWT_SECRET, { expiresIn: '7d' });
      
      res.json({
        success: true,
        data: {
          user: { id: 1, email, name: 'Admin', role: 'admin' },
          accessToken: token,
          refreshToken
        }
      });
    } else {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
  });

  app.get('/api/users', authenticateToken, async (req, res) => {
    res.json({
      success: true,
      data: [
        { id: 1, name: 'Admin User', email: 'admin@gawdesy.org', role: 'admin', status: 'active' },
        { id: 2, name: 'John Doe', email: 'john@example.com', role: 'user', status: 'active' }
      ],
      total: 2,
      page: 1,
      limit: 20
    });
  });

  app.get('/api/modules', authenticateToken, async (req, res) => {
    res.json({
      success: true,
      data: [
        { name: 'core', version: '1.0.0', state: 'installed' },
        { name: 'user', version: '1.0.0', state: 'installed' },
        { name: 'auth', version: '1.0.0', state: 'installed' },
        { name: 'donations', version: '1.0.0', state: 'installed' }
      ]
    });
  });

  app.get('/api/menus', authenticateToken, async (req, res) => {
    res.json({
      success: true,
      data: [
        { id: 1, title: 'Dashboard', path: '/', icon: 'dashboard', permission: null },
        { id: 2, title: 'Users', path: '/users', icon: 'users', permission: 'users.read' },
        { id: 3, title: 'Donations', path: '/donations', icon: 'donations', permission: 'donations.read' }
      ]
    });
  });

  return app;
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

describe('GAWDESY API Tests', () => {
  let app;
  
  beforeAll(() => {
    app = createTestApp();
  });

  describe('Health Check', () => {
    test('GET /api/health returns status ok', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Authentication', () => {
    test('POST /api/auth/login with valid credentials returns token', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@gawdesy.org', password: 'Admin@123' })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.email).toBe('admin@gawdesy.org');
    });

    test('POST /api/auth/login with invalid credentials returns 401', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'wrong@example.com', password: 'wrongpassword' })
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });

  describe('Users API', () => {
    test('GET /api/users without token returns 401', async () => {
      await request(app)
        .get('/api/users')
        .expect(401);
    });

    test('GET /api/users with valid token returns user list', async () => {
      const token = jwt.sign({ id: 1, email: 'admin@gawdesy.org' }, JWT_SECRET);
      
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.total).toBe(2);
    });
  });

  describe('Modules API', () => {
    test('GET /api/modules returns installed modules', async () => {
      const token = jwt.sign({ id: 1, email: 'admin@gawdesy.org' }, JWT_SECRET);
      
      const response = await request(app)
        .get('/api/modules')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Menus API', () => {
    test('GET /api/menus returns navigation menus', async () => {
      const token = jwt.sign({ id: 1, email: 'admin@gawdesy.org' }, JWT_SECRET);
      
      const response = await request(app)
        .get('/api/menus')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});

module.exports = { createTestApp };
