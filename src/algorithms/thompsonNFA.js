import Automaton from '../models/Automaton.js';
import State from '../models/State.js';
import ShuntingYard from './shuntingYard.js';

/**
 * Implementacion del algoritmo de Thompson para construir
 * un AFN a partir de una expresion regular en notacion postfija
 */
class ThompsonNFA {
    constructor() {
        this.epsilonSymbol = 'ε';
    }

    buildNFA(postfixRegex) {
        const stack = [];
        for (let i = 0; i < postfixRegex.length; i++) {
            const symbol = postfixRegex[i];
            if (this.isOperator(symbol)) {
                switch (symbol) {
                    case '*':
                        if (stack.length < 1) throw new Error('Error: operador * requiere un operando');
                        stack.push(this.kleeneStar(stack.pop()));
                        break;
                    case '+':
                        if (stack.length < 1) throw new Error('Error: operador + requiere un operando');
                        stack.push(this.oneOrMore(stack.pop()));
                        break;
                    case '?':
                        if (stack.length < 1) throw new Error('Error: operador ? requiere un operando');
                        stack.push(this.optional(stack.pop()));
                        break;
                    case '|':
                        if (stack.length < 2) throw new Error('Error: operador | requiere dos operandos');
                        {
                            const right = stack.pop();
                            const left = stack.pop();
                            stack.push(this.alternation(left, right));
                        }
                        break;
                    case '.':
                        if (stack.length < 2) throw new Error('Error: operador . requiere dos operandos');
                        {
                            const second = stack.pop();
                            const first = stack.pop();
                            stack.push(this.concatenation(first, second));
                        }
                        break;
                    default:
                        throw new Error(`Operador desconocido: ${symbol}`);
                }
            } else {
                stack.push(this.basicSymbol(symbol));
            }
        }
        if (stack.length !== 1) throw new Error('Error en la expresion: la pila debe contener exactamente un AFN');
        return stack[0];
    }

    basicSymbol(symbol) {
        const nfa = new Automaton('NFA');
        const startState = nfa.createState(false);
        const acceptState = nfa.createState(true);
        nfa.setStartState(startState);
        if (symbol === this.epsilonSymbol) nfa.addTransition(startState, 'ε', acceptState);
        else nfa.addTransition(startState, symbol, acceptState);
        return nfa;
    }

    concatenation(nfa1, nfa2) {
        const result = new Automaton('NFA');
        this.copyStatesAndTransitions(nfa1, result);
        this.copyStatesAndTransitions(nfa2, result);
        result.setStartState(nfa1.startState);
        nfa1.acceptStates.forEach(acceptState => {
            acceptState.isAccepting = false;
            result.acceptStates.delete(acceptState);
            result.addTransition(acceptState, 'ε', nfa2.startState);
        });
        nfa2.acceptStates.forEach(state => { result.addAcceptState(state); });
        return result;
    }

