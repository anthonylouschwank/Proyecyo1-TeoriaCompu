/**
 * Visualizador de autómatas usando D3.js o Cytoscape.js
 */
class GraphVisualizer {
    constructor(containerId = 'automaton-container') {
        this.containerId = containerId;
        this.container = null;
        this.currentAutomaton = null;
        this.simulation = null;
        this.highlightedPath = [];
        
        // Configuración de visualización
        this.config = {
            width: 800,
            height: 600,
            margin: { top: 20, right: 20, bottom: 20, left: 20 },
            node: {
                radius: 30,
                fillColor: '#e8f4f8',
                strokeColor: '#2196F3',
                strokeWidth: 2,
                acceptingStrokeWidth: 4,
                startColor: '#4CAF50',
                acceptingColor: '#FF9800',
                highlightColor: '#F44336'
            },
            edge: {
                strokeColor: '#666',
                strokeWidth: 1.5,
                highlightColor: '#F44336',
                highlightWidth: 3,
                arrowSize: 6
            },
            text: {
                fontSize: '12px',
                fontFamily: 'Arial, sans-serif',
                nodeColor: '#333',
                edgeColor: '#444'
            },
            animation: {
                duration: 500,
                highlightDuration: 1000
            }
        };
    }

    /**
     * Inicializa el visualizador
     * @param {string} library - Librería a usar ('d3' o 'cytoscape')
     */
    initialize(library = 'd3') {
        this.library = library;
        this.container = document.getElementById(this.containerId);
        
        if (!this.container) {
            throw new Error(`Container con ID '${this.containerId}' no encontrado`);
        }

        // Limpiar container
        this.container.innerHTML = '';
        
        if (library === 'd3') {
            this.initializeD3();
        } else if (library === 'cytoscape') {
            this.initializeCytoscape();
        } else {
            throw new Error(`Librería no soportada: ${library}`);
        }
    }

    /**
     * Inicializa visualización con D3.js
     */
    initializeD3() {
        // Verificar que D3 esté disponible
        if (typeof d3 === 'undefined') {
            throw new Error('D3.js no está disponible. Incluya la librería D3.js');
        }

        this.svg = d3.select(`#${this.containerId}`)
            .append('svg')
            .attr('width', this.config.width)
            .attr('height', this.config.height)
            .style('border', '1px solid #ccc')
            .style('background-color', '#fafafa');

        // Definir marcadores para flechas
        this.svg.append('defs').append('marker')
            .attr('id', 'arrowhead')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 15)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('class', 'arrowhead')
            .style('fill', this.config.edge.strokeColor);

