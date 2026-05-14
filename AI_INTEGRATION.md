# 🤖 Red Hat MaaS AI Integration

## Implementación Completa ✅

K8HOLDER ahora incluye análisis inteligente de clusters Kubernetes usando **IBM Granite 3.2 8B Instruct** a través de Red Hat MaaS (Model as a Service).

---

## 🚀 Características AI Implementadas

### 1. **Diagnóstico de Nodos** 🔍
- **Trigger**: Botón "DIAGNOSTICAR ✨" en nodos con problemas (CPU > 70%, status error/warning)
- **Análisis**:
  - Estado actual del nodo (CPU, memoria, pods)
  - Diagnóstico del problema
  - Causa raíz probable
  - 3 pasos de remediación con comandos kubectl específicos
- **Formato de respuesta**:
  ```json
  {
    "diagnosis": "El nodo muestra signos de estrés...",
    "rootCause": "Alta utilización causada por...",
    "remediation": [
      "kubectl top pods -n namespace --sort-by=cpu",
      "kubectl scale deployment/app --replicas=3",
      "kubectl rollout restart deployment/app"
    ]
  }
  ```

### 2. **Optimización de Cluster** 💰
- **Trigger**: Botón "Optimización ✨" en Sidebar
- **Análisis**:
  - Estado general del cluster (CPU/memoria promedio)
  - 3 recomendaciones priorizadas
  - Estimación de ahorro potencial
  - Matriz de impacto vs esfuerzo
- **Recomendaciones típicas**:
  - Right-sizing de pods (ajustar requests/limits)
  - Consolidación de nodos
  - Implementación de HPA/VPA
  - Optimización de costos de infraestructura
- **Formato de respuesta**:
  ```json
  {
    "summary": "Tu cluster opera con X% CPU...",
    "recommendations": [
      {
        "title": "💰 Optimización de Costos",
        "description": "Considera consolidar cargas...",
        "impact": "Alto",
        "effort": "Medio"
      }
    ],
    "potentialSavings": "$500-1000/mes"
  }
  ```

### 3. **Reportes Ejecutivos** 📊
- **Trigger**: Botón "GENERAR REPORTE ✨" en panel Bio-Estado (Sidebar)
- **Análisis**:
  - Resumen ejecutivo estilo "Oráculo del Clúster"
  - Estado general y patrones observados
  - Zonas de atención
  - Recomendaciones estratégicas
  - Métricas clave (Health, Efficiency, Availability)
- **Formato de respuesta**:
  ```json
  {
    "summary": "El cluster está operando con N nodos...",
    "sections": [
      { "title": "Estado General", "content": "..." },
      { "title": "Zonas de Atención", "content": "..." },
      { "title": "Recomendaciones", "content": "..." }
    ],
    "metrics": {
      "health": "Saludable",
      "efficiency": "78%",
      "availability": "99.9%"
    }
  }
  ```

---

## 🔧 Detalles Técnicos

### Configuración del Modelo

```javascript
{
  apiKey: process.env.VITE_MAAS_API_KEY, // Set via environment variable
  endpoint: 'https://litellm-prod.apps.maas.redhatworkshops.io/v1',
  model: 'granite-3-2-8b-instruct'
}
```

### Parámetros de Inferencia

- **Temperature**: `0.3` - Respuestas determinísticas y técnicas
- **Max Tokens**: `2000` - Suficiente para análisis detallados
- **Top P**: `0.9` - Balance creatividad/precisión

### System Prompts Optimizados

Cada tipo de análisis usa un system prompt especializado:

**Diagnostic**:
> "Eres un experto en Kubernetes y sistemas distribuidos. Analiza problemas técnicos y proporciona diagnósticos precisos con causas raíz y pasos de remediación concretos."

**Optimization**:
> "Eres un consultor de optimización de infraestructura cloud. Analiza métricas de clusters y genera recomendaciones prácticas de optimización de costos y rendimiento."

**Report**:
> "Eres un analista de infraestructura que genera reportes ejecutivos claros y concisos sobre el estado de clusters Kubernetes."

---

## 📝 Prompts Engineering

### Estructura de Prompts

Los prompts están diseñados para maximizar la calidad de las respuestas de Granite:

1. **Contexto claro**: Datos estructurados del cluster
2. **Formato esperado**: Especificación explícita de la estructura de respuesta
3. **Instrucciones específicas**: "Sé técnico", "incluye comandos kubectl"
4. **Límites definidos**: "3 pasos", "2-3 líneas"

### Ejemplo: Prompt de Diagnóstico

```
Analiza este nodo de Kubernetes:

**Identificación:**
- Nombre: worker-node-1
- Estado: warning
- Zona: us-east-1a

**Métricas Actuales:**
- CPU: 85.3%
- Memoria: 72.1%
- Pods activos: 28
- Load promedio: 0.85

**Solicitud:**
Genera un diagnóstico estructurado con:

DIAGNÓSTICO: (2-3 líneas describiendo el estado y severidad)

CAUSA RAÍZ: (1-2 líneas identificando la causa más probable)

PASOS DE REMEDIACIÓN:
1. [Acción inmediata específica con comando kubectl]
2. [Acción de monitoreo o verificación]
3. [Acción preventiva o escalamiento]

Sé técnico, específico y enfócate en acciones concretas para OpenShift/Kubernetes.
```

---

## 🎨 UI/UX de AI Features

### AIModal Component

Modal full-screen con backdrop blur que renderiza diferentes formatos según el tipo de análisis:

**Estados del Modal**:
- ✅ **Loading**: Animación de spinner con mensaje "Sincronizando con el Núcleo Inteligente..."
- ✅ **Success**: Renderizado estructurado de la respuesta
- ✅ **Error**: Mensaje de error con fallback a datos mock

