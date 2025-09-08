/**
 * Clase State - Representa un estado en un automata finito
 */
class State {
    constructor(id, isAccepting = false) {
        this.id = id;
        this.isAccepting = isAccepting;
        this.transitions = new Map(); // symbol -> Set of states (for NFA) or state (for DFA)
        this.epsilonTransitions = new Set(); // Para AFN con transiciones epsilon
    }

    /**
     * Añade una transicion desde este estado
     * @param {string} symbol - Simbolo de la transicion (o 'ε' para epsilon)
     * @param {State|Set<State>} targetState - Estado(s) destino
     */
    addTransition(symbol, targetState) {
        if (symbol === 'ε' || symbol === '') {
            // Transicion epsilon
            if (targetState instanceof Set) {
                targetState.forEach(state => this.epsilonTransitions.add(state));
            } else {
                this.epsilonTransitions.add(targetState);
            }
        } else {
            // Transicion normal
            if (!this.transitions.has(symbol)) {
                this.transitions.set(symbol, new Set());
            }
            
            if (targetState instanceof Set) {
                // Para AFN - multiples estados destino
                targetState.forEach(state => this.transitions.get(symbol).add(state));
            } else {
                // Para AFD - un solo estado destino
                this.transitions.get(symbol).add(targetState);
            }
        }
    }

    /**
     * Obtiene los estados alcanzables con un simbolo dado
     * @param {string} symbol - Simbolo de transicion
     * @returns {Set<State>} Estados alcanzables
     */
    getTransitions(symbol) {
        return this.transitions.get(symbol) || new Set();
    }

    /**
     * Obtiene las transiciones epsilon desde este estado
     * @returns {Set<State>} Estados alcanzables por epsilon
     */
    getEpsilonTransitions() {
        return this.epsilonTransitions;
    }

    /**
     * Obtiene todos los simbolos que tienen transiciones desde este estado
     * @returns {Array<string>} Simbolos disponibles
     */
    getAvailableSymbols() {
        return Array.from(this.transitions.keys());
    }

    /**
     * Verifica si este estado tiene transiciones epsilon
     * @returns {boolean}
     */
    hasEpsilonTransitions() {
        return this.epsilonTransitions.size > 0;
    }

    /**
     * Convierte el estado a un objeto serializable
     * @returns {Object} Representacion del estado
     */
    toJSON() {
        const transitions = {};
        this.transitions.forEach((states, symbol) => {
            transitions[symbol] = Array.from(states).map(state => state.id);
        });

        return {
            id: this.id,
            isAccepting: this.isAccepting,
            transitions: transitions,
            epsilonTransitions: Array.from(this.epsilonTransitions).map(state => state.id)
        };
    }

    /**
     * Representacion en string del estado
     * @returns {string}
     */
    toString() {
        return `State(${this.id}${this.isAccepting ? ', accepting' : ''})`;
    }

    /**
     * Clona el estado (util para transformaciones)
     * @returns {State} Nuevo estado con las mismas propiedades
     */
    clone() {
        const newState = new State(this.id, this.isAccepting);
        
        // Clonar transiciones (sin referencias a los estados destino por ahora)
        this.transitions.forEach((states, symbol) => {
            newState.transitions.set(symbol, new Set(states));
        });
        
        newState.epsilonTransitions = new Set(this.epsilonTransitions);
        
        return newState;
    }
}

export default State;