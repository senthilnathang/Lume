/**
 * Security Audit API Routes
 */

import { Router } from 'express';
import { SecurityAuditService } from './services/security-audit.service.js';

export function createSecurityAuditRoutes(prisma, drizzle) {
  const router = Router();
  const auditService = new SecurityAuditService(prisma, drizzle);

  /**
   * GET /api/security/audit
   * Generate security audit report
   */
  router.get('/audit', async (req, res) => {
    try {
      const report = await auditService.generateAuditReport();
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Security audit error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to generate security audit report' }
      });
    }
  });

  /**
   * GET /api/security/owasp
   * Get OWASP Top 10 vulnerability scan results
   */
  router.get('/owasp', async (req, res) => {
    try {
      const findings = await auditService.scanOWASPVulnerabilities();
      res.json({
        success: true,
        data: {
          total: findings.length,
          findings: findings.sort((a, b) => {
            const severityOrder = { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };
            return severityOrder[a.severity] - severityOrder[b.severity];
          })
        }
      });
    } catch (error) {
      console.error('OWASP scan error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to scan OWASP vulnerabilities' }
      });
    }
  });

  /**
   * GET /api/security/api-scan
   * Scan API endpoints for security issues
   */
  router.get('/api-scan', async (req, res) => {
    try {
      const findings = await auditService.scanAPIEndpoints();
      res.json({
        success: true,
        data: {
          findings,
          checklist: [
            'API Authentication - All endpoints require proper auth',
            'Input Validation - All requests validated',
            'Output Encoding - Sensitive data not exposed',
            'Rate Limiting - Endpoints throttled appropriately',
            'CORS - Origins whitelist properly configured'
          ]
        }
      });
    } catch (error) {
      console.error('API security scan error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to scan API security' }
      });
    }
  });

  /**
   * GET /api/security/dependencies
   * Check for vulnerable dependencies
   */
  router.get('/dependencies', async (req, res) => {
    try {
      const findings = await auditService.checkVulnerableDependencies();
      res.json({
        success: true,
        data: {
          findings,
          command: 'npm audit --audit-level=moderate',
          schedule: 'Run weekly in CI/CD pipeline'
        }
      });
    } catch (error) {
      console.error('Dependency audit error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to audit dependencies' }
      });
    }
  });

  /**
   * GET /api/security/risk-score
   * Get current security risk score
   */
  router.get('/risk-score', async (req, res) => {
    try {
      const report = await auditService.generateAuditReport();
      const { riskScore, summary, recommendation } = report;

      const riskLevel = riskScore < 30 ? 'LOW' : riskScore < 60 ? 'MEDIUM' : 'HIGH';

      res.json({
        success: true,
        data: {
          riskScore,
          riskLevel,
          summary,
          recommendation,
          color: riskLevel === 'LOW' ? '#10b981' : riskLevel === 'MEDIUM' ? '#f59e0b' : '#ef4444'
        }
      });
    } catch (error) {
      console.error('Risk score calculation error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to calculate risk score' }
      });
    }
  });

  return router;
}
