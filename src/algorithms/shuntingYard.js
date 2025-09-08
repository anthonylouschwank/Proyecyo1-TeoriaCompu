/**
 * Implementacion del algoritmo Shunting Yard para convertir
 * expresiones regulares de notacion infija a postfija
 */

class ShuntingYard {
    constructor() {
        // Definir precedencia de operadores (mayor número = mayor precedencia)
        this.precedence = {
            '|': 1,    // OR (alternacion)
            '.': 2,    // Concatenacion implicita
            '+': 3,    // Una o mas repeticiones
            '*': 3,    // Cero o mas repeticiones
            '?': 3     // Cero o una repeticion (opcional)
        };

        // Operadores que son asociativos por la izquierda
        this.leftAssociative = new Set(['|', '.']);
        
        // Operadores unarios (postfijos)
        this.unaryOperators = new Set(['*', '+', '?']);
        
        // Operadores binarios
        this.binaryOperators = new Set(['|', '.']);
        
        // Simbolo para representar epsilon (cadena vacia)
        this.epsilonSymbol = 'ε';
    }

    /**
     * Convierte una expresion regular a notacion postfija
     * @param {string} regex - Expresion regular en notacion infija
     * @returns {string} Expresion en notacion postfija
     */
    infixToPostfix(regex) {
        // Paso 1: Preprocesar la expresion regular
        const preprocessed = this.preprocess(regex);
        
        // Paso 2: Aplicar Shunting Yard
        const postfix = this.shuntingYard(preprocessed);
        
        return postfix;
    }

    /**
     * Preprocesa la expresion regular para añadir concatenaciones explicitas
     * @param {string} regex - Expresion regular original
     * @returns {string} Expresion con concatenaciones explicitas
     */
    preprocess(regex) {
        if (!regex || regex.length === 0) {
            return this.epsilonSymbol;
        }

        let result = '';
        
        for (let i = 0; i < regex.length; i++) {
            const current = regex[i];
            result += current;
            
            // Si hay un siguiente caracter, verificar si necesitamos concatenacion
            if (i < regex.length - 1) {
                const next = regex[i + 1];
                
                if (this.needsConcatenation(current, next)) {
                    result += '.';
                }
            }
        }
        
        return result;
    }

    /**
     * Determina si se necesita insertar un operador de concatenación
     * entre dos caracteres consecutivos
     * @param {string} current - Caracter actual
     * @param {string} next - Siguiente caracter
     * @returns {boolean} True si se necesita concatenación
     */
    needsConcatenation(current, next) {
        // No concatenar si el actual es un operador binario o parentesis de apertura
        if (this.binaryOperators.has(current) || current === '(') {
            return false;
        }
        
        // No concatenar si el siguiente es un operador o parentesis de cierre
        if (this.isOperator(next) || next === ')') {
            return false;
        }
        
        // Concatenar en todos los demas casos
        return true;
    }

    /**
     * Aplica el algoritmo Shunting Yard
     * @param {string} expression - Expresión con concatenaciones explicitas
     * @returns {string} Expresion en notacion postfija
     */
    shuntingYard(expression) {
        const output = [];
        const operatorStack = [];
        
        for (let i = 0; i < expression.length; i++) {
            const token = expression[i];
            
            if (this.isOperand(token)) {
                // Si es un operando, añadirlo a la salida
                output.push(token);
            }
            else if (this.isOperator(token)) {
                // Mientras haya operadores en la pila con mayor o igual precedencia
                while (operatorStack.length > 0 && 
                       this.isOperator(operatorStack[operatorStack.length - 1]) &&
                       this.hasHigherOrEqualPrecedence(operatorStack[operatorStack.length - 1], token)) {
                    output.push(operatorStack.pop());
                }
                operatorStack.push(token);
            }
            else if (token === '(') {
                operatorStack.push(token);
            }
            else if (token === ')') {
                // Desapilar hasta encontrar el parentesis de apertura
                while (operatorStack.length > 0 && 
                       operatorStack[operatorStack.length - 1] !== '(') {
                    output.push(operatorStack.pop());
                }
                
                if (operatorStack.length === 0) {
                    throw new Error('Parentesis desbalanceados: falta parentesis de apertura');
                }
                
                // Remover el parentesis de apertura
                operatorStack.pop();
            }
            else {
                throw new Error(`Caracter no reconocido: ${token}`);
            }
        }
        
        // Desapilar operadores restantes
        while (operatorStack.length > 0) {
            const op = operatorStack.pop();
            if (op === '(' || op === ')') {
                throw new Error('Parentesis desbalanceados');
            }
            output.push(op);
        }
        
        return output.join('');
    }

