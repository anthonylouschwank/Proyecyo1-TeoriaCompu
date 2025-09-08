import ShuntingYard from '../algorithms/shuntingYard.js';
import ThompsonNFA from '../algorithms/thompsonNFA.js';
import SubsetConstruction from '../algorithms/subsetConstruction.js';
import HopcroftMinimization from '../algorithms/hopcroft.js';


// Pipeline completo: Regex → AFN → AFD → AFD Minimo
const shuntingYard = new ShuntingYard();
const thompson = new ThompsonNFA();
const subsetConstruction = new SubsetConstruction();
const hopcroft = new HopcroftMinimization();

// 1. Regex → Postfija 
const postfixResult = shuntingYard.convert('(a|b)*abb');

// 2. Postfija → AFN 
const nfa = thompson.buildNFA(postfixResult.postfix);

// 3. AFN → AFD 
const dfa = subsetConstruction.convertToDFA(nfa);

// 4. AFD → AFD Minimo 
const minDFA = hopcroft.minimize(dfa);

// 5. Simulacion - Implementada en Automaton.js
const simulation = minDFA.accepts('aabbabb');

// 6. Exportar resultados
console.log('AFN:', nfa.export('json'));
console.log('AFD:', dfa.export('json'));
console.log('AFD Mínimo:', minDFA.export('json'));
console.log('Simulación:', simulation);