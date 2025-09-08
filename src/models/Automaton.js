import State from './State.js';

/**
 * Clase Automaton - Representa un automata finito (AFN o AFD)
 */
class Automaton {
    constructor(type = 'NFA') {
        this.type = type; // 'NFA', 'DFA', 'MinDFA'
        this.states = new Map(); // id -> State
        this.alphabet = new Set();
        this.startState = null;
        this.acceptStates = new Set();
        this.stateCounter = 0;
    }

    /**
     * Crea un nuevo estado con ID unico
     * @param {boolean} isAccepting - Si el estado es de aceptacion
     * @returns {State} Nuevo estado
     */
    createState(isAccepting = false) {
        const state = new State(this.stateCounter++, isAccepting);
        this.states.set(state.id, state);
        if (isAccepting) {
            this.acceptStates.add(state);
        }
        return state;
    }

    /**
     * Añade un estado existente al automata
     * @param {State} state - Estado a añadir
     */
    addState(state) {
        this.states.set(state.id, state);
        if (state.isAccepting) {
            this.acceptStates.add(state);
        }
    }

    /**
     * Obtiene un estado por su ID
     * @param {number} id - ID del estado
     * @returns {State|null} Estado encontrado o null
     */
    getState(id) {
        return this.states.get(id) || null;
    }

    /**
     * Establece el estado inicial
     * @param {State} state - Estado inicial
     */
    setStartState(state) {
        this.startState = state;
    }

    /**
     * Marca un estado como de aceptacion
     * @param {State} state - Estado a marcar
     */
    addAcceptState(state) {
        state.isAccepting = true;
        this.acceptStates.add(state);
    }

    /**
     * Añade una transicion entre estados
     * @param {State} fromState - Estado origen
     * @param {string} symbol - Simbolo de transicion
     * @param {State} toState - Estado destino
     */
    addTransition(fromState, symbol, toState) {
        fromState.addTransition(symbol, toState);
        if (symbol !== 'ε' && symbol !== '') {
            this.alphabet.add(symbol);
        }
    }

    /**
     * Obtiene todos los estados del automata
     * @returns {Array<State>} Array de estados
     */
    getAllStates() {
        return Array.from(this.states.values());
    }

    /**
     * Obtiene el alfabeto del automata
     * @returns {Array<string>} Array de simbolos
     */
    getAlphabet() {
        return Array.from(this.alphabet);
    }

    /**
     * Calcula la clausura epsilon de un conjunto de estados
     * @param {Set<State>} states - Estados iniciales
     * @returns {Set<State>} Clausura epsilon
     */
    epsilonClosure(states) {
        const closure = new Set(states);
        const stack = Array.from(states);

        while (stack.length > 0) {
            const current = stack.pop();
            current.getEpsilonTransitions().forEach(state => {
                if (!closure.has(state)) {
                    closure.add(state);
                    stack.push(state);
                }
            });
        }

        return closure;
    }

    /**
     * Verifica si una cadena es aceptada por el automata
     * @param {string} input - Cadena a verificar
     * @returns {Object} Resultado de la simulacion
     */
    accepts(input) {
        if (this.type === 'DFA' || this.type === 'MinDFA') {
            return this.simulateDFA(input);
        } else {
            return this.simulateNFA(input);
        }
    }

    /**
     * Simula un AFD
     * @param {string} input - Cadena de entrada
     * @returns {Object} Resultado de la simulacion
     */
    simulateDFA(input) {
        const steps = [];
        let currentState = this.startState;
        
        steps.push({
            step: 0,
            currentState: currentState.id,
            remainingInput: input,
            action: 'Inicio'
        });

        for (let i = 0; i < input.length; i++) {
            const symbol = input[i];
            const nextStates = currentState.getTransitions(symbol);
            
            if (nextStates.size === 0) {
                steps.push({
                    step: i + 1,
                    currentState: currentState.id,
                    symbol: symbol,
                    remainingInput: input.substring(i + 1),
                    action: 'Rechazada - No hay transicion'
                });
                return { accepted: false, steps: steps };
            }

            currentState = nextStates.values().next().value;
            steps.push({
                step: i + 1,
                currentState: currentState.id,
                symbol: symbol,
                remainingInput: input.substring(i + 1),
                action: 'Transicion'
            });
        }

        const accepted = currentState.isAccepting;
        steps.push({
            step: input.length + 1,
            currentState: currentState.id,
            remainingInput: '',
            action: accepted ? 'Aceptada' : 'Rechazada - Estado no final'
        });

        return { accepted: accepted, steps: steps };
    }

