# K8HOLDER - Metrics Integration

## Kubernetes Metrics Server Integration

K8HOLDER now integrates with Kubernetes Metrics Server to provide **real resource usage data** instead of simulated metrics.

### Status

✅ **Metrics Server Integration: ACTIVE**

Test the health endpoint to verify:
```bash
curl https://k8holder-k8holder.apps.cluster-kxhkz.dynamic.redhatworkshops.io/health
```

Response includes `"metricsServer": true` when available.

### What Metrics Are Collected

#### Pod Metrics (from metrics.k8s.io/v1beta1)

**Real metrics (when Metrics Server available):**
- **CPU Usage**: Actual CPU consumption in cores (parsed from nanocores)
- **Memory Usage**: Actual memory consumption in MB (parsed from Ki/Mi)

**Fallback (when Metrics Server unavailable):**
- CPU: Simulated as 30-70% of requests
- Memory: Simulated as 50-80% of requests

#### Node Metrics

- **Capacity**: Total CPU cores and memory GB per node
- **Allocatable**: Available resources for pods
- **Requests**: Sum of all pod resource requests
- **Actual Usage**: Real consumption from Metrics Server
- **Waste**: Allocatable - Actual Usage

### Data Format

#### API Response Example

**GET /api/metrics**
```json
{
  "metrics": {
    "cert-manager/cert-manager-7df4dc964c-mmbv8": {
      "cpu": {
        "usage": 0.0012,
        "requests": "10m",
        "limits": "100m"
      },
      "memory": {
        "usage": 122.14,
        "requests": "32Mi",
        "limits": "128Mi"
      },
      "timestamp": "2026-05-02T05:00:00.000Z",
      "realMetrics": true
    }
  }
}
```

**GET /api/resources/summary**
```json
{
  "nodeCount": 6,
  "capacity": {
    "cpu": 96,
    "memory": 282354
  },
  "allocatable": {
    "cpu": 93,
    "memory": 279315
  },
  "efficiency": {
    "cpu": 5.67,
    "memory": 21.05
  },
  "waste": {
    "cpu": 94.33,
    "memory": 78.95
  }
}
```

### Metrics Parsing

#### CPU Formats Supported

From Kubernetes resource requests/limits:
- `100m` → 0.1 cores (millicores)
- `1` → 1.0 cores
- `500n` → 0.0000005 cores (nanocores, rare)

From Metrics Server:
- `145437514n` → 145.4 millicores (nanocores)
- `1200u` → 1.2 millicores (microcores)
- `250m` → 250 millicores

#### Memory Formats Supported

From Kubernetes resource requests/limits:
- `256Mi` → 256 MB
- `1Gi` → 1024 MB
- `512K` → 0.5 MB

From Metrics Server:
- `223152Ki` → 217.9 MB (kibibytes)
- `512Mi` → 512 MB (mebibytes)
- `2Gi` → 2048 MB (gibibytes)

### Resource Analyzer

The `ResourceAnalyzer` class now:

1. **Checks for Metrics Server availability**
2. **Fetches pod and node metrics** every 10 seconds
3. **Calculates actual usage** from real data when available
4. **Falls back to simulation** when metrics unavailable
5. **Computes efficiency** (actual usage / allocatable)
6. **Identifies waste** (allocatable - actual usage)

### Metrics Collector

The `MetricsCollector` class now:

1. **Fetches pod metrics** from Metrics Server
2. **Stores real CPU/Memory usage** per pod
3. **Flags data source** with `realMetrics: true/false`
4. **Maintains network metrics** (simulated, as not in Metrics Server)

### Efficiency vs Utilization

**Utilization** = Requests / Allocatable  
Shows how much has been *requested* by pods.

**Efficiency** = Actual Usage / Allocatable  
Shows how much is *actually being used*.

**Waste** = Allocatable - Actual Usage  
Shows unused capacity.

