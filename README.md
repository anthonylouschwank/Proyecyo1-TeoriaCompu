# Teoria de la Computacion 2025

## Descripcion

Este proyecto implementa algoritmos fundamentales para la construccion y manipulacion de automatas finitos a partir de expresiones regulares. Incluye la cadena completa de conversion desde expresiones regulares hasta automatas finitos deterministas minimos, con capacidades de simulacion y visualizacion.

## Estructura del Proyecto

```
proyecto-automatas/
├── src/
│   ├── algorithms/
│   │   ├── shuntingYard.js       # Conversion regex a postfija
│   │   ├── thompsonNFA.js        # Construccion de AFN 
│   │   ├── subsetConstruction.js # Conversion AFN a AFD
│   │   └── hopcroft.js          # Minimizacion AFD 
│   ├── models/
│   │   ├── Automaton.js         # Clase principal de automata
│   │   └── State.js             # Clase estado
│   ├── tests/
│   │   ├── CompTest.js          # Test de implementacion conjunta
│   │   ├── shuntingYardTest.js        
│   │   └── ThompsonTest.js 
│   ├── utils/
│   │   ├── fileExporter.js      # Exportacion de archivos
│   │   └── validator.js         # Validacion de entradas
│   └── visualization/
│       └── graphVisualizer.js   # Visualizacion de automatas
├── public/
│   └── index.html              # Interfaz web
├── examples/
│   ├── basic-examples.js       # Ejemplos basicos
│   └── test-cases.js          # Casos de prueba
├── docs/
│   ├── algoritmos.md          # Documentacion de algoritmos
│   └── ejemplos.md           # Ejemplos de uso
└── README.md                 # Este archivo
```

## Algoritmos Implementados

### 1. Shunting Yard 
Convierte expresiones regulares de notacion infija a postfija.

**Archivo:** `src/algorithms/shuntingYard.js`

**Caracteristicas:**
- Manejo de precedencias de operadores
- Insercion automatica de concatenaciones
- Validacion de sintaxis
- Soporte para `|`, `*`, `+`, `?`, `(`, `)`

**Ejemplo:**
```javascript
const shuntingYard = new ShuntingYard();
const result = shuntingYard.convert('(a|b)*abb');
// Output: ab|*a.b.b..
```

### 2. Construccion de AFN - Thompson
Construye un Automata Finito No-determinista a partir de expresiones regulares en postfija.

**Archivo:** `src/algorithms/thompsonNFA.js`

**Caracteristicas:**
- Construccion inductiva por operadores
- Manejo de transiciones epsilon
- Estados unicos de entrada y salida por construccion
- Soporte completo para todos los operadores

**Ejemplo:**
```javascript
const thompson = new ThompsonNFA();
const nfa = thompson.buildNFA('ab|*');
console.log(nfa.export('json'));
```

### 3. Construccion de Subconjuntos
Convierte AFN en AFD eliminando el no-determinismo.

**Archivo:** `src/algorithms/subsetConstruction.js`

**Caracteristicas:**
- Calculo de clausuras epsilon
- Construccion de estados como conjuntos
- Eliminacion de estados inalcanzables
- Mapeo detallado AFN → AFD

**Ejemplo:**
```javascript
const subsetConstruction = new SubsetConstruction();
const dfa = subsetConstruction.convertToDFA(nfa);
```

### 4. Minimizacion de Hopcroft 
Minimiza el AFD eliminando estados equivalentes.

**Archivo:** `src/algorithms/hopcroft.js`

**Caracteristicas:**
- Particion inicial por estados finales/no finales
- Refinamiento iterativo de particiones
- Construccion del AFD minimo
- Optimizacion automatica

**Ejemplo:**
```javascript
const hopcroft = new HopcroftMinimization();
const minDFA = hopcroft.minimize(dfa);
```

### 5. Simulacion de Automatas
Simula la ejecucion de cadenas en automatas con pasos detallados.

**Implementado en:** `src/models/Automaton.js`

**Caracteristicas:**
- Simulacion para AFN y AFD
- Pasos detallados de ejecucion
- Verificacion de aceptacion/rechazo
- Manejo de transiciones epsilon

