/**
 * Utilidades de validación para expresiones regulares y cadenas de entrada
 */
class Validator {
    constructor() {
        // Caracteres válidos para el alfabeto
        this.validAlphabetChars = /^[a-zA-Z0-9]$/;
        
        // Operadores válidos
        this.validOperators = new Set(['|', '*', '+', '?', '(', ')']);
        
        // Símbolo epsilon
        this.epsilonSymbol = 'ε';
        
        // Operadores binarios
        this.binaryOperators = new Set(['|']);
        
        // Operadores unarios (postfijos)
        this.unaryOperators = new Set(['*', '+', '?']);
    }

    /**
     * Valida una expresión regular completa
     * @param {string} regex - Expresión regular a validar
     * @returns {Object} Resultado de la validación
     */
    validateRegex(regex) {
        const errors = [];
        const warnings = [];

        // Verificar que no esté vacía
        if (!regex || regex.trim().length === 0) {
            return {
                isValid: false,
                errors: ['La expresión regular no puede estar vacía'],
                warnings: [],
                suggestions: ['Ingrese una expresión regular válida, por ejemplo: (a|b)*']
            };
        }

        // Normalizar la expresión (eliminar espacios)
        const normalizedRegex = regex.replace(/\s+/g, '');

        // Validar caracteres permitidos
        const invalidChars = this.findInvalidCharacters(normalizedRegex);
        if (invalidChars.length > 0) {
            errors.push(`Caracteres no válidos encontrados: ${invalidChars.join(', ')}`);
        }

        // Validar balance de paréntesis
        const parenthesesResult = this.validateParentheses(normalizedRegex);
        if (!parenthesesResult.isValid) {
            errors.push(...parenthesesResult.errors);
        }

        // Validar operadores
        const operatorResult = this.validateOperators(normalizedRegex);
        if (!operatorResult.isValid) {
            errors.push(...operatorResult.errors);
        }
        warnings.push(...operatorResult.warnings);

        // Validar secuencias inválidas
        const sequenceResult = this.validateSequences(normalizedRegex);
        if (!sequenceResult.isValid) {
            errors.push(...sequenceResult.errors);
        }

        // Generar sugerencias
        const suggestions = this.generateSuggestions(normalizedRegex, errors);

        return {
            isValid: errors.length === 0,
            errors: errors,
            warnings: warnings,
            suggestions: suggestions,
            normalizedRegex: normalizedRegex,
            alphabet: this.extractAlphabet(normalizedRegex)
        };
    }

    /**
     * Valida una cadena de entrada para simulación
     * @param {string} inputString - Cadena a validar
     * @param {Set<string>} alphabet - Alfabeto del autómata
     * @returns {Object} Resultado de la validación
     */
    validateInputString(inputString, alphabet) {
        const errors = [];
        const warnings = [];

        // Permitir cadena vacía
        if (inputString === '') {
            return {
                isValid: true,
                errors: [],
                warnings: ['Cadena vacía - se probará la transición epsilon'],
                normalizedString: ''
            };
        }

        // Verificar que todos los caracteres estén en el alfabeto
        const invalidChars = [];
        for (let char of inputString) {
            if (!alphabet.has(char)) {
                invalidChars.push(char);
            }
        }

        if (invalidChars.length > 0) {
            errors.push(`Caracteres no válidos para este autómata: ${[...new Set(invalidChars)].join(', ')}`);
            errors.push(`Alfabeto válido: {${Array.from(alphabet).sort().join(', ')}}`);
        }

        // Verificar longitud razonable
        if (inputString.length > 100) {
            warnings.push('Cadena muy larga - la simulación puede ser lenta');
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            warnings: warnings,
            normalizedString: inputString,
            length: inputString.length
        };
    }

    /**
     * Encuentra caracteres inválidos en la expresión regular
     * @param {string} regex - Expresión regular
     * @returns {Array<string>} Caracteres inválidos
     */
    findInvalidCharacters(regex) {
        const invalidChars = [];
        
        for (let char of regex) {
            if (!this.validAlphabetChars.test(char) && 
                !this.validOperators.has(char) && 
                char !== this.epsilonSymbol) {
                invalidChars.push(char);
            }
        }
        
        return [...new Set(invalidChars)];
    }

