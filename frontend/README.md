# K8HOLDER Frontend

React 18 + Vite + Tailwind CSS frontend con integración de Red Hat MaaS AI.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build
```

## 🤖 Red Hat MaaS AI Integration

### Configuración

1. Copia el archivo de ejemplo:
```bash
cp src/config/maas.config.example.js src/config/maas.config.js
```

2. Edita `src/config/maas.config.js` con tus credenciales:
```javascript
export const MAAS_CONFIG = {
  apiKey: 'tu-api-key',
  endpoint: 'https://litellm-prod.apps.maas.redhatworkshops.io/v1',
  model: 'granite-3-2-8b-instruct'
};
```

### Modelos Disponibles

- **granite-3-2-8b-instruct** (recomendado): Balance óptimo entre rendimiento y costo
- **granite-13b-chat-v2**: Mayor capacidad de razonamiento
- **granite-20b-code**: Especializado en generación de código

### Funcionalidades AI

#### 1. Diagnóstico de Nodos
```javascript
aiService.diagnoseNode(node)
```
- Analiza métricas de CPU, memoria y pods
- Identifica causa raíz de problemas
- Genera pasos de remediación con comandos kubectl

#### 2. Optimización de Cluster
```javascript
aiService.optimizeCluster(nodes)
```
- Recomendaciones de right-sizing
- Análisis de costos
- Sugerencias de autoscaling

#### 3. Reportes Ejecutivos
```javascript
aiService.generateReport(clusterData)
```
- Estado general del cluster
- Métricas clave de health
- Insights estratégicos

## 📁 Estructura

```
frontend/
├── src/
│   ├── components/
│   │   ├── AIModal.jsx      # Modal para análisis AI
│   │   ├── NodeCard.jsx     # Visualización de nodos
│   │   ├── Sidebar.jsx      # Navegación y stats
│   │   └── TopBar.jsx       # Barra superior
│   ├── services/
│   │   ├── aiService.js     # Red Hat MaaS integration
│   │   └── k8sApi.js        # Kubernetes API client
│   ├── config/
│   │   └── maas.config.js   # Credenciales MaaS (no committed)
│   └── styles/
│       └── index.css        # Tailwind + custom styles
├── public/
└── vite.config.js
```

## 🎨 Design System

### Colores Cyberpunk
- **cyber-bg**: `#030508` - Background principal
- **cyber-cyan**: `#22d3ee` - Acciones y highlights
- **cyber-purple**: `#a78bfa` - Elementos secundarios

### Componentes Personalizados
- `.custom-scrollbar` - Scrollbar estilizado
- `.text-glow-cyan` - Efecto de brillo cyan
- `.animate-glow` - Animación de pulso

## 🔧 Development

### Proxy Configuration

Vite está configurado para hacer proxy a las APIs del backend:

- `/api/*` → `http://localhost:8080`
- `/ws` → `ws://localhost:8080` (WebSocket)

### Hot Module Replacement (HMR)

React Fast Refresh habilitado para desarrollo ágil.

## 📦 Build

```bash
npm run build
```

Output: `../public/dist/` (servido por el backend Express)

## 🐳 Docker

El Dockerfile multi-stage construye el frontend automáticamente:

```dockerfile
FROM registry.access.redhat.com/ubi9/nodejs-18:latest AS frontend-builder
# ... build steps
```

## 🔐 Seguridad

- ⚠️ **NO** commitear `maas.config.js` con credenciales
- Usar variables de entorno en producción
- El `.gitignore` excluye archivos de configuración

## 📝 License

MIT
