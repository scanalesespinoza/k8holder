# K8HOLDER - Map View (Vista de Mapa)

**Fecha:** 2026-05-02  
**Versión:** Build 14+

---

## 🗺️ ¿Por Qué Map View?

La vista isométrica original mostraba todos los elementos con profundidad 3D, pero con **377-423 pods** en el cluster, los elementos se superponían y la visualización era **ilegible**. 

La solución: **Map View** - una vista top-down (desde arriba) que elimina completamente la superposición y hace que todos los elementos sean claramente visibles.

---

## 📊 Comparación: Map View vs Isometric View

| Característica | Map View (🗺️) | Isometric View (📐) |
|---------------|----------------|---------------------|
| **Perspectiva** | Top-down (2D) | Isométrica (3D) |
| **Legibilidad** | ✅ Excelente | ⚠️ Difícil con muchos pods |
| **Superposición** | ❌ Ninguna | ⚠️ Muchas con 400+ pods |
| **Textos** | ✅ Siempre legibles | ⚠️ Se superponen |
| **Organización** | ✅ Grid claro | ⚠️ Profundidad confusa |
| **Performance** | ✅ Más rápido | ⚠️ Más cálculos |
| **Uso Recomendado** | **Default - Clusters grandes** | Clusters pequeños (<50 pods) |

---

## 🗺️ Map View: Componentes

### Vista General

```
┌──────────────────────────────────────────────────────┐
│  Header: K8HOLDER - Kubernetes Factory               │
│  [🗺️ Map View] [📐 Isometric View]                  │
└──────────────────────────────────────────────────────┘
│                                                       │
│  ┌─────────────────┐  ┌─────────────────┐           │
│  │  Node 1         │  │  Node 2         │           │
│  │  ━━━━━━━━━━━━━  │  │  ━━━━━━━━━━━━━  │           │
│  │  CPU: ▓▓░░ 45%  │  │  CPU: ▓▓░░ 52%  │           │
│  │  MEM: ▓▓▓░ 67%  │  │  MEM: ▓▓░░ 34%  │           │
│  │                  │  │                  │           │
│  │  ┌─┐ ┌─┐ ┌─┐   │  │  ┌─┐ ┌─┐        │           │
│  │  │P│ │P│ │P│   │  │  │P│ │P│        │           │
│  │  └─┘ └─┘ └─┘   │  │  └─┘ └─┘        │           │
│  │                  │  │                  │           │
│  │  57 pods         │  │  32 pods         │           │
│  └─────────────────┘  └─────────────────┘           │
│                                                       │
│  Legend:        Cluster Summary:                     │
│  ◼ Running      Nodes: 6                            │
│  ◼ Pending      Pods: 57                            │
│  ◼ Failed       Flows: 150                          │
└──────────────────────────────────────────────────────┘
```

### Estructura Jerárquica

**Nodes (Rectángulos Grandes)**
- Tamaño: 350x250px
- Color de borde según salud:
  - 🟢 Verde: <60% utilización
  - 🟡 Amarillo: 60-85% utilización
  - 🔴 Rojo: >85% utilización
- Header con nombre del node
- Barras de recursos (CPU, Memory)
- Contador de pods

**Pods (Cuadrados Medianos dentro de Nodes)**
- Tamaño: 40x40px
- Organizados en grid dentro del node
- Color según estado:
  - 🟢 Verde: Running
  - 🟡 Amarillo: Pending
  - 🔴 Rojo: Failed
  - ⚫ Gris: Unknown

**Containers (Puntos Pequeños dentro de Pods)**
- Tamaño: 8x8px
- Organizados en grid dentro del pod
- Color según utilización:
  - 🟢 Verde: <60% CPU
  - 🟡 Amarillo: 60-85% CPU
  - 🔴 Rojo: >85% CPU

**Network Flows (Líneas con Flechas)**
- Conectan pods que se comunican
- Grosor proporcional a traffic
- Color según salud:
  - 🔵 Azul: Healthy (latencia <200ms, errors <1%)
  - 🟡 Amarillo: Warning (latencia <500ms, errors <5%)
  - 🔴 Rojo: Error (latencia >500ms, errors >5%)

---

## 🎮 Controles

