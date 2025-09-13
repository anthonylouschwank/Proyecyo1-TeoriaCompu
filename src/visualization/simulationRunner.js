// SimulationRunner.js
/**
 * Ejecuta la simulación paso a paso en un AFD (idealmente minimizado)
 * y opcionalmente anima el recorrido en GraphVisualizer.
 *
 * @param {string} w - Cadena a simular, p.ej. "babbaaaaa"
 * @param {Automaton} dfa - Autómata determinista (type: 'DFA' o 'MinDFA')
 * @param {GraphVisualizer|null} visualizer - Instancia del visualizador (D3 o Cytoscape)
 * @param {Object} options - { speed?: number, autoPlay?: boolean, showStepInfo?: boolean }
 * @returns {{accepted: boolean, steps: Array}} Resultado y pasos de simulación
 */
export async function simulateStringOnDFA(w, dfa, visualizer = null, options = {}) {
  if (!dfa || (dfa.type !== 'DFA' && dfa.type !== 'MinDFA')) {
    throw new Error('Proporciona un AFD (o AFD minimizado) para simular.');
  }

  // Validar símbolos contra el alfabeto del autómata
  const alphabet = new Set(dfa.getAlphabet());
  const invalid = [...new Set([...w].filter(ch => !alphabet.has(ch)))];
  if (invalid.length > 0) {
    throw new Error(
      `Símbolos inválidos en la cadena: ${invalid.join(', ')}. ` +
      `El alfabeto del autómata es: {${[...alphabet].join(', ')}}`
    );
  }

  // Simulación "en seco" (no visual)
  const { accepted, steps } = dfa.simulateDFA(w);

  // Si hay visualizador, animar recorrido
  if (visualizer) {
    // Reset de overlay/veredictos previos si existe método
    if (typeof visualizer.clearFinalVerdict === 'function') {
      visualizer.clearFinalVerdict();
    }

    // Pintar paso 0 y animar
    visualizer.highlightSimulationPath(steps, 0);
    await visualizer.animateSimulation(steps, {
      speed: 1000,
      autoPlay: true,
      showStepInfo: true,
      ...options
    });

    // Mostrar veredicto final en overlay si existe método
    if (typeof visualizer.showFinalVerdict === 'function') {
      visualizer.showFinalVerdict(accepted, { word: w });
    }
  }

  return { accepted, steps };
}