### Current Cluster Metrics (Live Data)

Based on real data from the OpenShift cluster:

```
Cluster: 6 nodes, ~376 pods
CPU Capacity: 96 cores
CPU Efficiency: 5.67% (5.27 cores in use)
CPU Waste: 94.33% (87.73 cores idle)

Memory Capacity: 282 GB
Memory Efficiency: 21.05% (58.9 GB in use)
Memory Waste: 78.95% (222.4 GB idle)
```

**Interpretation:**
- Cluster is highly underutilized
- Potential for significant cost savings through node consolidation
- Most pods are using far less than their requests
- Recommendation: Right-size pod requests and reduce node count

### Network Metrics

**Status**: ⚠️ Simulated (not available in Metrics Server)

Network I/O metrics (rxBytes, txBytes, rxPackets, txPackets) are currently simulated.

**Future integration options:**
- Prometheus + node-exporter for network metrics
- cAdvisor for container-level network stats
- Istio/Service Mesh for application-level metrics

### Optimizations Generated

Based on real metrics, K8HOLDER generates:

1. **Consolidation suggestions** - Underutilized nodes (<40% usage)
2. **Right-sizing suggestions** - Pods with limits >> usage
3. **Waste reduction** - Nodes with >50% waste

Example:
```
High Priority: Consolidate 6 underutilized nodes
Potential savings: $X/month (calculated)
```

### Testing Metrics Integration

#### Check if Metrics Server is available
```bash
oc get apiservices | grep metrics
```

Expected: `v1beta1.metrics.k8s.io` should be available.

#### Test metrics API directly
```bash
oc exec deployment/k8holder -n k8holder -- node -e "
const k8s = require('@kubernetes/client-node');
const kc = new k8s.KubeConfig();
kc.loadFromCluster();
const api = kc.makeApiClient(k8s.CustomObjectsApi);
api.listNamespacedCustomObject('metrics.k8s.io', 'v1beta1', 'k8holder', 'pods')
  .then(r => console.log(JSON.stringify(r.body.items[0], null, 2)))
  .catch(e => console.error('Error:', e.message));
"
```

#### Verify real metrics are being used
```bash
curl https://k8holder-k8holder.apps.cluster-kxhkz.dynamic.redhatworkshops.io/api/metrics | \
  jq '.metrics | to_entries | .[0:5] | map({pod: .key, real: .value.realMetrics})'
```

Should show a mix of `"real": true` and `"real": false`.

### Troubleshooting

#### Metrics Server not available

**Symptoms:**
- Health endpoint shows `"metricsServer": false`
- All metrics show `"realMetrics": false`
- Logs show "⚠️  Metrics Server not available"

**Solutions:**
1. Install Metrics Server:
   ```bash
   oc apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
   ```

2. For OpenShift, metrics-server is usually pre-installed. Check:
   ```bash
   oc get deployment metrics-server -n openshift-monitoring
   ```

#### Partial metrics coverage

**Symptoms:**
- Some pods have `realMetrics: true`, others `false`

**Explanation:**
This is normal. Metrics Server only tracks running pods with resource usage.
Pods without metrics:
- Recently started (< 15 seconds)
- Completed/Failed/Terminated
- Not consuming measurable resources

#### High waste percentages

**Symptoms:**
- Waste shows 70-90%

**Explanation:**
This indicates pods have large requests but low actual usage. This is the insight K8HOLDER provides - showing where to optimize!

### Future Enhancements

1. **Prometheus Integration** - Historical metrics, custom queries
2. **Service Mesh Integration** - Application-level metrics (RED)
3. **Cost Attribution** - Map usage to actual cloud costs
4. **Predictive Analytics** - ML-based usage forecasting
5. **Auto-scaling Recommendations** - HPA/VPA suggestions

---

**Status:** ✅ Real metrics integration complete (CPU, Memory)  
**Next:** Network metrics from Prometheus/Service Mesh