    /**
     * Valida el balance de paréntesis
     * @param {string} regex - Expresión regular
     * @returns {Object} Resultado de la validación
     */
    validateParentheses(regex) {
        const errors = [];
        let balance = 0;
        let position = 0;

        for (let char of regex) {
            if (char === '(') {
                balance++;
            } else if (char === ')') {
                balance--;
                if (balance < 0) {
                    errors.push(`Paréntesis de cierre sin apertura en posición ${position}`);
                    break;
                }
            }
            position++;
        }

        if (balance > 0) {
            errors.push(`${balance} paréntesis de apertura sin cierre correspondiente`);
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Valida el uso correcto de operadores
     * @param {string} regex - Expresión regular
     * @returns {Object} Resultado de la validación
     */
    validateOperators(regex) {
        const errors = [];
        const warnings = [];

        // Verificar operadores al inicio y final
        if (this.binaryOperators.has(regex[0])) {
            errors.push('La expresión no puede comenzar con un operador binario');
        }

        if (this.binaryOperators.has(regex[regex.length - 1])) {
            errors.push('La expresión no puede terminar con un operador binario');
        }

        // Verificar operadores consecutivos
        for (let i = 0; i < regex.length - 1; i++) {
            const current = regex[i];
            const next = regex[i + 1];

            // Operadores binarios consecutivos
            if (this.binaryOperators.has(current) && this.binaryOperators.has(next)) {
                errors.push(`Operadores binarios consecutivos en posición ${i}: ${current}${next}`);
            }

            // Operador binario después de paréntesis de apertura
            if (current === '(' && this.binaryOperators.has(next)) {
                errors.push(`Operador binario después de '(' en posición ${i + 1}`);
            }

            // Operador binario antes de paréntesis de cierre
            if (this.binaryOperators.has(current) && next === ')') {
                errors.push(`Operador binario antes de ')' en posición ${i}`);
            }

            // Paréntesis vacíos
            if (current === '(' && next === ')') {
                errors.push(`Paréntesis vacíos en posición ${i}`);
            }
        }

        // Detectar expresiones redundantes
        if (regex.includes('|') && this.hasRedundantAlternations(regex)) {
            warnings.push('Posibles alternaciones redundantes detectadas (ej: a|a)');
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            warnings: warnings
        };
    }

    /**
     * Valida secuencias de caracteres
     * @param {string} regex - Expresión regular
     * @returns {Object} Resultado de la validación
     */
    validateSequences(regex) {
        const errors = [];

        // Verificar múltiples operadores unarios
        for (let i = 0; i < regex.length - 1; i++) {
            const current = regex[i];
            const next = regex[i + 1];

            if (this.unaryOperators.has(current) && this.unaryOperators.has(next)) {
                errors.push(`Operadores unarios consecutivos en posición ${i}: ${current}${next}`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Detecta alternaciones redundantes
     * @param {string} regex - Expresión regular
     * @returns {boolean} True si hay redundancia
     */
    hasRedundantAlternations(regex) {
        // Buscar patrones como a|a, (ab)|(ab), etc.
        const alternationPattern = /([^|()]+)\|(\1)/g;
        return alternationPattern.test(regex);
    }

    /**
     * Extrae el alfabeto de una expresión regular
     * @param {string} regex - Expresión regular
     * @returns {Set<string>} Alfabeto extraído
     */
    extractAlphabet(regex) {
        const alphabet = new Set();
        
        for (let char of regex) {
            if (this.validAlphabetChars.test(char)) {
                alphabet.add(char);
            }
        }
        
        return alphabet;
    }

    /**
     * Genera sugerencias de corrección
     * @param {string} regex - Expresión regular
     * @param {Array<string>} errors - Errores encontrados
     * @returns {Array<string>} Sugerencias
     */
    generateSuggestions(regex, errors) {
        const suggestions = [];

        if (errors.some(error => error.includes('paréntesis'))) {
            suggestions.push('Verifique que todos los paréntesis estén balanceados');
            suggestions.push('Ejemplo correcto: (a|b)*c');
        }

        if (errors.some(error => error.includes('operador binario'))) {
            suggestions.push('Los operadores binarios (|) deben tener operandos a ambos lados');
            suggestions.push('Ejemplo correcto: a|b, no |a o a|');
        }

        if (errors.some(error => error.includes('consecutivos'))) {
            suggestions.push('Evite operadores consecutivos');
            suggestions.push('Use paréntesis para agrupar: (a*)*  →  a*');
        }

        if (errors.some(error => error.includes('Caracteres no válidos'))) {
            suggestions.push('Use solo letras (a-z, A-Z), números (0-9) y operadores (|*+?())');
            suggestions.push('Para espacios en blanco, considere usar un símbolo como _ o s');
        }

        // Sugerencias generales si no hay errores específicos
        if (suggestions.length === 0 && errors.length > 0) {
            suggestions.push('Ejemplos de expresiones válidas:');
            suggestions.push('• (a|b)*  - cero o más a\'s o b\'s');
            suggestions.push('• a+b*   - una o más a\'s seguido de cero o más b\'s');
            suggestions.push('• (ab)?c - opcionalmente ab, seguido de c');
        }

        return suggestions;
    }

    /**
     * Valida formato de archivo de autómata
     * @param {Object} automatonData - Datos del autómata
     * @returns {Object} Resultado de la validación
     */
    validateAutomatonFormat(automatonData) {
        const errors = [];
        const requiredFields = ['ESTADOS', 'SIMBOLOS', 'INICIO', 'ACEPTACION', 'TRANSICIONES'];

        // Verificar campos requeridos
        for (let field of requiredFields) {
            if (!(field in automatonData)) {
                errors.push(`Campo requerido faltante: ${field}`);
            }
        }

        if (errors.length > 0) {
            return { isValid: false, errors: errors };
        }

        // Validar tipos de datos
        if (!Array.isArray(automatonData.ESTADOS)) {
            errors.push('ESTADOS debe ser un array');
        }

        if (!Array.isArray(automatonData.SIMBOLOS)) {
            errors.push('SIMBOLOS debe ser un array');
        }

        if (!Array.isArray(automatonData.ACEPTACION)) {
            errors.push('ACEPTACION debe ser un array');
        }

        if (!Array.isArray(automatonData.TRANSICIONES)) {
            errors.push('TRANSICIONES debe ser un array');
        }

        // Validar estado inicial
        if (!automatonData.ESTADOS.includes(automatonData.INICIO)) {
            errors.push('El estado inicial debe estar en el conjunto de estados');
        }

        // Validar estados de aceptación
        for (let state of automatonData.ACEPTACION) {
            if (!automatonData.ESTADOS.includes(state)) {
                errors.push(`Estado de aceptación ${state} no está en el conjunto de estados`);
            }
        }

        // Validar transiciones
        for (let i = 0; i < automatonData.TRANSICIONES.length; i++) {
            const trans = automatonData.TRANSICIONES[i];
            
            if (!trans.hasOwnProperty('from') || !trans.hasOwnProperty('symbol') || !trans.hasOwnProperty('to')) {
                errors.push(`Transición ${i} debe tener campos 'from', 'symbol', 'to'`);
                continue;
            }

            if (!automatonData.ESTADOS.includes(trans.from)) {
                errors.push(`Estado origen ${trans.from} en transición ${i} no está en el conjunto de estados`);
            }

            if (!automatonData.ESTADOS.includes(trans.to)) {
                errors.push(`Estado destino ${trans.to} en transición ${i} no está en el conjunto de estados`);
            }

            if (trans.symbol !== 'ε' && !automatonData.SIMBOLOS.includes(trans.symbol)) {
                errors.push(`Símbolo ${trans.symbol} en transición ${i} no está en el alfabeto`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Proporciona ayuda contextual para la entrada
     * @returns {Object} Información de ayuda
     */
    getHelp() {
        return {
            operators: {
                '|': 'Alternación (OR) - elige entre opciones: a|b',
                '*': 'Estrella de Kleene - cero o más repeticiones: a*',
                '+': 'Plus - una o más repeticiones: a+',
                '?': 'Opcional - cero o una repetición: a?',
                '()': 'Agrupación - agrupa expresiones: (a|b)*'
            },
            examples: {
                basic: [
                    'a - acepta solo "a"',
                    'ab - acepta solo "ab"',
                    'a|b - acepta "a" o "b"'
                ],
                intermediate: [
                    'a* - acepta "", "a", "aa", "aaa", ...',
                    'a+ - acepta "a", "aa", "aaa", ... (no cadena vacía)',
                    'a? - acepta "" o "a"'
                ],
                advanced: [
                    '(a|b)* - cualquier secuencia de a\'s y b\'s',
                    '(a|b)*abb - termina en "abb"',
                    'a*b+c? - cero o más a\'s, una o más b\'s, opcionalmente c'
                ]
            },
            tips: [
                'Use paréntesis para agrupar operaciones',
                'Los operadores *, +, ? se aplican al elemento inmediatamente anterior',
                'El operador | tiene la menor precedencia',
                'La concatenación es implícita (ab significa a seguido de b)'
            ]
        };
    }
}

export default Validator;