        // Definir marcador para flechas resaltadas
        this.svg.select('defs').append('marker')
            .attr('id', 'arrowhead-highlight')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 15)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('class', 'arrowhead-highlight')
            .style('fill', this.config.edge.highlightColor);
    }

    /**
     * Inicializa visualización con Cytoscape.js
     */
    initializeCytoscape() {
        // Verificar que Cytoscape esté disponible
        if (typeof cytoscape === 'undefined') {
            throw new Error('Cytoscape.js no está disponible. Incluya la librería Cytoscape.js');
        }

        this.cy = cytoscape({
            container: this.container,
            style: this.getCytoscapeStyle(),
            layout: { name: 'breadthfirst', directed: true },
            userZoomingEnabled: true,
            userPanningEnabled: true,
            boxSelectionEnabled: false
        });
    }

    /**
     * Visualiza un autómata
     * @param {Automaton} automaton - Autómata a visualizar
     * @param {Object} options - Opciones de visualización
     */
    visualizeAutomaton(automaton, options = {}) {
        this.currentAutomaton = automaton;
        
        if (this.library === 'd3') {
            this.visualizeWithD3(automaton, options);
        } else if (this.library === 'cytoscape') {
            this.visualizeWithCytoscape(automaton, options);
        }
    }

    /**
     * Visualiza con D3.js
     * @param {Automaton} automaton - Autómata
     * @param {Object} options - Opciones
     */
    visualizeWithD3(automaton, options) {
        // Limpiar visualización anterior
        this.svg.selectAll('.node, .link, .label').remove();

        // Preparar datos
        const graphData = this.prepareGraphData(automaton);
        
        // Crear simulación de fuerzas
        this.simulation = d3.forceSimulation(graphData.nodes)
            .force('link', d3.forceLink(graphData.links).id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(this.config.width / 2, this.config.height / 2))
            .force('collision', d3.forceCollide().radius(this.config.node.radius + 10));

        // Crear enlaces
        const link = this.svg.append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(graphData.links)
            .enter().append('line')
            .attr('class', 'link')
            .style('stroke', this.config.edge.strokeColor)
            .style('stroke-width', this.config.edge.strokeWidth)
            .attr('marker-end', 'url(#arrowhead)');

        // Crear etiquetas de enlaces
        const linkLabels = this.svg.append('g')
            .attr('class', 'link-labels')
            .selectAll('text')
            .data(graphData.links)
            .enter().append('text')
            .attr('class', 'link-label')
            .style('font-size', this.config.text.fontSize)
            .style('font-family', this.config.text.fontFamily)
            .style('fill', this.config.text.edgeColor)
            .style('text-anchor', 'middle')
            .text(d => d.label);

        // Crear nodos
        const node = this.svg.append('g')
            .attr('class', 'nodes')
            .selectAll('circle')
            .data(graphData.nodes)
            .enter().append('circle')
            .attr('class', 'node')
            .attr('r', this.config.node.radius)
            .style('fill', d => this.getNodeColor(d))
            .style('stroke', this.config.node.strokeColor)
            .style('stroke-width', d => d.isAccepting ? 
                this.config.node.acceptingStrokeWidth : this.config.node.strokeWidth)
            .call(d3.drag()
                .on('start', this.dragstarted.bind(this))
                .on('drag', this.dragged.bind(this))
                .on('end', this.dragended.bind(this)));

        // Crear etiquetas de nodos
        const nodeLabels = this.svg.append('g')
            .attr('class', 'node-labels')
            .selectAll('text')
            .data(graphData.nodes)
            .enter().append('text')
            .attr('class', 'node-label')
            .style('font-size', this.config.text.fontSize)
            .style('font-family', this.config.text.fontFamily)
            .style('fill', this.config.text.nodeColor)
            .style('text-anchor', 'middle')
            .style('pointer-events', 'none')
            .text(d => d.id);

        // Actualizar posiciones en cada tick
        this.simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            linkLabels
                .attr('x', d => (d.source.x + d.target.x) / 2)
                .attr('y', d => (d.source.y + d.target.y) / 2);

            node
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);

            nodeLabels
                .attr('x', d => d.x)
                .attr('y', d => d.y + 4);
        });

        // Añadir estado inicial especial
        if (automaton.startState) {
            const startArrow = this.svg.append('g')
                .attr('class', 'start-arrow');
                
            startArrow.append('line')
                .style('stroke', this.config.node.startColor)
                .style('stroke-width', 3)
                .attr('marker-end', 'url(#arrowhead)');
                
            startArrow.append('text')
                .text('inicio')
                .style('font-size', '10px')
                .style('fill', this.config.node.startColor);
        }
    }

    /**
     * Visualiza con Cytoscape.js
     * @param {Automaton} automaton - Autómata
     * @param {Object} options - Opciones
     */
    visualizeWithCytoscape(automaton, options) {
        const elements = this.prepareCytoscapeData(automaton);
        
        this.cy.elements().remove();
        this.cy.add(elements);
        
        // Aplicar layout
        const layout = options.layout || 'breadthfirst';
        this.cy.layout({ 
            name: layout, 
            directed: true,
            roots: automaton.startState ? `#state-${automaton.startState.id}` : undefined
        }).run();
    }

    /**
     * Prepara datos para D3.js
     * @param {Automaton} automaton - Autómata
     * @returns {Object} Datos del grafo
     */
    prepareGraphData(automaton) {
        const nodes = [];
        const links = [];

        // Crear nodos
        automaton.states.forEach(state => {
            nodes.push({
                id: state.id,
                isStart: state === automaton.startState,
                isAccepting: state.isAccepting
            });
        });

        // Crear enlaces
        automaton.states.forEach(state => {
            // Transiciones normales
            state.transitions.forEach((targetStates, symbol) => {
                targetStates.forEach(targetState => {
                    links.push({
                        source: state.id,
                        target: targetState.id,
                        label: symbol,
                        id: `${state.id}-${symbol}-${targetState.id}`
                    });
                });
            });

            // Transiciones epsilon
            state.epsilonTransitions.forEach(targetState => {
                links.push({
                    source: state.id,
                    target: targetState.id,
                    label: 'ε',
                    id: `${state.id}-ε-${targetState.id}`
                });
            });
        });

        return { nodes, links };
    }

    /**
     * Prepara datos para Cytoscape.js
     * @param {Automaton} automaton - Autómata
     * @returns {Array} Elementos para Cytoscape
     */
    prepareCytoscapeData(automaton) {
        const elements = [];

        // Añadir nodos
        automaton.states.forEach(state => {
            elements.push({
                data: {
                    id: `state-${state.id}`,
                    label: state.id.toString(),
                    isStart: state === automaton.startState,
                    isAccepting: state.isAccepting
                }
            });
        });

        // Añadir enlaces
        automaton.states.forEach(state => {
            // Transiciones normales
            state.transitions.forEach((targetStates, symbol) => {
                targetStates.forEach(targetState => {
                    elements.push({
                        data: {
                            id: `edge-${state.id}-${symbol}-${targetState.id}`,
                            source: `state-${state.id}`,
                            target: `state-${targetState.id}`,
                            label: symbol
                        }
                    });
                });
            });

            // Transiciones epsilon
            state.epsilonTransitions.forEach(targetState => {
                elements.push({
                    data: {
                        id: `edge-${state.id}-ε-${targetState.id}`,
                        source: `state-${state.id}`,
                        target: `state-${targetState.id}`,
                        label: 'ε'
                    }
                });
            });
        });

        return elements;
    }

    /**
     * Obtiene el color del nodo según su tipo
     * @param {Object} node - Datos del nodo
     * @returns {string} Color del nodo
     */
    getNodeColor(node) {
        if (node.isStart) return this.config.node.startColor;
        if (node.isAccepting) return this.config.node.acceptingColor;
        return this.config.node.fillColor;
    }

    /**
     * Resalta el camino de una simulación
     * @param {Array} steps - Pasos de la simulación
     * @param {number} currentStep - Paso actual
     */
    highlightSimulationPath(steps, currentStep = 0) {
        if (this.library === 'd3') {
            this.highlightPathD3(steps, currentStep);
        } else if (this.library === 'cytoscape') {
            this.highlightPathCytoscape(steps, currentStep);
        }
    }

    /**
     * Resalta camino en D3.js
     * @param {Array} steps - Pasos de simulación
     * @param {number} currentStep - Paso actual
     */
    highlightPathD3(steps, currentStep) {
        // Reiniciar estilos
        this.svg.selectAll('.node')
            .style('fill', d => this.getNodeColor(d))
            .style('stroke-width', d => d.isAccepting ? 
                this.config.node.acceptingStrokeWidth : this.config.node.strokeWidth);

        this.svg.selectAll('.link')
            .style('stroke', this.config.edge.strokeColor)
            .style('stroke-width', this.config.edge.strokeWidth)
            .attr('marker-end', 'url(#arrowhead)');

        // Resaltar paso actual
        if (currentStep < steps.length) {
            const step = steps[currentStep];
            
            // Resaltar estado actual
            const currentStateId = step.currentState || (step.currentStates && step.currentStates[0]);
            if (currentStateId !== undefined) {
                this.svg.selectAll('.node')
                    .filter(d => d.id === currentStateId)
                    .style('fill', this.config.node.highlightColor);
            }

            // Resaltar transición si existe
            if (step.symbol && currentStep > 0) {
                const prevStep = steps[currentStep - 1];
                const prevStateId = prevStep.currentState || (prevStep.currentStates && prevStep.currentStates[0]);
                
                this.svg.selectAll('.link')
                    .filter(d => d.source.id === prevStateId && 
                               d.target.id === currentStateId && 
                               d.label === step.symbol)
                    .style('stroke', this.config.edge.highlightColor)
                    .style('stroke-width', this.config.edge.highlightWidth)
                    .attr('marker-end', 'url(#arrowhead-highlight)');
            }
        }
    }

    /**
     * Resalta camino en Cytoscape.js
     * @param {Array} steps - Pasos de simulación
     * @param {number} currentStep - Paso actual
     */
    highlightPathCytoscape(steps, currentStep) {
        // Reiniciar estilos
        this.cy.elements().removeClass('highlighted current-state');

        // Resaltar paso actual
        if (currentStep < steps.length) {
            const step = steps[currentStep];
            const currentStateId = step.currentState || (step.currentStates && step.currentStates[0]);
            
            if (currentStateId !== undefined) {
                this.cy.$(`#state-${currentStateId}`).addClass('current-state');
            }
        }
    }

    /**
     * Obtiene estilos para Cytoscape.js
     * @returns {Array} Estilos de Cytoscape
     */
    getCytoscapeStyle() {
        return [
            {
                selector: 'node',
                style: {
                    'background-color': this.config.node.fillColor,
                    'border-color': this.config.node.strokeColor,
                    'border-width': this.config.node.strokeWidth,
                    'label': 'data(label)',
                    'text-valign': 'center',
                    'color': this.config.text.nodeColor,
                    'font-size': this.config.text.fontSize,
                    'font-family': this.config.text.fontFamily
                }
            },
            {
                selector: 'node[isStart]',
                style: {
                    'background-color': this.config.node.startColor
                }
            },
            {
                selector: 'node[isAccepting]',
                style: {
                    'border-width': this.config.node.acceptingStrokeWidth,
                    'background-color': this.config.node.acceptingColor
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': this.config.edge.strokeWidth,
                    'line-color': this.config.edge.strokeColor,
                    'target-arrow-color': this.config.edge.strokeColor,
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier',
                    'label': 'data(label)',
                    'text-rotation': 'autorotate',
                    'color': this.config.text.edgeColor,
                    'font-size': this.config.text.fontSize
                }
            },
            {
                selector: '.current-state',
                style: {
                    'background-color': this.config.node.highlightColor,
                    'border-color': this.config.node.highlightColor
                }
            },
            {
                selector: '.highlighted',
                style: {
                    'line-color': this.config.edge.highlightColor,
                    'target-arrow-color': this.config.edge.highlightColor,
                    'width': this.config.edge.highlightWidth
                }
            }
        ];
    }

    /**
     * Funciones de arrastre para D3.js
     */
    dragstarted(event, d) {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    dragended(event, d) {
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    /**
     * Exporta la visualización como imagen
     * @param {string} format - Formato de imagen ('png', 'svg')
     * @returns {string} URL de la imagen
     */
    exportAsImage(format = 'png') {
        if (this.library === 'd3') {
            return this.exportD3AsImage(format);
        } else if (this.library === 'cytoscape') {
            return this.exportCytoscapeAsImage(format);
        }
    }

    /**
     * Exporta visualización D3 como imagen
     * @param {string} format - Formato
     * @returns {string} URL de la imagen
     */
    exportD3AsImage(format) {
        const svgNode = this.svg.node();
        
        if (format === 'svg') {
            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(svgNode);
            const blob = new Blob([svgString], { type: 'image/svg+xml' });
            return URL.createObjectURL(blob);
        } else if (format === 'png') {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            const data = new XMLSerializer().serializeToString(svgNode);
            const img = new Image();
            
            return new Promise((resolve) => {
                img.onload = () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    context.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/png'));
                };
                img.src = 'data:image/svg+xml;base64,' + btoa(data);
            });
        }
    }

    /**
     * Exporta visualización Cytoscape como imagen
     * @param {string} format - Formato
     * @returns {string} URL de la imagen
     */
    exportCytoscapeAsImage(format) {
        if (format === 'png') {
            return this.cy.png({ output: 'blob-promise' });
        } else if (format === 'jpg') {
            return this.cy.jpg({ output: 'blob-promise' });
        }
    }

    /**
     * Redimensiona la visualización
     * @param {number} width - Nuevo ancho
     * @param {number} height - Nueva altura
     */
    resize(width, height) {
        this.config.width = width;
        this.config.height = height;

        if (this.library === 'd3' && this.svg) {
            this.svg
                .attr('width', width)
                .attr('height', height);
                
            if (this.simulation) {
                this.simulation
                    .force('center', d3.forceCenter(width / 2, height / 2))
                    .alpha(0.3)
                    .restart();
            }
        } else if (this.library === 'cytoscape' && this.cy) {
            this.cy.resize();
        }
    }

    /**
     * Limpia la visualización
     */
    clear() {
        if (this.library === 'd3' && this.svg) {
            this.svg.selectAll('*').remove();
            if (this.simulation) {
                this.simulation.stop();
                this.simulation = null;
            }
        } else if (this.library === 'cytoscape' && this.cy) {
            this.cy.elements().remove();
        }
        
        this.currentAutomaton = null;
        this.highlightedPath = [];
    }

    /**
     * Obtiene información sobre el nodo clickeado
     * @param {Function} callback - Función a llamar cuando se clickea un nodo
     */
    onNodeClick(callback) {
        if (this.library === 'd3') {
            this.svg.selectAll('.node')
                .on('click', (event, d) => {
                    callback({
                        id: d.id,
                        isStart: d.isStart,
                        isAccepting: d.isAccepting,
                        position: { x: d.x, y: d.y }
                    });
                });
        } else if (this.library === 'cytoscape') {
            this.cy.on('tap', 'node', (event) => {
                const node = event.target;
                callback({
                    id: node.data('label'),
                    isStart: node.data('isStart'),
                    isAccepting: node.data('isAccepting'),
                    position: node.position()
                });
            });
        }
    }

    /**
     * Anima la simulación paso a paso
     * @param {Array} steps - Pasos de la simulación
     * @param {Object} options - Opciones de animación
     * @returns {Promise} Promesa que se resuelve cuando termina la animación
     */
    animateSimulation(steps, options = {}) {
        const {
            speed = 1000,
            autoPlay = true,
            showStepInfo = true
        } = options;

        return new Promise((resolve) => {
            let currentStep = 0;
            
            const animate = () => {
                if (currentStep < steps.length) {
                    this.highlightSimulationPath(steps, currentStep);
                    
                    if (showStepInfo) {
                        this.displayStepInfo(steps[currentStep], currentStep);
                    }
                    
                    currentStep++;
                    
                    if (autoPlay) {
                        setTimeout(animate, speed);
                    }
                } else {
                    resolve();
                }
            };

            animate();
        });
    }

    /**
     * Muestra información del paso actual
     * @param {Object} step - Paso de simulación
     * @param {number} stepNumber - Número del paso
     */
    displayStepInfo(step, stepNumber) {
        // Crear o actualizar elemento de información
        let infoElement = document.getElementById('simulation-info');
        
        if (!infoElement) {
            infoElement = document.createElement('div');
            infoElement.id = 'simulation-info';
            infoElement.style.cssText = `
                position: absolute;
                top: 10px;
                right: 10px;
                background: rgba(255, 255, 255, 0.9);
                padding: 10px;
                border: 1px solid #ccc;
                border-radius: 5px;
                font-family: Arial, sans-serif;
                font-size: 12px;
                max-width: 250px;
                z-index: 1000;
            `;
            this.container.style.position = 'relative';
            this.container.appendChild(infoElement);
        }

        // Actualizar contenido
        infoElement.innerHTML = `
            <strong>Paso ${stepNumber + 1}</strong><br>
            Estado: ${step.currentState || step.currentStates}<br>
            ${step.symbol ? `Símbolo: ${step.symbol}<br>` : ''}
            ${step.remainingInput !== undefined ? `Entrada restante: "${step.remainingInput}"<br>` : ''}
            Acción: ${step.action}
        `;
    }

    /**
     * Aplica un layout específico
     * @param {string} layoutName - Nombre del layout
     * @param {Object} options - Opciones del layout
     */
    applyLayout(layoutName, options = {}) {
        if (this.library === 'cytoscape' && this.cy) {
            const layoutOptions = {
                name: layoutName,
                directed: true,
                ...options
            };
            
            this.cy.layout(layoutOptions).run();
        } else if (this.library === 'd3') {
            // Para D3, podemos ajustar las fuerzas de la simulación
            if (this.simulation) {
                switch (layoutName) {
                    case 'hierarchical':
                        this.simulation
                            .force('y', d3.forceY(d => d.isStart ? 100 : 300).strength(0.3));
                        break;
                    case 'circular':
                        this.simulation
                            .force('radial', d3.forceRadial(200, this.config.width / 2, this.config.height / 2));
                        break;
                    case 'force':
                    default:
                        // Layout por defecto (ya aplicado)
                        break;
                }
                this.simulation.alpha(0.3).restart();
            }
        }
    }

    /**
     * Obtiene estadísticas de la visualización actual
     * @returns {Object} Estadísticas
     */
    getVisualizationStats() {
        if (!this.currentAutomaton) {
            return null;
        }

        return {
            nodes: this.currentAutomaton.states.size,
            edges: this.countTransitions(),
            alphabet: this.currentAutomaton.getAlphabet().length,
            startState: this.currentAutomaton.startState ? this.currentAutomaton.startState.id : null,
            acceptingStates: this.currentAutomaton.acceptStates.size,
            type: this.currentAutomaton.type,
            library: this.library
        };
    }

    /**
     * Cuenta las transiciones del autómata actual
     * @returns {number} Número de transiciones
     */
    countTransitions() {
        if (!this.currentAutomaton) return 0;
        
        let count = 0;
        this.currentAutomaton.states.forEach(state => {
            state.transitions.forEach(targets => {
                count += targets.size;
            });
            count += state.epsilonTransitions.size;
        });
        return count;
    }

    /**
     * Configura el tema de visualización
     * @param {string} theme - Tema ('light', 'dark', 'colorful')
     */
    setTheme(theme) {
        const themes = {
            light: {
                background: '#fafafa',
                nodeColor: '#e8f4f8',
                nodeStroke: '#2196F3',
                edgeColor: '#666',
                textColor: '#333'
            },
            dark: {
                background: '#2d2d2d',
                nodeColor: '#4a4a4a',
                nodeStroke: '#64B5F6',
                edgeColor: '#ccc',
                textColor: '#fff'
            },
            colorful: {
                background: '#f0f8ff',
                nodeColor: '#FFE082',
                nodeStroke: '#FF5722',
                edgeColor: '#9C27B0',
                textColor: '#1A237E'
            }
        };

        if (themes[theme]) {
            Object.assign(this.config.node, {
                fillColor: themes[theme].nodeColor,
                strokeColor: themes[theme].nodeStroke
            });
            Object.assign(this.config.edge, {
                strokeColor: themes[theme].edgeColor
            });
            Object.assign(this.config.text, {
                nodeColor: themes[theme].textColor,
                edgeColor: themes[theme].textColor
            });

            // Aplicar cambios
            if (this.library === 'd3' && this.svg) {
                this.svg.style('background-color', themes[theme].background);
            }
        }
    }

    /**
     * Obtiene información sobre layouts disponibles
     * @returns {Object} Información de layouts
     */
    getAvailableLayouts() {
        const common = {
            force: 'Layout basado en fuerzas físicas',
            hierarchical: 'Layout jerárquico en niveles'
        };

        if (this.library === 'cytoscape') {
            return {
                ...common,
                breadthfirst: 'Recorrido en amplitud',
                circle: 'Disposición circular',
                concentric: 'Círculos concéntricos',
                grid: 'Grilla regular',
                random: 'Posiciones aleatorias'
            };
        } else {
            return {
                ...common,
                circular: 'Disposición circular',
                radial: 'Disposición radial'
            };
        }
    }
}

export default GraphVisualizer;