import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { SecurityAuditService } from '../services/security-audit.service';
import { Permissions } from '@core/decorators';

@Controller('api/security')
export class SecurityAuditController {
  constructor(private service: SecurityAuditService) {}

  /**
   * GET /api/security/audit
   * Generate security audit report
   */
  @Get('audit')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('security.audit.view')
  async getAuditReport() {
    return this.service.generateAuditReport();
  }

  /**
   * GET /api/security/owasp
   * Get OWASP Top 10 vulnerability scan results
   */
  @Get('owasp')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('security.owasp.check')
  async getOWASPScan() {
    return this.service.scanOWASPCompliance();
  }

  /**
   * GET /api/security/api-scan
   * Scan API endpoints for security issues
   */
  @Get('api-scan')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('security.api.scan')
  async getAPISecurityScan() {
    return this.service.performAPISecurityScan();
  }

  /**
   * GET /api/security/dependencies
   * Check for vulnerable dependencies
   */
  @Get('dependencies')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('security.dependencies.audit')
  async checkDependencies() {
    return this.service.checkDependencies();
  }

  /**
   * GET /api/security/risk-score
   * Get current security risk score
   */
  @Get('risk-score')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('security.audit.view')
  async getRiskScore() {
    return this.service.getRiskScore();
  }
}
