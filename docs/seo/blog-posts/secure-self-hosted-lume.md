---
title: "Secure Your Self-Hosted Lume: HIPAA & GDPR Compliance Guide"
slug: secure-self-hosted-lume
description: "Step-by-step guide to hardening Lume for HIPAA, GDPR, SOC2 compliance with encryption, audit logs, and access controls."
keywords: ["HIPAA compliance", "GDPR compliance", "data security", "encryption", "self-hosted security"]
target_volume: 1900
difficulty: 48
audience: ["CTOs", "Security Teams", "Compliance Officers", "Healthcare Providers"]
published_date: 2026-09-11
reading_time: 11
---

# Secure Your Self-Hosted Lume: HIPAA & GDPR Compliance Guide

If you're storing sensitive data (healthcare records, personal information, financial data), you need to harden your Lume instance. This guide covers HIPAA, GDPR, and SOC2 compliance.

**Timeline:** 2-4 weeks to full compliance
**Cost:** $0-1,000 (mostly infrastructure upgrades)

---

## Part 1: Network Security

### 1.1 TLS/HTTPS Everywhere

All data in transit must be encrypted:

```bash
# Generate self-signed certificate (testing only)
openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365

# Or use Let's Encrypt (production)
certbot certonly --standalone -d lume.yourdomain.com
```

Update Lume config:

```env
# .env
HTTPS_CERT=/path/to/cert.pem
HTTPS_KEY=/path/to/key.pem
SECURE_COOKIES=true
HSTS_MAX_AGE=31536000
```

### 1.2 Firewall Rules

Restrict network access:

```bash
# Only allow HTTPS (443) and SSH (22)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow https
sudo ufw enable
```

### 1.3 IP Allowlisting

Restrict access to known IPs:

```nginx
# nginx.conf
server {
    listen 443 ssl;
    
    # Allow only company IPs
    allow 203.0.113.0/24;  # Your office IP range
    allow 198.51.100.0/24; # Your VPN IP range
    deny all;
}
```

---

## Part 2: Data Encryption

### 2.1 Database Encryption

**MySQL with transparent data encryption (TDE):**

```sql
-- Enable MySQL TDE
SET GLOBAL early_plugin_load='keyring_file.so';
SET PERSIST early_plugin_load='keyring_file.so';
SET PERSIST keyring_file_data='/var/lib/mysql-keyring/keyring';

-- Encrypt all tables
ALTER TABLE contacts ENCRYPTION='Y';
ALTER TABLE companies ENCRYPTION='Y';
ALTER TABLE opportunities ENCRYPTION='Y';
```

### 2.2 Field-Level Encryption

For ultra-sensitive fields (SSN, credit cards, medical data):

```sql
-- Create encrypted columns
ALTER TABLE contacts ADD COLUMN encrypted_ssn BLOB;

-- Encrypt data
UPDATE contacts 
SET encrypted_ssn = AES_ENCRYPT(ssn, 'your-encryption-key')
WHERE ssn IS NOT NULL;
```

Configure Lume to encrypt these fields:

```javascript
// In Lume config
const ENCRYPTED_FIELDS = [
  'contacts.ssn',
  'contacts.credit_card',
  'companies.tax_id'
];

// Automatically encrypt on create/update
app.use(async (req, res, next) => {
  if (req.method === 'PUT' || req.method === 'POST') {
    for (const field of ENCRYPTED_FIELDS) {
      const [table, column] = field.split('.');
      if (req.body[column]) {
        req.body[column] = await encrypt(req.body[column]);
      }
    }
  }
  next();
});
```

### 2.3 Backup Encryption

All backups must be encrypted:

```bash
#!/bin/bash
# Encrypted daily backup

BACKUP_FILE="lume-backup-$(date +%Y%m%d).sql"
BACKUP_PATH="/backup/$BACKUP_FILE"

# Create backup
mysqldump -h localhost -u lume -p$DB_PASSWORD lume > "$BACKUP_FILE"

# Encrypt with GPG
gpg --symmetric --cipher-algo AES256 "$BACKUP_FILE"

# Move to secure storage
mv "$BACKUP_FILE.gpg" "$BACKUP_PATH.gpg"

# Delete unencrypted original
shred -vfz "$BACKUP_FILE"

# Upload to secure cloud storage (AWS S3 with encryption)
aws s3 cp "$BACKUP_PATH.gpg" s3://backups/lume/ --sse AES256
```

