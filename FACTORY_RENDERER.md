# K8HOLDER - Factory Renderer Architecture

## 🏭 Concepto: Fábrica Isométrica Kubernetes

K8HOLDER ahora visualiza el cluster completo como una **fábrica isométrica** donde:

- **Cluster** = La fábrica completa
- **Nodes** = Plantas/Edificios dentro de la fábrica
- **Deployments** = Líneas de producción dentro de las plantas
- **Pods** = Estaciones de trabajo en las líneas
- **Containers** = Cubos/máquinas en las estaciones
- **Network Flows** = Cintas transportadoras/pasillos conectando estaciones
- **Requests** = Paquetes moviéndose por las cintas

## 🎯 Filosofía de Diseño

### Vista Única Unificada

**ANTES:** 3 modos separados (Journey Tracer, Network Flow, Resource Tetris)  
**AHORA:** 1 vista única que muestra TODO simultáneamente

### Jerarquía Visual Completa

```
CLUSTER (Fábrica)
  └─ NODE (Planta)
      └─ DEPLOYMENT (Línea de producción)
          └─ POD (Estación de trabajo)
              └─ CONTAINER (Cubo/máquina)
```

### Proporciones Basadas en Recursos

Cada elemento tiene tamaño proporcional a sus recursos:

**Containers:**
- Ancho ∝ CPU usage
- Alto ∝ Memory usage
- Mínimo: 0.5x base unit

**Pods:**
- Plataforma que contiene containers
- Tamaño = suma de containers

**Nodes:**
- Contenedor grande
- Tamaño ∝ √(capacity)

### Colores por Salud

**Containers:**
- 🟢 Verde: <60% uso
- 🟡 Amarillo: 60-85% uso
- 🔴 Rojo: >85% uso
- ⚫ Gris: Terminated/Waiting

**Pods:**
- 🟢 Verde: Running
- 🟡 Amarillo: Pending
- 🔴 Rojo: Failed
- ⚫ Gris: Unknown

**Nodes:**
- 🟢 Verde oscuro: <60% utilización
- 🟡 Amarillo: 60-85% utilización
- 🟠 Naranja: >85% utilización
- ⚫ Gris: NotReady

**Network Flows:**
- 🔵 Azul: Healthy
- 🟡 Amarillo: Warning (alta latencia)
- 🔴 Rojo: Error

## 📋 Arquitectura de Código

### 1. FactoryRenderer (`factory-renderer.js`)

Renderizador principal responsable de:

```javascript
class FactoryRenderer {
    // Renderiza toda la fábrica
    render(clusterData) {
        this.renderFloor();              // Grid de fondo
        this.renderNodes();              // Plantas/nodos
        this.renderFlows();              // Conexiones de red
        this.renderRequests();           // Requests en tránsito
        this.renderUI();                 // Overlays
    }
    
    // Jerarquía de renderizado
    renderNode(node) {
        this.drawNodeContainer();        // Edificio del nodo
        this.renderDeployments();        // Líneas de producción
        this.drawResourceBar();          // Barra de utilización
    }
    
    renderDeployment(deployment) {
        this.drawDeploymentArea();       // Área delimitada
        this.renderPods();               // Estaciones
    }
    
    renderPod(pod) {
        this.drawPlatform();             // Plataforma base
        this.renderContainers();         // Cubos
        this.drawStatusIndicator();      // Indicador de estado
    }
    
    renderContainer(container) {
        this.drawIsometricCube();        // Cubo 3D
        this.drawActivityAnimation();    // Pulso si activo
    }
}
```

**Funciones de Geometría:**

```javascript
// Proyección isométrica
cartToIso(x, y) {
    return {
        x: (x - y) * 0.5,
        y: (x + y) * 0.25
    };
}

// Cubo isométrico 3D
drawIsometricCube(x, y, width, height, depth, color) {
    // Cara superior
    // Cara izquierda
    // Cara derecha
}

// Caja isométrica simplificada
drawIsometricBox(x, y, width, height, depth, color) {
    // Para nodes grandes
}
```

**Sistema de Colores:**

```javascript
this.colors = {
    container: {
        running: {
            low: '#2ecc71',
            medium: '#f39c12',
            high: '#e74c3c'
        }
    },
    pod: {
        running: '#2ecc71',
        pending: '#f39c12',
        failed: '#e74c3c'
    },
    node: {
        ready: {
            low: '#27ae60',
            medium: '#f39c12',
            high: '#e67e22'
        }
    }
};
```

### 2. ClusterDataAdapter (`cluster-data-adapter.js`)

Transforma datos del backend al formato del renderer:

