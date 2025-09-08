import Automaton from '../models/Automaton.js';
import State from '../models/State.js';

/**
 * Implementacion del algoritmo de minimizacion de Hopcroft
 * para obtener el AFD minimo eliminando estados equivalentes
 */
class HopcroftMinimization {
    constructor() {
        this.partitions = []; // Particiones actuales
        this.workList = []; // Lista de trabajo para refinamiento
        this.stateToPartition = new Map(); // Mapeo estado -> particion
    }

    /**
     * Minimiza un AFD usando el algoritmo de Hopcroft
     * @param {Automaton} dfa - AFD de entrada
     * @returns {Automaton} AFD minimo
     */
    minimize(dfa) {
        if (dfa.type !== 'DFA') {
            throw new Error('El automata de entrada debe ser un AFD');
        }

        // Paso 1: Eliminar estados inalcanzables
        const reachableDFA = this.removeUnreachableStates(dfa);
        
        // Si el AFD esta vacio o tiene un solo estado, ya es minimo
        if (reachableDFA.states.size <= 1) {
            reachableDFA.type = 'MinDFA';
            return reachableDFA;
        }

        // Paso 2: Inicializar particiones
        this.initializePartitions(reachableDFA);

        // Paso 3: Refinar particiones
        this.refinePartitions(reachableDFA);

        // Paso 4: Construir AFD minimo
        const minDFA = this.buildMinimalDFA(reachableDFA);
        
        return minDFA;
    }

    /**
     * Minimiza con informacion detallada del proceso
     * @param {Automaton} dfa - AFD de entrada
     * @returns {Object} Resultado completo de la minimizacion
     */
    minimizeWithSteps(dfa) {
        try {
            const steps = [];
            
            // Paso 1: Eliminar estados inalcanzables
            const reachableDFA = this.removeUnreachableStates(dfa);
            
            steps.push({
                step: 1,
                action: 'Eliminacion de estados inalcanzables',
                originalStates: dfa.states.size,
                reachableStates: reachableDFA.states.size,
                removedStates: dfa.states.size - reachableDFA.states.size
            });

            if (reachableDFA.states.size <= 1) {
                steps.push({
                    step: 2,
                    action: 'AFD ya es minimo (≤1 estado)',
                    finalPartitions: this.partitions.length
                });
                
                return {
                    success: true,
                    originalDFA: dfa,
                    minimalDFA: reachableDFA,
                    steps: steps,
                    statistics: this.getStatistics(dfa, reachableDFA)
                };
            }

            // Paso 2: Inicializar particiones
            this.initializePartitions(reachableDFA);
            
            steps.push({
                step: 2,
                action: 'Inicializacion de particiones',
                partitions: this.partitions.map(p => this.partitionToString(p)),
                partitionCount: this.partitions.length
            });

            // Paso 3: Refinar particiones con pasos detallados
            const refinementSteps = this.refinePartitionsWithSteps(reachableDFA);
            steps.push(...refinementSteps);

            // Paso 4: Construir AFD minimo
            const minDFA = this.buildMinimalDFA(reachableDFA);
            
            steps.push({
                step: steps.length + 1,
                action: 'Construccion del AFD minimo',
                finalPartitions: this.partitions.map(p => this.partitionToString(p)),
                minimalStates: minDFA.states.size
            });

            return {
                success: true,
                originalDFA: dfa,
                reachableDFA: reachableDFA,
                minimalDFA: minDFA,
                steps: steps,
                partitionHistory: this.partitions.map(p => this.partitionToString(p)),
                stateMapping: this.getStateMapping(),
                statistics: this.getStatistics(dfa, minDFA)
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                minimalDFA: null
            };
        }
    }

    /**
     * Elimina estados inalcanzables del AFD
     * @param {Automaton} dfa - AFD original
     * @returns {Automaton} AFD con solo estados alcanzables
     */
    removeUnreachableStates(dfa) {
        const reachableStates = new Set();
        const queue = [dfa.startState];
        reachableStates.add(dfa.startState);

        // BFS para encontrar estados alcanzables
        while (queue.length > 0) {
            const currentState = queue.shift();
            
            currentState.transitions.forEach(targetStates => {
                targetStates.forEach(targetState => {
                    if (!reachableStates.has(targetState)) {
                        reachableStates.add(targetState);
                        queue.push(targetState);
                    }
                });
            });
        }

        // Si todos los estados son alcanzables, retornar el original
        if (reachableStates.size === dfa.states.size) {
            return dfa;
        }

        // Crear nuevo AFD con solo estados alcanzables
        const newDFA = new Automaton('DFA');
        const stateMapping = new Map();

        // Copiar estados alcanzables manteniendo IDs originales
        reachableStates.forEach(oldState => {
            const newState = new State(oldState.id, oldState.isAccepting);
            newDFA.addState(newState);
            stateMapping.set(oldState, newState);
            
            if (oldState === dfa.startState) {
                newDFA.setStartState(newState);
            }
        });

        // Copiar transiciones
        reachableStates.forEach(oldState => {
            const newFromState = stateMapping.get(oldState);
            
            oldState.transitions.forEach((targetStates, symbol) => {
                targetStates.forEach(oldTargetState => {
                    if (reachableStates.has(oldTargetState)) {
                        const newTargetState = stateMapping.get(oldTargetState);
                        newDFA.addTransition(newFromState, symbol, newTargetState);
                    }
                });
            });
        });

        return newDFA;
    }

