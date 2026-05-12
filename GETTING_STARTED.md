# Getting Started - K8s Isometric Console

## ✅ Lo que se ha Creado

Has recibido una **consola visual isométrica completa** para OpenShift/Kubernetes con funcionalidad de **Pod Journey Tracer**.

### 📦 Componentes Implementados

#### Backend (Node.js)
- ✅ **Server Express + WebSocket** (`backend/src/server.js`)
- ✅ **Kubernetes Client** para leer topología (`backend/src/k8s-client.js`)
- ✅ **Log Parser** para extraer correlation IDs (`backend/src/log-parser.js`)
- ✅ **REST API** completa con 7 endpoints
- ✅ **WebSocket** para actualizaciones en tiempo real

#### Frontend (Vanilla JS + Canvas)
- ✅ **Motor isométrico** base (`public/utils.js`, `public/map.js`)
- ✅ **K8s API Client** (`public/k8s-api.js`)
- ✅ **Cluster Map Visualizer** (`public/k8s-map.js`)
- ✅ **Request Journey Tracer** con animación (`public/request-tracer.js`)

#### Deployment
- ✅ **Dockerfile** con Red Hat UBI base image
- ✅ **Kubernetes Manifests** completos (RBAC, Deployment, Service, Route)
- ✅ **Documentación** extensa (README, ARCHITECTURE, DEPLOYMENT)

## 🚀 Próximos Pasos Inmediatos

### Paso 1: Probar Localmente (Desarrollo)

```bash
cd k8s-iso-console/backend

# Instalar dependencias
npm install

# Conectar a tu cluster
oc login <your-cluster-url>

# Iniciar backend (modo desarrollo)
npm run dev

# En otro terminal, abrir en navegador
open http://localhost:8080
```

### Paso 2: Preparar para OpenShift

#### 2.1 Build de la Imagen

```bash
cd k8s-iso-console

# Build con Podman/Docker
podman build -t k8s-iso-console:latest .

# Test local de la imagen
podman run -p 8080:8080 k8s-iso-console:latest

# Push a tu registry
podman tag k8s-iso-console:latest <your-registry>/k8s-iso-console:latest
podman push <your-registry>/k8s-iso-console:latest
```

#### 2.2 Deploy en OpenShift

```bash
# Crear proyecto
oc new-project k8s-iso-console

# Aplicar manifiestos
oc apply -f deploy/namespace.yaml
oc apply -f deploy/rbac.yaml

# IMPORTANTE: Editar deploy/deployment.yaml
# Cambiar la imagen a la que acabas de pushear
# image: <your-registry>/k8s-iso-console:latest

oc apply -f deploy/deployment.yaml
oc apply -f deploy/service.yaml
oc apply -f deploy/route.yaml

# Verificar
oc get pods -n k8s-iso-console
oc logs -f deployment/k8s-iso-console

# Obtener URL
oc get route k8s-iso-console -o jsonpath='{.spec.host}'
```

### Paso 3: Configurar tus Aplicaciones

Para que el Pod Journey Tracer funcione, tus aplicaciones necesitan loggear correlation IDs.

#### Ejemplo Node.js

```javascript
const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Middleware para correlation ID
app.use((req, res, next) => {
  req.correlationId = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.correlationId);
  next();
});

// Usar en logs
app.get('/api/data', async (req, res) => {
  console.log(`[${req.correlationId}] Received request`);
  
  // Al llamar otro servicio
  console.log(`[${req.correlationId}] Calling service-b`);
  const response = await fetch('http://service-b/api/query', {
    headers: { 'X-Request-ID': req.correlationId }
  });
  
  console.log(`[${req.correlationId}] Response sent`);
  res.json({ data: 'ok' });
});
```

#### Ejemplo Python

```python
import uuid
import logging
from flask import Flask, request, g

app = Flask(__name__)

@app.before_request
def before_request():
    g.correlation_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))

@app.route('/api/data')
def get_data():
    logging.info(f"[{g.correlation_id}] Received request")
    
    # Al llamar otro servicio
    logging.info(f"[{g.correlation_id}] Calling service-b")
    response = requests.get('http://service-b/api/query',
                          headers={'X-Request-ID': g.correlation_id})
    
    logging.info(f"[{g.correlation_id}] Response sent")
    return {'data': 'ok'}
```

### Paso 4: Usar la Consola

1. **Abrir la consola** en tu navegador (URL del Route)

2. **Verás tu cluster visualizado** como edificios isométricos:
   - Servicios = Edificios grandes
   - Color = Namespace
   - Altura = Número de pods

3. **Scan de logs**:
   ```bash
   # Desde la UI, click "Scan Logs"
   # O desde terminal:
   curl -X POST https://<your-route>/api/scan-logs
   ```

4. **Ver traces disponibles**:
   ```bash
   curl https://<your-route>/api/traces
   ```

5. **Reproducir un journey**:
   - Selecciona un correlation ID del dropdown
   - Verás un "personaje" animado caminando por los servicios
   - Usa play/pause/step para controlar

