# K8HOLDER Deployment Information

## 🚀 Production Deployment

**Deployment Date:** 2026-05-12

### 📍 OpenShift Cluster Details

- **Console URL:** https://console-openshift-console.apps.ocp.txzx4.sandbox3797.opentlc.com
- **API Server:** https://api.ocp.txzx4.sandbox3797.opentlc.com:6443
- **Cluster:** ocp.txzx4.sandbox3797.opentlc.com

### 🌐 Application URLs

- **Main Application:** https://k8holder-k8holder.apps.ocp.txzx4.sandbox3797.opentlc.com
- **Health Endpoint:** https://k8holder-k8holder.apps.ocp.txzx4.sandbox3797.opentlc.com/health
- **API Topology:** https://k8holder-k8holder.apps.ocp.txzx4.sandbox3797.opentlc.com/api/topology
- **Status Page:** https://k8holder-k8holder.apps.ocp.txzx4.sandbox3797.opentlc.com/status.html

### 📊 Deployment Status

```bash
# Check deployment status
oc get deployment k8holder -n k8holder

# Check pods
oc get pods -n k8holder

# View logs
oc logs -f deployment/k8holder -n k8holder

# Check route
oc get route k8holder -n k8holder
```

### 🏗️ Resources Deployed

- **Namespace:** k8holder
- **ServiceAccount:** k8holder (with ClusterRole)
- **BuildConfig:** k8holder (Binary source)
- **ImageStream:** k8holder:latest
- **Deployment:** k8holder (1 replica)
- **Service:** k8holder (port 8080)
- **Route:** k8holder (HTTPS with edge termination)

### 🔐 RBAC Permissions

The k8holder ServiceAccount has ClusterRole permissions to:
- **Read-only access** to:
  - Pods, Services, Nodes, Namespaces
  - Deployments, ReplicaSets
  - Pod logs
  - Metrics (CPU/Memory via Metrics Server)

### 📦 Container Image

- **Base Image:** Red Hat UBI 9 Node.js 18
- **Registry:** image-registry.openshift-image-registry.svc:5000/k8holder/k8holder:latest
- **Build Method:** Binary source (from local directory)

### ⚙️ Environment Configuration

```yaml
PORT: "8080"
NODE_ENV: "production"
CORRELATION_HEADER: "x-request-id"
CACHE_TTL: "30"
NAMESPACES: ""  # Empty = monitor all namespaces
```

### 🔄 Update Deployment

To update the application after code changes:

```bash
# 1. Navigate to project directory
cd /c/Users/sergi/git/k8holder

# 2. Start new build
oc start-build k8holder --from-dir=. --follow -n k8holder

# 3. Verify new pods are running
oc get pods -n k8holder

# 4. Check logs
oc logs -f deployment/k8holder -n k8holder
```

### 🧪 Current Cluster Metrics

At deployment time, K8HOLDER detected:
- **Pods:** 14
- **Services:** 10
- **Deployments:** 8
- **Nodes:** 6 (with Metrics Server enabled)

### 🔧 Troubleshooting

```bash
# Check pod events
oc describe pod -l app=k8holder -n k8holder

# Check deployment events
oc describe deployment k8holder -n k8holder

# View all resources
oc get all -n k8holder

# Check RBAC
oc get clusterrole k8holder
oc get clusterrolebinding k8holder

# Test health endpoint
curl -sk https://k8holder-k8holder.apps.ocp.txzx4.sandbox3797.opentlc.com/health
```

### 📝 Notes

- Application uses **HTTPS** by default (edge termination)
- HTTP requests are automatically redirected to HTTPS
- Metrics Server is **enabled** and providing real-time pod metrics
- Application runs as **non-root user** (UID 1001)
- Security context follows OpenShift best practices

---

**Deployed by:** Claude Code (AI Assistant)  
**GitHub Repository:** https://github.com/scanalesespinoza/k8holder
