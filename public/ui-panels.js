/**
 * UI Panels Manager
 * Maneja paneles flotantes, draggables, con lock/unlock y minimize
 */

class UIPanelsManager {
    constructor() {
        this.panels = new Map();
        this.draggingPanel = null;
        this.dragOffset = { x: 0, y: 0 };
        this.detailsPanel = null;

        this.initializeEventListeners();
    }

    /**
     * Crear un panel flotante
     */
    createPanel(id, title, x, y, width, height, content = '') {
        const panel = {
            id,
            title,
            x,
            y,
            width,
            height,
            content,
            minimized: false,
            locked: false,
            visible: true
        };

        this.panels.set(id, panel);
        this.renderPanel(panel);
        return panel;
    }

    /**
     * Renderizar un panel en el DOM
     */
    renderPanel(panel) {
        // Remover panel existente si ya existe
        const existing = document.getElementById(`panel-${panel.id}`);
        if (existing) {
            existing.remove();
        }

        const panelDiv = document.createElement('div');
        panelDiv.id = `panel-${panel.id}`;
        panelDiv.className = 'ui-panel';
        panelDiv.style.left = `${panel.x}px`;
        panelDiv.style.top = `${panel.y}px`;
        panelDiv.style.width = `${panel.width}px`;
        if (!panel.minimized) {
            panelDiv.style.height = `${panel.height}px`;
        }
        if (!panel.visible) {
            panelDiv.style.display = 'none';
        }

        // Header
        const header = document.createElement('div');
        header.className = 'panel-header';
        header.innerHTML = `
            <span class="panel-title">${panel.title}</span>
            <div class="panel-controls">
                <button class="panel-btn panel-lock-btn" data-panel="${panel.id}" title="${panel.locked ? 'Unlock' : 'Lock'}">
                    ${panel.locked ? '🔒' : '🔓'}
                </button>
                <button class="panel-btn panel-minimize-btn" data-panel="${panel.id}" title="${panel.minimized ? 'Maximize' : 'Minimize'}">
                    ${panel.minimized ? '🔼' : '🔽'}
                </button>
            </div>
        `;

        // Content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'panel-content';
        if (panel.minimized) {
            contentDiv.style.display = 'none';
        }
        contentDiv.innerHTML = panel.content;

        panelDiv.appendChild(header);
        panelDiv.appendChild(contentDiv);

        document.body.appendChild(panelDiv);

        // Eventos de header
        header.addEventListener('mousedown', (e) => this.startDrag(e, panel));

        // Eventos de botones
        header.querySelector('.panel-lock-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleLock(panel.id);
        });