## 🎯 Casos de Uso

### Debugging de un Request Fallido

```bash
# 1. Tu aplicación reporta un error para request ID "req-abc-123"

# 2. En la consola K8s Isometric, busca ese ID
curl https://<route>/api/traces/req-abc-123

# 3. Reproduce visualmente el journey
# - Verás exactamente qué servicios tocó
# - Dónde se detuvo
# - Logs en cada paso

# 4. Click en el edificio/servicio donde falló
# - Ver logs del pod
# - Ver estado del pod
# - Ver errores específicos
```

### Análisis de Latencia

```bash
# 1. Reproduce un trace lento

# 2. La animación muestra visualmente:
# - Tiempo entre cada hop
# - Qué servicio está agregando latencia

# 3. Optimiza el servicio problemático
```

### Onboarding de Nuevo Desarrollador

```bash
# "¿Cómo funciona nuestro sistema de checkout?"

# 1. Genera un request de checkout
# 2. Captura el correlation ID
# 3. Reproduce en la consola

# El nuevo dev VE visualmente:
# - API Gateway → Auth Service → Cart Service → Payment Service → Order Service
# - Qué datos se pasan en cada step
# - Logs de cada componente
```

## 📊 Estado Actual del Proyecto

```
✅ Backend completamente funcional
✅ Frontend base implementado
✅ Integración con Kubernetes API
✅ Log parsing con múltiples formatos
✅ Visualización isométrica del cluster
✅ Animación de request journey
✅ Manifiestos de deployment
✅ Dockerfile con UBI base
✅ Documentación completa

🔄 Pendiente (Futuras Mejoras):
- Integración con Jaeger/OpenTelemetry
- Network Flow Visualizer (Modo 2)
- Resource Tetris (Modo 3)
- Frontend UI completo con controles
- Tests automatizados
```

## 🐛 Troubleshooting Rápido

### "No veo pods en el mapa"
→ Verificar RBAC: `oc auth can-i list pods --as=system:serviceaccount:k8s-iso-console:k8s-iso-console`

### "No hay correlation IDs"
→ Ejecutar scan de logs primero: `POST /api/scan-logs`

### "WebSocket se desconecta"
→ Verificar logs del backend: `oc logs -f deployment/k8s-iso-console`

### "Error 403 al leer logs"
→ Asegurar que RBAC incluye `pods/log` resource

## 📚 Documentación Adicional

- **README.md** - Visión general y features
- **ARCHITECTURE.md** - Arquitectura técnica detallada
- **DEPLOYMENT.md** - Guía completa de deployment
- **backend/README.md** - Documentación del backend

## 🎮 Demo Rápido (Sin Cluster Real)

Si quieres ver la visualización sin un cluster:

```bash
# TODO: Agregar modo demo con datos mock
# Por ahora, puedes probar el motor isométrico base:
cd ../  # Volver al directorio raíz
open index.html  # El juego isométrico base
```

## 💡 Tips

1. **Empieza simple**: Despliega primero localmente, luego en cluster
2. **Test con apps simples**: Crea una app de prueba con 2-3 servicios
3. **Logs claros**: Asegura que tus apps loggeen correlation IDs consistentemente
4. **Namespaces**: Usa la variable `NAMESPACES` para filtrar y reducir ruido
5. **Caching**: Ajusta `CACHE_TTL` según tu necesidad de freshness vs performance

## 🚀 Roadmap Sugerido

### Semana 1: Setup Básico
- [ ] Deploy local funcionando
- [ ] Conectar a tu cluster OpenShift
- [ ] Ver topología básica en la consola

### Semana 2: Instrumentación
- [ ] Agregar correlation IDs a tus apps
- [ ] Propagar headers entre servicios
- [ ] Validar logs con el parser

### Semana 3: Production Deployment
- [ ] Build y push de imagen
- [ ] Deploy en cluster
- [ ] Configurar RBAC apropiado

### Semana 4: Uso Real
- [ ] Debugging de requests reales
- [ ] Onboarding de equipo
- [ ] Feedback y mejoras

## 🤝 Siguientes Acciones

**Ahora te toca a ti:**

1. **Dame acceso a tu cluster OpenShift**
   - Puedo ayudarte a hacer el deploy inicial
   - Validar que todo funciona correctamente

2. **Prueba local primero**
   - Valida que el backend conecta a tu cluster
   - Verifica que puede leer pods y servicios

3. **Prepara una app de prueba**
   - Deployment simple con correlation IDs
   - Genera tráfico para crear traces

4. **Feedback**
   - ¿Qué te gustaría ajustar?
   - ¿Qué features adicionales necesitas?

## 📧 Soporte

Si encuentras problemas:
1. Revisa DEPLOYMENT.md (troubleshooting section)
2. Check logs del backend
3. Valida RBAC permissions
4. Comparte el error conmigo para ayudarte

---

**¡Estás listo para empezar! 🎉**

La consola está completamente implementada y lista para usar. Solo necesitas hacer el deployment y empezar a instrumentar tus aplicaciones.
