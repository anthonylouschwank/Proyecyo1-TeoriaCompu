/**
 * Utilidades para exportar autómatas en diferentes formatos
 */
class FileExporter {
    constructor() {
        this.supportedFormats = ['json', 'txt', 'yml', 'yaml', 'csv', 'dot'];
    }

    /**
     * Exporta un autómata en el formato especificado
     * @param {Automaton} automaton - Autómata a exportar
     * @param {string} format - Formato de exportación
     * @param {string} filename - Nombre del archivo (opcional)
     * @returns {Object} Resultado de la exportación
     */
    exportAutomaton(automaton, format = 'json', filename = null) {
        try {
            format = format.toLowerCase();
            
            if (!this.supportedFormats.includes(format)) {
                throw new Error(`Formato no soportado: ${format}. Formatos válidos: ${this.supportedFormats.join(', ')}`);
            }

            const content = this.generateContent(automaton, format);
            const generatedFilename = filename || this.generateFilename(automaton, format);
            
            return {
                success: true,
                content: content,
                filename: generatedFilename,
                mimeType: this.getMimeType(format),
                size: content.length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                content: null
            };
        }
    }

    /**
     * Genera el contenido del archivo según el formato
     * @param {Automaton} automaton - Autómata a exportar
     * @param {string} format - Formato de exportación
     * @returns {string} Contenido del archivo
     */
    generateContent(automaton, format) {
        switch (format) {
            case 'json':
                return this.toJSON(automaton);
            case 'txt':
                return this.toText(automaton);
            case 'yml':
            case 'yaml':
                return this.toYAML(automaton);
            case 'csv':
                return this.toCSV(automaton);
            case 'dot':
                return this.toDOT(automaton);
            default:
                throw new Error(`Formato no implementado: ${format}`);
        }
    }

    /**
     * Convierte autómata a formato JSON
     * @param {Automaton} automaton - Autómata
     * @returns {string} Representación JSON
     */
    toJSON(automaton) {
        const data = this.extractAutomatonData(automaton);
        return JSON.stringify(data, null, 2);
    }

    /**
     * Convierte autómata a formato de texto plano (especificación del proyecto)
     * @param {Automaton} automaton - Autómata
     * @returns {string} Representación en texto
     */
    toText(automaton) {
        const data = this.extractAutomatonData(automaton);
        
        let content = '';
        content += `ESTADOS = {${data.ESTADOS.join(', ')}}\n`;
        content += `SIMBOLOS = {${data.SIMBOLOS.join(', ')}}\n`;
        content += `INICIO = {${data.INICIO}}\n`;
        content += `ACEPTACION = {${data.ACEPTACION.join(', ')}}\n`;
        
        const transitionStrings = data.TRANSICIONES.map(t => 
            `(${t.from}, ${t.symbol}, ${t.to})`
        );
        content += `TRANSICIONES = {${transitionStrings.join(', ')}}`;
        
        return content;
    }

    /**
     * Convierte autómata a formato YAML
     * @param {Automaton} automaton - Autómata
     * @returns {string} Representación YAML
     */
    toYAML(automaton) {
        const data = this.extractAutomatonData(automaton);
        
        let yaml = '';
        yaml += `# Autómata ${data.type}\n`;
        yaml += `type: ${data.type}\n`;
        yaml += `estados: [${data.ESTADOS.join(', ')}]\n`;
        yaml += `simbolos: [${data.SIMBOLOS.map(s => `"${s}"`).join(', ')}]\n`;
        yaml += `inicio: ${data.INICIO}\n`;
        yaml += `aceptacion: [${data.ACEPTACION.join(', ')}]\n`;
        yaml += `transiciones:\n`;
        
        data.TRANSICIONES.forEach(t => {
            yaml += `  - from: ${t.from}\n`;
            yaml += `    symbol: "${t.symbol}"\n`;
            yaml += `    to: ${t.to}\n`;
        });
        
        return yaml;
    }

