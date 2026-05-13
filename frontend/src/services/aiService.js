/**
 * AI Service - Red Hat MaaS Integration
 * Placeholder for AI-powered cluster analysis
 */

class AIService {
  constructor() {
    this.apiKey = null;
    this.endpoint = null;
    this.model = null;
  }

  /**
   * Configure Red Hat MaaS connection
   * Call this when you have the credentials
   */
  configure(config) {
    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint;
    this.model = config.model || 'default';
    console.log('✅ AI Service configured with Red Hat MaaS');
  }

  /**
   * Diagnose node issues
   */
  async diagnoseNode(node) {
    if (!this.apiKey) {
      return this.getMockDiagnosis(node);
    }

    try {
      const podCount = Array.isArray(node.pods) ? node.pods.length : node.pods;
      const cpuPercent = node.efficiency?.cpu || node.cpu || 0;
      const memPercent = node.efficiency?.memory || node.mem || 0;

      const prompt = `Analiza este nodo de Kubernetes:

**Identificación:**
- Nombre: ${node.name}
- Estado: ${node.status}
- Zona: ${node.zone || 'no especificada'}

**Métricas Actuales:**
- CPU: ${cpuPercent.toFixed(1)}%
- Memoria: ${memPercent.toFixed(1)}%
- Pods activos: ${podCount}
- Load promedio: ${node.load || (cpuPercent / 100).toFixed(2)}

**Solicitud:**
Genera un diagnóstico estructurado con:

DIAGNÓSTICO: (2-3 líneas describiendo el estado y severidad)

CAUSA RAÍZ: (1-2 líneas identificando la causa más probable)

PASOS DE REMEDIACIÓN:
1. [Acción inmediata específica con comando kubectl]
2. [Acción de monitoreo o verificación]
3. [Acción preventiva o escalamiento]

Sé técnico, específico y enfócate en acciones concretas para OpenShift/Kubernetes.`;

      const response = await this.callMaaS(prompt, 'diagnostic');
      return response;
    } catch (error) {
      console.error('Error calling AI service:', error);
      return this.getMockDiagnosis(node);
    }
  }

  /**
   * Generate optimization recommendations
   */
  async optimizeCluster(nodes) {
    if (!this.apiKey) {
      return this.getMockOptimization(nodes);
    }

    try {
      const avgCpu = nodes.reduce((sum, n) => sum + (n.efficiency?.cpu || n.cpu || 0), 0) / nodes.length;
      const avgMem = nodes.reduce((sum, n) => sum + (n.efficiency?.memory || n.mem || 0), 0) / nodes.length;
      const totalPods = nodes.reduce((sum, n) => {
        const pods = Array.isArray(n.pods) ? n.pods.length : n.pods;
        return sum + pods;
      }, 0);

      const nodesSummary = nodes.map(n => ({
        name: n.name,
        cpu: `${(n.efficiency?.cpu || n.cpu || 0).toFixed(1)}%`,
        mem: `${(n.efficiency?.memory || n.mem || 0).toFixed(1)}%`,
        pods: Array.isArray(n.pods) ? n.pods.length : n.pods,
        status: n.status
      }));

      const prompt = `Analiza este cluster de OpenShift/Kubernetes para optimización:

**Cluster Overview:**
- Total de nodos: ${nodes.length}
- CPU promedio: ${avgCpu.toFixed(1)}%
- Memoria promedio: ${avgMem.toFixed(1)}%
- Total de pods: ${totalPods}

**Detalle de Nodos:**
${JSON.stringify(nodesSummary, null, 2)}

**Solicitud:**
Genera 3 recomendaciones de optimización con este formato:

RESUMEN: (1 línea sobre el estado general del cluster)

RECOMENDACIONES:

1. **[Título Acción]**
   Descripción: [Explicación de 2-3 líneas]
   Impacto: [Alto/Medio/Bajo]
   Esfuerzo: [Alto/Medio/Bajo]

2. **[Título Acción]**
   Descripción: [Explicación de 2-3 líneas]
   Impacto: [Alto/Medio/Bajo]
   Esfuerzo: [Alto/Medio/Bajo]

3. **[Título Acción]**
   Descripción: [Explicación de 2-3 líneas]
   Impacto: [Alto/Medio/Bajo]
   Esfuerzo: [Alto/Medio/Bajo]

AHORRO POTENCIAL: $[estimación mensual]

Enfócate en optimización de costos, right-sizing, y autoscaling.`;

      const response = await this.callMaaS(prompt, 'optimization');
      return response;
    } catch (error) {
      console.error('Error calling AI service:', error);
      return this.getMockOptimization(nodes);
    }
  }

