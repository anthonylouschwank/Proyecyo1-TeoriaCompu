# AFD Builder

Constructor y visualizador de **Autómatas Finitos Deterministas (AFD)** a partir de expresiones regulares, con soporte para múltiples algoritmos de construcción y visualización web interactiva.

##  Características

-  **Múltiples Algoritmos**: Thompson, (faltan los demas) 
-  **Visualización Interactiva**: Gráficos web con vis.js para explorar el AFD
-  **Procesamiento en Lote**: Procesa múltiples archivos automáticamente
-  **Reportes**: Documentación automática en Markdown

##  Instalación

```bash
# Clonar el repositorio
git clone https://github.com/anthonylouschwank/Proyecyo1-TeoriaCompu.git

# No requiere dependencias externas - usa Node.js puro
node --version  # Requiere Node.js >= 14.0.0
```

## Uso Rápido

### Ejemplo Básico
```bash
# Ejecutar ejemplo completo
npm start

# Solo construcción con algoritmo de Thompson
npm run thompson

# Visualizar AFD existente
npm run visualizar

# Procesamiento en lote
npm run lote
```

##  Estructura del Proyecto

```
afd-builder/
├── AFDBuilder.js          # Lógica principal de construcción
├── AFDVisualizer.js       # Generador de visualizaciones
├── main.js               # Aplicación principal
├── package.json          # Configuración del proyecto
├── README.md             # Este archivo
├── entrada/              # Archivos de entrada
│   ├── ejemplo1.json
│   ├── ejemplo2.txt
│   └── ...
└── salida/               # Resultados generados
    ├── afd_*.json        # AFDs en formato JSON
    ├── *_visual.html     # Visualizaciones
    ├── *_stats.json      # Estadísticas
    └── *_reporte.md      # Reportes detallados
```

##  Formatos de Entrada

### Archivo JSON
```json
{
  "r": "(b|b)*abb(a|b)*",
  "descripcion": "Expresión de ejemplo"
}
```

### Archivo de Texto
```
(a|b)*a(a|b)(a|b)
```

### Desde Código
```javascript
const expresion = "a*b+";
const afd = builder.resolver(expresion, 'thompson');
```

## 📊 Formato de Salida

El AFD se representa como:

```json
{
  "ESTADOS": [0, 1, 2, 3],
  "SIMBOLOS": ["a", "b"],
  "INICIO": 0,
  "ACEPTACION": [0, 1, 3],
  "TRANSICIONES": [
    [0, "a", 1],
    [0, "b", 2],
    [3, "b", 3]
  ],
  "metadata": {
    "algoritmoUsado": "thompson",
    "expresionOriginal": "(b|b)*abb(a|b)*"
  }
}
```

##  Algoritmos Disponibles

###  Thompson
```javascript
const afd = builder.resolver(expresion, 'thompson');
```
- Convierte regex → AFN → AFD
- Usa construcciones básicas de Thompson
- Aplicar construcción de subconjuntos
- Incluye minimización básica

##  Visualización

La visualización genera un archivo HTML interactivo con:

- **Nodos coloreados** por tipo de estado
- **Aristas etiquetadas** con símbolos de transición  
- **Controles interactivos** para explorar el grafo
- **Panel de información** con estadísticas
- **Leyenda visual** explicativa

### Tipos de Estados
- 🟡 **Estado Inicial** - Punto de entrada
- 🔴 **Estado de Aceptación** - Estados finales
- 🟢 **Inicial + Aceptación** - Ambos roles
- 🔵 **Estado Normal** - Estados regulares
