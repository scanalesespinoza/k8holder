# K8s Isometric Console - Backend

Backend server for the Kubernetes Isometric Console providing REST API and WebSocket endpoints for cluster visualization and request tracing.

## Features

- ✅ **Cluster Topology Reader**: Fetch pods, services, deployments
- ✅ **Log Parser**: Extract correlation IDs and build request traces
- ✅ **Real-time Updates**: WebSocket support for live data
- ✅ **In-cluster & Local**: Works both inside cluster and locally
- ✅ **Caching**: Reduce API calls with smart caching

## Installation

```bash
cd backend
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key configurations:
- `PORT`: Server port (default: 8080)
- `NAMESPACES`: Comma-separated list of namespaces to monitor (empty = all)
- `CORRELATION_HEADER`: Header name for request correlation (default: x-request-id)
- `CACHE_TTL`: Cache time-to-live in seconds (default: 30)

## Running Locally

Make sure you have `kubectl` or `oc` configured and authenticated:

```bash
# Test connection
oc get pods

# Run backend
npm start

# Or with auto-reload for development
npm run dev
```

## Running in OpenShift

See `../deploy/` directory for Kubernetes manifests.

## API Endpoints

### REST API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/topology` | GET | Get cluster topology (pods, services, deployments) |
| `/api/namespaces` | GET | List namespaces |
| `/api/pods/:namespace/:podName/logs` | GET | Get pod logs (with parsing) |
| `/api/traces` | GET | List all correlation IDs |
| `/api/traces/:id` | GET | Get trace for specific correlation ID |
| `/api/scan-logs` | POST | Scan logs across all pods |

### WebSocket

Connect to `ws://localhost:8080` and send messages:

```json
{
  "type": "get-topology"
}
```

```json
{
  "type": "get-trace",
  "correlationId": "req-12345"
}
```

## Log Format

The backend looks for correlation IDs in various formats:

```
# Bracketed format
2024-05-01T12:00:00.000Z INFO [req-123] Received request

# Key-value format
2024-05-01T12:00:00.000Z INFO correlation-id=req-123 Processing request

# Header format
2024-05-01T12:00:00.000Z INFO X-Request-ID: req-123

# Service call detection
2024-05-01T12:00:00.100Z INFO [req-123] Calling service-b
2024-05-01T12:00:00.150Z INFO [req-123] Request to http://backend-svc
```

## Example Usage

```bash
# Get topology
curl http://localhost:8080/api/topology

# Get namespaces
curl http://localhost:8080/api/namespaces

# Get pod logs
curl http://localhost:8080/api/pods/default/my-pod/logs?tailLines=50

# Scan all logs
curl -X POST http://localhost:8080/api/scan-logs -H "Content-Type: application/json" -d '{"tailLines": 100}'

# Get all traces
curl http://localhost:8080/api/traces

# Get specific trace
curl http://localhost:8080/api/traces/req-12345
```

## RBAC Requirements

When running in-cluster, the ServiceAccount needs these permissions:

```yaml
rules:
- apiGroups: [""]
  resources: ["pods", "pods/log", "services", "namespaces"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch"]
```

See `../deploy/rbac.yaml` for complete setup.

## Development

Run tests:
```bash
npm test
```

Check logs:
```bash
# Backend logs show all API calls and K8s interactions
npm run dev
```

## Troubleshooting

### Connection errors

```
❌ Failed to load Kubernetes config
```

**Solution**: Make sure you're authenticated with `oc login` or have a valid kubeconfig.

### No correlation IDs found

```
GET /api/traces -> {"correlationIds": [], "count": 0}
```

**Solution**: 
1. Run `/api/scan-logs` first to parse logs
2. Check that your application logs include correlation IDs
3. Verify `CORRELATION_HEADER` matches your app's header name

### Permission denied

```
❌ Error fetching pods: Forbidden
```

**Solution**: Check RBAC permissions. ServiceAccount needs read access to pods, services, and deployments.

## Next Steps

- [ ] Add support for Jaeger/Zipkin integration
- [ ] Implement log streaming (tail -f equivalent)
- [ ] Add metrics from Prometheus
- [ ] Support for custom log parsers
- [ ] Export traces to OpenTelemetry format
