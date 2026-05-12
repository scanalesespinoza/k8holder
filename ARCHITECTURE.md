# K8s Isometric Console - Architecture

## Vision
Una consola visual isométrica para OpenShift/Kubernetes que resuelve 3 necesidades críticas mediante gamificación.

## Componentes Técnicos

### Frontend (Isometric Engine)
- **Base**: Código isométrico existente (utils.js, map.js)
- **Renderer**: Canvas 2D con soporte para múltiples capas
- **Interacción**: Click, drag, hover sobre recursos K8s
- **Animaciones**: Flujos de red, movimiento de requests, cambios de estado

### Backend / Data Layer
```
┌─────────────────────────────────────────────┐
│          OpenShift / Kubernetes             │
│  (oc cli / kubectl / API Server)            │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│         Data Aggregation Layer              │
│  - Pods, Services, Deployments              │
│  - Metrics (CPU, RAM, Network)              │
│  - Logs & Events                            │
│  - Service Mesh (Istio/OpenShift Mesh)      │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│           WebSocket Server                  │
│  (Real-time updates to frontend)            │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│        Isometric Visualization              │
└─────────────────────────────────────────────┘
```

### Fuentes de Datos

#### Para Pod Journey Tracer:
- **Istio Service Mesh**: Distributed tracing (Jaeger)
- **OpenShift Logs**: oc logs con correlation IDs
- **Kiali API**: Service graph & traffic flow
- **OpenTelemetry**: Request traces

#### Para Network Flow Visualizer:
- **Service Mesh Telemetry**: Request rates, latency, errors
- **NetworkPolicies**: Allowed/denied connections
- **Prometheus Metrics**: Red/golden signals
- **eBPF (optional)**: Deep packet inspection

#### Para Resource Tetris:
- **Metrics Server**: CPU/RAM usage actual
- **Node allocatable**: Capacity disponible
- **Pod requests/limits**: Resource requirements
- **Scheduler API**: Placement decisions

## Modos de Operación

### Modo 1: Pod Journey Tracer
**Vista**: Arquitectura como mapa de ciudad
**Personaje**: HTTP Request animado
**Objetivo**: Seguir el path de un request específico

```
User Input: Request ID / Trace ID
          ↓
    Query Jaeger/Logs
          ↓
    Build request path
          ↓
    Animate character walking through:
    Ingress → Service → Pod → Container → External API
          ↓
    Show metrics at each hop
```

### Modo 2: Network Flow Visualizer
**Vista**: Cluster como red de nodos conectados
**Elementos**: Pods como edificios, comunicaciones como caminos
**Objetivo**: Identificar cuellos de botella y errores

```
Real-time stream from Service Mesh
          ↓
    Parse traffic metrics
          ↓
    Render animated flows:
    - Width = Traffic volume
    - Color = Health (green/yellow/red)
    - Pulse = Active requests
          ↓
    Highlight anomalies
```

### Modo 3: Resource Tetris
**Vista**: Nodos como contenedores 3D
**Elementos**: Pods como bloques Tetris
**Objetivo**: Optimizar packing y reducir costos

```
Query all nodes + pods
          ↓
    Calculate utilization
          ↓
    Render pods as blocks:
    - Size = Requests/Limits
    - Color = Actual usage %
    - Position = Current node
          ↓
    Suggest optimizations:
    - Compact pods
    - Resize requests
    - Identify waste
```

## MVP - Fase 1

Vamos a empezar con **Pod Journey Tracer** porque:
- ✅ Es la funcionalidad más diferenciadora
- ✅ Resuelve el dolor más agudo (debugging distribuido)
- ✅ Podemos usar la base isométrica de movimiento de personaje
- ✅ OpenShift ya tiene integración con Jaeger/tracing

### Roadmap Fase 1

1. **Conexión a OpenShift** (Backend básico)
   - Script Node.js que lee cluster con `oc` CLI
   - WebSocket server para datos en tiempo real
   - API REST para queries

2. **Visualización de Arquitectura** (Frontend)
   - Leer Services, Deployments, Pods
   - Renderizar como edificios isométricos
   - Mostrar conexiones (Services → Pods)

3. **Request Tracer** (Funcionalidad core)
   - Integrar con Jaeger/OpenTelemetry
   - Input: Trace ID
   - Animar "personaje-request" siguiendo el trace
   - Mostrar spans como paradas

4. **Interactividad**
   - Click en pod → Ver logs
   - Pause/play de trace replay
   - Timeline scrubber

## Tech Stack Propuesto

### Frontend
- **HTML5 Canvas** (ya lo tenemos)
- **Vanilla JS** (modular, sin frameworks pesados)
- **WebSocket client** (para real-time)

### Backend
- **Node.js + Express**
- **kubernetes-client npm** (API nativa de K8s)
- **oc CLI wrapper** (para OpenShift específico)
- **WebSocket (ws)**
- **Jaeger Query API** (para tracing)

### Deployment
- **Container**: Backend en un pod dentro del cluster
- **RBAC**: ServiceAccount con permisos de lectura
- **Route**: OpenShift Route para acceso externo

## Preguntas para el Usuario

1. **¿Tienes acceso a Jaeger/distributed tracing en tu OpenShift?**
   - Si no, podemos empezar parseando logs con correlation IDs

2. **¿Prefieres comenzar con MVP de Pod Journey Tracer?**
   - O prefieres una demo rápida de los 3 modos?

3. **¿El cluster tiene Service Mesh instalado?** (Istio/OpenShift Service Mesh)
   - Esto nos daría datos mucho más ricos

4. **¿Deployment preferido?**
   - A) Container dentro del cluster
   - B) Herramienta local que se conecta remotamente
   - C) Hybrid: Backend en cluster, frontend servido externamente

## Próximos Pasos

1. Conectar a tu cluster de OpenShift (necesito las credenciales)
2. Inspeccionar qué servicios/observability tiene disponible
3. Crear backend básico que lea recursos
4. Adaptar motor isométrico para renderizar topología real
5. Implementar primer modo: Pod Journey Tracer
