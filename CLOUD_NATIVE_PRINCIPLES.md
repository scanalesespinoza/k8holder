# K8HOLDER - Cloud-Native & GitOps Principles

**Un videojuego, pero cloud-native en su ADN** ☁️

## 🎯 Philosophy

K8HOLDER es ante todo una **aplicación cloud-native** que se despliega en Kubernetes. El hecho de que use una interfaz de videojuego isométrico es simplemente una capa de visualización innovadora, pero por debajo sigue todas las mejores prácticas de aplicaciones empresariales en Kubernetes.

---

## 📜 The 12-Factor App Compliance

### I. Codebase
✅ **Single codebase tracked in Git, many deployments**
- Repo único en GitHub/GitLab
- Branches: `main`, `develop`, `feature/*`, `release/*`
- Tags semánticos: `v1.0.0`, `v1.1.0`
- Multi-environment: dev, staging, production

### II. Dependencies
✅ **Explicitly declare and isolate dependencies**
- `package.json` con versiones exactas
- `package-lock.json` committed
- Container images con dependencias bundled
- No dependencias implícitas del host

### III. Config
✅ **Store config in environment**
```yaml
# ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: k8holder-config
data:
  CLUSTER_MODE: "production"
  CACHE_TTL: "30"
  LOG_LEVEL: "info"
  
# Secrets (nunca en Git!)
apiVersion: v1
kind: Secret
metadata:
  name: k8holder-secrets
type: Opaque
data:
  PROMETHEUS_TOKEN: <base64>
  JAEGER_API_KEY: <base64>
```

### IV. Backing Services
✅ **Treat backing services as attached resources**
- Prometheus: Service discovery via K8s DNS
- Jaeger: URL en ConfigMap, fácil cambiar
- Database (futuro): External name service
```yaml
# No hardcoded IPs!
PROMETHEUS_URL: http://prometheus-k8s.monitoring.svc.cluster.local:9090
JAEGER_URL: http://jaeger-query.tracing.svc:16686
```

### V. Build, Release, Run
✅ **Strictly separate build and run stages**

**Build Stage:**
```bash
# CI Pipeline (GitHub Actions / Tekton)
npm ci
npm run build
podman build -t k8holder:${GIT_SHA} .
podman push quay.io/myorg/k8holder:${GIT_SHA}
```

**Release Stage:**
```bash
# Kustomize overlay
kustomize edit set image k8holder=quay.io/myorg/k8holder:${GIT_SHA}
git commit -m "Release v1.2.3"
git tag v1.2.3
```

**Run Stage:**
```bash
# ArgoCD/Flux auto-sync
# O manual:
kubectl apply -k overlays/production
```

### VI. Processes
✅ **Execute the app as stateless processes**
- Backend es completamente stateless
- Session data en Redis (futuro) o K8s secrets
- No filesystem persistence (excepto logs → stdout)
- Múltiples replicas sin sticky sessions

### VII. Port Binding
✅ **Export services via port binding**
```javascript
// server.js
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`K8HOLDER listening on :${PORT}`);
});
```

```yaml
# Service
spec:
  ports:
  - name: http
    port: 80
    targetPort: 8080
```

### VIII. Concurrency
✅ **Scale out via the process model**
```yaml
# HorizontalPodAutoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: k8holder-backend
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: k8holder-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### IX. Disposability
✅ **Maximize robustness with fast startup and graceful shutdown**
```javascript
// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    // Close DB connections, WebSocket connections
    process.exit(0);
  });
});
```

```yaml
# Deployment
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 30
      containers:
      - name: backend
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 5"]
```

### X. Dev/Prod Parity
✅ **Keep development, staging, and production as similar as possible**
- Mismo Dockerfile para todos los ambientes
- Kustomize overlays para diferencias mínimas
- Minikube/Kind para desarrollo local
- Same backing services (Prometheus, Jaeger)

### XI. Logs
✅ **Treat logs as event streams**
```javascript
// NO escribir a archivos
// NO usar winston con file transport
// SÍ usar stdout/stderr
console.log(JSON.stringify({
  level: 'info',
  timestamp: new Date().toISOString(),
  message: 'Request processed',
  correlationId: 'req-123',
  duration: 45
}));
```

```yaml
# Fluentd/Fluent Bit colecta de stdout
# Envía a Elasticsearch/Loki
# K8HOLDER solo hace: console.log()
```

### XII. Admin Processes
✅ **Run admin/management tasks as one-off processes**
```yaml
# Job para migraciones
apiVersion: batch/v1
kind: Job
metadata:
  name: k8holder-db-migrate
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: quay.io/myorg/k8holder:v1.2.3
        command: ["npm", "run", "migrate"]
      restartPolicy: OnFailure