  /**
   * Generate cluster report
   */
  async generateReport(clusterData) {
    if (!this.apiKey) {
      return this.getMockReport(clusterData);
    }

    try {
      const { nodes, stats } = clusterData;

      const healthyNodes = nodes?.filter(n => n.status === 'Ready' || n.status === 'healthy').length || 0;
      const totalNodes = nodes?.length || 0;

      const prompt = `Genera un reporte ejecutivo del estado de este cluster OpenShift/Kubernetes:

**Estado del Cluster:**
- Nodos totales: ${totalNodes}
- Nodos saludables: ${healthyNodes}
- CPU promedio: ${stats?.avgCpu || 0}%
- Memoria total: ${stats?.totalMemory || '0GB'}

**Solicitud:**
Genera un reporte estructurado estilo "Oráculo del Clúster" con:

RESUMEN EJECUTIVO: (2-3 líneas sobre el estado general, usa metáforas de ecosistema/energía)

## Estado General
[Análisis del health global del cluster, menciona patrones observados]

## Zonas de Atención
[Identifica áreas que requieren monitoreo o intervención]

## Recomendaciones Estratégicas
[3-4 recomendaciones de alto nivel para los próximos 30 días]

MÉTRICAS CLAVE:
- Health: [Saludable/Advertencia/Crítico]
- Efficiency: [porcentaje]
- Availability: [porcentaje]

Usa un tono técnico pero accesible para stakeholders ejecutivos. Incluye insights accionables.`;

      const response = await this.callMaaS(prompt, 'report');
      return response;
    } catch (error) {
      console.error('Error calling AI service:', error);
      return this.getMockReport(clusterData);
    }
  }