    /**
     * Verifica si un caracter es un operando
     * @param {string} char - Caracter a verificar
     * @returns {boolean} True si es operando
     */
    isOperand(char) {
        return !this.isOperator(char) && char !== '(' && char !== ')';
    }

    /**
     * Verifica si un caracter es un operador
     * @param {string} char - Caracter a verificar
     * @returns {boolean} True si es operador
     */
    isOperator(char) {
        return this.precedence.hasOwnProperty(char);
    }

    /**
     * Verifica si un operador tiene mayor o igual precedencia que otro
     * @param {string} op1 - Primer operador
     * @param {string} op2 - Segundo operador
     * @returns {boolean} True si op1 >= op2 en precedencia
     */
    hasHigherOrEqualPrecedence(op1, op2) {
        const prec1 = this.precedence[op1] || 0;
        const prec2 = this.precedence[op2] || 0;
        
        if (prec1 > prec2) {
            return true;
        }
        
        if (prec1 === prec2 && this.leftAssociative.has(op1)) {
            return true;
        }
        
        return false;
    }

    /**
     * Valida que una expresion regular sea sintacticamente correcta
     * @param {string} regex - Expresion regular a validar
     * @returns {Object} Resultado de la validacion
     */
    validate(regex) {
        const errors = [];
        
        // Verificar parentesis balanceados
        let parenthesesCount = 0;
        for (let char of regex) {
            if (char === '(') {
                parenthesesCount++;
            } else if (char === ')') {
                parenthesesCount--;
                if (parenthesesCount < 0) {
                    errors.push('Parentesis de cierre sin apertura correspondiente');
                    break;
                }
            }
        }
        
        if (parenthesesCount > 0) {
            errors.push('Parentesis de apertura sin cierre correspondiente');
        }
        
        // Verificar que no haya operadores binarios consecutivos
        for (let i = 0; i < regex.length - 1; i++) {
            const current = regex[i];
            const next = regex[i + 1];
            
            if (this.binaryOperators.has(current) && this.binaryOperators.has(next)) {
                errors.push(`Operadores binarios consecutivos: ${current}${next}`);
            }
        }
        
        // Verificar que no empiece con operador binario
        if (regex.length > 0 && this.binaryOperators.has(regex[0])) {
            errors.push('La expresion no puede empezar con un operador binario');
        }
        
        // Verificar que no termine con operador binario
        if (regex.length > 0 && this.binaryOperators.has(regex[regex.length - 1])) {
            errors.push('La expresion no puede terminar con un operador binario');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Funcion principal que convierte y valida
     * @param {string} regex - Expresion regular
     * @returns {Object} Resultado de la conversion
     */
    convert(regex) {
        try {
            // Validar la expresion
            const validation = this.validate(regex);
            if (!validation.isValid) {
                return {
                    success: false,
                    errors: validation.errors,
                    postfix: null
                };
            }
            
            // Convertir a postfijo
            const postfix = this.infixToPostfix(regex);
            
            return {
                success: true,
                original: regex,
                postfix: postfix,
                steps: this.getConversionSteps(regex)
            };
        } catch (error) {
            return {
                success: false,
                errors: [error.message],
                postfix: null
            };
        }
    }

    /**
     * Genera los pasos de conversion para propositos educativos
     * @param {string} regex - Expresion regular original
     * @returns {Array} Pasos de la conversion
     */
    getConversionSteps(regex) {
        const steps = [];
        
        // Paso 1: Expresion original
        steps.push({
            step: 1,
            description: 'Expresion regular original',
            expression: regex
        });
        
        // Paso 2: Preprocesamiento
        const preprocessed = this.preprocess(regex);
        if (preprocessed !== regex) {
            steps.push({
                step: 2,
                description: 'Insercion de concatenaciones explicitas (.)',
                expression: preprocessed
            });
        }
        
        // Paso 3: Resultado final
        const postfix = this.shuntingYard(preprocessed);
        steps.push({
            step: steps.length + 1,
            description: 'Conversion a notacion postfija',
            expression: postfix
        });
        
        return steps;
    }

    /**
     * Funcion de utilidad para probar el algoritmo
     * @param {Array<string>} testCases - Casos de prueba
     */
    runTests(testCases) {
        console.log('=== PRUEBAS SHUNTING YARD ===\n');
        
        testCases.forEach((testCase, index) => {
            console.log(`Prueba ${index + 1}: ${testCase}`);
            const result = this.convert(testCase);
            
            if (result.success) {
                console.log(`✓ Resultado: ${result.postfix}`);
                result.steps.forEach(step => {
                    console.log(`  ${step.step}. ${step.description}: ${step.expression}`);
                });
            } else {
                console.log(`✗ Errores: ${result.errors.join(', ')}`);
            }
            console.log('');
        });
    }
}

export default ShuntingYard;

// Ejemplo de uso:

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