    /**
     * Inicializa las particiones: estados de aceptacion vs no aceptacion
     * @param {Automaton} dfa - AFD a particionar
     */
    initializePartitions(dfa) {
        this.partitions = [];
        this.workList = [];
        this.stateToPartition.clear();

        const acceptingStates = new Set();
        const nonAcceptingStates = new Set();

        // Separar estados de aceptacion y no aceptacion
        dfa.states.forEach(state => {
            if (state.isAccepting) {
                acceptingStates.add(state);
            } else {
                nonAcceptingStates.add(state);
            }
        });

        // Crear particiones iniciales
        if (nonAcceptingStates.size > 0) {
            this.partitions.push(nonAcceptingStates);
            nonAcceptingStates.forEach(state => {
                this.stateToPartition.set(state, 0);
            });
        }

        if (acceptingStates.size > 0) {
            const acceptingPartitionIndex = this.partitions.length;
            this.partitions.push(acceptingStates);
            acceptingStates.forEach(state => {
                this.stateToPartition.set(state, acceptingPartitionIndex);
            });
        }

        // Inicializar lista de trabajo
        for (let i = 0; i < this.partitions.length; i++) {
            for (const symbol of dfa.getAlphabet()) {
                this.workList.push({ partition: i, symbol: symbol });
            }
        }
    }

    /**
     * Refina las particiones hasta que no se puedan refinar mas
     * @param {Automaton} dfa - AFD a minimizar
     */
    refinePartitions(dfa) {
        while (this.workList.length > 0) {
            const { partition: splitterIndex, symbol } = this.workList.shift();
            
            if (splitterIndex >= this.partitions.length) {
                continue; // Particion ya no existe
            }
            
            const splitter = this.partitions[splitterIndex];
            this.split(dfa, splitter, symbol);
        }
    }

    /**
     * Refina particiones con pasos detallados
     * @param {Automaton} dfa - AFD a minimizar
     * @returns {Array} Pasos del refinamiento
     */
    refinePartitionsWithSteps(dfa) {
        const steps = [];
        let stepNumber = 3;

        while (this.workList.length > 0) {
            const { partition: splitterIndex, symbol } = this.workList.shift();
            
            if (splitterIndex >= this.partitions.length) {
                continue;
            }
            
            const splitter = this.partitions[splitterIndex];
            const oldPartitionCount = this.partitions.length;
            
            this.split(dfa, splitter, symbol);
            
            if (this.partitions.length > oldPartitionCount) {
                steps.push({
                    step: stepNumber++,
                    action: `Refinamiento con particion ${splitterIndex} y simbolo '${symbol}'`,
                    splitter: this.partitionToString(splitter),
                    symbol: symbol,
                    partitionsBefore: oldPartitionCount,
                    partitionsAfter: this.partitions.length,
                    newPartitions: this.partitions.slice(oldPartitionCount).map(p => this.partitionToString(p))
                });
            }
        }

        return steps;
    }

    /**
     * Divide particiones basandose en un splitter y simbolo
     * @param {Automaton} dfa - AFD
     * @param {Set<State>} splitter - Particion splitter
     * @param {string} symbol - Simbolo para dividir
     */
    split(dfa, splitter, symbol) {
        const newPartitions = [];
        const indicesToRemove = [];

        for (let i = 0; i < this.partitions.length; i++) {
            const partition = this.partitions[i];
            
            if (partition === splitter) {
                newPartitions.push(partition);
                continue;
            }

            // Dividir la particion en dos grupos
            const goesToSplitter = new Set();
            const doesNotGoToSplitter = new Set();

            partition.forEach(state => {
                const targetStates = state.getTransitions(symbol);
                let goesToSplitterFlag = false;

                targetStates.forEach(targetState => {
                    if (splitter.has(targetState)) {
                        goesToSplitterFlag = true;
                    }
                });

                if (goesToSplitterFlag) {
                    goesToSplitter.add(state);
                } else {
                    doesNotGoToSplitter.add(state);
                }
            });

            // Si la particion se divide
            if (goesToSplitter.size > 0 && doesNotGoToSplitter.size > 0) {
                indicesToRemove.push(i);
                
                // Añadir nuevas particiones
                newPartitions.push(goesToSplitter);
                newPartitions.push(doesNotGoToSplitter);
                
                // Actualizar lista de trabajo
                for (const sym of dfa.getAlphabet()) {
                    this.workList.push({ 
                        partition: this.partitions.length + newPartitions.length - 2, 
                        symbol: sym 
                    });
                    this.workList.push({ 
                        partition: this.partitions.length + newPartitions.length - 1, 
                        symbol: sym 
                    });
                }
            } else {
                newPartitions.push(partition);
            }
        }

        // Actualizar particiones
        const oldPartitions = [...this.partitions];
        this.partitions = newPartitions;

        // Actualizar mapeo estado -> particion
        this.stateToPartition.clear();
        this.partitions.forEach((partition, index) => {
            partition.forEach(state => {
                this.stateToPartition.set(state, index);
            });
        });
    }

