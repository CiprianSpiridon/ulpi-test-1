# Enterprise URL Shortener - Deployment Guide

This comprehensive guide covers deployment options, configuration, monitoring, and best practices for the Enterprise URL Shortener API.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Docker Deployment](#docker-deployment)
- [Production Deployment](#production-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Monitoring and Logging](#monitoring-and-logging)
- [Security Configuration](#security-configuration)
- [Performance Tuning](#performance-tuning)
- [Backup and Recovery](#backup-and-recovery)
- [Troubleshooting](#troubleshooting)

## 🚀 Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/your-org/enterprise-url-shortener.git
cd enterprise-url-shortener

# Copy environment configuration
cp .env.example .env

# Edit configuration
nano .env
```

### 2. Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Access the application
curl http://localhost:3000/health
```

### 3. Manual Setup

```bash
# Install dependencies
cd backend && npm install

# Run database migrations
npm run migrate

# Start the server
npm run start
```

## 📋 Prerequisites

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 2 cores | 4+ cores |
| **RAM** | 4GB | 8GB+ |
| **Storage** | 20GB SSD | 100GB+ SSD |
| **Network** | 100 Mbps | 1 Gbps |

### Software Dependencies

- **Node.js**: 20.0.0 or higher
- **PostgreSQL**: 13.0 or higher
- **Redis**: 6.0 or higher
- **Docker**: 20.10 or higher (optional)
- **Docker Compose**: 2.0 or higher (optional)

### External Services

- **DNS Provider**: For custom domains
- **SSL Certificate**: Let's Encrypt or commercial
- **Email Service**: For notifications (SendGrid, AWS SES)
- **Monitoring**: Prometheus, Grafana (optional)

## ⚙️ Environment Configuration

### Core Configuration

Create and configure your `.env` file:

```env
# =============================================================================
# APPLICATION SETTINGS
# =============================================================================
NODE_ENV=production
PORT=3000
API_BASE_URL=https://api.yourdomain.com

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================
# PostgreSQL
DATABASE_URL=postgresql://username:password@host:port/database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=urlshortener
DB_USER=urlshortener_user
DB_PASSWORD=your_secure_password
DB_SSL=true
DB_POOL_MIN=2
DB_POOL_MAX=10

# =============================================================================
# CACHE CONFIGURATION
# =============================================================================
# Redis
REDIS_URL=redis://username:password@host:port
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0
REDIS_KEY_PREFIX=urlshortener:

# =============================================================================
# AUTHENTICATION
# =============================================================================
JWT_SECRET=your_super_secure_jwt_secret_key_here
JWT_EXPIRES_IN=3600
JWT_REFRESH_SECRET=your_super_secure_refresh_secret_key
JWT_REFRESH_EXPIRES_IN=2592000

# =============================================================================
# SECURITY
# =============================================================================
CORS_ORIGIN=https://yourdomain.com,https://dashboard.yourdomain.com
ALLOWED_HOSTS=yourdomain.com,api.yourdomain.com
BCRYPT_ROUNDS=12
SESSION_SECRET=your_session_secret_key

# =============================================================================
# RATE LIMITING
# =============================================================================
RATE_LIMIT_AUTHENTICATED=1000
RATE_LIMIT_ANONYMOUS=100
RATE_LIMIT_WINDOW_MS=3600000

# =============================================================================
# LOGGING
# =============================================================================
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE_PATH=/var/log/urlshortener/app.log
LOG_MAX_FILES=30
LOG_MAX_SIZE=100m

# =============================================================================
# MONITORING
# =============================================================================
HEALTH_CHECK_ENABLED=true
METRICS_ENABLED=true
METRICS_PORT=9090
PROMETHEUS_METRICS=true

# =============================================================================
# EMAIL CONFIGURATION
# =============================================================================
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=URL Shortener

# =============================================================================
# FEATURE FLAGS
# =============================================================================
ENABLE_WEBHOOKS=true
ENABLE_CUSTOM_DOMAINS=true
ENABLE_BULK_OPERATIONS=true
ENABLE_ANALYTICS_EXPORT=true

# =============================================================================
# THIRD-PARTY INTEGRATIONS
# =============================================================================
# Analytics
GOOGLE_ANALYTICS_ID=UA-XXXXXXXXX-X
MIXPANEL_TOKEN=your_mixpanel_token

# Geolocation
MAXMIND_LICENSE_KEY=your_maxmind_license_key

# Cloud Storage (for exports)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-exports-bucket
```

### Development vs Production

```bash
# Development
NODE_ENV=development
LOG_LEVEL=debug
DB_SSL=false
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Production
NODE_ENV=production
LOG_LEVEL=warn
DB_SSL=true
CORS_ORIGIN=https://yourdomain.com
```

## 🐳 Docker Deployment

### Docker Compose Setup

```yaml
# docker-compose.yml
version: '3.8'

services:
  # ==========================================================================
  # APPLICATION SERVICES
  # ==========================================================================
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: production
    ports:
      - "3000:3000"
      - "9090:9090"  # Metrics
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://urlshortener:${DB_PASSWORD}@postgres:5432/urlshortener
      - REDIS_URL=redis://redis:6379
    env_file:
      - .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./logs:/var/log/urlshortener
    networks:
      - urlshortener-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # ==========================================================================
  # DATABASE SERVICES
  # ==========================================================================
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: urlshortener
      POSTGRES_USER: urlshortener
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_INITDB_ARGS: "--auth-host=scram-sha-256"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - urlshortener-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U urlshortener -d urlshortener"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - urlshortener-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # ==========================================================================
  # REVERSE PROXY & SSL
  # ==========================================================================
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./docker/nginx/sites:/etc/nginx/sites-available
      - ./ssl:/etc/ssl/certs
    depends_on:
      - api
    networks:
      - urlshortener-network
    restart: unless-stopped

  # ==========================================================================
  # MONITORING SERVICES
  # ==========================================================================
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9091:9090"
    volumes:
      - ./docker/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
    networks:
      - urlshortener-network
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./docker/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./docker/grafana/datasources:/etc/grafana/provisioning/datasources
    networks:
      - urlshortener-network
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:

networks:
  urlshortener-network:
    driver: bridge
```

### Backend Dockerfile

```dockerfile
# backend/Dockerfile
FROM node:20-alpine AS base

# Install dependencies
RUN apk add --no-cache \
    curl \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Development stage
FROM base AS development
RUN npm ci --include=dev
COPY . .
CMD ["dumb-init", "npm", "run", "dev"]

# Build stage
FROM development AS build
RUN npm run build
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM base AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy built application
COPY --from=build --chown=nextjs:nodejs /app/dist ./dist
COPY --from=build --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nextjs:nodejs /app/package.json ./package.json

# Create logs directory
RUN mkdir -p /var/log/urlshortener && chown nextjs:nodejs /var/log/urlshortener

USER nextjs

EXPOSE 3000 9090

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

CMD ["dumb-init", "node", "dist/app.js"]
```

### Commands

```bash
# Build and start all services
docker-compose up -d --build

# View service status
docker-compose ps

# View logs
docker-compose logs -f api
docker-compose logs -f postgres

# Scale API service
docker-compose up -d --scale api=3

# Update services
docker-compose pull
docker-compose up -d --build

# Stop all services
docker-compose down

# Stop and remove all data
docker-compose down -v
```

## 🏭 Production Deployment

### AWS ECS Deployment

```yaml
# ecs-task-definition.json
{
  "family": "urlshortener-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/urlshortener-task-role",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "your-account.dkr.ecr.region.amazonaws.com/urlshortener:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:urlshortener/db"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:urlshortener/jwt"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/urlshortener-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:3000/health || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

### Deployment Script

```bash
#!/bin/bash
# deploy.sh

set -e

# Configuration
AWS_REGION="us-east-1"
ECR_REPOSITORY="your-account.dkr.ecr.${AWS_REGION}.amazonaws.com/urlshortener"
ECS_CLUSTER="urlshortener-cluster"
ECS_SERVICE="urlshortener-api"
TASK_DEFINITION_FILE="ecs-task-definition.json"

echo "🚀 Starting deployment process..."

# Build and push Docker image
echo "📦 Building Docker image..."
docker build -t urlshortener:latest ./backend

echo "🏷️  Tagging image..."
docker tag urlshortener:latest "${ECR_REPOSITORY}:latest"
docker tag urlshortener:latest "${ECR_REPOSITORY}:$(git rev-parse --short HEAD)"

echo "📤 Pushing to ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REPOSITORY}
docker push "${ECR_REPOSITORY}:latest"
docker push "${ECR_REPOSITORY}:$(git rev-parse --short HEAD)"

# Update ECS service
echo "🔄 Updating ECS service..."
aws ecs register-task-definition \
    --cli-input-json file://${TASK_DEFINITION_FILE} \
    --region ${AWS_REGION}

TASK_DEFINITION_ARN=$(aws ecs describe-task-definition \
    --task-definition urlshortener-api \
    --region ${AWS_REGION} \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text)

aws ecs update-service \
    --cluster ${ECS_CLUSTER} \
    --service ${ECS_SERVICE} \
    --task-definition ${TASK_DEFINITION_ARN} \
    --region ${AWS_REGION}

echo "⏳ Waiting for deployment to complete..."
aws ecs wait services-stable \
    --cluster ${ECS_CLUSTER} \
    --services ${ECS_SERVICE} \
    --region ${AWS_REGION}

echo "✅ Deployment completed successfully!"

# Health check
echo "🔍 Performing health check..."
sleep 30
curl -f https://api.yourdomain.com/health && echo "✅ Health check passed!" || echo "❌ Health check failed!"
```

## ☸️ Kubernetes Deployment

### Namespace

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: urlshortener
  labels:
    name: urlshortener
```

### ConfigMap

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: urlshortener-config
  namespace: urlshortener
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  LOG_FORMAT: "json"
  RATE_LIMIT_AUTHENTICATED: "1000"
  RATE_LIMIT_ANONYMOUS: "100"
  ENABLE_WEBHOOKS: "true"
  ENABLE_ANALYTICS_EXPORT: "true"
```

### Secret

```yaml
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: urlshortener-secrets
  namespace: urlshortener
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:password@postgres:5432/urlshortener"
  REDIS_URL: "redis://redis:6379"
  JWT_SECRET: "your-super-secure-jwt-secret"
  JWT_REFRESH_SECRET: "your-super-secure-refresh-secret"
```

### Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: urlshortener-api
  namespace: urlshortener
  labels:
    app: urlshortener-api
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: urlshortener-api
  template:
    metadata:
      labels:
        app: urlshortener-api
    spec:
      containers:
      - name: api
        image: your-registry/urlshortener:latest
        ports:
        - containerPort: 3000
          name: http
        - containerPort: 9090
          name: metrics
        envFrom:
        - configMapRef:
            name: urlshortener-config
        - secretRef:
            name: urlshortener-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        volumeMounts:
        - name: logs
          mountPath: /var/log/urlshortener
      volumes:
      - name: logs
        emptyDir: {}
```

### Service

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: urlshortener-api-service
  namespace: urlshortener
  labels:
    app: urlshortener-api
spec:
  selector:
    app: urlshortener-api
  ports:
  - name: http
    port: 80
    targetPort: 3000
  - name: metrics
    port: 9090
    targetPort: 9090
  type: ClusterIP
```

### Ingress

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: urlshortener-ingress
  namespace: urlshortener
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
  - hosts:
    - api.yourdomain.com
    secretName: urlshortener-tls
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: urlshortener-api-service
            port:
              number: 80
```

### Deployment Commands

```bash
# Apply all configurations
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n urlshortener
kubectl get services -n urlshortener
kubectl get ingress -n urlshortener

# View logs
kubectl logs -f deployment/urlshortener-api -n urlshortener

# Scale deployment
kubectl scale deployment urlshortener-api --replicas=5 -n urlshortener

# Rolling update
kubectl set image deployment/urlshortener-api api=your-registry/urlshortener:v2.0.0 -n urlshortener

# Rollback
kubectl rollout undo deployment/urlshortener-api -n urlshortener
```

## 📊 Monitoring and Logging

### Prometheus Configuration

```yaml
# docker/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules/*.yml"

scrape_configs:
  - job_name: 'urlshortener-api'
    static_configs:
      - targets: ['api:9090']
    scrape_interval: 10s
    metrics_path: /metrics

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### Grafana Dashboards

```json
{
  "dashboard": {
    "title": "URL Shortener API Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"4..|5..\"}[5m])",
            "legendFormat": "Errors"
          }
        ]
      }
    ]
  }
}
```

### Log Configuration

```javascript
// backend/src/config/logger.js
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(process.env.NODE_ENV === 'production' && {
    transport: {
      target: 'pino/file',
      options: {
        destination: process.env.LOG_FILE_PATH || '/var/log/urlshortener/app.log',
        mkdir: true,
      },
    },
  }),
});