**Diseño Visual**:
- Fondo: `bg-[#0a0f18]` con border glow cyan
- Header: Gradiente `from-cyan-900/20 to-purple-900/20`
- Secciones con colores codificados:
  - Diagnóstico: `text-cyan-400`
  - Causa Raíz: `text-purple-400`
  - Remediación: `text-amber-400`
- Footer: Botón "Ejecutar Remediación ✨" (placeholder para futura implementación)

### Triggers Visuales

- **NodeCard**: Botón "DIAGNOSTICAR ✨" aparece solo en nodos con problemas
- **Sidebar**: 
  - "Optimización ✨" con badge "AI" en navegación
  - "GENERAR REPORTE ✨" en panel Bio-Estado

---

## 🔐 Seguridad

### Manejo de Credenciales

- ✅ API Key configurada en `frontend/src/config/maas.config.js`
- ✅ Archivo excluido del control de versiones via `.gitignore`
- ✅ Archivo de ejemplo `maas.config.example.js` para onboarding
- ✅ Soporte para variables de entorno: `VITE_MAAS_API_KEY`, `VITE_MAAS_ENDPOINT`, `VITE_MAAS_MODEL`

### Fallback Strategy

Si MaaS no está disponible o falla:
1. Intento de llamada a API
2. Catch error
3. Return mock data
4. Log error en consola
5. Usuario ve respuesta (aunque sea mock) sin interrupción

---

## 📊 Response Parsing

### Estrategia Multi-formato

El `aiService.js` puede parsear respuestas en múltiples formatos:

1. **JSON nativo**: Si Granite responde con JSON válido
2. **Texto estructurado**: Parser inteligente que extrae:
   - Secciones por headers (`##`, `**`)
   - Listas numeradas (remediation steps)
   - Métricas (`$500`, `78%`)
   - Keywords ("diagnóstico", "causa", "recomendación")

### Parsers Especializados

```javascript
parseDiagnosticResponse(content)    // Extrae diagnosis, rootCause, remediation
parseOptimizationResponse(content)  // Extrae recommendations con impact/effort
parseReportResponse(content)        // Extrae sections y metrics
```

---

## 🧪 Testing

### Mock Data

Todos los métodos AI incluyen fallback a mock data:
- `getMockDiagnosis(node)`
- `getMockOptimization(nodes)`
- `getMockReport(clusterData)`

Esto permite:
- ✅ Desarrollo sin credenciales
- ✅ Testing de UI sin consumir API
- ✅ Demostración offline

### Verificación de Integración

```bash
# En el navegador, verificar que el servicio está configurado
localStorage.getItem('ai-service-configured')

# Logs en consola al llamar diagnóstico
console.log('✅ AI Service configured with Red Hat MaaS')
```

---

## 🚀 Deployment

### Build Multi-stage

```dockerfile
# Stage 1: Build React con MaaS config
FROM registry.access.redhat.com/ubi9/nodejs-18:latest AS frontend-builder
COPY frontend/ ./
RUN npm run build

# Stage 2: Runtime con frontend compilado
FROM registry.access.redhat.com/ubi9/nodejs-18:latest
COPY --from=frontend-builder /opt/app-root/src/public/dist ./public/dist
```

### OpenShift Deployment

```bash
# Build actual (k8holder-13)
oc start-build k8holder -n k8holder --from-dir=. --follow

# Pod desplegado con AI integration
k8holder-75b765dfd6-df5h5   1/1     Running   0
```

### URL de Producción

**https://k8holder-k8holder.apps.ocp.txzx4.sandbox3797.opentlc.com**

---

## 📈 Próximos Pasos

### Mejoras Sugeridas

1. **Ejecutar Remediación Automática** 🤖
   - Implementar botón "Ejecutar Remediación ✨"
   - Aplicar acciones sugeridas directamente en el cluster
   - Confirmación de usuario antes de ejecutar

2. **Historial de Análisis** 📜
   - Guardar diagnósticos previos
   - Comparar estados del cluster en el tiempo
   - Tracking de recomendaciones implementadas

3. **Alertas Proactivas** 🚨
   - Análisis automático periódico
   - Notificaciones cuando se detectan problemas
   - Dashboard de tendencias

4. **Fine-tuning de Prompts** 🎯
   - A/B testing de diferentes estructuras de prompts
   - Optimización basada en feedback de usuarios
   - Incorporar patrones específicos del cluster

5. **Multi-modelo Support** 🔀
   - Permitir selección entre Granite 8B/13B/20B
   - Comparación de resultados entre modelos
   - Routing inteligente según complejidad del análisis

---

## 📚 Referencias

- **Red Hat MaaS**: https://litellm-prod.apps.maas.redhatworkshops.io
- **IBM Granite**: https://www.ibm.com/granite
- **LiteLLM Docs**: https://docs.litellm.ai
- **K8HOLDER Repo**: https://github.com/scanalesespinoza/k8holder

---

## ✅ Checklist de Integración

- [x] Implementar `callMaaS()` con LiteLLM API
- [x] Crear prompts optimizados para Granite
- [x] Implementar response parsing multi-formato
- [x] Integrar en componentes UI (AIModal, NodeCard, Sidebar)
- [x] Configurar credenciales Red Hat MaaS
- [x] Testing local con mock data
- [x] Build y deploy a OpenShift
- [x] Verificación en producción
- [x] Documentación completa
- [ ] User acceptance testing
- [ ] Performance monitoring
- [ ] Cost analysis

---

**¡La integración está LIVE y funcionando!** 🎉

Los usuarios ahora pueden obtener insights inteligentes sobre sus clusters Kubernetes directamente desde la UI de K8HOLDER.