    /**
     * Simula un AFN
     * @param {string} input - Cadena de entrada
     * @returns {Object} Resultado de la simulacion
     */
    simulateNFA(input) {
        let currentStates = this.epsilonClosure(new Set([this.startState]));
        const steps = [];

        steps.push({
            step: 0,
            currentStates: Array.from(currentStates).map(s => s.id),
            remainingInput: input,
            action: 'Inicio (clausura epsilon)'
        });

        for (let i = 0; i < input.length; i++) {
            const symbol = input[i];
            const nextStates = new Set();

            currentStates.forEach(state => {
                state.getTransitions(symbol).forEach(nextState => {
                    nextStates.add(nextState);
                });
            });

            if (nextStates.size === 0) {
                steps.push({
                    step: i + 1,
                    currentStates: Array.from(currentStates).map(s => s.id),
                    symbol: symbol,
                    remainingInput: input.substring(i + 1),
                    action: 'Rechazada - No hay transiciones'
                });
                return { accepted: false, steps: steps };
            }

            currentStates = this.epsilonClosure(nextStates);
            steps.push({
                step: i + 1,
                currentStates: Array.from(currentStates).map(s => s.id),
                symbol: symbol,
                remainingInput: input.substring(i + 1),
                action: 'Transicion + clausura epsilon'
            });
        }

        const accepted = Array.from(currentStates).some(state => state.isAccepting);
        steps.push({
            step: input.length + 1,
            currentStates: Array.from(currentStates).map(s => s.id),
            remainingInput: '',
            action: accepted ? 'Aceptada' : 'Rechazada - Ningun estado final'
        });

        return { accepted: accepted, steps: steps };
    }

    /**
     * Exporta el automata en el formato requerido
     * @param {string} format - Formato de exportacion ('json', 'text')
     * @returns {string} Representacion del automata
     */
    export(format = 'json') {
        const states = Array.from(this.states.keys()).sort((a, b) => a - b);
        const alphabet = this.getAlphabet().sort();
        const startState = this.startState ? this.startState.id : null;
        const acceptStates = Array.from(this.acceptStates).map(s => s.id).sort((a, b) => a - b);
        
        // Construir transiciones
        const transitions = [];
        this.states.forEach(state => {
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

        if (format === 'json') {
            return JSON.stringify({
                type: this.type,
                ESTADOS: states,
                SIMBOLOS: alphabet,
                INICIO: startState,
                ACEPTACION: acceptStates,
                TRANSICIONES: transitions
            }, null, 2);
        } else {
            // Formato de texto como especifica el proyecto
            let result = `ESTADOS = {${states.join(', ')}}\n`;
            result += `SIMBOLOS = {${alphabet.join(', ')}}\n`;
            result += `INICIO = {${startState}}\n`;
            result += `ACEPTACION = {${acceptStates.join(', ')}}\n`;
            result += `TRANSICIONES = {${transitions.map(t => 
                `(${t.from}, ${t.symbol}, ${t.to})`
            ).join(', ')}}`;
            return result;
        }
    }

    /**
     * Crea una copia del automata
     * @returns {Automaton} Nuevo automata
     */
    clone() {
        const newAutomaton = new Automaton(this.type);
        const stateMap = new Map(); // old state -> new state

        // Clonar estados
        this.states.forEach(state => {
            const newState = new State(state.id, state.isAccepting);
            newAutomaton.addState(newState);
            stateMap.set(state, newState);
        });

        // Clonar transiciones
        this.states.forEach(state => {
            const newState = stateMap.get(state);
            
            // Transiciones normales
            state.transitions.forEach((targetStates, symbol) => {
                targetStates.forEach(targetState => {
                    const newTargetState = stateMap.get(targetState);
                    newAutomaton.addTransition(newState, symbol, newTargetState);
                });
            });
            
            // Transiciones epsilon
            state.epsilonTransitions.forEach(targetState => {
                const newTargetState = stateMap.get(targetState);
                newAutomaton.addTransition(newState, 'ε', newTargetState);
            });
        });

        // Establecer estado inicial
        if (this.startState) {
            newAutomaton.setStartState(stateMap.get(this.startState));
        }

        newAutomaton.stateCounter = this.stateCounter;
        return newAutomaton;
    }

    /**
     * Informacion de debug del automata
     * @returns {string} Informacion detallada
     */
    toString() {
        let result = `${this.type} Automaton:\n`;
        result += `States: ${this.states.size}\n`;
        result += `Alphabet: {${this.getAlphabet().join(', ')}}\n`;
        result += `Start: ${this.startState ? this.startState.id : 'none'}\n`;
        result += `Accept: {${Array.from(this.acceptStates).map(s => s.id).join(', ')}}\n`;
        return result;
    }
}

export default Automaton;