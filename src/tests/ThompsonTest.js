import ThompsonNFA from '../algorithms/thompsonNFA.js';

const thompson = new ThompsonNFA();

// Casos de prueba en postfija (output de Shunting Yard)
const testCases = [
    'ab|*',      // (a|b)*
    'ab.',       // ab
    'a*b+.',     // a*b+
    'ab|*ab.b..' // (a|b)*abb
];

thompson.runTests(testCases);