import ShuntingYard from '../algorithms/shuntingYard.js';

const shuntingYard = new ShuntingYard();

// Casos de prueba del proyecto
const testCases = [
    '(b|b)*abb(a|b)*',
    'a*b+',
    '(a|b)*abb',
    'a+b*c',
    '((a|b)*c)*'
];

shuntingYard.runTests(testCases);