        header.querySelector('.panel-minimize-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMinimize(panel.id);
        });
    }

    /**
     * Actualizar contenido de un panel
     */
    updatePanelContent(id, content) {
        const panel = this.panels.get(id);
        if (!panel) return;

        panel.content = content;
        const panelDiv = document.getElementById(`panel-${id}`);
        if (panelDiv) {
            const contentDiv = panelDiv.querySelector('.panel-content');
            if (contentDiv) {
                contentDiv.innerHTML = content;
            }
        }
    }

    /**
     * Toggle lock/unlock
     */
    toggleLock(id) {
        const panel = this.panels.get(id);
        if (!panel) return;

        panel.locked = !panel.locked;
        this.renderPanel(panel);
    }

    /**
     * Toggle minimize/maximize
     */
    toggleMinimize(id) {
        const panel = this.panels.get(id);
        if (!panel) return;

        panel.minimized = !panel.minimized;
        this.renderPanel(panel);
    }

    /**
     * Show/hide panel
     */
    setPanelVisible(id, visible) {
        const panel = this.panels.get(id);
        if (!panel) return;

        panel.visible = visible;
        const panelDiv = document.getElementById(`panel-${id}`);
        if (panelDiv) {
            panelDiv.style.display = visible ? 'block' : 'none';
        }
    }

    /**
     * Iniciar drag de panel
     */
    startDrag(e, panel) {
        if (panel.locked) return;

        this.draggingPanel = panel;
        const panelDiv = document.getElementById(`panel-${panel.id}`);
        const rect = panelDiv.getBoundingClientRect();

        this.dragOffset.x = e.clientX - rect.left;
        this.dragOffset.y = e.clientY - rect.top;

        panelDiv.classList.add('dragging');
        e.preventDefault();
    }

    /**
     * Event listeners globales
     */
    initializeEventListeners() {
        document.addEventListener('mousemove', (e) => {
            if (!this.draggingPanel) return;

            const x = e.clientX - this.dragOffset.x;
            const y = e.clientY - this.dragOffset.y;

            this.draggingPanel.x = Math.max(0, Math.min(x, window.innerWidth - this.draggingPanel.width));
            this.draggingPanel.y = Math.max(0, Math.min(y, window.innerHeight - 50));

            const panelDiv = document.getElementById(`panel-${this.draggingPanel.id}`);
            if (panelDiv) {
                panelDiv.style.left = `${this.draggingPanel.x}px`;
                panelDiv.style.top = `${this.draggingPanel.y}px`;
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.draggingPanel) {
                const panelDiv = document.getElementById(`panel-${this.draggingPanel.id}`);
                if (panelDiv) {
                    panelDiv.classList.remove('dragging');
                }
                this.draggingPanel = null;
            }
        });
    }

    /**
     * Mostrar panel de detalles
     */
    showDetailsPanel(element, position = null) {
        if (!element) {
            this.hideDetailsPanel();
            return;
        }

        // Cerrar panel anterior si existe
        this.hideDetailsPanel();

        // Crear panel de detalles
        const detailsDiv = document.createElement('div');
        detailsDiv.id = 'details-panel';
        detailsDiv.className = 'details-panel';

        // Posicionar cerca del elemento clickeado o en centro
        if (position) {
            detailsDiv.style.left = `${Math.min(position.x + 20, window.innerWidth - 400)}px`;
            detailsDiv.style.top = `${Math.min(position.y, window.innerHeight - 300)}px`;
        } else {
            detailsDiv.style.left = '50%';
            detailsDiv.style.top = '50%';
            detailsDiv.style.transform = 'translate(-50%, -50%)';
        }

        // Contenido
        detailsDiv.innerHTML = `
            <div class="details-header">
                <h3>${this.getElementIcon(element)} ${element.name || 'Details'}</h3>
                <button class="details-close-btn">✕</button>
            </div>
            <div class="details-content">
                ${this.generateDetailsContent(element)}
            </div>
        `;

        document.body.appendChild(detailsDiv);
        this.detailsPanel = detailsDiv;

        // Eventos
        detailsDiv.querySelector('.details-close-btn').addEventListener('click', () => {
            this.hideDetailsPanel();
        });

        // Hacer draggable
        const header = detailsDiv.querySelector('.details-header');
        let isDragging = false;
        let dragOffsetX = 0;
        let dragOffsetY = 0;

        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('details-close-btn')) return;
            isDragging = true;
            const rect = detailsDiv.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            detailsDiv.style.transform = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const x = e.clientX - dragOffsetX;
            const y = e.clientY - dragOffsetY;
            detailsDiv.style.left = `${x}px`;
            detailsDiv.style.top = `${y}px`;
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    /**
     * Ocultar panel de detalles
     */
    hideDetailsPanel() {
        if (this.detailsPanel) {
            this.detailsPanel.remove();
            this.detailsPanel = null;
        }
    }

    /**
     * Generar contenido de detalles según tipo de elemento
     */
    generateDetailsContent(element) {
        if (element.type === 'pod') {
            return this.generatePodDetails(element);
        } else if (element.type === 'container') {
            return this.generateContainerDetails(element);
        } else if (element.type === 'node') {
            return this.generateNodeDetails(element);
        } else {
            return '<p>No details available</p>';
        }
    }

    /**
     * Detalles de pod
     */
    generatePodDetails(pod) {
        return `
            <div class="detail-section">
                <h4>Pod Information</h4>
                <table class="detail-table">
                    <tr>
                        <td><strong>Name:</strong></td>
                        <td>${pod.name}</td>
                    </tr>
                    <tr>
                        <td><strong>Namespace:</strong></td>
                        <td>${pod.namespace}</td>
                    </tr>
                    <tr>
                        <td><strong>Phase:</strong></td>
                        <td><span class="status-badge status-${pod.phase.toLowerCase()}">${pod.phase}</span></td>
                    </tr>
                    ${pod.deployment ? `
                    <tr>
                        <td><strong>Deployment:</strong></td>
                        <td>${pod.deployment}</td>
                    </tr>
                    ` : ''}
                    <tr>
                        <td><strong>Node:</strong></td>
                        <td>${pod.nodeName || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td><strong>Containers:</strong></td>
                        <td>${pod.containers?.length || 0}</td>
                    </tr>
                </table>
            </div>

            ${pod.containers && pod.containers.length > 0 ? `
            <div class="detail-section">
                <h4>Containers (${pod.containers.length})</h4>
                ${pod.containers.map(c => {
                    const cpuUsage = c.usage?.cpu || 0;
                    const cpuRequest = c.resources?.requests?.cpu || 100;
                    const memUsage = c.usage?.memory || 0;
                    const memRequest = c.resources?.requests?.memory || 256;
                    const cpuUtil = cpuRequest > 0 ? ((cpuUsage / cpuRequest) * 100) : 0;
                    const memUtil = memRequest > 0 ? ((memUsage / memRequest) * 100) : 0;

                    const getCpuBadge = () => {
                        if (cpuUtil > 85) return '<span class="status-badge status-failed">HIGH</span>';
                        if (cpuUtil > 60) return '<span class="status-badge status-pending">MEDIUM</span>';
                        return '<span class="status-badge status-running">LOW</span>';
                    };

                    return `
                    <div class="container-item">
                        <strong>${c.name}</strong>
                        <div class="container-stats">
                            <span>CPU: ${cpuUsage.toFixed(0)}m / ${cpuRequest}m (${cpuUtil.toFixed(0)}%) ${getCpuBadge()}</span>
                            <span>Memory: ${memUsage.toFixed(0)}Mi / ${memRequest}Mi (${memUtil.toFixed(0)}%)</span>
                            <span class="status-badge status-${c.state || 'unknown'}">${c.state || 'unknown'}</span>
                        </div>
                        ${c.image ? `<div class="container-image">Image: ${c.image}</div>` : ''}
                    </div>
                `;
                }).join('')}
            </div>
            ` : ''}

            ${pod.labels ? `
            <div class="detail-section">
                <h4>Labels</h4>
                <div class="labels-list">
                    ${Object.entries(pod.labels).map(([k, v]) => `
                        <span class="label-tag">${k}: ${v}</span>
                    `).join('')}
                </div>
            </div>
            ` : ''}
        `;
    }

    /**
     * Detalles de container
     */
    generateContainerDetails(container) {
        const cpuRequest = container.resources?.requests?.cpu || 0;
        const cpuLimit = container.resources?.limits?.cpu || 0;
        const memRequest = container.resources?.requests?.memory || 0;
        const memLimit = container.resources?.limits?.memory || 0;
        const cpuUsage = container.usage?.cpu || 0;
        const memUsage = container.usage?.memory || 0;

        // Calculate utilization percentages
        const cpuUtilization = cpuRequest > 0 ? ((cpuUsage / cpuRequest) * 100) : 0;
        const memUtilization = memRequest > 0 ? ((memUsage / memRequest) * 100) : 0;

        // Determine utilization status
        const getCpuStatus = () => {
            if (cpuUtilization > 85) return { text: 'HIGH', class: 'status-failed' };
            if (cpuUtilization > 60) return { text: 'MEDIUM', class: 'status-pending' };
            return { text: 'LOW', class: 'status-running' };
        };

        const getMemStatus = () => {
            if (memUtilization > 85) return { text: 'HIGH', class: 'status-failed' };
            if (memUtilization > 60) return { text: 'MEDIUM', class: 'status-pending' };
            return { text: 'LOW', class: 'status-running' };
        };

        const cpuStatus = getCpuStatus();
        const memStatus = getMemStatus();

        return `
            <div class="detail-section">
                <h4>Container Information</h4>
                <table class="detail-table">
                    <tr>
                        <td><strong>Name:</strong></td>
                        <td>${container.name}</td>
                    </tr>
                    <tr>
                        <td><strong>State:</strong></td>
                        <td><span class="status-badge status-${container.state || 'unknown'}">${container.state || 'unknown'}</span></td>
                    </tr>
                    ${container.image ? `
                    <tr>
                        <td><strong>Image:</strong></td>
                        <td>${container.image}</td>
                    </tr>
                    ` : ''}
                </table>
            </div>

            <div class="detail-section">
                <h4>Resource Utilization</h4>
                <div class="resource-bars">
                    <div class="resource-bar-item">
                        <label>CPU Utilization: ${cpuUtilization.toFixed(1)}% <span class="status-badge ${cpuStatus.class}">${cpuStatus.text}</span></label>
                        <div class="bar-container">
                            <div class="bar-fill" style="width: ${Math.min(cpuUtilization, 100)}%; background: ${cpuUtilization > 85 ? '#e74c3c' : cpuUtilization > 60 ? '#f39c12' : '#2ecc71'}"></div>
                        </div>
                        <span>${cpuUsage.toFixed(0)}m / ${cpuRequest}m requested</span>
                    </div>
                    <div class="resource-bar-item">
                        <label>Memory Utilization: ${memUtilization.toFixed(1)}% <span class="status-badge ${memStatus.class}">${memStatus.text}</span></label>
                        <div class="bar-container">
                            <div class="bar-fill" style="width: ${Math.min(memUtilization, 100)}%; background: ${memUtilization > 85 ? '#e74c3c' : memUtilization > 60 ? '#f39c12' : '#2ecc71'}"></div>
                        </div>
                        <span>${memUsage.toFixed(0)}Mi / ${memRequest}Mi requested</span>
                    </div>
                </div>
                <p style="margin-top: 10px; font-size: 10px; color: #95a5a6;">
                    ℹ️ Color indica utilización: <span style="color: #2ecc71;">Verde &lt;60%</span>,
                    <span style="color: #f39c12;">Amarillo 60-85%</span>,
                    <span style="color: #e74c3c;">Rojo &gt;85%</span>
                </p>
            </div>

            <div class="detail-section">
                <h4>Resource Requests & Limits</h4>
                <table class="detail-table">
                    <tr>
                        <td><strong>CPU Request:</strong></td>
                        <td>${cpuRequest}m</td>
                    </tr>
                    <tr>
                        <td><strong>CPU Limit:</strong></td>
                        <td>${cpuLimit || 'None'}${cpuLimit ? 'm' : ''}</td>
                    </tr>
                    <tr>
                        <td><strong>Memory Request:</strong></td>
                        <td>${memRequest}Mi</td>
                    </tr>
                    <tr>
                        <td><strong>Memory Limit:</strong></td>
                        <td>${memLimit || 'None'}${memLimit ? 'Mi' : ''}</td>
                    </tr>
                </table>
            </div>
        `;
    }

    /**
     * Detalles de node
     */
    generateNodeDetails(node) {
        const cpuUtil = node.utilization?.cpu || 0;
        const memUtil = node.utilization?.memory || 0;

        return `
            <div class="detail-section">
                <h4>Node Information</h4>
                <table class="detail-table">
                    <tr>
                        <td><strong>Name:</strong></td>
                        <td>${node.name}</td>
                    </tr>
                    <tr>
                        <td><strong>Ready:</strong></td>
                        <td><span class="status-badge status-${node.ready ? 'running' : 'failed'}">${node.ready ? 'Yes' : 'No'}</span></td>
                    </tr>
                    <tr>
                        <td><strong>Schedulable:</strong></td>
                        <td>${node.schedulable ? 'Yes' : 'No'}</td>
                    </tr>
                    <tr>
                        <td><strong>Pods:</strong></td>
                        <td>${node.pods?.length || 0}</td>
                    </tr>
                    ${node.roles && node.roles.length > 0 ? `
                    <tr>
                        <td><strong>Roles:</strong></td>
                        <td>${node.roles.join(', ')}</td>
                    </tr>
                    ` : ''}
                </table>
            </div>

            <div class="detail-section">
                <h4>Resource Capacity</h4>
                <div class="resource-bars">
                    <div class="resource-bar-item">
                        <label>CPU Utilization</label>
                        <div class="bar-container">
                            <div class="bar-fill" style="width: ${cpuUtil}%"></div>
                        </div>
                        <span>${cpuUtil.toFixed(1)}% (${node.capacity?.cpu || 0} cores total)</span>
                    </div>
                    <div class="resource-bar-item">
                        <label>Memory Utilization</label>
                        <div class="bar-container">
                            <div class="bar-fill" style="width: ${memUtil}%"></div>
                        </div>
                        <span>${memUtil.toFixed(1)}% (${((node.capacity?.memory || 0) / 1024).toFixed(0)} GB total)</span>
                    </div>
                </div>
            </div>

            ${node.waste ? `
            <div class="detail-section">
                <h4>Resource Waste</h4>
                <table class="detail-table">
                    <tr>
                        <td><strong>CPU Waste:</strong></td>
                        <td>${node.waste.cpu.toFixed(2)} cores (${node.waste.cpuPercent.toFixed(1)}%)</td>
                    </tr>
                    <tr>
                        <td><strong>Memory Waste:</strong></td>
                        <td>${(node.waste.memory / 1024).toFixed(2)} GB (${node.waste.memoryPercent.toFixed(1)}%)</td>
                    </tr>
                </table>
            </div>
            ` : ''}
        `;
    }

    /**
     * Obtener icono según tipo de elemento
     */
    getElementIcon(element) {
        if (element.type === 'pod') return '📦';
        if (element.type === 'container') return '📦';
        if (element.type === 'node') return '🖥️';
        if (element.type === 'deployment') return '🚀';
        return '📋';
    }
}
