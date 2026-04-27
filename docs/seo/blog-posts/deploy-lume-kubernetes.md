---
title: "Deploy Lume on Kubernetes: Production-Ready Helm Chart"
slug: deploy-lume-kubernetes
description: "Complete guide to deploying Lume on Kubernetes using Helm charts with auto-scaling, monitoring, and high availability."
keywords: ["Kubernetes deployment", "Helm chart", "DevOps", "production deployment", "container orchestration"]
target_volume: 1800
difficulty: 50
audience: ["DevOps Engineers", "System Administrators", "Enterprise Teams"]
published_date: 2026-09-10
reading_time: 11
---

# Deploy Lume on Kubernetes: Production-Ready Helm Chart

For enterprises running Kubernetes, Lume provides a production-ready Helm chart for high-availability deployments, auto-scaling, and monitoring.

**What this covers:**
- Helm chart installation
- Database setup (MySQL + Redis)
- TLS/HTTPS configuration
- Auto-scaling policies
- Monitoring with Prometheus
- Backup & disaster recovery

---

## Prerequisites

- Kubernetes cluster (1.19+) with kubectl access
- Helm 3 installed
- MySQL database (managed or self-hosted)
- Redis cache (optional but recommended)
- Ingress controller (nginx or istio)

---

## Step 1: Add Lume Helm Repository

```bash
helm repo add lume https://charts.lume.dev
helm repo update
```

---

## Step 2: Create Namespace & Secrets

```bash
# Create namespace
kubectl create namespace lume

# Create secrets for database
kubectl create secret generic lume-db \
  -n lume \
  --from-literal=DATABASE_URL="mysql://user:pass@db.example.com:3306/lume" \
  --from-literal=REDIS_URL="redis://redis.example.com:6379"

# Create secrets for JWT
kubectl create secret generic lume-jwt \
  -n lume \
  --from-literal=JWT_SECRET="your-super-secret-key"
```

---

## Step 3: Create Values.yaml

```yaml
# values.yaml for Lume Helm chart

replicaCount: 3

image:
  repository: lume/lume
  tag: "2.0.0"
  pullPolicy: IfNotPresent

imagePullSecrets: []
nameOverride: ""
fullnameOverride: ""

# Pod Security
podAnnotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "9090"

podSecurityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 1000

securityContext:
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL
  readOnlyRootFilesystem: true

# Service Configuration
service:
  type: ClusterIP
  port: 3000
  targetPort: 3000

# Ingress Configuration
ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  hosts:
    - host: lume.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: lume-tls
      hosts:
        - lume.example.com

# Resource limits
resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 500m
    memory: 512Mi

# Auto-scaling
autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

# Health checks
livenessProbe:
  httpGet:
    path: /health
    port: http
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /ready
    port: http
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 2

# Environment variables
env:
  LOG_LEVEL: info
  NODE_ENV: production
  DATABASE_POOL_SIZE: "20"
  REDIS_CACHE_TTL: "3600"

# Database
database:
  host: mysql.default.svc.cluster.local
  port: 3306
  name: lume
  # user and password set via secrets

# Redis cache
redis:
  enabled: true
  host: redis.default.svc.cluster.local
  port: 6379

# Monitoring
monitoring:
  enabled: true
  prometheus:
    enabled: true
  dashboards:
    enabled: true

# Backup configuration
backup:
  enabled: true
  schedule: "0 2 * * *"  # Daily at 2 AM
  retention: 30  # days

# Node affinity (spread across nodes)
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchExpressions:
              - key: app
                operator: In
                values:
                  - lume
          topologyKey: kubernetes.io/hostname
```

---

## Step 4: Install Lume with Helm

```bash
helm install lume lume/lume \
  -n lume \
  -f values.yaml \
  --set image.tag=2.0.0
```

**Verify installation:**

```bash
kubectl get pods -n lume
kubectl get svc -n lume
kubectl get ingress -n lume
```

---

## Step 5: Configure TLS/HTTPS

