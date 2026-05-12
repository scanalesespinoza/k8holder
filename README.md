# K8HOLDER 👁️

**The All-Seeing Eye of Your Kubernetes Cluster**

> Un videojuego isométrico que resuelve 3 problemas críticos de Kubernetes que ninguna herramienta tradicional aborda de forma visual e intuitiva.

[![Cloud-Native](https://img.shields.io/badge/Cloud--Native-Kubernetes-blue.svg)](https://kubernetes.io/)
[![GitOps](https://img.shields.io/badge/GitOps-Ready-success.svg)](https://www.gitops.tech/)
[![12-Factor](https://img.shields.io/badge/12--Factor-Compliant-green.svg)](https://12factor.net/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🎯 ¿Qué es K8HOLDER?

K8HOLDER (pronunciado "ka-eight-holder") es una consola visual isométrica para Kubernetes/OpenShift que transforma problemas complejos de debugging, monitoreo y optimización en una experiencia interactiva de videojuego.

**Inspirado en el Beholder de D&D** - el "ojo que todo lo ve" - K8HOLDER te da visibilidad completa de tu cluster a través de 3 modos de visualización únicos.

---

## 🎮 Las 3 Funcionalidades del MVP

### 1️⃣ Pod Journey Tracer - Debugging Visual de Requests

**Problema:** Cuando un request falla en microservicios, es imposible seguir visualmente su camino.

**Solución:**
- Tu cluster es una "ciudad isométrica" con servicios como edificios 3D
- Los requests son "personajes" que caminan entre servicios
- Sigue correlation IDs parseados automáticamente de logs
- Play/pause/step controls como un replay de videojuego
- Click en edificios para ver logs y métricas en tiempo real

```
   🏢        🏢         🏢
 API-GW → Service-A → Service-B
            ↓           ↓
   🚶      🏢         🏢
 Request  Cache      DB
```

**¿Cuándo usarlo?**
- Debuggear requests fallidos
- Entender flujos complejos de microservicios
- Onboarding de nuevos desarrolladores
- Root cause analysis de incidents

---

### 2️⃣ Network Flow Visualizer - Monitoreo de Comunicación

**Problema:** No hay forma visual de ver qué pods hablan con quién, qué conexiones fallan, o dónde están los cuellos de botella.

**Solución:**
- Pods como nodos brillantes en el mapa
- Comunicaciones como "rayos animados" entre pods
- Grosor = volumen de tráfico
- Color = salud (verde=ok, amarillo=lento, rojo=errores)
- Métricas RED (Rate, Errors, Duration) en tiempo real
- Detección automática de anomalías

```
    🏢 ━━━━━━━> 🏢  (verde: 150 req/s, 20ms avg)
  service-a   service-b
     │
     ╰━━━━━━━━━━━━━> 🏢  (rojo: 5xx errors 30%)
                   db
```

**¿Cuándo usarlo?**
- Identificar servicios con alta latencia
- Detectar cascadas de errores
- Validar circuit breakers y retry policies
- Análisis de tráfico post-deploy

---

### 3️⃣ Resource Tetris - Optimización Visual de Costos

**Problema:** Los equipos desperdician dinero porque no ven visualmente cómo están empaquetados sus pods en los nodos.

**Solución:**
- Cada nodo es un "contenedor 3D transparente"
- Pods son "bloques de Tetris" con tamaño = CPU + RAM
- Color = utilización actual (verde=bajo, rojo=saturado)
- Espacios vacíos = desperdicio visible
- Drag & drop para simular reasignación
- IA sugiere optimizaciones: "Consolidar estos 3 pods libera 1 nodo ($150/mes)"

```
╔════════════════════╗ Node-1 (16 CPU, 64GB)
║ ████ ██ ████       ║ 
║ ████ ██ ████ ░░░░ ║ ← 30% waste
║ ████    ████ ░░░░ ║
╚════════════════════╝

Suggestion: Move 3 pods → Save $500/month
```

**¿Cuándo usarlo?**
- Reducir costos de cloud
- Right-sizing de pod requests
- Planear capacity upgrades
- Identificar nodos infrautilizados

---

## ✨ Por qué K8HOLDER es Único

| Herramienta | Enfoque | Limitaciones |
|------------|---------|--------------|
| **Kubernetes Dashboard** | Tablas/listas estáticas | No visualiza flujos ni relaciones |
| **Grafana/Prometheus** | Gráficos 2D tradicionales | Difícil correlacionar métricas con topología |
| **Lens IDE** | Admin general | No especializado en debugging distribuido |
| **K8HOLDER** 👁️ | **Visualización isométrica gamificada** | **Primera herramienta que hace Kubernetes intuitivo** |

**Valor diferenciador:**
- ✅ Visualización espacial 3D isométrica
- ✅ Gamificación de problemas complejos
- ✅ 3 herramientas especializadas en 1
- ✅ Cloud-native y GitOps desde el diseño
- ✅ Zero learning curve (interfaz de videojuego)

---

## 🏗️ Arquitectura Cloud-Native

K8HOLDER sigue los principios de **12-Factor App**, **GitOps**, y **Kubernetes best practices**.

```
┌─────────────────────────────────────────┐
│    Frontend (Isometric Game Engine)     │
│  HTML5 Canvas + Vanilla JavaScript      │
│  - 3 Modos: Journey/Flow/Tetris         │
└──────────────────┬──────────────────────┘
                   │ WebSocket + REST
┌──────────────────┴──────────────────────┐
│          Backend (Node.js)              │
│  Express + WebSocket + Kubernetes API   │
│  - Topology Service                     │
│  - Metrics Collector                    │
│  - Log Parser                           │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────┴──────────────────────┐
│      Kubernetes/OpenShift Cluster       │
│  Pods | Services | Nodes | Metrics      │
└─────────────────────────────────────────┘
```

**Cumple:**
- ✅ Stateless (horizontally scalable)
- ✅ Health checks (liveness, readiness)
- ✅ RBAC least privilege
- ✅ Structured logging (JSON)
- ✅ Prometheus metrics
- ✅ OpenTelemetry tracing
- ✅ Declarative config (GitOps)
- ✅ Immutable deployments

Ver: [CLOUD_NATIVE_PRINCIPLES.md](CLOUD_NATIVE_PRINCIPLES.md)

---

## 🚀 Quick Start

### Opción 1: Deploy en OpenShift/Kubernetes

```bash
# 1. Clonar repo
git clone https://github.com/scanalesespinoza/k8holder.git
cd k8holder

# 2. Build imagen (con Red Hat UBI)
podman build -t k8holder:latest .

# 3. Push a tu registry
podman tag k8holder:latest quay.io/scanalesespinoza/k8holder:latest
podman push quay.io/scanalesespinoza/k8holder:latest

# 4. Deploy con Kustomize
oc new-project k8holder
oc apply -k deploy/overlays/production

# 5. Obtener URL
oc get route k8holder -o jsonpath='{.spec.host}'
```

### Opción 2: Desarrollo Local

```bash
# 1. Instalar dependencias
cd backend && npm install

# 2. Conectar a tu cluster
oc login https://your-cluster-url

# 3. Iniciar backend
npm run dev

# 4. Abrir navegador
open http://localhost:8080
```

### Opción 3: GitOps con ArgoCD/Flux

```yaml
# argocd-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: k8holder
spec:
  source:
    repoURL: https://github.com/scanalesespinoza/k8holder.git
    path: deploy/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: k8holder
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

Ver: [DEPLOYMENT.md](DEPLOYMENT.md) para guía completa

---

## 📖 Cómo Usar

### Modo 1: Pod Journey Tracer

1. **Abrir K8HOLDER** en tu navegador
2. **Seleccionar modo** "Journey Tracer" (botón 1)
3. **Scan logs** para encontrar correlation IDs
4. **Seleccionar un trace** del dropdown
5. **Play** y ver el "personaje" caminar por tu arquitectura
6. **Click en edificios** para ver logs/métricas

**Tip:** Tus apps deben loggear correlation IDs:
```javascript
console.log(`[${correlationId}] Processing request`);
```

### Modo 2: Network Flow Visualizer

1. **Cambiar a modo** "Network Flow" (botón 2)
2. **Ver flujos en tiempo real** entre pods
3. **Hover sobre rayos** para ver métricas RED
4. **Click en conexión** para ver detalles
5. **Filtrar por namespace** o error rate

### Modo 3: Resource Tetris

1. **Cambiar a modo** "Resource Tetris" (botón 3)
2. **Ver nodos** como contenedores 3D
3. **Pods como bloques** dentro de nodos
4. **Click en nodo** para ver utilización
5. **Ver sugerencias** de optimización
6. **Drag & drop** pods para simular (opcional)

---

## ⌨️ Controles

### Generales (Todos los Modos)
- **1/2/3:** Cambiar entre modos
- **Space:** Pause/Play animaciones
- **G:** Toggle grid
- **ESC:** Deselect/Back
- **+/-:** Zoom in/out
- **H:** Help overlay

### Modo Journey Tracer
- **←/→:** Previous/Next step
- **R:** Restart trace
- **T:** Toggle timeline

### Modo Network Flow
- **F:** Toggle filtros
- **M:** Metrics panel
- **A:** Show all connections

### Modo Resource Tetris
- **S:** Show suggestions
- **C:** Cost calculator
- **D:** Toggle drag mode

---

## 🔧 Configuración

### Variables de Entorno

```bash
# Backend (.env)
PORT=8080
NODE_ENV=production
NAMESPACES=default,production,staging
CORRELATION_HEADER=x-request-id
CACHE_TTL=30
PROMETHEUS_URL=http://prometheus:9090
JAEGER_URL=http://jaeger:16686
```

### Kustomize Overlays

```bash
deploy/
├── base/              # Base manifests
└── overlays/
    ├── dev/           # Development
    ├── staging/       # Staging
    └── production/    # Production
```

Editar: `deploy/overlays/production/kustomization.yaml`

---

## 📂 Estructura del Proyecto

```
k8holder/
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── server.js        # Express + WebSocket
│   │   ├── k8s-client.js    # Kubernetes API
│   │   ├── log-parser.js    # Correlation ID parser
│   │   └── metrics.js       # Prometheus metrics
│   └── package.json
├── public/                  # Frontend
│   ├── modes/
│   │   ├── journey-tracer.js
│   │   ├── network-flow.js
│   │   └── resource-tetris.js
│   ├── k8s-api.js
│   ├── game-engine.js
│   └── index.html
├── deploy/                  # Kubernetes manifests
│   ├── base/
│   └── overlays/
├── docs/
│   ├── MVP_PLAN.md
│   ├── CLOUD_NATIVE_PRINCIPLES.md
│   └── ARCHITECTURE.md
└── README.md
```

---

## 🛠️ Desarrollo

### Prerrequisitos
- Node.js 18+
- `oc` o `kubectl` CLI
- Acceso a cluster Kubernetes/OpenShift
- (Opcional) Prometheus, Jaeger

### Setup Local
```bash
# Backend
cd backend
npm install
npm run dev

# Test
npm test

# Lint
npm run lint
```

### Contribuir

1. Fork el repo
2. Crear feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

Ver: [CONTRIBUTING.md](CONTRIBUTING.md)

---

## 📊 Roadmap

### MVP (Q2 2026) - **En Progreso**
- [x] Journey Tracer base
- [x] Backend K8s integration
- [x] Log parser con correlation IDs
- [ ] Network Flow Visualizer
- [ ] Resource Tetris
- [ ] Mode selector UI
- [ ] Documentación completa

### v1.0 (Q3 2026)
- [ ] Jaeger/OpenTelemetry integration
- [ ] Service Mesh support (Istio/Linkerd)
- [ ] Export reports (PDF/JSON)
- [ ] Multi-cluster view
- [ ] AI-powered optimization suggestions

### v2.0 (Q4 2026)
- [ ] Chaos City mode
- [ ] Event Storm Map (time-travel debugging)
- [ ] Multiplayer collaboration
- [ ] Mobile app (view-only)
- [ ] Grafana plugin

---

## 🤝 Comunidad

- **Discussions:** [GitHub Discussions](https://github.com/scanalesespinoza/k8holder/discussions)
- **Issues:** [GitHub Issues](https://github.com/scanalesespinoza/k8holder/issues)
- **Slack:** [#k8holder](https://kubernetes.slack.com/archives/k8holder)
- **Twitter:** [@k8holder](https://twitter.com/k8holder)

---

## 📄 Licencia

MIT License - Ver [LICENSE](LICENSE) para detalles

---

## 🎯 Casos de Uso

### 1. Debugging de Incident en Producción

**Escenario:** Service-A reporta errores 5xx

```
1. Abrir K8HOLDER → Journey Tracer
2. Filtrar logs por Service-A
3. Seleccionar correlation ID con error
4. Ver trace: API-GW → Service-A → Service-B → DB
5. Identificar: Service-B timeout al DB
6. Click en Service-B → Ver logs: "connection pool exhausted"
7. Root cause: DB connection leak
```

**Resultado:** MTTR reducido de 2 horas a 15 minutos

---

### 2. Optimización de Costos Cloud

**Escenario:** Factura de AWS incrementó 40%

```
1. Abrir K8HOLDER → Resource Tetris
2. Ver 15 nodos con <40% utilización
3. AI suggestions: "Consolidar 5 nodos libera $750/mes"
4. Drag & drop simulation de 20 pods
5. Exportar nuevos YAML con right-sized requests
6. Deploy via GitOps
```

**Resultado:** $9,000/año ahorrados

---

### 3. Validación Post-Deploy

**Escenario:** Deploy de nueva versión de microservicio

```
1. Abrir K8HOLDER → Network Flow
2. Comparar before/after traffic patterns
3. Detectar: Latencia a DB incrementó 2x
4. Rollback inmediato
5. Investigar con Journey Tracer
6. Encontrar: N+1 query problem
```

**Resultado:** Bug detectado antes que afecte usuarios

---

## 💡 Tips & Tricks

### Instrumentar tus Apps

**Node.js:**
```javascript
const { v4: uuidv4 } = require('uuid');

app.use((req, res, next) => {
  req.correlationId = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.correlationId);
  console.log(`[${req.correlationId}] ${req.method} ${req.path}`);
  next();
});
```

**Python:**
```python
import uuid
import logging

correlation_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
logging.info(f"[{correlation_id}] Processing request")
```

### Optimizar Performance

```yaml
# HPA para escalar automáticamente
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: k8holder
spec:
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

---

## 🙏 Agradecimientos

- Inspirado por el Beholder de D&D
- Comunidad de Kubernetes
- Skills de arquitectura: `microservices-architect`, `kubernetes`, `software-architecture`
- Red Hat OpenShift team

---

**Hecho con ❤️ y ☕ por la comunidad cloud-native**

**K8HOLDER - The All-Seeing Eye of Your Cluster** 👁️