```

---

## 🔄 GitOps Principles

### Everything as Code

**Application Code:**
```
k8holder/
├── backend/src/          # Node.js backend
├── public/               # Frontend
└── Dockerfile            # Container definition
```

**Infrastructure Code:**
```
k8holder/
├── deploy/
│   ├── base/             # Kustomize base
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── rbac.yaml
│   │   └── kustomization.yaml
│   └── overlays/
│       ├── dev/
│       │   └── kustomization.yaml
│       ├── staging/
│       │   └── kustomization.yaml
│       └── production/
│           ├── kustomization.yaml
│           └── hpa.yaml
```

**Configuration Code:**
```yaml
# ConfigMap versionado en Git
apiVersion: v1
kind: ConfigMap
metadata:
  name: k8holder-config-v3  # Versionado!
data:
  config.json: |
    {
      "modes": {
        "journey-tracer": { "enabled": true },
        "network-flow": { "enabled": true },
        "resource-tetris": { "enabled": true }
      }
    }
```

### Declarative Configuration

```yaml
# ❌ MAL: Imperative
kubectl create deployment k8holder --image=k8holder:latest
kubectl scale deployment k8holder --replicas=3
kubectl expose deployment k8holder --port=80

# ✅ BIEN: Declarative
# deploy/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: k8holder-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: k8holder
  template:
    metadata:
      labels:
        app: k8holder
        version: v1.2.3
    spec:
      containers:
      - name: backend
        image: quay.io/myorg/k8holder:v1.2.3
        ports:
        - containerPort: 8080
```

### Versioned & Immutable

```bash
# Immutable tags (NO usar :latest!)
# ❌ MAL
image: k8holder:latest

# ✅ BIEN
image: quay.io/myorg/k8holder:v1.2.3
image: quay.io/myorg/k8holder:sha-a3f2b9c  # Git SHA

# Rollback = Revert Git commit
git revert HEAD
# ArgoCD/Flux auto-deploys previous version
```

### Automated Sync with ArgoCD/Flux

**ArgoCD Application:**
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: k8holder
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/k8holder.git
    targetRevision: main
    path: deploy/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: k8holder
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
```

**FluxCD GitRepository:**
```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: k8holder
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/myorg/k8holder
  ref:
    branch: main
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: k8holder
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: k8holder
  path: ./deploy/overlays/production
  prune: true
  healthChecks:
  - apiVersion: apps/v1
    kind: Deployment
    name: k8holder-backend
    namespace: k8holder
```

---

## ☸️ Kubernetes Best Practices

### Resource Requests & Limits

```yaml
# Siempre definir requests y limits
resources:
  requests:
    cpu: 100m        # Mínimo garantizado
    memory: 256Mi
  limits:
    cpu: 500m        # Máximo permitido
    memory: 512Mi
```

### Health Checks

```yaml
# Liveness: ¿Está vivo? Si falla → restart
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 30
  timeoutSeconds: 5
  failureThreshold: 3

# Readiness: ¿Listo para tráfico? Si falla → remove from service
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 10
  timeoutSeconds: 3
  failureThreshold: 2

# Startup: Para apps lentas en iniciar
startupProbe:
  httpGet:
    path: /health
    port: 8080
  failureThreshold: 30
  periodSeconds: 10
```

### Security Context

```yaml
# Non-root user
securityContext:
  runAsNonRoot: true
  runAsUser: 1001
  runAsGroup: 1001
  fsGroup: 1001
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true  # Filesystem read-only
  capabilities:
    drop:
    - ALL
  seccompProfile:
    type: RuntimeDefault

# Temporary directories
volumeMounts:
- name: tmp
  mountPath: /tmp
volumes:
- name: tmp
  emptyDir: {}
```

### RBAC Least Privilege

```yaml
# ServiceAccount específico
apiVersion: v1
kind: ServiceAccount
metadata:
  name: k8holder
  namespace: k8holder
---
# Role con permisos mínimos
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: k8holder-viewer
rules:
# SOLO lectura, NO escritura
- apiGroups: [""]
  resources: ["pods", "pods/log", "services", "namespaces", "nodes"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["metrics.k8s.io"]
  resources: ["pods", "nodes"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: k8holder-viewer
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: k8holder-viewer
subjects:
- kind: ServiceAccount
  name: k8holder
  namespace: k8holder
```

### Pod Disruption Budget

```yaml
# Garantizar disponibilidad durante rolling updates
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: k8holder-backend
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: k8holder
```

### Network Policies

```yaml
# Restricción de tráfico de red
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: k8holder-backend
spec:
  podSelector:
    matchLabels:
      app: k8holder
  policyTypes:
  - Ingress
  - Egress
  ingress:
  # Solo recibir de Ingress Controller
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8080
  egress:
  # Solo salir a K8s API y Prometheus
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: TCP
      port: 443  # K8s API
  - to:
    - namespaceSelector:
        matchLabels:
          name: monitoring
    ports:
    - protocol: TCP
      port: 9090  # Prometheus
```