**Using cert-manager + Let's Encrypt:**

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer for Let's Encrypt
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
EOF
```

---

## Step 6: Set Up Monitoring with Prometheus

```bash
# Install Prometheus
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  -n monitoring \
  --create-namespace

# Get Prometheus dashboard
kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090
# Visit http://localhost:9090
```

**Create ServiceMonitor for Lume:**

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: lume
  namespace: lume
spec:
  selector:
    matchLabels:
      app: lume
  endpoints:
    - port: metrics
      interval: 30s
```

---

## Step 7: Configure Auto-Scaling

Lume auto-scales based on CPU and memory metrics.

```bash
# Create HPA (Horizontal Pod Autoscaler)
kubectl autoscale deployment lume \
  -n lume \
  --min=3 \
  --max=10 \
  --cpu-percent=70

# View HPA status
kubectl get hpa -n lume
kubectl describe hpa lume -n lume
```

---

## Step 8: Database Backup & Restoration

**Automated daily backups:**

```bash
# Create backup script
kubectl exec -it deployment/lume -n lume -- \
  mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASS lume > lume-backup.sql

# Schedule via CronJob
cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: CronJob
metadata:
  name: lume-backup
  namespace: lume
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: mysql:8.0
              command:
                - /bin/bash
                - -c
                - mysqldump -h mysql.default -u lume -p\$MYSQL_PASSWORD lume | gzip > /backup/lume-\$(date +%Y%m%d).sql.gz
              env:
                - name: MYSQL_PASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: lume-db
                      key: DB_PASSWORD
              volumeMounts:
                - name: backup-storage
                  mountPath: /backup
          volumes:
            - name: backup-storage
              persistentVolumeClaim:
                claimName: lume-backups
          restartPolicy: OnFailure
EOF
```

---

## Step 9: View Logs & Debug

```bash
# View pod logs
kubectl logs -f deployment/lume -n lume

# SSH into pod
kubectl exec -it pod/lume-xxxx -n lume -- /bin/bash

# Check events
kubectl describe pod lume-xxxx -n lume

# Debug with port-forward
kubectl port-forward svc/lume 3000:3000 -n lume
# Visit http://localhost:3000
```

---

## Step 10: Upgrade Lume

```bash
# Update Helm repo
helm repo update

# Upgrade installation
helm upgrade lume lume/lume \
  -n lume \
  -f values.yaml \
  --set image.tag=2.1.0

# Check rollout status
kubectl rollout status deployment/lume -n lume
```

---

## Production Checklist

- [ ] Database backed up daily
- [ ] Monitoring enabled (Prometheus + Grafana)
- [ ] Auto-scaling configured (min 3, max 10 replicas)
- [ ] TLS/HTTPS enabled
- [ ] Pod Security Policies enforced
- [ ] Resource limits set
- [ ] Network policies configured
- [ ] Disaster recovery tested
- [ ] Secrets managed securely (not in git)
- [ ] Log aggregation enabled (ELK, Splunk, etc.)

---

## Common Issues & Solutions

**Pod stuck in CrashLoopBackOff:**
```bash
kubectl logs -f pod/lume-xxxx -n lume
# Check database connection, API key, environment variables
```

**Out of memory:**
```bash
# Increase memory limits
kubectl set resources deployment lume \
  -n lume \
  --limits=memory=2Gi \
  --requests=memory=1Gi
```

**Slow response times:**
```bash
# Check Redis cache status
kubectl exec redis -- redis-cli INFO
# Increase Lume replicas
kubectl scale deployment lume --replicas=5 -n lume
```

---

## Documentation & Support

- **Full docs:** https://docs.lume.dev/kubernetes
- **Helm repo:** https://charts.lume.dev
- **Community:** https://discord.gg/lume
- **Email support:** enterprise@lume.dev

---

## Next Steps

1. Customize `values.yaml` for your environment
2. Set up monitoring dashboards
3. Configure backup retention policies
4. Test failover scenarios
5. Document runbooks for your team

Deploy Lume on Kubernetes today!