### Teclado
- `WASD` o `Flechas`: Mover cámara (pan)
- `Mouse Wheel`: Zoom in/out
- `+` / `-`: Zoom in/out
- `R`: Reset cámara
- `Click`: Mostrar detalles del pod/node

### Botones de Header
- **🗺️ Map View**: Activa vista de mapa (predeterminada)
- **📐 Isometric View**: Cambia a vista isométrica

### Paneles Flotantes (Nuevos en Build 16)

**Características:**
- **Draggable**: Arrastra el header para mover el panel
- **🔓/🔒 Lock/Unlock**: Bloquea el panel para evitar moverlo accidentalmente
- **🔽/🔼 Minimize/Maximize**: Oculta o muestra el contenido del panel
- **Sin superposición**: Los paneles se posicionan automáticamente sin taparse

**Paneles Disponibles:**
1. **Factory Controls** (inferior izquierda) - Atajos de teclado
2. **Pod Status** (inferior izquierda) - Leyenda de colores
3. **Cluster Summary** (inferior derecha) - Estadísticas del cluster

**Panel de Detalles:**
- Click en cualquier pod o node para ver información completa
- **Draggable**: Mueve el panel a donde necesites
- **Botón ✕**: Cierra el panel
- **Información mostrada:**
  - Para **Pods**: Name, namespace, phase, deployment, containers, labels
  - Para **Containers**: CPU/Memory usage, requests, limits, state, image
  - Para **Nodes**: Capacity, utilization, waste, pods count, roles
- **Barras de utilización**: Visuales de CPU y Memory
- **Badges de estado**: Running (verde), Pending (amarillo), Failed (rojo)

---

## 🚫 Namespace Blacklist

Para reducir el ruido y enfocarse en servicios de usuarios, K8HOLDER excluye automáticamente los namespaces de sistema:

### Namespaces Excluidos (Default)
- `openshift-*` - Todos los namespaces de OpenShift
- `kube-*` - Namespaces de Kubernetes (kube-system, etc.)
- `default` - Namespace default
- `openshift` - Namespace base de OpenShift

### Impacto
- **Antes:** 423 pods (todos los namespaces)
- **Después:** 57 pods (solo aplicaciones de usuarios)
- **Reducción:** 87% menos ruido

### Configuración

La blacklist es configurable vía variable de entorno:

```bash
# En deployment.yaml o BuildConfig
env:
  - name: NAMESPACE_BLACKLIST
    value: "openshift-*,kube-*,default,custom-system-*"
```

**Soporte de Wildcards:**
- `openshift-*` → Matches: `openshift-monitoring`, `openshift-dns`, etc.
- `kube-*` → Matches: `kube-system`, `kube-public`, etc.
- `prod-*` → Matches: `prod-api`, `prod-web`, etc.

**Matches Exactos:**
- `default` → Solo el namespace "default"
- `monitoring` → Solo el namespace "monitoring"

---

## 📐 Isometric View (Vista Alternativa)

La vista isométrica sigue disponible como opción secundaria para:

- **Clusters pequeños** (<50 pods)
- **Demos visuales** con efecto 3D
- **Screenshots** más atractivos visualmente

### Cuándo NO usar Isometric View
- ❌ Clusters con >100 pods (ilegible)
- ❌ Cuando necesitas claridad sobre ubicación exacta
- ❌ Cuando necesitas leer textos de pods

### Ventajas de Isometric View
- ✅ Visualmente atractiva
- ✅ Sensación de profundidad
- ✅ Buena para presentaciones con pocos elementos

---

## 🎯 Layout de Nodes en Map View

Los nodes se organizan en un **grid automático** basado en la cantidad total:

```javascript
const cols = Math.ceil(Math.sqrt(nodeCount));
```

**Ejemplos:**
- 6 nodes → Grid 3x2
- 9 nodes → Grid 3x3
- 12 nodes → Grid 4x3
- 16 nodes → Grid 4x4

**Espaciado:**
- Node width: 350px
- Node height: 250px
- Spacing horizontal: 50px
- Spacing vertical: 50px
- Margin inicial: 50px

**Total viewport para 6 nodes (3x2):**
- Width: 3 * (350 + 50) + 50 = 1,250px
- Height: 2 * (250 + 50) + 50 = 650px

---

## 🎨 Sistema de Colores