    /**
     * Convierte autómata a formato CSV
     * @param {Automaton} automaton - Autómata
     * @returns {string} Representación CSV
     */
    toCSV(automaton) {
        const data = this.extractAutomatonData(automaton);
        
        let csv = '';
        
        // Información general
        csv += 'Tipo,Valor\n';
        csv += `Tipo de Autómata,${data.type}\n`;
        csv += `Estados,"${data.ESTADOS.join(';')}"\n`;
        csv += `Símbolos,"${data.SIMBOLOS.join(';')}"\n`;
        csv += `Estado Inicial,${data.INICIO}\n`;
        csv += `Estados de Aceptación,"${data.ACEPTACION.join(';')}"\n`;
        csv += '\n';
        
        // Transiciones
        csv += 'Estado Origen,Símbolo,Estado Destino\n';
        data.TRANSICIONES.forEach(t => {
            csv += `${t.from},${t.symbol},${t.to}\n`;
        });
        
        return csv;
    }

    /**
     * Convierte autómata a formato DOT (Graphviz)
     * @param {Automaton} automaton - Autómata
     * @returns {string} Representación DOT
     */
    toDOT(automaton) {
        const data = this.extractAutomatonData(automaton);
        
        let dot = 'digraph automaton {\n';
        dot += '  rankdir=LR;\n';
        dot += '  size="8,5";\n';
        dot += '  node [shape = circle];\n';
        
        // Estados de aceptación (doble círculo)
        if (data.ACEPTACION.length > 0) {
            dot += `  node [shape = doublecircle]; ${data.ACEPTACION.join(' ')};\n`;
            dot += '  node [shape = circle];\n';
        }
        
        // Estado inicial (flecha de entrada)
        dot += `  "" [shape=none];\n`;
        dot += `  "" -> ${data.INICIO};\n`;
        
        // Transiciones
        const transitionMap = new Map();
        data.TRANSICIONES.forEach(t => {
            const key = `${t.from}-${t.to}`;
            if (!transitionMap.has(key)) {
                transitionMap.set(key, []);
            }
            transitionMap.get(key).push(t.symbol);
        });
        
        transitionMap.forEach((symbols, key) => {
            const [from, to] = key.split('-');
            const label = symbols.join(', ');
            dot += `  ${from} -> ${to} [label="${label}"];\n`;
        });
        
        dot += '}';
        
        return dot;
    }

    /**
     * Extrae datos del autómata en formato estándar
     * @param {Automaton} automaton - Autómata
     * @returns {Object} Datos extraídos
     */
    extractAutomatonData(automaton) {
        const states = Array.from(automaton.states.keys()).sort((a, b) => a - b);
        const alphabet = automaton.getAlphabet().sort();
        const startState = automaton.startState ? automaton.startState.id : null;
        const acceptStates = Array.from(automaton.acceptStates).map(s => s.id).sort((a, b) => a - b);
        
        // Construir transiciones
        const transitions = [];
        automaton.states.forEach(state => {
            // Transiciones normales
            state.transitions.forEach((targetStates, symbol) => {
                targetStates.forEach(targetState => {
                    transitions.push({
                        from: state.id,
                        symbol: symbol,
                        to: targetState.id
                    });
                });
            });
            
            // Transiciones epsilon
            state.epsilonTransitions.forEach(targetState => {
                transitions.push({
                    from: state.id,
                    symbol: 'ε',
                    to: targetState.id
                });
            });
        });

        // Ordenar transiciones
        transitions.sort((a, b) => {
            if (a.from !== b.from) return a.from - b.from;
            if (a.symbol !== b.symbol) return a.symbol.localeCompare(b.symbol);
            return a.to - b.to;
        });

        return {
            type: automaton.type,
            ESTADOS: states,
            SIMBOLOS: alphabet,
            INICIO: startState,
            ACEPTACION: acceptStates,
            TRANSICIONES: transitions
        };
    }

    /**
     * Genera un nombre de archivo apropiado
     * @param {Automaton} automaton - Autómata
     * @param {string} format - Formato
     * @returns {string} Nombre de archivo
     */
    generateFilename(automaton, format) {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const type = automaton.type.toLowerCase();
        return `${type}_${timestamp}.${format}`;
    }