**Ejemplo:**
```javascript
const result = minDFA.accepts('aabbabb');
console.log(result.accepted); // true/false
console.log(result.steps);    // Pasos de la simulacion
```

## Formato de Entrada

El programa acepta expresiones regulares con:
- **Alfabeto:** Letras minusculas/mayusculas (a-z, A-Z), digitos (0-9)
- **Operadores:** `|` (alternacion), `*` (estrella), `+` (plus), `?` (opcional), `()` (agrupacion)
- **Simbolo epsilon:** `ε` (representado internamente)

**Ejemplos validos:**
- `(a|b)*abb`
- `a*b+`
- `(ab|ba)*`
- `a?b*c+`

## Formato de Salida

### Formato JSON
```json
{
  "type": "DFA",
  "ESTADOS": [0, 1, 2, 3],
  "SIMBOLOS": ["a", "b"],
  "INICIO": 0,
  "ACEPTACION": [3],
  "TRANSICIONES": [
    {"from": 0, "symbol": "a", "to": 1},
    {"from": 1, "symbol": "b", "to": 3}
  ]
}
```

### Formato Texto
```
ESTADOS = {0, 1, 2, 3}
SIMBOLOS = {a, b}
INICIO = {0}
ACEPTACION = {3}
TRANSICIONES = {(0, a, 1), (1, b, 3)}
```

## Instalacion y Uso

### Requisitos
- Node.js (version 14 o superior)
- Navegador web moderno

### Instalacion
```bash
# Clonar el repositorio
git clone https://github.com/anthonylouschwank/Proyecyo1-TeoriaCompu.git
cd Proyecyo1-TeoriaCompu

# Ejecutar ejemplos
cd src/tests
node CompTest.js
```

### Uso Basico

#### Uso Individual de Algoritmos
```javascript
// Solo Shunting Yard
const shuntingYard = new ShuntingYard();
const result = shuntingYard.convert('a*b+');
console.log(result.postfix); // "a*b+."

// Solo Thompson
const thompson = new ThompsonNFA();
const nfa = thompson.buildNFA('ab.');
console.log(`Estados: ${nfa.states.size}`);

// Solo simulacion
const testResult = automaton.accepts('ab');
console.log(`Aceptada: ${testResult.accepted}`);
```

## Ejemplos de Prueba

### Caso 1: `(b|b)*abb(a|b)*`
```
Expresion original: (b|b)*abb(a|b)*
Postfija: bb|*a.b.b.ab|*.
Estados AFN: 18
Estados AFD: 5
Estados AFD minimo: 4
```

### Caso 2: `a*b+`
```
Expresion original: a*b+
Postfija: a*b+.
Estados AFN: 8
Estados AFD: 3
Estados AFD minimo: 3
```

### Simulaciones
```javascript
// Ejemplo de simulacion exitosa
const result1 = minDFA.accepts("babbaaaaa");
// Output: { accepted: true, steps: [...] }

// Ejemplo de simulacion fallida
const result2 = minDFA.accepts("xyz");
// Output: { accepted: false, steps: [...] }
```

## Caracteristicas Avanzadas

### Pasos Detallados
Todos los algoritmos proporcionan informacion paso a paso:

```javascript
const result = shuntingYard.convert('(a|b)*');
result.steps.forEach(step => {
    console.log(`${step.step}. ${step.description}: ${step.expression}`);
});
```

### Estadisticas de Conversion
```javascript
const stats = hopcroft.getStatistics(originalDFA, minimalDFA);
console.log(`Reduccion: ${stats.stateReductionPercent}`);
```

### Validacion de Entrada
```javascript
const validation = shuntingYard.validate('((a|b)*');
if (!validation.isValid) {
    console.log('Errores:', validation.errors);
}
```

### Casos de Prueba Incluidos
- Expresiones basicas (simbolos individuales)
- Operadores unarios (`*`, `+`, `?`)
- Operadores binarios (`|`, concatenacion)
- Expresiones complejas con anidamiento
- Casos limite y expresiones vacias

## Documentacion Adicional

Proyecto de Teoria de la Computacion 2025  

## Correr programa

npx http-server . -p 5173 -c-1