### Node Health
```javascript
CPU/Memory > 85%  → 🔴 #e67e22 (Naranja/Critical)
CPU/Memory > 60%  → 🟡 #f39c12 (Amarillo/Warning)
CPU/Memory < 60%  → 🟢 #27ae60 (Verde/Healthy)
Node NotReady     → ⚫ #7f8c8d (Gris/Offline)
```

### Pod Status
```javascript
Running  → 🟢 #2ecc71
Pending  → 🟡 #f39c12
Failed   → 🔴 #e74c3c
Unknown  → ⚫ #95a5a6
```

### Container Utilization
```javascript
CPU > 85%  → 🔴 #e74c3c (Alto)
CPU > 60%  → 🟡 #f39c12 (Medio)
CPU < 60%  → 🟢 #2ecc71 (Bajo)
Terminated → ⚫ #34495e (Apagado)
```

### Network Flows
```javascript
Error rate > 5% OR Latency > 500ms  → 🔴 #e74c3c (Error)
Error rate > 1% OR Latency > 200ms  → 🟡 #f39c12 (Warning)
Otherwise                            → 🔵 #3498db (Healthy)
```

---

## 📊 Paneles de Información

### Cluster Overview (Top Left)
```
Cluster Overview
Nodes: 6
FPS: 30
Flows: 150
```

### Connection Status (Top Right)
```
🟢 Connected  (cuando APIs responden)
🔴 Disconnected  (cuando APIs fallan)
```

### Legend (Bottom Left)
```
Pod Status
◼ Running
◼ Pending
◼ Failed
```

### Cluster Summary (Bottom Right)
```
Cluster Summary
Nodes: 6
Pods: 57
Flows: 150
CPU: 96 cores
Memory: 282 GB
```

---

## 🚀 Performance

### Optimizaciones en Map View

1. **Single render pass** - Todo en un loop de canvas
2. **Grid-based layout** - Cálculo de posiciones O(1)
3. **Simple 2D rendering** - Sin proyección isométrica
4. **Viewport culling** - (próximamente) No renderizar fuera de pantalla
5. **Level of Detail** - (próximamente) Menos detalle con zoom out

### Performance Objetivo

| Métrica | Objetivo | Actual (57 pods) | Actual (423 pods) |
|---------|----------|------------------|-------------------|
| FPS | 60 | ~60 ✅ | ~30 ⚠️ |
| Data refresh | 5s | 5s ✅ | 5s ✅ |
| Initial load | <2s | <1s ✅ | <2s ✅ |

**Recomendación:** Con más de 100 pods, usar namespace blacklist para enfocar en apps específicas.

---

## 🔮 Próximas Mejoras en Map View

### Prioridad Alta
- [ ] **Info panel lateral** - Mostrar detalles del pod seleccionado
- [ ] **Tooltips en hover** - Información rápida al pasar el mouse
- [ ] **Animated flows** - Partículas moviéndose por las flechas
- [ ] **Namespace grouping** - Agrupar visualmente pods por namespace

### Prioridad Media
- [ ] **Search/Filter** - Buscar pods por nombre
- [ ] **Namespace selector** - Filtrar por namespace específico
- [ ] **Deployment highlighting** - Resaltar todos los pods de un deployment
- [ ] **Historical view** - Ver estado del cluster en tiempo pasado

### Prioridad Baja
- [ ] **Minimap** - Vista miniatura del cluster completo
- [ ] **Heat map mode** - Modo de visualización de calor por utilización
- [ ] **Dark/Light theme** - Temas de color
- [ ] **Export to PNG** - Exportar vista como imagen

---

## 🎯 Conclusión

**Map View** es ahora la vista predeterminada porque:

1. ✅ Es **legible** con cualquier cantidad de pods
2. ✅ Elimina completamente la **superposición**
3. ✅ Más **rápida** de renderizar
4. ✅ **Organización clara** en grid
5. ✅ Textos siempre **visibles**

**Isometric View** sigue disponible para:
- Demos visuales
- Clusters pequeños
- Screenshots atractivos

Con la **Namespace Blacklist**, pasamos de 423 pods (ilegible) a 57 pods enfocados en aplicaciones de usuarios, haciendo K8HOLDER una herramienta práctica y usable para clusters reales de producción.