    /**
     * Construye el AFD minimo a partir de las particiones finales
     * @param {Automaton} dfa - AFD original
     * @returns {Automaton} AFD minimo
     */
    buildMinimalDFA(dfa) {
        const minDFA = new Automaton('MinDFA');
        const partitionToState = new Map();

        // Crear estados del AFD minimo (uno por particion)
        this.partitions.forEach((partition, index) => {
            // Determinar si la particion es de aceptacion
            const isAccepting = Array.from(partition).some(state => state.isAccepting);
            const newState = minDFA.createState(isAccepting);
            newState.id = index;
            partitionToState.set(index, newState);

            // Si la particion contiene el estado inicial, este es el nuevo estado inicial
            if (partition.has(dfa.startState)) {
                minDFA.setStartState(newState);
            }
        });

        // Crear transiciones del AFD minimo
        this.partitions.forEach((partition, fromIndex) => {
            const fromState = partitionToState.get(fromIndex);
            const representative = Array.from(partition)[0]; // Representante de la particion

            dfa.getAlphabet().forEach(symbol => {
                const targetStates = representative.getTransitions(symbol);
                if (targetStates.size > 0) {
                    const targetState = targetStates.values().next().value;
                    const toIndex = this.stateToPartition.get(targetState);
                    const toState = partitionToState.get(toIndex);
                    
                    minDFA.addTransition(fromState, symbol, toState);
                }
            });
        });

        return minDFA;
    }

    /**
     * Convierte una particion a string para visualizacion
     * @param {Set<State>} partition - Particion a convertir
     * @returns {string} Representacion en string
     */
    partitionToString(partition) {
        const stateIds = Array.from(partition).map(state => state.id).sort((a, b) => a - b);
        return `{${stateIds.join(',')}}`;
    }

    /**
     * Obtiene el mapeo de estados originales a estados minimos
     * @returns {Object} Mapeo de estados
     */
    getStateMapping() {
        const mapping = {};
        
        this.partitions.forEach((partition, partitionIndex) => {
            const originalStates = Array.from(partition).map(s => s.id).sort((a, b) => a - b);
            mapping[partitionIndex] = {
                minimalState: partitionIndex,
                originalStates: originalStates,
                isAccepting: Array.from(partition).some(state => state.isAccepting)
            };
        });
        
        return mapping;
    }

    /**
     * Obtiene estadisticas de la minimizacion
     * @param {Automaton} originalDFA - AFD original
     * @param {Automaton} minimalDFA - AFD minimo
     * @returns {Object} Estadisticas
     */
    getStatistics(originalDFA, minimalDFA) {
        const originalTransitions = this.countTransitions(originalDFA);
        const minimalTransitions = this.countTransitions(minimalDFA);
        
        return {
            originalStates: originalDFA.states.size,
            minimalStates: minimalDFA.states.size,
            stateReduction: originalDFA.states.size - minimalDFA.states.size,
            stateReductionPercent: ((originalDFA.states.size - minimalDFA.states.size) / originalDFA.states.size * 100).toFixed(2) + '%',
            originalTransitions: originalTransitions,
            minimalTransitions: minimalTransitions,
            transitionReduction: originalTransitions - minimalTransitions,
            alphabetSize: originalDFA.alphabet.size,
            partitionCount: this.partitions.length
        };
    }

    /**
     * Cuenta transiciones en un automata
     * @param {Automaton} automaton - Automata a analizar
     * @returns {number} Numero de transiciones
     */
    countTransitions(automaton) {
        let count = 0;
        automaton.states.forEach(state => {
            state.transitions.forEach(targets => {
                count += targets.size;
            });
        });
        return count;
    }

    /**
     * Funcion de utilidad para probar el algoritmo
     * @param {Array<Automaton>} testDFAs - AFDs de prueba
     */
    runTests(testDFAs) {
        console.log('=== PRUEBAS MINIMIZACIoN HOPCROFT ===\n');
        
        testDFAs.forEach((dfa, index) => {
            console.log(`Prueba ${index + 1}:`);
            
            const result = this.minimizeWithSteps(dfa);
            
            if (result.success) {
                console.log(`✓ Minimizacion exitosa`);
                console.log(`  Original: ${result.statistics.originalStates} estados`);
                console.log(`  Minimo: ${result.statistics.minimalStates} estados`);
                console.log(`  Reduccion: ${result.statistics.stateReduction} estados (${result.statistics.stateReductionPercent})`);
                
                console.log(`  Mapeo final:`);
                Object.values(result.stateMapping).forEach(mapping => {
                    console.log(`    ${mapping.minimalState} ← {${mapping.originalStates.join(',')}}${mapping.isAccepting ? ' (aceptacion)' : ''}`);
                });
                
            } else {
                console.log(`✗ Error: ${result.error}`);
            }
            console.log('');
        });
    }
}

export default HopcroftMinimization;