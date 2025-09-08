import Automaton from '../models/Automaton.js';
import State from '../models/State.js';

/**
 * Implementacion del algoritmo de Construccion de Subconjuntos
 * para convertir un AFN en AFD
 */
class SubsetConstruction {
    constructor() {
        this.stateSetToId = new Map(); // Mapeo de conjuntos de estados a IDs
        this.idToStateSet = new Map(); // Mapeo inverso: ID a conjunto de estados
        this.nextStateId = 0;
    }

    /**
     * Convierte un AFN en AFD usando construccion de subconjuntos
     * @param {Automaton} nfa - AFN de entrada
     * @returns {Automaton} AFD resultante
     */
    convertToDFA(nfa) {
        if (nfa.type !== 'NFA') {
            throw new Error('El automata de entrada debe ser un AFN');
        }

        // Reiniciar contadores para nueva conversion
        this.stateSetToId.clear();
        this.idToStateSet.clear();
        this.nextStateId = 0;

        const dfa = new Automaton('DFA');
        const unmarkedStates = []; // Cola de estados por procesar
        const markedStates = new Set(); // Estados ya procesados

        // Paso 1: Calcular estado inicial del AFD
        const initialClosure = nfa.epsilonClosure(new Set([nfa.startState]));
        const initialStateId = this.getStateId(initialClosure);
        const initialDFAState = dfa.createState(this.isAcceptingSet(initialClosure));
        initialDFAState.id = initialStateId;
        dfa.states.set(initialStateId, initialDFAState);
        dfa.setStartState(initialDFAState);
        
        unmarkedStates.push(initialClosure);

        // Paso 2: Procesar todos los estados
        while (unmarkedStates.length > 0) {
            const currentStateSet = unmarkedStates.shift();
            const currentStateId = this.getStateId(currentStateSet);
            markedStates.add(this.stateSetToString(currentStateSet));

            // Para cada simbolo del alfabeto
            for (const symbol of nfa.getAlphabet()) {
                // Calcular move(currentStateSet, symbol)
                const moveResult = this.move(currentStateSet, symbol);
                
                if (moveResult.size === 0) {
                    continue; // No hay transicion para este simbolo
                }

                // Calcular clausura epsilon del resultado
                const newStateSet = nfa.epsilonClosure(moveResult);
                const newStateSetString = this.stateSetToString(newStateSet);

                // Si este conjunto de estados no ha sido visto antes
                if (!this.stateSetToId.has(newStateSetString)) {
                    const newStateId = this.getStateId(newStateSet);
                    const newDFAState = dfa.createState(this.isAcceptingSet(newStateSet));
                    newDFAState.id = newStateId;
                    dfa.states.set(newStateId, newDFAState);
                    
                    unmarkedStates.push(newStateSet);
                }

                // Añadir transicion en el AFD
                const fromState = dfa.getState(currentStateId);
                const toStateId = this.stateSetToId.get(newStateSetString);
                const toState = dfa.getState(toStateId);
                
                dfa.addTransition(fromState, symbol, toState);
            }
        }

        return dfa;
    }

    /**
     * Calcula move(states, symbol) - estados alcanzables desde states con symbol
     * @param {Set<State>} states - Conjunto de estados
     * @param {string} symbol - Simbolo de entrada
     * @returns {Set<State>} Estados alcanzables
     */
    move(states, symbol) {
        const result = new Set();
        
        states.forEach(state => {
            const transitions = state.getTransitions(symbol);
            transitions.forEach(targetState => {
                result.add(targetState);
            });
        });
        
        return result;
    }

    /**
     * Verifica si un conjunto de estados contiene al menos un estado de aceptacion
     * @param {Set<State>} stateSet - Conjunto de estados
     * @returns {boolean} True si es conjunto de aceptacion
     */
    isAcceptingSet(stateSet) {
        for (const state of stateSet) {
            if (state.isAccepting) {
                return true;
            }
        }
        return false;
    }

    /**
     * Obtiene o crea un ID unico para un conjunto de estados
     * @param {Set<State>} stateSet - Conjunto de estados
     * @returns {number} ID unico
     */
    getStateId(stateSet) {
        const stateSetString = this.stateSetToString(stateSet);
        
        if (!this.stateSetToId.has(stateSetString)) {
            const newId = this.nextStateId++;
            this.stateSetToId.set(stateSetString, newId);
            this.idToStateSet.set(newId, stateSet);
        }
        
        return this.stateSetToId.get(stateSetString);
    }