    alternation(nfa1, nfa2) {
        const result = new Automaton('NFA');
        const newStart = result.createState(false);
        const newAccept = result.createState(true);
        result.setStartState(newStart);
        this.copyStatesAndTransitions(nfa1, result);
        this.copyStatesAndTransitions(nfa2, result);
        result.addTransition(newStart, 'ε', nfa1.startState);
        result.addTransition(newStart, 'ε', nfa2.startState);
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

    kleeneStar(nfa) {
        const result = new Automaton('NFA');
        const newStart = result.createState(false);
        const newAccept = result.createState(true);
        result.setStartState(newStart);
        this.copyStatesAndTransitions(nfa, result);
        result.addTransition(newStart, 'ε', nfa.startState);
        result.addTransition(newStart, 'ε', newAccept);
        nfa.acceptStates.forEach(acceptState => {
            acceptState.isAccepting = false;
            result.acceptStates.delete(acceptState);
            result.addTransition(acceptState, 'ε', newAccept);
            result.addTransition(acceptState, 'ε', nfa.startState);
        });
        return result;
    }

    oneOrMore(nfa) {
        const result = new Automaton('NFA');
        const newAccept = result.createState(true);
        this.copyStatesAndTransitions(nfa, result);
        result.setStartState(nfa.startState);
        nfa.acceptStates.forEach(acceptState => {
            acceptState.isAccepting = false;
            result.acceptStates.delete(acceptState);
            result.addTransition(acceptState, 'ε', newAccept);
            result.addTransition(acceptState, 'ε', nfa.startState);
        });
        return result;
    }

    optional(nfa) {
        const result = new Automaton('NFA');
        const newStart = result.createState(false);
        const newAccept = result.createState(true);
        result.setStartState(newStart);
        this.copyStatesAndTransitions(nfa, result);
        result.addTransition(newStart, 'ε', nfa.startState);
        result.addTransition(newStart, 'ε', newAccept);
        nfa.acceptStates.forEach(acceptState => {
            acceptState.isAccepting = false;
            result.acceptStates.delete(acceptState);
            result.addTransition(acceptState, 'ε', newAccept);
        });
        return result;
    }

    copyStatesAndTransitions(source, target) {
        source.states.forEach(state => {
            if (!target.states.has(state.id)) target.addState(state);
        });
        source.alphabet.forEach(symbol => { target.alphabet.add(symbol); });
    }

    isOperator(char) { return ['*', '+', '?', '|', '.'].includes(char); }

    fromRegex(regex) {
        try {
            const shuntingYard = new ShuntingYard();
            const conversionResult = shuntingYard.convert(regex);
            if (!conversionResult.success) {
                return { success: false, errors: conversionResult.errors, nfa: null };
            }
            const nfa = this.buildNFA(conversionResult.postfix);
            return {
                success: true,
                original: regex,
                postfix: conversionResult.postfix,
                nfa,
                steps: this.getConstructionSteps(conversionResult.postfix)
            };
        } catch (error) {
            return { success: false, errors: [error.message], nfa: null };
        }
    }

    getConstructionSteps(postfix) {
        const steps = [];
        const stack = [];
        steps.push({ step: 0, description: 'Inicializacion', postfix, currentSymbol: '', stackSize: 0, action: 'Comenzar construccion del AFN' });
        for (let i = 0; i < postfix.length; i++) {
            const symbol = postfix[i];
            let action = '';
            if (this.isOperator(symbol)) {
                switch (symbol) {
                    case '*': action = 'Aplicar estrella de Kleene'; stack.pop(); stack.push('AFN*'); break;
                    case '+': action = 'Aplicar una o mas repeticiones'; stack.pop(); stack.push('AFN+'); break;
                    case '?': action = 'Aplicar opcional'; stack.pop(); stack.push('AFN?'); break;
                    case '|': action = 'Aplicar alternacion'; stack.pop(); stack.pop(); stack.push('AFN|'); break;
                    case '.': action = 'Aplicar concatenacion'; stack.pop(); stack.pop(); stack.push('AFN.'); break;
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
                action,
                stackContent: [...stack]
            });
        }
        return steps;
    }

    runTests(testCases) {
        console.log('=== PRUEBAS THOMPSON NFA ===\n');
        testCases.forEach((testCase, index) => {
            console.log(`Prueba ${index + 1}: ${testCase}`);
            try {
                const nfa = this.buildNFA(testCase);
                console.log(`✓ AFN construido exitosamente`);
                console.log(`  Estados: ${nfa.states.size}`);
                console.log(`  Alfabeto: {${nfa.getAlphabet().join(', ')}}`);
                console.log(`  Estado inicial: ${nfa.startState.id}`);
                console.log(`  Estados de aceptacion: {${Array.from(nfa.acceptStates).map(s => s.id).join(', ')}}`);
                const transitions = [];
                nfa.states.forEach(state => {
                    state.transitions.forEach((targets, symbol) => {
                        targets.forEach(target => transitions.push(`(${state.id}, ${symbol}, ${target.id})`));
                    });
                    state.epsilonTransitions.forEach(target => transitions.push(`(${state.id}, ε, ${target.id})`));
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
