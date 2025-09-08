import Automaton from '../models/Automaton.js';
import State from '../models/State.js';

/**
 * Implementacion del algoritmo de Thompson para construir
 * un AFN a partir de una expresion regular en notacion postfija
 */
class ThompsonNFA {
    constructor() {
        this.epsilonSymbol = 'ε';
    }

    /**
     * Construye un AFN a partir de una expresion regular en postfija
     * @param {string} postfixRegex - Expresion regular en notacion postfija
     * @returns {Automaton} AFN resultante
     */
    buildNFA(postfixRegex) {
        const stack = [];
        
        for (let i = 0; i < postfixRegex.length; i++) {
            const symbol = postfixRegex[i];
            
            if (this.isOperator(symbol)) {
                // Procesar operador
                switch (symbol) {
                    case '*':
                        if (stack.length < 1) {
                            throw new Error('Error: operador * requiere un operando');
                        }
                        stack.push(this.kleeneStar(stack.pop()));
                        break;
                        
                    case '+':
                        if (stack.length < 1) {
                            throw new Error('Error: operador + requiere un operando');
                        }
                        stack.push(this.oneOrMore(stack.pop()));
                        break;
                        
                    case '?':
                        if (stack.length < 1) {
                            throw new Error('Error: operador ? requiere un operando');
                        }
                        stack.push(this.optional(stack.pop()));
                        break;
                        
                    case '|':
                        if (stack.length < 2) {
                            throw new Error('Error: operador | requiere dos operandos');
                        }
                        const right = stack.pop();
                        const left = stack.pop();
                        stack.push(this.alternation(left, right));
                        break;
                        
                    case '.':
                        if (stack.length < 2) {
                            throw new Error('Error: operador . requiere dos operandos');
                        }
                        const second = stack.pop();
                        const first = stack.pop();
                        stack.push(this.concatenation(first, second));
                        break;
                        
                    default:
                        throw new Error(`Operador desconocido: ${symbol}`);
                }
            } else {
                // Es un simbolo del alfabeto
                stack.push(this.basicSymbol(symbol));
            }
        }
        
        if (stack.length !== 1) {
            throw new Error('Error en la expresion: la pila debe contener exactamente un AFN');
        }
        
        return stack[0];
    }

    /**
     * Crea un AFN basico para un simbolo individual
     * @param {string} symbol - Simbolo del alfabeto
     * @returns {Automaton} AFN basico
     */
    basicSymbol(symbol) {
        const nfa = new Automaton('NFA');
        
        const startState = nfa.createState(false);
        const acceptState = nfa.createState(true);
        
        nfa.setStartState(startState);
        
        if (symbol === this.epsilonSymbol) {
            // Para epsilon, crear transicion epsilon directa
            nfa.addTransition(startState, 'ε', acceptState);
        } else {
            // Para simbolos normales
            nfa.addTransition(startState, symbol, acceptState);
        }
        
        return nfa;
    }

    /**
     * Construye AFN para concatenacion (A·B)
     * @param {Automaton} nfa1 - Primer AFN
     * @param {Automaton} nfa2 - Segundo AFN
     * @returns {Automaton} AFN resultante
     */
    concatenation(nfa1, nfa2) {
        const result = new Automaton('NFA');
        
        // Copiar todos los estados de ambos AFNs
        this.copyStatesAndTransitions(nfa1, result);
        this.copyStatesAndTransitions(nfa2, result);
        
        // El estado inicial es el de nfa1
        result.setStartState(nfa1.startState);
        
        // Conectar estados de aceptacion de nfa1 con estado inicial de nfa2
        nfa1.acceptStates.forEach(acceptState => {
            acceptState.isAccepting = false;
            result.acceptStates.delete(acceptState);
            result.addTransition(acceptState, 'ε', nfa2.startState);
        });
        
        // Los estados de aceptacion son solo los de nfa2
        nfa2.acceptStates.forEach(state => {
            result.addAcceptState(state);
        });
        
        return result;
    }

