export default {
  name: 'security-audit',
  displayName: 'Security Audit',
  description: 'Comprehensive security audit and vulnerability scanning for the Lume framework',
  version: '1.0.0',
  author: 'Lume Team',
  license: 'MIT',
  enabled: true,
  dependencies: ['base'],

  permissions: [
    {
      name: 'security.audit.view',
      description: 'View security audit results',
      category: 'Security'
    },
    {
      name: 'security.audit.run',
      description: 'Run security audits',
      category: 'Security'
    },
    {
      name: 'security.vulnerabilities.view',
      description: 'View vulnerability reports',
      category: 'Security'
    },
    {
      name: 'security.vulnerabilities.manage',
      description: 'Manage vulnerability findings',
      category: 'Security'
    },
    {
      name: 'security.owasp.check',
      description: 'Check OWASP compliance',
      category: 'Security'
    },
    {
      name: 'security.api.scan',
      description: 'Scan API security',
      category: 'Security'
    },
    {
      name: 'security.dependencies.audit',
      description: 'Audit dependencies for vulnerabilities',
      category: 'Security'
    },
    {
      name: 'security.csp.manage',
      description: 'Manage Content Security Policy',
      category: 'Security'
    }
  ],

  menuItems: [
    {
      name: 'Security Audit',
      path: '/security/audit',
      icon: 'shield',
      category: 'Security'
    },
    {
      name: 'Vulnerability Reports',
      path: '/security/vulnerabilities',
      icon: 'alert-triangle',
      category: 'Security'
    },
    {
      name: 'OWASP Compliance',
      path: '/security/owasp',
      icon: 'check-circle',
      category: 'Security'
    },
    {
      name: 'API Security',
      path: '/security/api-scan',
      icon: 'network',
      category: 'Security'
    },
    {
      name: 'Dependency Audit',
      path: '/security/dependencies',
      icon: 'package',
      category: 'Security'
    }
  ],

  features: [
    'OWASP Top 10 vulnerability scanning',
    'API security assessment',
    'Dependency vulnerability detection',
    'Content Security Policy validation',
    'SQL Injection prevention checks',
    'XSS vulnerability detection',
    'CORS policy validation',
    'Authentication flow auditing',
    'Encryption strength assessment',
    'Rate limiting validation',
    'Input validation checking',
    'Output encoding verification',
    'Secure header validation',
    'Deserialization attack detection',
    'SSRF prevention checks',
    'Insecure direct object reference detection'
  ]
};