export default logger;
```

## 🔒 Security Configuration

### SSL/TLS Setup

```nginx
# docker/nginx/sites/default.conf
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/ssl/certs/fullchain.pem;
    ssl_certificate_key /etc/ssl/certs/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    location / {
        proxy_pass http://api:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Security Headers Middleware

```typescript
// backend/src/middleware/security.ts
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

export const securityMiddleware = [
  helmet({
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }),

  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: (req) => {
      if (req.user) {
        return 1000; // Authenticated users
      }
      return 100; // Anonymous users
    },
    message: {
      error: 'RATE_LIMITED',
      message: 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),
];
```

## ⚡ Performance Tuning

### Database Optimization

```sql
-- Performance indices
CREATE INDEX CONCURRENTLY idx_urls_user_id_created_at ON urls(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_urls_short_code ON urls(short_code) WHERE is_active = true;
CREATE INDEX CONCURRENTLY idx_clicks_url_id_created_at ON clicks(url_id, created_at);
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

-- Partition large tables
CREATE TABLE clicks_y2024 PARTITION OF clicks
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Analyze and vacuum
ANALYZE;
VACUUM ANALYZE;
```

### Redis Configuration

```redis
# docker/redis/redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Network
tcp-keepalive 300
timeout 0

# Memory optimization
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
list-max-ziplist-size -2
set-max-intset-entries 512
zset-max-ziplist-entries 128
zset-max-ziplist-value 64
```

### Node.js Optimization

```javascript
// backend/src/config/performance.js
import cluster from 'cluster';
import os from 'os';

if (cluster.isPrimary && process.env.NODE_ENV === 'production') {
  const numWorkers = process.env.WORKERS || os.cpus().length;

  console.log(`Starting ${numWorkers} workers...`);

  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  // Worker process
  import('./app.js');
}
```

## 💾 Backup and Recovery

### Database Backup Script

```bash
#!/bin/bash
# backup.sh

set -e

BACKUP_DIR="/backups"
DB_NAME="urlshortener"
DB_USER="urlshortener"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/urlshortener_backup_${TIMESTAMP}.sql.gz"

# Create backup directory
mkdir -p ${BACKUP_DIR}

# Create database backup
echo "Creating database backup..."
PGPASSWORD=${DB_PASSWORD} pg_dump -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} \
  --verbose --clean --create --if-exists \
  | gzip > ${BACKUP_FILE}

# Upload to S3
if [ ! -z "${AWS_S3_BACKUP_BUCKET}" ]; then
  echo "Uploading backup to S3..."
  aws s3 cp ${BACKUP_FILE} s3://${AWS_S3_BACKUP_BUCKET}/database/
fi

# Cleanup old backups (keep last 30 days)
find ${BACKUP_DIR} -name "urlshortener_backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: ${BACKUP_FILE}"
```

### Restore Procedure

```bash
#!/bin/bash
# restore.sh

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <backup_file>"
  exit 1
fi

BACKUP_FILE=$1

# Stop application
docker-compose stop api

# Drop and recreate database
PGPASSWORD=${DB_PASSWORD} dropdb -h ${DB_HOST} -U ${DB_USER} ${DB_NAME} || true
PGPASSWORD=${DB_PASSWORD} createdb -h ${DB_HOST} -U ${DB_USER} ${DB_NAME}

# Restore from backup
echo "Restoring database from ${BACKUP_FILE}..."
gunzip -c ${BACKUP_FILE} | PGPASSWORD=${DB_PASSWORD} psql -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME}

# Start application
docker-compose start api

echo "Database restored successfully"
```

## 🔧 Troubleshooting

### Common Issues

#### High Memory Usage

```bash
# Check memory usage
docker stats

# Analyze Node.js heap
docker exec -it urlshortener_api_1 node -e "console.log(process.memoryUsage())"

# Enable heap dump on OOM
docker run -e NODE_OPTIONS="--max-old-space-size=1024 --heapsnapshot-signal=SIGUSR2" ...
```

#### Database Connection Issues

```bash
# Check database connectivity
docker exec -it urlshortener_postgres_1 psql -U urlshortener -d urlshortener -c "SELECT version();"

# View database logs
docker logs urlshortener_postgres_1

# Check connection pool
docker exec -it urlshortener_api_1 node -e "console.log(require('./dist/config/database').pool.totalCount)"
```

#### SSL Certificate Issues

```bash
# Test SSL certificate
openssl s_client -connect api.yourdomain.com:443 -servername api.yourdomain.com

# Check certificate expiration
echo | openssl s_client -connect api.yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates

# Renew Let's Encrypt certificate
certbot renew --dry-run
```

### Health Checks

```javascript
// backend/src/routes/health.js
export const healthCheck = async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    disk: await checkDisk(),
    memory: await checkMemory(),
  };

  const isHealthy = Object.values(checks).every(check => check.status === 'ok');
  const statusCode = isHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: isHealthy ? 'ok' : 'error',
    timestamp: new Date().toISOString(),
    checks,
    uptime: process.uptime(),
    version: process.env.npm_package_version,
  });
};
```

### Log Analysis

```bash
# View application logs
docker-compose logs -f api

# Search for errors
docker-compose logs api | grep ERROR

# Real-time error monitoring
tail -f /var/log/urlshortener/app.log | grep '"level":"error"'

# Analyze performance
grep '"duration":' /var/log/urlshortener/app.log | jq '.duration' | sort -n | tail -10
```

### Performance Monitoring

```bash
# Monitor API response times
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:3000/urls"

# Database query analysis
docker exec -it urlshortener_postgres_1 psql -U urlshortener -d urlshortener -c "
  SELECT query, calls, total_time, mean_time
  FROM pg_stat_statements
  ORDER BY total_time DESC LIMIT 10;
"

# Redis monitoring
docker exec -it urlshortener_redis_1 redis-cli INFO stats
```

## 🚀 Deployment Checklist

### Pre-deployment

- [ ] Environment variables configured
- [ ] SSL certificates obtained
- [ ] Database migrations ready
- [ ] Backup procedures tested
- [ ] Monitoring configured
- [ ] Load testing completed
- [ ] Security audit passed

### Deployment

- [ ] Deploy to staging environment
- [ ] Run automated tests
- [ ] Perform manual testing
- [ ] Deploy to production
- [ ] Verify health checks
- [ ] Monitor metrics and logs
- [ ] Validate functionality

### Post-deployment

- [ ] Monitor performance metrics
- [ ] Check error rates
- [ ] Verify backup systems
- [ ] Test rollback procedures
- [ ] Update documentation
- [ ] Notify stakeholders

---

## 📞 Support

For deployment support:

- **Documentation**: [https://docs.urlshortener.com](https://docs.urlshortener.com)
- **Issues**: [GitHub Issues](https://github.com/your-org/urlshortener/issues)
- **Email**: [devops@yourdomain.com](mailto:devops@yourdomain.com)
- **Slack**: #urlshortener-ops

**Happy deploying!** 🎉