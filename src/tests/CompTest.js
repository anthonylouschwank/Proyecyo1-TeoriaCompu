import ShuntingYard from '../algorithms/shuntingYard.js';
import ThompsonNFA from '../algorithms/thompsonNFA.js';
import SubsetConstruction from '../algorithms/subsetConstruction.js';
import HopcroftMinimization from '../algorithms/hopcroft.js';

// Test simple y controlado
function simpleTest() {
    console.log('=== SIMPLE TEST START ===');
    
    try {
        // 1. Probar primero con un símbolo simple
        console.log('\n1. Testing simple symbol "a":');
        const shuntingYard = new ShuntingYard();
        const thompson = new ThompsonNFA();
        
        let result = shuntingYard.convert('a');
        console.log('Postfix for "a":', result.postfix);
        
        let nfa = thompson.buildNFA(result.postfix);
        console.log('NFA for "a" - States:', nfa.states.size);
        console.log('NFA Start:', nfa.startState?.id);
        console.log('NFA Accept:', Array.from(nfa.acceptStates).map(s => s.id));
        
        // Test NFA
        let nfaTest = nfa.accepts('a');
        console.log('NFA accepts "a":', nfaTest.accepted);
        
        // 2. Probar concatenación simple "ab"
        console.log('\n2. Testing concatenation "ab":');
        result = shuntingYard.convert('ab');
        console.log('Postfix for "ab":', result.postfix);
        
        nfa = thompson.buildNFA(result.postfix);
        console.log('NFA for "ab" - States:', nfa.states.size);
        console.log('NFA Start:', nfa.startState?.id);
        console.log('NFA Accept:', Array.from(nfa.acceptStates).map(s => s.id));
        
        nfaTest = nfa.accepts('ab');
        console.log('NFA accepts "ab":', nfaTest.accepted);
        
        // 3. Probar alternación simple "a|b"
        console.log('\n3. Testing alternation "a|b":');
        result = shuntingYard.convert('a|b');
        console.log('Postfix for "a|b":', result.postfix);
        
        nfa = thompson.buildNFA(result.postfix);
        console.log('NFA for "a|b" - States:', nfa.states.size);
        console.log('NFA Start:', nfa.startState?.id);
        console.log('NFA Accept:', Array.from(nfa.acceptStates).map(s => s.id));
        
        nfaTest = nfa.accepts('a');
        console.log('NFA accepts "a":', nfaTest.accepted);
        nfaTest = nfa.accepts('b');
        console.log('NFA accepts "b":', nfaTest.accepted);
        
        // 4. Si llegamos aquí, probar el caso complejo
        console.log('\n4. Testing complex "(a|b)*abb":');
        result = shuntingYard.convert('(a|b)*abb');
        console.log('Postfix for "(a|b)*abb":', result.postfix);
        
        nfa = thompson.buildNFA(result.postfix);
        console.log('NFA for "(a|b)*abb" - States:', nfa.states.size);
        console.log('NFA Start:', nfa.startState?.id);
        console.log('NFA Accept:', Array.from(nfa.acceptStates).map(s => s.id));
        
        // Test NFA directamente
        const testStrings = ['abb', 'aabb', 'babb', 'aabbabb', 'ab', 'abba'];
        console.log('\nTesting NFA with various strings:');
        testStrings.forEach(str => {
            const test = nfa.accepts(str);
            console.log(`NFA accepts "${str}": ${test.accepted}`);
        });
        
        // 5. Solo si el NFA funciona, probar DFA
        console.log('\n5. Converting NFA to DFA:');
        const subsetConstruction = new SubsetConstruction();
        const dfaResult = subsetConstruction.convertToDFA(nfa);
        
        console.log('DFA - States:', dfaResult.states.size);
        console.log('DFA Start:', dfaResult.startState?.id);
        console.log('DFA Accept:', Array.from(dfaResult.acceptStates).map(s => s.id));
        
        console.log('\nTesting DFA with various strings:');
        testStrings.forEach(str => {
            const test = dfaResult.accepts(str);
            console.log(`DFA accepts "${str}": ${test.accepted}`);
        });
        
        console.log('\n=== TEST COMPLETED SUCCESSFULLY ===');
        
    } catch (error) {
        console.error('ERROR:', error.message);
        console.error('Stack:', error.stack);
        
        // Información adicional para debugging
        console.log('\nDebugging info:');
        console.log('Error occurred at step:', error.step || 'unknown');
    }
}

// Ejecutar test
simpleTest();