# Deployment Guide - K8s Isometric Console

## Pre-requisitos

- Acceso a un cluster OpenShift (o Kubernetes con ajustes menores)
- `oc` CLI instalado y configurado
- Permisos para crear namespaces y ClusterRoles

## Opción 1: Deployment Completo en OpenShift

### Paso 1: Build de la Imagen

```bash
# Navegar al directorio
cd k8s-iso-console

# Build con Docker/Podman
podman build -t k8s-iso-console:latest .

# Tag para tu registry (ajustar según tu entorno)
podman tag k8s-iso-console:latest <your-registry>/k8s-iso-console:latest

# Push
podman push <your-registry>/k8s-iso-console:latest
```

#### Opción: Build con OpenShift BuildConfig

```bash
# Crear BuildConfig
oc new-build --name=k8s-iso-console \
  --strategy=docker \
  --binary=true \
  -n k8s-iso-console

# Start build
oc start-build k8s-iso-console \
  --from-dir=. \
  --follow \
  -n k8s-iso-console
```

### Paso 2: Aplicar Manifiestos

```bash
# Crear namespace
oc apply -f deploy/namespace.yaml

# RBAC (ServiceAccount, ClusterRole, ClusterRoleBinding)
oc apply -f deploy/rbac.yaml

# Deployment
# IMPORTANTE: Actualizar la imagen en deployment.yaml primero
# Cambiar: image: registry.access.redhat.com/ubi9/nodejs-18:latest
# Por: image: <your-registry>/k8s-iso-console:latest

oc apply -f deploy/deployment.yaml

# Service
oc apply -f deploy/service.yaml

# Route (OpenShift only)
oc apply -f deploy/route.yaml
```

### Paso 3: Verificar Deployment

```bash
# Check pods
oc get pods -n k8s-iso-console

# Check logs
oc logs -f deployment/k8s-iso-console -n k8s-iso-console

# Get route URL
oc get route k8s-iso-console -n k8s-iso-console -o jsonpath='{.spec.host}'
```

### Paso 4: Acceder a la Consola

```bash
# Obtener URL
export CONSOLE_URL=$(oc get route k8s-iso-console -n k8s-iso-console -o jsonpath='{.spec.host}')

# Abrir en navegador
echo "Open: https://$CONSOLE_URL"
```

## Opción 2: Desarrollo Local

### Paso 1: Setup

```bash
cd k8s-iso-console/backend

# Instalar dependencias
npm install

# Copiar .env
cp .env.example .env
```

### Paso 2: Configurar Cluster Access

```bash
# Login a OpenShift
oc login <your-cluster-url>

# Verificar acceso
oc get pods --all-namespaces
```

### Paso 3: Ejecutar Backend

```bash
# Development mode (auto-reload)
npm run dev

# O production mode
npm start
```

### Paso 4: Acceder

Abre tu navegador en: http://localhost:8080

## Configuración

### Variables de Entorno

Edita `.env` o el ConfigMap en deployment.yaml:

```bash
# Puerto
PORT=8080

# Namespaces a monitorear (vacío = todos)
# Ejemplo: NAMESPACES=default,my-app,production
NAMESPACES=

# Header de correlation
CORRELATION_HEADER=x-request-id

# Cache TTL en segundos
CACHE_TTL=30
```

### RBAC Mínimo

Si no quieres usar ClusterRole, puedes usar Role por namespace:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: k8s-iso-console
  namespace: my-namespace
rules:
- apiGroups: [""]
  resources: ["pods", "pods/log", "services"]
  verbs: ["get", "list"]
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list"]
```

## Testing

### Test 1: Health Check

```bash
curl http://localhost:8080/health
# Expected: {"status":"ok","timestamp":"..."}
```

### Test 2: Get Topology

```bash
curl http://localhost:8080/api/topology | jq
```

### Test 3: Scan Logs

```bash
curl -X POST http://localhost:8080/api/scan-logs \
  -H "Content-Type: application/json" \
  -d '{"tailLines": 50}'