---

## 🔐 Security Best Practices

### Image Scanning

```yaml
# Tekton/Jenkins pipeline
- name: scan-image
  image: aquasec/trivy
  command:
  - trivy
  args:
  - image
  - --severity HIGH,CRITICAL
  - --exit-code 1
  - quay.io/myorg/k8holder:${GIT_SHA}
```

### Secret Management

```yaml
# ❌ NUNCA hardcodear secrets
# ❌ NUNCA commitear secrets en Git

# ✅ Usar Sealed Secrets
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: k8holder-secrets
spec:
  encryptedData:
    prometheus-token: AgB8... # Encrypted!

# ✅ O External Secrets Operator
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: k8holder-secrets
spec:
  secretStoreRef:
    name: vault
    kind: ClusterSecretStore
  target:
    name: k8holder-secrets
  data:
  - secretKey: prometheus-token
    remoteRef:
      key: k8holder/prometheus-token
```

### Red Hat UBI Base Image

```dockerfile
# Usar imagen oficial, verificada, y con CVE patches
FROM registry.access.redhat.com/ubi9/nodejs-18:latest

# Security scanning
LABEL maintainer="k8holder@example.com"
LABEL description="K8HOLDER - The Kubernetes Beholder"
LABEL version="1.0.0"
```

---

## 📊 Observability (O11y)

### Structured Logging

```javascript
// Log JSON estructurado
const logger = {
  info: (msg, meta = {}) => {
    console.log(JSON.stringify({
      level: 'info',
      timestamp: new Date().toISOString(),
      message: msg,
      ...meta
    }));
  },
  error: (msg, error, meta = {}) => {
    console.error(JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      message: msg,
      error: error.message,
      stack: error.stack,
      ...meta
    }));
  }
};

// Uso
logger.info('Request processed', {
  correlationId: req.correlationId,
  method: req.method,
  path: req.path,
  duration: 45,
  statusCode: 200
});
```

### Prometheus Metrics

```javascript
// Backend expone métricas en /metrics
const promClient = require('prom-client');
const register = new promClient.Registry();

// Métricas custom
const httpRequestDuration = new promClient.Histogram({
  name: 'k8holder_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new promClient.Gauge({
  name: 'k8holder_active_websocket_connections',
  help: 'Number of active WebSocket connections'
});

register.registerMetric(httpRequestDuration);
register.registerMetric(activeConnections);

// Endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

```yaml
# ServiceMonitor para Prometheus Operator
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: k8holder
spec:
  selector:
    matchLabels:
      app: k8holder
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
```

### Distributed Tracing

```javascript
// OpenTelemetry integration
const { trace } = require('@opentelemetry/api');
const tracer = trace.getTracer('k8holder-backend');

app.get('/api/topology', async (req, res) => {
  const span = tracer.startSpan('get-topology');
  
  try {
    const topology = await k8sClient.getTopology();
    span.setStatus({ code: SpanStatusCode.OK });
    res.json(topology);
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw error;
  } finally {
    span.end();
  }
});
```

---

## 🚀 CI/CD Pipeline

### Tekton Pipeline

```yaml
apiVersion: tekton.dev/v1
kind: Pipeline
metadata:
  name: k8holder-pipeline
spec:
  params:
  - name: git-url
  - name: git-revision
  
  tasks:
  - name: clone
    taskRef:
      name: git-clone
    params:
    - name: url
      value: $(params.git-url)
    - name: revision
      value: $(params.git-revision)
  
  - name: test
    runAfter: [clone]
    taskRef:
      name: npm-test
  
  - name: build-image
    runAfter: [test]
    taskRef:
      name: buildah
    params:
    - name: IMAGE
      value: quay.io/myorg/k8holder:$(params.git-revision)
  
  - name: scan-image
    runAfter: [build-image]
    taskRef:
      name: trivy-scan
  
  - name: push-image
    runAfter: [scan-image]
    taskRef:
      name: buildah-push
  
  - name: update-gitops
    runAfter: [push-image]
    taskRef:
      name: git-cli
    params:
    - name: GIT_SCRIPT
      value: |
        cd deploy/overlays/production
        kustomize edit set image k8holder=quay.io/myorg/k8holder:$(params.git-revision)
        git commit -am "Deploy $(params.git-revision)"
        git push
```

---

## 🎯 Summary

K8HOLDER = **Videojuego + Cloud-Native First**

- ✅ 12-Factor App compliant
- ✅ GitOps declarativo y versionado
- ✅ Kubernetes best practices (RBAC, security, health checks)
- ✅ Observability (logs, metrics, traces)
- ✅ CI/CD automatizado
- ✅ Immutable infrastructure
- ✅ Stateless y horizontally scalable

**El hecho de que sea un videojuego no compromete su arquitectura enterprise-grade.**