    /**
     * Convierte un conjunto de estados a string para usarlo como clave
     * @param {Set<State>} stateSet - Conjunto de estados
     * @returns {string} Representacion en string
     */
    stateSetToString(stateSet) {
        const stateIds = Array.from(stateSet).map(state => state.id).sort((a, b) => a - b);
        return `{${stateIds.join(',')}}`;
    }

    /**
     * Convierte un AFN a AFD con informacion detallada del proceso
     * @param {Automaton} nfa - AFN de entrada
     * @returns {Object} Resultado completo de la conversion
     */
    convertWithSteps(nfa) {
        try {
            // Reiniciar para nueva conversion
            this.stateSetToId.clear();
            this.idToStateSet.clear();
            this.nextStateId = 0;

            const steps = [];
            const dfa = new Automaton('DFA');
            const unmarkedStates = [];
            const markedStates = new Set();

            // Paso 1: Estado inicial
            const initialClosure = nfa.epsilonClosure(new Set([nfa.startState]));
            const initialStateId = this.getStateId(initialClosure);
            const initialDFAState = dfa.createState(this.isAcceptingSet(initialClosure));
            initialDFAState.id = initialStateId;
            dfa.states.set(initialStateId, initialDFAState);
            dfa.setStartState(initialDFAState);
            
            unmarkedStates.push(initialClosure);

            steps.push({
                step: 1,
                action: 'Estado inicial del AFD',
                currentState: this.stateSetToString(initialClosure),
                epsilonClosure: this.stateSetToString(initialClosure),
                isAccepting: this.isAcceptingSet(initialClosure),
                dfaStateId: initialStateId
            });

            let stepNumber = 2;

            // Paso 2: Procesar estados
            while (unmarkedStates.length > 0) {
                const currentStateSet = unmarkedStates.shift();
                const currentStateId = this.getStateId(currentStateSet);
                const currentStateString = this.stateSetToString(currentStateSet);
                markedStates.add(currentStateString);

                steps.push({
                    step: stepNumber++,
                    action: `Procesando estado ${currentStateId}`,
                    currentState: currentStateString,
                    dfaStateId: currentStateId
                });

                // Para cada simbolo del alfabeto
                for (const symbol of nfa.getAlphabet()) {
                    const moveResult = this.move(currentStateSet, symbol);
                    
                    if (moveResult.size === 0) {
                        steps.push({
                            step: stepNumber++,
                            action: `No hay transicion con '${symbol}'`,
                            currentState: currentStateString,
                            symbol: symbol,
                            moveResult: '{}',
                            newState: null
                        });
                        continue;
                    }

                    const newStateSet = nfa.epsilonClosure(moveResult);
                    const newStateSetString = this.stateSetToString(newStateSet);
                    const moveResultString = this.stateSetToString(moveResult);

                    let newStateId;
                    let isNewState = false;

                    if (!this.stateSetToId.has(newStateSetString)) {
                        newStateId = this.getStateId(newStateSet);
                        const newDFAState = dfa.createState(this.isAcceptingSet(newStateSet));
                        newDFAState.id = newStateId;
                        dfa.states.set(newStateId, newDFAState);
                        
                        unmarkedStates.push(newStateSet);
                        isNewState = true;
                    } else {
                        newStateId = this.stateSetToId.get(newStateSetString);
                    }

                    // Añadir transicion
                    const fromState = dfa.getState(currentStateId);
                    const toState = dfa.getState(newStateId);
                    dfa.addTransition(fromState, symbol, toState);

                    steps.push({
                        step: stepNumber++,
                        action: `Transicion con '${symbol}'`,
                        currentState: currentStateString,
                        symbol: symbol,
                        moveResult: moveResultString,
                        epsilonClosure: newStateSetString,
                        newState: newStateId,
                        isNewState: isNewState,
                        isAccepting: this.isAcceptingSet(newStateSet)
                    });
                }
            }

            return {
                success: true,
                nfa: nfa,
                dfa: dfa,
                steps: steps,
                stateMapping: this.getStateMapping(),
                statistics: this.getStatistics(nfa, dfa)
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                dfa: null
            };
        }
    }

