# K8HOLDER - Quick Installation Guide

Instala K8HOLDER en cualquier cluster OpenShift en 3 comandos.

## ⚡ Instalación Rápida

```bash
# 1. Login a tu cluster OpenShift
oc login <API_URL> -u <username> -p <password>

# 2. Crear proyecto e instalar todos los recursos
oc new-project k8holder
oc apply -f k8s/install-all-in-one.yaml

# 3. Build y deploy desde código local
oc start-build k8holder --from-dir=. --follow
```

Listo! K8HOLDER estará disponible en la ruta generada automáticamente.

## 📋 Verificación

```bash
# Ver el build en progreso
oc get builds -w

# Ver el deployment
oc get deployment k8holder

# Obtener la URL de acceso
oc get route k8holder -o jsonpath='{.spec.host}'
```

## 🔧 Qué se Instala

El archivo `k8s/install-all-in-one.yaml` crea:

1. **BuildConfig** - Construye la imagen del contenedor
2. **ImageStream** - Almacena las imágenes construidas
3. **Deployment** - Ejecuta la aplicación (1 réplica)
4. **Service** - Networking interno (puerto 8080)
5. **Route** - Acceso HTTPS externo
6. **ClusterRole** - Permisos de lectura del cluster
7. **ClusterRoleBinding** - Asigna permisos al ServiceAccount

## 📊 Permisos Otorgados

K8HOLDER necesita **solo lectura** de:
- Nodes, Pods, Services, Namespaces
- Deployments, ReplicaSets, StatefulSets
- Routes (OpenShift)
- ConfigMaps, Secrets, PVCs
- Pod/Node metrics (Metrics Server)

**No requiere permisos de escritura** - es 100% read-only.

## 🔄 Actualizar la Aplicación

Después de hacer cambios en el código:

```bash
# Rebuild desde local
oc start-build k8holder --from-dir=. --follow

# El deployment se actualiza automáticamente
oc rollout status deployment/k8holder
```

## 🗑️ Desinstalación

```bash
# Eliminar todos los recursos
oc delete -f k8s/install-all-in-one.yaml

# Eliminar proyecto completo
oc delete project k8holder
```

## 🐛 Troubleshooting

### Build falla
```bash
# Ver logs del build
oc logs -f bc/k8holder

# Verificar Dockerfile
cat Dockerfile
```

### Deployment no arranca
```bash
# Ver logs del pod
oc logs -f deployment/k8holder

# Ver eventos
oc get events --sort-by='.lastTimestamp'
```

### Sin métricas
```bash
# Verificar Metrics Server
oc get deployment metrics-server -n openshift-monitoring

# Verificar permisos
oc auth can-i get pods.metrics.k8s.io --as=system:serviceaccount:k8holder:default
```

## 📚 Arquitectura

```
┌─────────────────────────────────────┐
│   OpenShift Cluster                 │
├─────────────────────────────────────┤
│                                     │
│  ┌──────────────────────────────┐  │
│  │  K8HOLDER Deployment         │  │
│  │  ├─ Backend (Node.js)        │  │
│  │  ├─ Frontend (HTML/JS)       │  │
│  │  └─ Phaser.js Renderer       │  │
│  └──────────────────────────────┘  │
│           ▲                         │
│           │ Read-only access        │
│           ▼                         │
│  ┌──────────────────────────────┐  │
│  │  Kubernetes API Server       │  │
│  │  ├─ Nodes, Pods, Services    │  │
│  │  ├─ Deployments, Routes      │  │
│  │  └─ Metrics Server           │  │
│  └──────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
           │
           ▼
    HTTPS Route (External Access)
```

## 🔐 Seguridad

- **Read-only**: K8HOLDER nunca modifica el cluster
- **RBAC**: Usa ClusterRole con mínimos permisos necesarios
- **ServiceAccount**: Usa `default` SA del namespace k8holder
- **HTTPS**: Route con TLS edge termination
- **Sin secretos**: No almacena credenciales

## 💡 Mejores Prácticas

1. **Namespaces blacklist**: Configura `NAMESPACE_BLACKLIST` para ocultar namespaces sensibles
2. **Recursos**: Ajusta `resources.limits` según tamaño del cluster
3. **Réplicas**: Usa `replicas: 1` (stateless, no necesita más)
4. **Health checks**: Configurados en `/health` endpoint
5. **Logs**: Usa `oc logs -f deployment/k8holder` para debugging

## 📦 Requisitos

- OpenShift 4.x (probado en 4.14+)
- Metrics Server instalado (incluido por defecto en OpenShift)
- Permisos de `cluster-admin` para crear ClusterRole/Binding
- Node.js 18+ (en la imagen base UBI9)

## 🚀 Próximos Pasos

Una vez instalado:
1. Abre la URL del route en tu navegador
2. Explora el cluster visualmente
3. Haz click en nodos/pods para ver detalles
4. Usa filtros para enfocarte en tipos de nodos
5. Busca pods específicos con el buscador
6. Arrastra el mapa con click izquierdo
7. Usa tooltips para ver nombres rápidamente

---

**¿Problemas?** Abre un issue en el repositorio con:
- Versión de OpenShift (`oc version`)
- Logs del pod (`oc logs deployment/k8holder`)
- Navegador y versión