Schedule via cron:

```bash
0 2 * * * /scripts/backup-lume.sh
```

---

## Part 3: Access Control

### 3.1 Role-Based Access Control (RBAC)

Define strict roles:

```sql
-- Roles
INSERT INTO roles VALUES 
  (1, 'admin', 'Full access'),
  (2, 'doctor', 'Can view own patient records'),
  (3, 'nurse', 'Can view/edit vitals'),
  (4, 'admin_billing', 'Can view billing records only');

-- Permissions
INSERT INTO permissions VALUES
  (1, 'view_all_records', 'View all patient records'),
  (2, 'view_own_records', 'View only assigned records'),
  (3, 'edit_vitals', 'Edit vital signs');

-- Role-Permission mapping
INSERT INTO role_permissions VALUES
  (2, 2),  -- doctor can view_own_records
  (3, 3),  -- nurse can edit_vitals
  (4, 1);  -- admin_billing can view_all_records (billing only)
```

Configure field-level restrictions:

```javascript
// Only show SSN to doctors, not nurses
const fieldPermissions = {
  'contacts.ssn': ['admin', 'doctor'],
  'contacts.credit_card': ['admin'],
  'contacts.medical_notes': ['doctor']
};
```

### 3.2 Record-Level Access Control

Restrict who can see specific records:

```sql
-- Add privacy field to contacts
ALTER TABLE contacts ADD COLUMN access_level ENUM('public', 'private', 'restricted');

-- Create access control table
CREATE TABLE contact_access (
  id INT PRIMARY KEY,
  contact_id INT,
  user_id INT,
  permission ENUM('view', 'edit', 'delete'),
  FOREIGN KEY (contact_id) REFERENCES contacts(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- User can only see contacts they have explicit access to
SELECT * FROM contacts
WHERE id IN (
  SELECT contact_id FROM contact_access 
  WHERE user_id = ? AND permission IN ('view', 'edit')
);
```

### 3.3 Multi-Factor Authentication (MFA)

Require MFA for all users:

```javascript
// In Lume auth middleware
const mfaRequired = true;

if (mfaRequired && !req.session.mfaVerified) {
  // Force MFA verification
  return res.redirect('/auth/verify-mfa');
}
```

Enable TOTP (Google Authenticator):

```bash
# Generate QR code for user
npm install speakeasy qrcode

const secret = speakeasy.generateSecret({ name: 'Lume' });
const qrCode = await QRCode.toDataURL(secret.otpauth_url);
// Present QR code to user to scan
```

---

## Part 4: Audit Logging

### 4.1 Complete Audit Trail

Log all data access and changes:

```sql
-- Create audit table
CREATE TABLE audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  action VARCHAR(50),
  entity_type VARCHAR(50),
  entity_id INT,
  old_values JSON,
  new_values JSON,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT
);

-- Trigger on every change
DELIMITER //
CREATE TRIGGER audit_contact_changes
AFTER UPDATE ON contacts
FOR EACH ROW
BEGIN
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, timestamp)
  VALUES (
    CURRENT_USER_ID,
    'UPDATE',
    'Contact',
    NEW.id,
    JSON_OBJECT('name', OLD.name, 'email', OLD.email),
    JSON_OBJECT('name', NEW.name, 'email', NEW.email),
    NOW()
  );
END //
DELIMITER ;
```

### 4.2 Query Audit Logs

Generate compliance reports:

```sql
-- Who accessed patient records in the last 30 days?
SELECT user_id, COUNT(*) as access_count
FROM audit_logs
WHERE entity_type = 'Contact'
  AND action = 'SELECT'
  AND timestamp > DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY user_id;

-- All changes to sensitive fields
SELECT * FROM audit_logs
WHERE entity_type = 'Contact'
  AND (new_values LIKE '%ssn%' OR new_values LIKE '%credit_card%')
ORDER BY timestamp DESC;
```

---

## Part 5: Compliance Frameworks

### 5.1 HIPAA Compliance Checklist