```javascript
class ClusterDataAdapter {
    async fetchAll() {
        // Obtener datos de múltiples endpoints
        const [topology, resources, flows, metrics] = await Promise.all([
            this.api.get('/api/topology'),
            this.api.get('/api/resources'),
            this.api.get('/api/flows'),
            this.api.get('/api/metrics')
        ]);
        
        // Construir estructura unificada
        return this.buildClusterData();
    }
    
    buildClusterData() {
        return {
            nodes: this.buildNodes(),           // Nodes con jerarquía completa
            flows: this.buildFlows(),           // Network flows
            activeRequests: [],                 // Requests en tránsito
            summary: this.buildSummary()        // Resumen del cluster
        };
    }
    
    buildNodes() {
        // Para cada node:
        // 1. Obtener pods del node
        // 2. Agrupar pods por deployment
        // 3. Construir jerarquía: Node > Deployment > Pod > Container
    }
}
```

**Estructura de Datos:**

```javascript
{
    nodes: [
        {
            name: "worker-1",
            type: "node",
            capacity: { cpu: 16, memory: 65536 },
            utilization: { cpu: 45, memory: 60 },
            pods: [
                {
                    name: "frontend-abc",
                    namespace: "default",
                    deployment: "frontend",
                    phase: "Running",
                    containers: [
                        {
                            name: "nginx",
                            state: "running",
                            usage: { cpu: 120, memory: 256 },
                            resources: {
                                requests: { cpu: 100, memory: 256 },
                                limits: { cpu: 500, memory: 512 }
                            }
                        }
                    ]
                }
            ]
        }
    ],
    flows: [
        {
            source: { namespace: "default", name: "frontend" },
            target: { namespace: "default", name: "api" },
            metrics: {
                requestRate: 150,
                errorRate: 0.5,
                latencyP50: 45
            },
            health: "healthy"
        }
    ]
}
```

### 3. Main Application (`index.html`)

Loop principal simplificado:

```javascript
async function init() {
    // 1. Inicializar canvas
    canvas = document.getElementById('factoryCanvas');
    
    // 2. Inicializar API
    api = new K8sAPI();
    
    // 3. Inicializar adaptador de datos
    dataAdapter = new ClusterDataAdapter(api);
    
    // 4. Inicializar renderer
    factoryRenderer = new FactoryRenderer(canvas);
    
    // 5. Cargar datos iniciales
    clusterData = await dataAdapter.fetchAll();
    
    // 6. Iniciar loop de render
    requestAnimationFrame(renderLoop);
    
    // 7. Refresh periódico de datos
    setInterval(async () => {
        clusterData = await dataAdapter.fetchAll();
    }, 5000);
}

function renderLoop(currentTime) {
    // Renderizar fábrica
    factoryRenderer.render(clusterData);
    
    // FPS counter
    updateFPS();
    
    requestAnimationFrame(renderLoop);
}
```

## 🎮 Sistema de Interacción

### Controles

**Keyboard:**
- `WASD` / `Arrow Keys`: Pan camera
- `+/-`: Zoom in/out
- `R`: Reset camera
- `H`: Toggle help
- `Mouse Wheel`: Zoom

**Mouse:**
- `Click`: Select element (node/pod/container)
- `Drag`: (future) Pan camera
- `Hover`: (future) Tooltip

### Selección de Elementos

```javascript
handleClick(mouseX, mouseY, clusterData) {
    // 1. Ray picking - encontrar qué se clickeó
    const element = this.pickElement(mouseX, mouseY);
    
    // 2. Guardar elemento seleccionado
    this.selectedElement = element;
    
    // 3. Mostrar info en panel lateral
    this.renderUI() mostrará detalles del elemento
}
```

## 📊 Sistema de Proporciones

### Tamaño de Containers

```javascript
calculateContainerSize(container) {
    const cpu = container.usage?.cpu || 100;      // millicores
    const memory = container.usage?.memory || 256; // MB
    
    const cpuScale = Math.sqrt(cpu / 100);
    const memScale = Math.sqrt(memory / 256);
    
    return {
        width: BASE_UNIT * Math.max(cpuScale, 0.5),
        height: BASE_UNIT * Math.max(memScale, 0.5),
        depth: BASE_UNIT * 0.8
    };
}
```

**Ejemplo:**
- Container con 200m CPU, 512Mi RAM → Cubo ~1.4x más grande que base
- Container con 50m CPU, 128Mi RAM → Cubo ~0.7x más pequeño que base

### Tamaño de Nodes

```javascript
calculateNodeSize(node) {
    const cpuScale = Math.sqrt(node.capacity.cpu / 16);
    const memScale = Math.sqrt(node.capacity.memory / 65536);
    
    return {
        width: BASE_NODE_WIDTH * Math.max(cpuScale, 0.5),
        height: BASE_NODE_HEIGHT * Math.max(memScale, 0.5)
    };
}
```