    /**
     * Obtiene el tipo MIME para el formato
     * @param {string} format - Formato
     * @returns {string} Tipo MIME
     */
    getMimeType(format) {
        const mimeTypes = {
            'json': 'application/json',
            'txt': 'text/plain',
            'yml': 'text/yaml',
            'yaml': 'text/yaml',
            'csv': 'text/csv',
            'dot': 'text/vnd.graphviz'
        };
        return mimeTypes[format] || 'text/plain';
    }

    /**
     * Descarga archivo en el navegador
     * @param {string} content - Contenido del archivo
     * @param {string} filename - Nombre del archivo
     * @param {string} mimeType - Tipo MIME
     */
    downloadFile(content, filename, mimeType = 'text/plain') {
        try {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Limpiar URL
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            return { success: true, message: `Archivo ${filename} descargado exitosamente` };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Exporta y descarga un autómata
     * @param {Automaton} automaton - Autómata a exportar
     * @param {string} format - Formato de exportación
     * @param {string} filename - Nombre del archivo (opcional)
     * @returns {Object} Resultado de la operación
     */
    exportAndDownload(automaton, format = 'json', filename = null) {
        const exportResult = this.exportAutomaton(automaton, format, filename);
        
        if (!exportResult.success) {
            return exportResult;
        }
        
        const downloadResult = this.downloadFile(
            exportResult.content,
            exportResult.filename,
            exportResult.mimeType
        );
        
        return {
            success: downloadResult.success,
            message: downloadResult.success ? downloadResult.message : downloadResult.error,
            exportResult: exportResult
        };
    }

    /**
     * Exporta múltiples autómatas en un archivo ZIP (simulado)
     * @param {Array<Object>} automata - Array de {automaton, name}
     * @param {string} format - Formato para todos los archivos
     * @returns {Object} Resultado de la exportación múltiple
     */
    exportMultiple(automata, format = 'json') {
        try {
            const results = [];
            
            automata.forEach(({ automaton, name }, index) => {
                const filename = name || `automaton_${index + 1}.${format}`;
                const result = this.exportAutomaton(automaton, format, filename);
                results.push({
                    name: name || `Autómata ${index + 1}`,
                    filename: filename,
                    success: result.success,
                    content: result.content,
                    error: result.error
                });
            });
            
            return {
                success: true,
                results: results,
                total: automata.length,
                successful: results.filter(r => r.success).length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                results: []
            };
        }
    }

    /**
     * Genera un reporte de conversión completo
     * @param {Object} conversionData - Datos de la conversión completa
     * @returns {string} Reporte en formato texto
     */
    generateConversionReport(conversionData) {
        const {
            originalRegex,
            postfix,
            nfa,
            dfa,
            minDFA,
            shuntingSteps,
            subsetSteps,
            hopcroftSteps,
            simulations
        } = conversionData;

        let report = '';
        report += '='.repeat(60) + '\n';
        report += '         REPORTE DE CONVERSIÓN DE AUTÓMATAS\n';
        report += '='.repeat(60) + '\n\n';

        // Información general
        report += `Expresión Regular Original: ${originalRegex}\n`;
        report += `Notación Postfija: ${postfix}\n`;
        report += `Fecha de Generación: ${new Date().toLocaleString()}\n\n`;

        // Estadísticas de autómatas
        report += 'ESTADÍSTICAS DE AUTÓMATAS:\n';
        report += '-'.repeat(30) + '\n';
        report += `AFN (Thompson):\n`;
        report += `  - Estados: ${nfa.states.size}\n`;
        report += `  - Transiciones: ${this.countTransitions(nfa)}\n`;
        report += `  - Alfabeto: {${nfa.getAlphabet().join(', ')}}\n\n`;

        if (dfa) {
            report += `AFD (Construcción de Subconjuntos):\n`;
            report += `  - Estados: ${dfa.states.size}\n`;
            report += `  - Transiciones: ${this.countTransitions(dfa)}\n`;
            report += `  - Reducción desde AFN: ${((nfa.states.size - dfa.states.size) / nfa.states.size * 100).toFixed(1)}%\n\n`;
        }

        if (minDFA) {
            report += `AFD Mínimo (Hopcroft):\n`;
            report += `  - Estados: ${minDFA.states.size}\n`;
            report += `  - Transiciones: ${this.countTransitions(minDFA)}\n`;
            report += `  - Reducción desde AFD: ${dfa ? ((dfa.states.size - minDFA.states.size) / dfa.states.size * 100).toFixed(1) : '0'}%\n`;
            report += `  - Reducción total: ${((nfa.states.size - minDFA.states.size) / nfa.states.size * 100).toFixed(1)}%\n\n`;
        }

        // Pasos de algoritmos
        if (shuntingSteps && shuntingSteps.length > 0) {
            report += 'PASOS SHUNTING YARD:\n';
            report += '-'.repeat(30) + '\n';
            shuntingSteps.forEach(step => {
                report += `${step.step}. ${step.description}: ${step.expression}\n`;
            });
            report += '\n';
        }

        // Simulaciones
        if (simulations && simulations.length > 0) {
            report += 'SIMULACIONES:\n';
            report += '-'.repeat(30) + '\n';
            simulations.forEach((sim, index) => {
                report += `Cadena ${index + 1}: "${sim.input}"\n`;
                report += `Resultado: ${sim.accepted ? 'ACEPTADA' : 'RECHAZADA'}\n`;
                report += `Pasos: ${sim.steps.length}\n`;
                if (sim.steps.length <= 10) {
                    sim.steps.forEach(step => {
                        report += `  ${step.step}. Estado: ${step.currentState || step.currentStates} - ${step.action}\n`;
                    });
                }
                report += '\n';
            });
        }

        // Autómatas en formato texto
        report += 'DEFINICIONES FORMALES:\n';
        report += '-'.repeat(30) + '\n';
        report += 'AFN (Thompson):\n';
        report += this.toText(nfa) + '\n\n';

        if (dfa) {
            report += 'AFD (Construcción de Subconjuntos):\n';
            report += this.toText(dfa) + '\n\n';
        }

        if (minDFA) {
            report += 'AFD Mínimo (Hopcroft):\n';
            report += this.toText(minDFA) + '\n\n';
        }

        report += '='.repeat(60) + '\n';
        report += 'Fin del reporte\n';

        return report;
    }

    /**
     * Cuenta el número de transiciones en un autómata
     * @param {Automaton} automaton - Autómata
     * @returns {number} Número de transiciones
     */
    countTransitions(automaton) {
        let count = 0;
        automaton.states.forEach(state => {
            state.transitions.forEach(targets => {
                count += targets.size;
            });
            count += state.epsilonTransitions.size;
        });
        return count;
    }

    /**
     * Obtiene información sobre formatos soportados
     * @returns {Object} Información de formatos
     */
    getFormatInfo() {
        return {
            json: {
                name: 'JSON',
                description: 'Formato JavaScript Object Notation',
                extension: 'json',
                mimeType: 'application/json',
                features: ['Estructura completa', 'Fácil parsing', 'Intercambio de datos']
            },
            txt: {
                name: 'Texto Plano',
                description: 'Formato especificado en el proyecto',
                extension: 'txt',
                mimeType: 'text/plain',
                features: ['Formato del proyecto', 'Legible por humanos', 'Fácil edición']
            },
            yaml: {
                name: 'YAML',
                description: 'YAML Ain\'t Markup Language',
                extension: 'yml',
                mimeType: 'text/yaml',
                features: ['Legible por humanos', 'Estructura jerárquica', 'Comentarios']
            },
            csv: {
                name: 'CSV',
                description: 'Comma Separated Values',
                extension: 'csv',
                mimeType: 'text/csv',
                features: ['Compatible con Excel', 'Fácil importación', 'Formato tabular']
            },
            dot: {
                name: 'Graphviz DOT',
                description: 'Formato para visualización de grafos',
                extension: 'dot',
                mimeType: 'text/vnd.graphviz',
                features: ['Visualización gráfica', 'Compatible con Graphviz', 'Diagramas automáticos']
            }
        };
    }
}

export default FileExporter;