    /**
     * Construye AFN para alternacion (A|B)
     * @param {Automaton} nfa1 - Primer AFN
     * @param {Automaton} nfa2 - Segundo AFN
     * @returns {Automaton} AFN resultante
     */
    alternation(nfa1, nfa2) {
        const result = new Automaton('NFA');
        
        // Crear nuevos estados inicial y final
        const newStart = result.createState(false);
        const newAccept = result.createState(true);
        
        result.setStartState(newStart);
        
        // Copiar todos los estados de ambos AFNs
        this.copyStatesAndTransitions(nfa1, result);
        this.copyStatesAndTransitions(nfa2, result);
        
        // Conectar nuevo estado inicial con los iniciales de ambos AFNs
        result.addTransition(newStart, 'ε', nfa1.startState);
        result.addTransition(newStart, 'ε', nfa2.startState);
        
        // Conectar estados de aceptacion de ambos AFNs con nuevo estado final
        nfa1.acceptStates.forEach(acceptState => {
            acceptState.isAccepting = false;
            result.acceptStates.delete(acceptState);
            result.addTransition(acceptState, 'ε', newAccept);
        });
        
        nfa2.acceptStates.forEach(acceptState => {
            acceptState.isAccepting = false;
            result.acceptStates.delete(acceptState);
            result.addTransition(acceptState, 'ε', newAccept);
        });
        
        return result;
    }

    /**
     * Construye AFN para estrella de Kleene (A*)
     * @param {Automaton} nfa - AFN base
     * @returns {Automaton} AFN resultante
     */
    kleeneStar(nfa) {
        const result = new Automaton('NFA');
        
        // Crear nuevos estados inicial y final
        const newStart = result.createState(false);
        const newAccept = result.createState(true);
        
        result.setStartState(newStart);
        
        // Copiar estados y transiciones del AFN original
        this.copyStatesAndTransitions(nfa, result);
        
        // Conectar nuevo inicio con el inicio original y con el nuevo final (epsilon)
        result.addTransition(newStart, 'ε', nfa.startState);
        result.addTransition(newStart, 'ε', newAccept);
        
        // Conectar estados de aceptacion originales con nuevo final y con inicio original
        nfa.acceptStates.forEach(acceptState => {
            acceptState.isAccepting = false;
            result.acceptStates.delete(acceptState);
            result.addTransition(acceptState, 'ε', newAccept);
            result.addTransition(acceptState, 'ε', nfa.startState);
        });
        
        return result;
    }

    /**
     * Construye AFN para una o mas repeticiones (A+)
     * @param {Automaton} nfa - AFN base
     * @returns {Automaton} AFN resultante
     */
    oneOrMore(nfa) {
        const result = new Automaton('NFA');
        
        // Crear nuevo estado final
        const newAccept = result.createState(true);
        
        // Copiar estados y transiciones del AFN original
        this.copyStatesAndTransitions(nfa, result);
        
        // El estado inicial sigue siendo el original
        result.setStartState(nfa.startState);
        
        // Conectar estados de aceptacion originales con nuevo final y con inicio
        nfa.acceptStates.forEach(acceptState => {
            acceptState.isAccepting = false;
            result.acceptStates.delete(acceptState);
            result.addTransition(acceptState, 'ε', newAccept);
            result.addTransition(acceptState, 'ε', nfa.startState);
        });
        
        return result;
    }

    /**
     * Construye AFN para opcional (A?)
     * @param {Automaton} nfa - AFN base
     * @returns {Automaton} AFN resultante
     */
    optional(nfa) {
        const result = new Automaton('NFA');
        
        // Crear nuevos estados inicial y final
        const newStart = result.createState(false);
        const newAccept = result.createState(true);
        
        result.setStartState(newStart);
        
        // Copiar estados y transiciones del AFN original
        this.copyStatesAndTransitions(nfa, result);
        
        // Conectar nuevo inicio con inicio original y con final (epsilon)
        result.addTransition(newStart, 'ε', nfa.startState);
        result.addTransition(newStart, 'ε', newAccept);
        
        // Conectar estados de aceptacion originales con nuevo final
        nfa.acceptStates.forEach(acceptState => {
            acceptState.isAccepting = false;
            result.acceptStates.delete(acceptState);
            result.addTransition(acceptState, 'ε', newAccept);
        });
        
        return result;
    }

    /**
     * Copia estados y transiciones de un AFN a otro
     * @param {Automaton} source - AFN fuente
     * @param {Automaton} target - AFN destino
     */
    copyStatesAndTransitions(source, target) {
        // Copiar estados
        source.states.forEach(state => {
            if (!target.states.has(state.id)) {
                target.addState(state);
            }
        });
        
        // El alfabeto se actualiza automaticamente al añadir transiciones
        source.alphabet.forEach(symbol => {
            target.alphabet.add(symbol);
        });
    }

    /**
     * Verifica si un caracter es un operador
     * @param {string} char - Caracter a verificar
     * @returns {boolean} True si es operador
     */
    isOperator(char) {
        return ['*', '+', '?', '|', '.'].includes(char);
    }

