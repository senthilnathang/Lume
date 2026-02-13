/**
 * Base Module API Routes
 */

import { Router } from 'express';

const createRoutes = (models, services) => {
  const router = Router();
  
  // Health check
  router.get('/health', (req, res) => {
    res.json({
      success: true,
      message: 'Base module is running',
      timestamp: new Date().toISOString()
    });
  });
  
  // Module routes
  router.get('/modules', async (req, res) => {
    try {
      const modules = await services.moduleService.getInstalledModules();
      res.json({
        success: true,
        data: modules
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  
  router.get('/modules/:name', async (req, res) => {
    try {
      const module = await services.moduleService.getModule(req.params.name);
      if (!module) {
        return res.status(404).json({
          success: false,
          error: 'Module not found'
        });
      }
      res.json({
        success: true,
        data: module
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  
  router.post('/modules/:name/install', async (req, res) => {
    try {
      const result = await services.moduleService.installModule(req.body);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });
  
  router.post('/modules/:name/uninstall', async (req, res) => {
    try {
      await services.moduleService.uninstallModule(req.params.name);
      res.json({
        success: true,
        message: `Module ${req.params.name} uninstalled`
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });
  
  // Menu routes
  router.get('/menus', async (req, res) => {
    try {
      const menus = await services.moduleService.getAllMenus();
      res.json({
        success: true,
        data: menus
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  
  router.post('/menus', async (req, res) => {
    try {
      const menu = await models.Menu.createRecord(req.body, req.context);
      res.json({
        success: true,
        data: menu
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });
  
  router.put('/menus/:id', async (req, res) => {
    try {
      const menu = await models.Menu.updateRecord(req.params.id, req.body, req.context);
      res.json({
        success: true,
        data: menu
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });
  
  router.delete('/menus/:id', async (req, res) => {
    try {
      await models.Menu.deleteRecord(req.params.id, req.context);
      res.json({
        success: true,
        message: 'Menu deleted'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });
  
  // Permission routes
  router.get('/permissions', async (req, res) => {
    try {
      const permissions = await services.moduleService.getAllPermissions();
      res.json({
        success: true,
        data: permissions
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  
  // Role routes
  router.get('/roles', async (req, res) => {
    try {
      const roles = await models.Role.searchRecords(req.query, req.context);
      res.json({
        success: true,
        data: roles
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  
  router.post('/roles', async (req, res) => {
    try {
      const role = await models.Role.createRecord(req.body, req.context);
      res.json({
        success: true,
        data: role
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });
  
  router.get('/roles/:id', async (req, res) => {
    try {
      const role = await models.Role.readRecord(req.params.id, req.context);
      if (!role) {
        return res.status(404).json({
          success: false,
          error: 'Role not found'
        });
      }
      res.json({
        success: true,
        data: role
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  
  router.put('/roles/:id', async (req, res) => {
    try {
      const role = await models.Role.updateRecord(req.params.id, req.body, req.context);
      res.json({
        success: true,
        data: role
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });
  
  router.delete('/roles/:id', async (req, res) => {
    try {
      await models.Role.deleteRecord(req.params.id, req.context);
      res.json({
        success: true,
        message: 'Role deleted'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });
  
  // Group routes
  router.get('/groups', async (req, res) => {
    try {
      const groups = await models.Group.searchRecords(req.query, req.context);
      res.json({
        success: true,
        data: groups
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  
  router.post('/groups', async (req, res) => {
    try {
      const group = await models.Group.createRecord(req.body, req.context);
      res.json({
        success: true,
        data: group
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });
  
  // Record Rule routes
  router.get('/record-rules', async (req, res) => {
    try {
      const rules = await models.RecordRule.searchRecords(req.query, req.context);
      res.json({
        success: true,
        data: rules
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  
  router.post('/record-rules', async (req, res) => {
    try {
      const rule = await models.RecordRule.createRecord(req.body, req.context);
      res.json({
        success: true,
        data: rule
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });
  
  // Sequence routes
  router.get('/sequences', async (req, res) => {
    try {
      const sequences = await models.Sequence.searchRecords(req.query, req.context);
      res.json({
        success: true,
        data: sequences
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  
  router.post('/sequences', async (req, res) => {
    try {
      const sequence = await models.Sequence.createRecord(req.body, req.context);
      res.json({
        success: true,
        data: sequence
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });
  
  router.get('/sequences/:code/next', async (req, res) => {
    try {
      const number = await models.Sequence.getNextNumber(req.params.code);
      res.json({
        success: true,
        data: { number }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });
  
  return router;
};

export default createRoutes;