    /**
     * Obtiene el mapeo de estados AFD a conjuntos de estados AFN
     * @returns {Object} Mapeo de estados
     */
    getStateMapping() {
        const mapping = {};
        this.idToStateSet.forEach((stateSet, id) => {
            mapping[id] = {
                dfaState: id,
                nfaStates: Array.from(stateSet).map(s => s.id).sort((a, b) => a - b),
                isAccepting: this.isAcceptingSet(stateSet)
            };
        });
        return mapping;
    }

    /**
     * Obtiene estadisticas de la conversion
     * @param {Automaton} nfa - AFN original
     * @param {Automaton} dfa - AFD resultante
     * @returns {Object} Estadisticas
     */
    getStatistics(nfa, dfa) {
        return {
            nfaStates: nfa.states.size,
            dfaStates: dfa.states.size,
            reductionRatio: ((nfa.states.size - dfa.states.size) / nfa.states.size * 100).toFixed(2) + '%',
            alphabetSize: nfa.alphabet.size,
            nfaTransitions: this.countTransitions(nfa),
            dfaTransitions: this.countTransitions(dfa)
        };
    }

    /**
     * Cuenta el numero total de transiciones en un automata
     * @param {Automaton} automaton - Automata a analizar
     * @returns {number} Numero de transiciones
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
     * Funcion de utilidad para probar el algoritmo
     * @param {Array<Automaton>} testNFAs - AFNs de prueba
     */
    runTests(testNFAs) {
        console.log('=== PRUEBAS CONSTRUCCIoN DE SUBCONJUNTOS ===\n');
        
        testNFAs.forEach((nfa, index) => {
            console.log(`Prueba ${index + 1}:`);
            
            const result = this.convertWithSteps(nfa);
            
            if (result.success) {
                console.log(`✓ Conversion exitosa`);
                console.log(`  AFN: ${result.statistics.nfaStates} estados, ${result.statistics.nfaTransitions} transiciones`);
                console.log(`  AFD: ${result.statistics.dfaStates} estados, ${result.statistics.dfaTransitions} transiciones`);
                console.log(`  Reduccion: ${result.statistics.reductionRatio}`);
                
                console.log(`  Mapeo de estados:`);
                Object.values(result.stateMapping).forEach(mapping => {
                    console.log(`    ${mapping.dfaState} ← {${mapping.nfaStates.join(',')}}${mapping.isAccepting ? ' (aceptacion)' : ''}`);
                });
                
                // Mostrar algunos pasos
                console.log(`  Primeros pasos:`);
                result.steps.slice(0, 5).forEach(step => {
                    console.log(`    ${step.step}. ${step.action}`);
                });
                
            } else {
                console.log(`✗ Error: ${result.error}`);
            }
            console.log('');
        });
    }

    /**
     * Optimizacion: elimina estados inalcanzables del AFD
     * @param {Automaton} dfa - AFD a optimizar
     * @returns {Automaton} AFD optimizado
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

        // Crear nuevo AFD solo con estados alcanzables
        const optimizedDFA = new Automaton('DFA');
        const stateMapping = new Map();

        // Copiar estados alcanzables
        let newStateId = 0;
        reachableStates.forEach(oldState => {
            const newState = optimizedDFA.createState(oldState.isAccepting);
            newState.id = newStateId++;
            stateMapping.set(oldState, newState);
            
            if (oldState === dfa.startState) {
                optimizedDFA.setStartState(newState);
            }
        });

        // Copiar transiciones
        reachableStates.forEach(oldState => {
            const newFromState = stateMapping.get(oldState);
            
            oldState.transitions.forEach((targetStates, symbol) => {
                targetStates.forEach(oldTargetState => {
                    if (reachableStates.has(oldTargetState)) {
                        const newTargetState = stateMapping.get(oldTargetState);
                        optimizedDFA.addTransition(newFromState, symbol, newTargetState);
                    }
                });
            });
        });

        return optimizedDFA;
    }
}

export default SubsetConstruction;

// Ejemplo de uso:

import ThompsonNFA from './thompsonNFA.js';

const thompson = new ThompsonNFA();
const subsetConstruction = new SubsetConstruction();

// Crear un AFN simple
const nfa = thompson.buildNFA('ab|*');

// Convertir a AFD
const result = subsetConstruction.convertWithSteps(nfa);

if (result.success) {
    console.log('AFD generado:');
    console.log(result.dfa.export('json'));
}
