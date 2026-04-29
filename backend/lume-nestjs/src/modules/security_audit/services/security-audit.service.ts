import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/services/prisma.service';

@Injectable()
export class SecurityAuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * OWASP Top 10 Vulnerability Scanner
   */
  async scanOWASPVulnerabilities() {
    const findings = [];

    // A1: Broken Access Control
    findings.push(...(await this.checkAccessControl()));

    // A2: Cryptographic Failures
    findings.push(...(await this.checkCryptography()));

    // A3: Injection
    findings.push(...(await this.checkInjectionVulnerabilities()));

    // A4: Insecure Design
    findings.push(...(await this.checkInsecureDesign()));

    // A5: Security Misconfiguration
    findings.push(...(await this.checkSecurityMisconfiguration()));

    // A6: Vulnerable and Outdated Components
    findings.push(...(await this.checkVulnerableDependencies()));

    // A7: Authentication Failures
    findings.push(...(await this.checkAuthenticationFlaws()));

    // A8: Data Integrity Failures
    findings.push(...(await this.checkDataIntegrityFailures()));

    // A9: Logging and Monitoring Failures
    findings.push(...(await this.checkLoggingMonitoring()));

    // A10: SSRF
    findings.push(...(await this.checkSSRFVulnerabilities()));

    return findings;
  }

  /**
   * Check for Access Control Issues
   */
  async checkAccessControl() {
    const issues = [];

    const users = await this.prisma.user.findMany({ include: { role: true } });

    if (!users.every((u) => u.roleId)) {
      issues.push({
        type: 'BROKEN_ACCESS_CONTROL',
        severity: 'CRITICAL',
        title: 'Users without role assignment',
        description: 'Some users lack role assignment, potentially bypassing access controls',
        cwe: 'CWE-639: Authorization Bypass Through User-Controlled Key',
        remediation: 'Ensure all users have appropriate roles assigned'
      });
    }

    const settingValue = await this.prisma.setting.findFirst({
      where: { key: 'jwt_secret' }
    });

    if (settingValue?.value && settingValue.value === 'jwt-secret') {
      issues.push({
        type: 'HARDCODED_CREDENTIALS',
        severity: 'CRITICAL',
        title: 'Hardcoded JWT Secret',
        description: 'Default JWT secret detected in production',
        cwe: 'CWE-798: Use of Hard-Coded Credentials',
        remediation: 'Set JWT_SECRET environment variable to a strong random value'
      });
    }

    return issues;
  }

  /**
   * Check Cryptographic Implementation
   */
  async checkCryptography() {
    const issues = [];

    const settings = await this.prisma.setting.findMany();
    const hasHttpsEnforcement = settings.some((s) => s.key === 'enforce_https' && s.value === 'true');

    if (!hasHttpsEnforcement) {
      issues.push({
        type: 'MISSING_HTTPS',
        severity: 'HIGH',
        title: 'HTTPS not enforced',
        description: 'Application should enforce HTTPS for all connections',
        cwe: 'CWE-295: Improper Certificate Validation',
        remediation: 'Enable HTTPS enforcement in production'
      });
    }

    const users = await this.prisma.user.findMany({ take: 1 });
    if (users.length > 0) {
      const hasPasswordField = users[0].hasOwnProperty('password');
      if (hasPasswordField && users[0].password?.length < 50) {
        issues.push({
          type: 'WEAK_PASSWORD_HASHING',
          severity: 'CRITICAL',
          title: 'Weak password hashing detected',
          description: 'Passwords may not be properly hashed',
          cwe: 'CWE-327: Use of a Broken or Risky Cryptographic Algorithm',
          remediation: 'Ensure bcrypt or equivalent is used for password hashing'
        });
      }
    }

    return issues;
  }

  /**
   * Check for Injection Vulnerabilities
   */
  async checkInjectionVulnerabilities() {
    const issues = [];

    issues.push({
      type: 'INJECTION_CHECK',
      severity: 'MEDIUM',
      title: 'Manual injection vulnerability scan recommended',
      description: 'Automated static analysis should be complemented with manual code review',
      cwe: 'CWE-89: SQL Injection, CWE-79: Cross-site Scripting',
      remediation: 'Use parameterized queries and sanitize all user inputs with DOMPurify or equivalent'
    });

    return issues;
  }

  /**
   * Check for Insecure Design Patterns
   */
  async checkInsecureDesign() {
    const issues = [];

    const corsSettings = await this.prisma.setting.findFirst({
      where: { key: 'cors_origins' }
    });

    if (!corsSettings) {
      issues.push({
        type: 'MISSING_CORS_CONFIG',
        severity: 'MEDIUM',
        title: 'CORS policy not explicitly configured',
        description: 'CORS should be explicitly configured for security',
        cwe: 'CWE-346: Origin Validation Error',
        remediation: 'Configure CORS_ORIGINS environment variable'
      });
    }

    return issues;
  }

  /**
   * Check for Security Misconfiguration
   */
  async checkSecurityMisconfiguration() {
    const issues = [];

    const debugMode = process.env.DEBUG === 'true' || process.env.NODE_ENV !== 'production';
    if (debugMode && process.env.NODE_ENV === 'production') {
      issues.push({
        type: 'DEBUG_MODE_ENABLED',
        severity: 'HIGH',
        title: 'Debug mode enabled in production',
        description: 'Debug mode exposes sensitive information',
        cwe: 'CWE-215: Information Exposure Through Debug Information',
        remediation: 'Disable DEBUG mode in production environment'
      });
    }

    const securityHeaders = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'Strict-Transport-Security',
      'Content-Security-Policy'
    ];

    issues.push({
      type: 'MISSING_SECURITY_HEADERS',
      severity: 'MEDIUM',
      title: 'Verify security headers are configured',
      description: `Check that these headers are present: ${securityHeaders.join(', ')}`,
      cwe: 'CWE-693: Protection Mechanism Failure',
      remediation: 'Enable security headers middleware in production'
    });

    return issues;
  }

  /**
   * Check for Vulnerable Dependencies
   */
  async checkVulnerableDependencies() {
    const issues = [];

    issues.push({
      type: 'VULNERABLE_DEPENDENCIES',
      severity: 'HIGH',
      title: 'Dependency vulnerability audit required',
      description: 'Run "npm audit" to check for known vulnerabilities',
      cwe: 'CWE-1104: Use of Unmaintained Third Party Components',
      remediation: 'Regularly audit dependencies and apply patches',
      command: 'npm audit'
    });

    return issues;
  }

  /**
   * Check Authentication Flaws
   */
  async checkAuthenticationFlaws() {
    const issues = [];

    const settings = await this.prisma.setting.findFirst({
      where: { key: 'password_min_length' }
    });

    if (!settings || parseInt(settings.value) < 12) {
      issues.push({
        type: 'WEAK_PASSWORD_POLICY',
        severity: 'HIGH',
        title: 'Weak password requirements',
        description: 'Minimum password length should be at least 12 characters',
        cwe: 'CWE-521: Weak Password Requirements',
        remediation: 'Enforce minimum 12-character passwords with complexity requirements'
      });
    }

    const sessionTimeout = await this.prisma.setting.findFirst({
      where: { key: 'session_timeout' }
    });

    if (!sessionTimeout) {
      issues.push({
        type: 'MISSING_SESSION_TIMEOUT',
        severity: 'MEDIUM',
        title: 'No session timeout configured',
        description: 'Sessions should timeout after a period of inactivity',
        cwe: 'CWE-613: Insufficient Session Expiration',
        remediation: 'Configure SESSION_TIMEOUT environment variable'
      });
    }

    return issues;
  }

  /**
   * Check for Data Integrity Failures
   */
  async checkDataIntegrityFailures() {
    const issues = [];

    const auditLogs = await this.prisma.auditLog.findMany({ take: 1 });
    if (auditLogs.length === 0) {
      issues.push({
        type: 'MISSING_AUDIT_LOGGING',
        severity: 'HIGH',
        title: 'No audit logging detected',
        description: 'Critical operations should be logged for integrity verification',
        cwe: 'CWE-778: Insufficient Logging',
        remediation: 'Enable and configure comprehensive audit logging'
      });
    }

    return issues;
  }

  /**
   * Check Logging and Monitoring
   */
  async checkLoggingMonitoring() {
    const issues = [];

    const hasErrorTracking = process.env.ERROR_TRACKING_ENABLED === 'true';
    if (!hasErrorTracking) {
      issues.push({
        type: 'NO_ERROR_MONITORING',
        severity: 'MEDIUM',
        title: 'Error monitoring not enabled',
        description: 'Application should have centralized error tracking',
        cwe: 'CWE-778: Insufficient Logging',
        remediation: 'Enable ERROR_TRACKING_ENABLED and configure error service'
      });
    }

    return issues;
  }

  /**
   * Check for SSRF Vulnerabilities
   */
  async checkSSRFVulnerabilities() {
    const issues = [];

    issues.push({
      type: 'POTENTIAL_SSRF',
      severity: 'MEDIUM',
      title: 'SSRF prevention measures should be verified',
      description: 'Review all external URL handling for SSRF vulnerabilities',
      cwe: 'CWE-918: Server-Side Request Forgery (SSRF)',
      remediation: 'Validate and whitelist all external URLs, disable dangerous protocols'
    });

    return issues;
  }

  /**
   * API Security Scan
   */
  async scanAPIEndpoints() {
    const findings = [];

    findings.push({
      type: 'API_AUTHENTICATION',
      title: 'Verify all API endpoints require authentication',
      severity: 'CRITICAL',
      items: [
        'Check that public endpoints are explicitly marked',
        'Verify JWT validation on all protected endpoints',
        'Test token expiration and refresh mechanisms'
      ]
    });

    findings.push({
      type: 'API_VALIDATION',
      title: 'Validate API input/output handling',
      severity: 'HIGH',
      items: [
        'Check request validation on all endpoints',
        'Verify response does not leak sensitive data',
        'Test rate limiting per endpoint',
        'Verify pagination limits'
      ]
    });

    findings.push({
      type: 'API_CORS',
      title: 'Check CORS configuration',
      severity: 'MEDIUM',
      items: [
        'Verify allowed origins are not overly permissive',
        'Check credentials are properly handled',
        'Test preflight requests'
      ]
    });

    return findings;
  }

  /**
   * Calculate Risk Score
   */
  private calculateRiskScore(findings: any[]) {
    let score = 0;
    const severityWeights = {
      CRITICAL: 40,
      HIGH: 25,
      MEDIUM: 15,
      LOW: 5
    };

    findings.forEach((finding) => {
      score += severityWeights[finding.severity] || 5;
    });

    return Math.min(100, Math.round((score / 200) * 100));
  }

  /**
   * Generate Security Audit Report
   */
  async generateAuditReport() {
    const owaspFindings = await this.scanOWASPVulnerabilities();
    const apiFindings = await this.scanAPIEndpoints();
    const allFindings = [...owaspFindings, ...apiFindings];

    const riskScore = this.calculateRiskScore(allFindings);

    const criticalIssues = allFindings.filter((f) => f.severity === 'CRITICAL').length;
    const highIssues = allFindings.filter((f) => f.severity === 'HIGH').length;
    const mediumIssues = allFindings.filter((f) => f.severity === 'MEDIUM').length;

    return {
      success: true,
      data: {
        timestamp: new Date(),
        riskScore,
        summary: {
          total: allFindings.length,
          critical: criticalIssues,
          high: highIssues,
          medium: mediumIssues
        },
        findings: allFindings,
        recommendation:
          riskScore < 30
            ? '✅ Security posture is good. Continue regular audits.'
            : riskScore < 60
              ? '⚠️ Address HIGH and MEDIUM issues before production deployment.'
              : '🔴 Critical security issues detected. Remediate immediately.'
      }
    };
  }

  /**
   * Get OWASP scan results
   */
  async scanOWASPCompliance() {
    const findings = await this.scanOWASPVulnerabilities();
    return {
      success: true,
      data: {
        total: findings.length,
        findings: findings.sort((a, b) => {
          const severityOrder = { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        })
      }
    };
  }

  /**
   * Scan API endpoints
   */
  async performAPISecurityScan() {
    const findings = await this.scanAPIEndpoints();
    return {
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
    };
  }

  /**
   * Check dependencies
   */
  async checkDependencies() {
    const findings = await this.checkVulnerableDependencies();
    return {
      success: true,
      data: {
        findings,
        command: 'npm audit --audit-level=moderate',
        schedule: 'Run weekly in CI/CD pipeline'
      }
    };
  }

  /**
   * Get risk score
   */
  async getRiskScore() {
    const report = await this.generateAuditReport();
    const { riskScore, summary, recommendation } = report.data;

    const riskLevel = riskScore < 30 ? 'LOW' : riskScore < 60 ? 'MEDIUM' : 'HIGH';

    return {
      success: true,
      data: {
        riskScore,
        riskLevel,
        summary,
        recommendation,
        color: riskLevel === 'LOW' ? '#10b981' : riskLevel === 'MEDIUM' ? '#f59e0b' : '#ef4444'
      }
    };
  }
}