- [x] Encryption at rest (TDE)
- [x] Encryption in transit (TLS)
- [x] Access control (RBAC + MFA)
- [x] Audit logging (all access)
- [x] Secure backups (encrypted)
- [x] Breach notification plan
- [x] Business Associate Agreements (BAAs)
- [x] Risk assessment (annual)
- [x] Security awareness training
- [x] Incident response plan

**Verification:**

```bash
# Test encryption
mysql> SHOW STATUS LIKE 'Innodb_encryption%';

# Test audit logging
mysql> SELECT COUNT(*) FROM audit_logs;

# Test access control
curl -H "Authorization: Bearer invalid-token" \
  https://lume.yourdomain.com/api/contacts
# Should return 401 Unauthorized
```

### 5.2 GDPR Compliance Checklist

- [x] Right to access (data export)
- [x] Right to be forgotten (deletion)
- [x] Right to data portability (bulk export)
- [x] Data processing agreement (DPA)
- [x] Privacy by design (no data collection needed)
- [x] Encryption at rest and in transit
- [x] Data minimization (only store necessary fields)
- [x] Consent management

Implement GDPR features:

```javascript
// Data export endpoint (GDPR right to access)
app.get('/api/users/:id/data-export', authRequired, (req, res) => {
  const user = await getUser(req.params.id);
  const data = {
    profile: user,
    contacts: await getContacts(user.id),
    activities: await getActivities(user.id),
    audit_logs: await getAuditLogs(user.id)
  };
  
  res.json(data);
  // Also email as JSON file
});

// Data deletion endpoint (GDPR right to be forgotten)
app.delete('/api/users/:id', authRequired, (req, res) => {
  const user = await getUser(req.params.id);
  await deleteAllUserData(user.id);
  await logAudit('DELETE_USER', user.id);
  res.json({ success: true });
});
```

---

## Part 6: Disaster Recovery

### 6.1 Backup & Restore

Test restores monthly:

```bash
#!/bin/bash
# Test restore process

# Restore from backup
gunzip < lume-backup-20260427.sql.gz | mysql -u lume -p $DB_PASSWORD lume

# Verify data integrity
mysql -u lume -p $DB_PASSWORD lume << EOF
SELECT COUNT(*) as total_contacts FROM contacts;
SELECT COUNT(*) as total_audits FROM audit_logs;
EOF

# Send report
echo "Backup restore test successful" | mail -s "Backup Verification" admin@company.com
```

### 6.2 Incident Response Plan

```markdown
# Incident Response Plan

## Data Breach
1. Isolate affected system
2. Disable compromised user accounts
3. Review audit logs for accessed data
4. Notify affected users within 72 hours
5. Report to regulators (GDPR/HIPAA)

## Ransomware
1. Disconnect from network
2. Restore from clean backup
3. Review access logs
4. Update all passwords

## Performance Degradation
1. Check database size (audit logs growing?)
2. Archive old audit logs
3. Optimize queries
4. Scale infrastructure if needed
```

---

## Security Testing

Run regular security checks:

```bash
# Port scan (identify open ports)
nmap -A lume.yourdomain.com

# SSL/TLS check
testssl.sh https://lume.yourdomain.com

# SQL injection test
sqlmap -u "https://lume.yourdomain.com/api/contacts?search=test" --dbs

# OWASP ZAP security scan
zaproxy --selftest
```

---

## Compliance Audit Checklist

**Before going live:**

- [ ] Encryption audit (all data at rest and in transit)
- [ ] Access control audit (RBAC, MFA, field restrictions)
- [ ] Audit logging audit (all actions logged, can query)
- [ ] Network security audit (firewall, IP allowlist, TLS)
- [ ] Backup audit (encrypted, restorable, tested monthly)
- [ ] Documentation (policies, procedures, incident response)
- [ ] Staff training (security awareness, compliance)
- [ ] Third-party audit (independent security firm)

---

## Get Started

1. Set up encryption (database + backups)
2. Enable audit logging
3. Configure RBAC + MFA
4. Document compliance policies
5. Schedule third-party audit

Questions? Email secure@lume.dev or ask in our [community](https://discord.gg/lume).

**Your data is your most valuable asset. Protect it.**