```

### Test 4: Get Traces

```bash
curl http://localhost:8080/api/traces
```

## Preparar tus Aplicaciones

Para que el tracing funcione, tus aplicaciones necesitan loggear correlation IDs:

### 1. Generar Correlation ID

```javascript
// Node.js/Express middleware
app.use((req, res, next) => {
  req.correlationId = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.correlationId);
  next();
});
```

### 2. Incluir en Logs

```javascript
// Log format: [correlation-id] message
console.log(`[${req.correlationId}] Processing request to ${req.path}`);

// Al llamar otros servicios
console.log(`[${req.correlationId}] Calling service-b at http://service-b:8080`);
```

### 3. Propagar el Header

```javascript
// Cuando hagas requests a otros servicios
const response = await fetch('http://service-b:8080/api/data', {
  headers: {
    'X-Request-ID': req.correlationId
  }
});
```

## Ejemplo Completo: App de Prueba

Aquí un ejemplo de aplicación simple para probar:

```javascript
// app.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();

app.use((req, res, next) => {
  req.correlationId = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.correlationId);
  next();
});

app.get('/api/hello', async (req, res) => {
  console.log(`[${req.correlationId}] Received request to /api/hello`);
  
  // Simular llamada a otro servicio
  console.log(`[${req.correlationId}] Calling database service`);
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.log(`[${req.correlationId}] Response sent`);
  res.json({ message: 'Hello!', correlationId: req.correlationId });
});

app.listen(8080, () => {
  console.log('Server running on port 8080');
});
```

Despliega esta app en tu cluster y genera tráfico:

```bash
# Deploy
oc new-app nodejs~https://github.com/your-repo/test-app

# Generate traffic
for i in {1..10}; do
  curl http://test-app:8080/api/hello
done

# Ahora en la consola K8s Isometric Console, haz scan y verás los traces
```

## Troubleshooting

### Problema: No hay pods en la visualización

**Síntoma:**
```
GET /api/topology -> {"pods":[],"services":[],...}
```

**Solución:**
1. Verificar RBAC: `oc auth can-i list pods --as=system:serviceaccount:k8s-iso-console:k8s-iso-console`
2. Check logs del backend: `oc logs -f deployment/k8s-iso-console`
3. Verificar que el namespace configurado exista

### Problema: No se encuentran correlation IDs

**Síntoma:**
```
GET /api/traces -> {"correlationIds":[],"count":0}
```

**Solución:**
1. Ejecutar scan primero: `POST /api/scan-logs`
2. Verificar que tus apps loggeen correlation IDs
3. Ajustar `CORRELATION_HEADER` si usas otro nombre

### Problema: WebSocket se desconecta

**Síntoma:**
Console del navegador muestra: `WebSocket connection failed`

**Solución:**
1. En OpenShift, asegurar que la Route no tenga timeout agresivo
2. Verificar que no haya proxy/firewall bloqueando WS
3. Check backend logs para ver errores de WS

### Problema: Error 403 Forbidden al leer logs

**Síntoma:**
```
Error fetching logs: pods "my-pod" is forbidden
```

**Solución:**
El ServiceAccount necesita permiso `pods/log`:
```yaml
- apiGroups: [""]
  resources: ["pods/log"]  # ← Asegurar que esté presente
  verbs: ["get"]
```

## Next Steps

Una vez funcionando:

1. **Generar tráfico** en tus aplicaciones para crear traces
2. **Ejecutar scan de logs** desde la UI
3. **Seleccionar un trace** y ver la animación
4. **Experimentar** con diferentes correlation IDs
5. **Customizar** colores, formatos de log, etc.

## Monitoreo

```bash
# Ver recursos del deployment
oc get all -n k8s-iso-console

# Logs en tiempo real
oc logs -f deployment/k8s-iso-console

# Metrics (si tienes Prometheus)
oc get --raw /apis/metrics.k8s.io/v1beta1/namespaces/k8s-iso-console/pods
```

## Actualización

```bash
# Rebuild imagen
podman build -t k8s-iso-console:v2 .
podman push <registry>/k8s-iso-console:v2

# Update deployment
oc set image deployment/k8s-iso-console \
  backend=<registry>/k8s-iso-console:v2 \
  -n k8s-iso-console

# Rollout status
oc rollout status deployment/k8s-iso-console -n k8s-iso-console
```

## Cleanup

```bash
# Eliminar todo
oc delete namespace k8s-iso-console

# O solo el deployment
oc delete -f deploy/
```