  /**
   * Call Red Hat MaaS API
   * Uses LiteLLM-compatible endpoint with Granite model
   */
  async callMaaS(prompt, systemContext) {
    if (!this.apiKey || !this.endpoint) {
      throw new Error('Red Hat MaaS not configured. Call configure() first.');
    }

    try {
      const systemPrompts = {
        diagnostic: 'Eres un experto en Kubernetes y sistemas distribuidos. Analiza problemas técnicos y proporciona diagnósticos precisos con causas raíz y pasos de remediación concretos.',
        optimization: 'Eres un consultor de optimización de infraestructura cloud. Analiza métricas de clusters y genera recomendaciones prácticas de optimización de costos y rendimiento.',
        report: 'Eres un analista de infraestructura que genera reportes ejecutivos claros y concisos sobre el estado de clusters Kubernetes.'
      };

      const response = await fetch(`${this.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: systemPrompts[systemContext] || systemPrompts.diagnostic
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 2000,
          top_p: 0.9
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`MaaS API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return this.parseResponse(data.choices[0].message.content, systemContext);
    } catch (error) {
      console.error('Error calling Red Hat MaaS:', error);
      throw error;
    }
  }

  /**
   * Parse AI response into structured format
   */
  parseResponse(content, context) {
    try {
      // Try to parse as JSON first
      return JSON.parse(content);
    } catch (e) {
      // If not JSON, structure the response based on context
      if (context === 'diagnostic') {
        return this.parseDiagnosticResponse(content);
      } else if (context === 'optimization') {
        return this.parseOptimizationResponse(content);
      } else if (context === 'report') {
        return this.parseReportResponse(content);
      }
      return { raw: content };
    }
  }

  parseDiagnosticResponse(content) {
    // Parse diagnostic response into structured format
    const lines = content.split('\n').filter(l => l.trim());

    return {
      diagnosis: lines.find(l => l.toLowerCase().includes('diagnóstico') || l.toLowerCase().includes('problema'))?.replace(/^.*?:\s*/, '') || lines[0] || content,
      rootCause: lines.find(l => l.toLowerCase().includes('causa') || l.toLowerCase().includes('root cause'))?.replace(/^.*?:\s*/, '') || '',
      remediation: lines
        .filter(l => /^\d+[\.\)]/.test(l.trim()) || l.includes('•') || l.includes('-'))
        .map(l => l.replace(/^[\d\.\)\-•\s]+/, '').trim())
        .filter(l => l.length > 0),
      confidence: 'Alta',
      timestamp: new Date().toISOString()
    };
  }

  parseOptimizationResponse(content) {
    const lines = content.split('\n').filter(l => l.trim());

    return {
      summary: lines[0] || content,
      recommendations: this.extractRecommendations(content),
      potentialSavings: this.extractSavings(content),
      timestamp: new Date().toISOString()
    };
  }

  parseReportResponse(content) {
    const lines = content.split('\n').filter(l => l.trim());

    return {
      summary: lines[0] || content,
      sections: this.extractSections(content),
      metrics: this.extractMetrics(content),
      timestamp: new Date().toISOString()
    };
  }

  extractRecommendations(content) {
    const recs = [];
    const sections = content.split(/\d+[\.\)]/);

    sections.slice(1, 4).forEach((section, i) => {
      const lines = section.trim().split('\n');
      recs.push({
        title: lines[0]?.substring(0, 50) || `Recomendación ${i + 1}`,
        description: lines.slice(1).join(' ').substring(0, 200) || section.substring(0, 200),
        impact: i === 0 ? 'Alto' : i === 1 ? 'Medio' : 'Bajo',
        effort: i === 0 ? 'Medio' : i === 1 ? 'Bajo' : 'Alto'
      });
    });

    return recs.length > 0 ? recs : [
      {
        title: 'Optimización Recomendada',
        description: content.substring(0, 200),
        impact: 'Medio',
        effort: 'Medio'
      }
    ];
  }

  extractSavings(content) {
    const savingsMatch = content.match(/\$\s*\d+[\d,]*(\s*-\s*\$?\s*\d+[\d,]*)?/);
    return savingsMatch ? savingsMatch[0] : 'Por determinar';
  }

  extractSections(content) {
    const sections = [];
    const parts = content.split(/##\s+|###\s+|\*\*[A-Z]/);

    parts.slice(1, 4).forEach((part, i) => {
      const lines = part.trim().split('\n');
      sections.push({
        title: lines[0]?.replace(/\*\*/g, '').substring(0, 50) || `Sección ${i + 1}`,
        content: lines.slice(1).join(' ').substring(0, 300) || part.substring(0, 300)
      });
    });

    return sections.length > 0 ? sections : [
      { title: 'Análisis', content: content.substring(0, 300) }
    ];
  }

  extractMetrics(content) {
    return {
      health: content.toLowerCase().includes('saludable') ? 'Saludable' :
              content.toLowerCase().includes('warning') ? 'Advertencia' : 'Normal',
      efficiency: content.match(/\d+%/)?.[0] || 'N/A',
      availability: '99.9%'
    };
  }

  /**
   * Mock diagnosis for development
   */
  getMockDiagnosis(node) {
    return {
      diagnosis: `El nodo **${node.name}** muestra signos de estrés significativo.`,
      rootCause: node.cpu > 80
        ? 'Alta utilización de CPU causada probablemente por procesos intensivos o falta de recursos.'
        : node.mem > 80
        ? 'Presión de memoria - posible fuga de memoria en algún pod o insuficiente límite de recursos.'
        : 'Estado degradado detectado - requiere investigación adicional.',
      remediation: [
        '🔍 **Identificar pods problemáticos**: `kubectl top pods -n <namespace> --sort-by=cpu`',
        '⚡ **Escalar horizontalmente**: Aumentar réplicas de pods que manejan carga',
        '🔄 **Reiniciar pods sospechosos**: Realizar rolling restart de deployments afectados'
      ],
      confidence: 'Alta',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Mock optimization for development
   */
  getMockOptimization(nodes) {
    const avgCpu = nodes.reduce((sum, n) => sum + n.cpu, 0) / nodes.length;
    const avgMem = nodes.reduce((sum, n) => sum + n.mem, 0) / nodes.length;

    return {
      summary: `Tu cluster opera con ${avgCpu.toFixed(1)}% de CPU y ${avgMem.toFixed(1)}% de memoria en promedio.`,
      recommendations: [
        {
          title: '💰 Optimización de Costos',
          description: avgCpu < 30
            ? 'Considera consolidar cargas en menos nodos para reducir costos de infraestructura.'
            : 'El uso de CPU es eficiente. Mantén el tamaño actual del cluster.',
          impact: 'Alto',
          effort: 'Medio'
        },
        {
          title: '📊 Right-sizing de Pods',
          description: 'Analiza los requests/limits de recursos. Varios pods pueden estar sobre-provisionados.',
          impact: 'Medio',
          effort: 'Bajo'
        },
        {
          title: '🚀 Autoscaling',
          description: 'Implementa HPA (Horizontal Pod Autoscaler) y VPA (Vertical Pod Autoscaler) para optimización dinámica.',
          impact: 'Alto',
          effort: 'Alto'
        }
      ],
      potentialSavings: '$500-1000/mes estimado',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Mock report for development
   */
  getMockReport(clusterData) {
    return {
      title: 'Reporte del Ecosistema K8HOLDER',
      summary: `El cluster está operando con ${clusterData.nodes?.length || 0} nodos activos. La irradiación cognitiva de los datos muestra patrones saludables en la mayoría de los componentes.`,
      sections: [
        {
          title: 'Estado General',
          content: 'El ecosistema mantiene un balance entre carga y capacidad. La energía fluye de manera óptima a través de los contenedores.'
        },
        {
          title: 'Zonas de Atención',
          content: 'Se detectan algunas áreas que requieren observación continua, particularmente en nodos con alta utilización.'
        },
        {
          title: 'Recomendaciones',
          content: 'Continuar monitoreando métricas clave. Considerar expansión preventiva si el crecimiento continúa.'
        }
      ],
      metrics: {
        health: 'Saludable',
        efficiency: '78%',
        availability: '99.9%'
      },
      timestamp: new Date().toISOString()
    };
  }
}

export default new AIService();