**Ejemplo:**
- Node con 32 CPU, 128GB RAM → ~1.4x más grande
- Node con 8 CPU, 32GB RAM → ~0.7x más pequeño

### Layout de Nodes

```javascript
getNodeBounds(node, nodeIndex) {
    const cols = 3; // Nodes por fila
    const row = Math.floor(nodeIndex / cols);
    const col = nodeIndex % cols;
    
    return {
        x: col * (BASE_NODE_WIDTH + NODE_SPACING) + 100,
        y: row * (BASE_NODE_HEIGHT + NODE_SPACING) + 100
    };
}
```

Layout de grid 3x2 para 6 nodes:
```
[ Node 1 ] [ Node 2 ] [ Node 3 ]
[ Node 4 ] [ Node 5 ] [ Node 6 ]
```

## 🎨 Sistema de Animación

### Containers Activos

```javascript
// Pulsar si CPU > 50%
if (container.usage?.cpu > 50) {
    const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
    // Dibujar glow pulsante
}
```

### Network Flows (Cintas)

```javascript
drawConveyor(from, to, flow) {
    // Línea animada con dash offset
    const dashOffset = (Date.now() / 50) % 20;
    ctx.setLineDash([10, 10]);
    ctx.lineDashOffset = -dashOffset;
    
    // Grosor proporcional al request rate
    const thickness = Math.log10(flow.requestRate + 1) * 2;
}
```

### Requests en Movimiento

```javascript
renderRequest(request) {
    // Interpolar posición a lo largo del path
    const pos = this.interpolateRequestPosition(request);
    
    // Dibujar como cubo pequeño moviéndose
    this.drawIsometricCube(pos.x, pos.y, 8, 8, 8, request.color);
}
```

## 🔄 Flujo de Datos

```
Backend APIs
    ↓
ClusterDataAdapter.fetchAll()
    ↓
buildClusterData()
    ├─ buildNodes()
    │   ├─ getPodsForNode()
    │   │   └─ buildPod()
    │   │       └─ buildContainer()
    │   └─ groupPodsByDeployment()
    ├─ buildFlows()
    └─ buildSummary()
    ↓
FactoryRenderer.render(clusterData)
    ├─ renderFloor()
    ├─ renderNodes()
    │   ├─ renderDeployments()
    │   │   └─ renderPods()
    │   │       └─ renderContainers()
    │   └─ drawResourceBar()
    ├─ renderFlows()
    └─ renderUI()
```

## 📈 Performance

### Optimizaciones Implementadas

1. **Single render pass**: Todo en un solo loop
2. **Canvas batching**: Minimizar cambios de estado
3. **FPS counter**: Monitoreo de performance
4. **Refresh inteligente**: Solo datos cada 5s, render continuo

### Optimizaciones Futuras

1. **Culling**: No renderizar elementos fuera de viewport
2. **LOD**: Level of Detail - menos detalle cuando zoom out
3. **Object pooling**: Reutilizar objetos de geometría
4. **Dirty regions**: Solo re-dibujar lo que cambió

## 🚀 Próximos Pasos

### Fase 1: Interacción Completa
- [ ] Ray picking preciso para selección
- [ ] Tooltips en hover
- [ ] Panel de info lateral detallado
- [ ] Zoom in a elementos específicos

### Fase 2: Animaciones Avanzadas
- [ ] Traces sintéticos moviéndose por la fábrica
- [ ] Efectos visuales de errores/alertas
- [ ] Scaling animations al cambiar datos
- [ ] Camera transitions suaves

### Fase 3: Features Interactivas
- [ ] Drag & drop de pods (simulación)
- [ ] Filtros por namespace/label
- [ ] Búsqueda de elementos
- [ ] Timeline histórico

### Fase 4: Optimización
- [ ] Viewport culling
- [ ] Level of Detail
- [ ] WebGL renderer (opcional)
- [ ] Web Workers para datos

---

## 🎯 Comparación: Antes vs Ahora

### ANTES (3 Modos Separados)

```
Mode 1: Journey Tracer
  - Solo muestra request path
  - No ve recursos

Mode 2: Network Flow
  - Solo muestra flows
  - No ve pods individuales

Mode 3: Resource Tetris
  - Solo muestra recursos
  - No ve comunicación
```

**Problema:** Usuario tiene que cambiar entre modos para entender el cluster completo.

### AHORA (Vista Unificada)

```
Factory View:
  ✅ Nodes con recursos
  ✅ Deployments organizados
  ✅ Pods con containers
  ✅ Network flows
  ✅ Requests moviéndose
  ✅ Salud de todo visible simultáneamente
```

**Ventaja:** Todo visible al mismo tiempo, contexto completo.

---

**Documentación actualizada:** 2026-05-02  
**Versión:** Factory Renderer v1.0