    /**
     * Construye un AFN desde una expresion regular completa
     * @param {string} regex - Expresion regular en notacion infija
     * @returns {Object} Resultado de la construccion
     */
    fromRegex(regex) {
        try {
            // Importar ShuntingYard para convertir a postfija
            // Nota: En un proyecto real, esto se haria con import
            const ShuntingYard = require('./shuntingYard.js').default;
            const shuntingYard = new ShuntingYard();
            
            // Convertir a postfija
            const conversionResult = shuntingYard.convert(regex);
            if (!conversionResult.success) {
                return {
                    success: false,
                    errors: conversionResult.errors,
                    nfa: null
                };
            }
            
            // Construir AFN
            const nfa = this.buildNFA(conversionResult.postfix);
            
            return {
                success: true,
                original: regex,
                postfix: conversionResult.postfix,
                nfa: nfa,
                steps: this.getConstructionSteps(conversionResult.postfix)
            };
        } catch (error) {
            return {
                success: false,
                errors: [error.message],
                nfa: null
            };
        }
    }

    /**
     * Genera los pasos de construccion del AFN
     * @param {string} postfix - Expresion en postfija
     * @returns {Array} Pasos de la construccion
     */
    getConstructionSteps(postfix) {
        const steps = [];
        const stack = [];
        
        steps.push({
            step: 0,
            description: 'Inicializacion',
            postfix: postfix,
            currentSymbol: '',
            stackSize: 0,
            action: 'Comenzar construccion del AFN'
        });
        
        for (let i = 0; i < postfix.length; i++) {
            const symbol = postfix[i];
            let action = '';
            
            if (this.isOperator(symbol)) {
                switch (symbol) {
                    case '*':
                        action = 'Aplicar estrella de Kleene';
                        stack.pop();
                        stack.push('AFN*');
                        break;
                    case '+':
                        action = 'Aplicar una o mas repeticiones';
                        stack.pop();
                        stack.push('AFN+');
                        break;
                    case '?':
                        action = 'Aplicar opcional';
                        stack.pop();
                        stack.push('AFN?');
                        break;
                    case '|':
                        action = 'Aplicar alternacion';
                        stack.pop();
                        stack.pop();
                        stack.push('AFN|');
                        break;
                    case '.':
                        action = 'Aplicar concatenacion';
                        stack.pop();
                        stack.pop();
                        stack.push('AFN.');
                        break;
                }
            } else {
                action = `Crear AFN basico para '${symbol}'`;
                stack.push(`AFN(${symbol})`);
            }
            
            steps.push({
                step: i + 1,
                description: `Procesando '${symbol}'`,
                currentSymbol: symbol,
                stackSize: stack.length,
                action: action,
                stackContent: [...stack]
            });
        }
        
        return steps;
    }

    /**
     * Funcion de utilidad para probar el algoritmo
     * @param {Array<string>} testCases - Casos de prueba
     */
    runTests(testCases) {
        console.log('=== PRUEBAS THOMPSON NFA ===\n');
        
        testCases.forEach((testCase, index) => {
            console.log(`Prueba ${index + 1}: ${testCase}`);
            
            try {
                // Para las pruebas, asumimos que ya tenemos la postfija
                const nfa = this.buildNFA(testCase);
                
                console.log(`✓ AFN construido exitosamente`);
                console.log(`  Estados: ${nfa.states.size}`);
                console.log(`  Alfabeto: {${nfa.getAlphabet().join(', ')}}`);
                console.log(`  Estado inicial: ${nfa.startState.id}`);
                console.log(`  Estados de aceptacion: {${Array.from(nfa.acceptStates).map(s => s.id).join(', ')}}`);
                
                // Mostrar algunas transiciones como ejemplo
                const transitions = [];
                nfa.states.forEach(state => {
                    state.transitions.forEach((targets, symbol) => {
                        targets.forEach(target => {
                            transitions.push(`(${state.id}, ${symbol}, ${target.id})`);
                        });
                    });
                    state.epsilonTransitions.forEach(target => {
                        transitions.push(`(${state.id}, ε, ${target.id})`);
                    });
                });
                
                console.log(`  Transiciones (primeras 5): ${transitions.slice(0, 5).join(', ')}${transitions.length > 5 ? '...' : ''}`);
                
            } catch (error) {
                console.log(`✗ Error: ${error.message}`);
            }
            console.log('');
        });
    }
}

export default ThompsonNFA;

// Ejemplo de uso:


