function toText(automaton) {
  try {
    const txt = automaton.export('text');
    if (typeof txt === 'string') return txt;
  } catch {}
  try {
    return JSON.stringify(JSON.parse(automaton.export('json')), null, 2);
  } catch (e) {
    return String(e.message || e);
  }
}

export default class FileExporter {
  exportAndDownload(automaton, format = 'json') {
    try {
      let dataStr = '';
      let mime = 'application/json';
      let filename = `automata.${format}`;

      if (format === 'json') {
        dataStr = automaton.export('json');
      } else if (format === 'txt' || format === 'text') {
        dataStr = toText(automaton);
        mime = 'text/plain';
      } else if (format === 'yaml' || format === 'yml') {
        const obj = JSON.parse(automaton.export('json'));
        dataStr = Object.entries(obj).map(([k,v]) => `${k}: ${JSON.stringify(v)}`).join('\n');
        mime = 'text/yaml';
        filename = 'automata.yaml';
      } else if (format === 'csv') {
        const obj = JSON.parse(automaton.export('json'));
        dataStr = 'from,symbol,to\n' + obj.TRANSICIONES.map(t => `${t.from},${t.symbol},${t.to}`).join('\n');
        mime = 'text/csv';
        filename = 'transiciones.csv';
      } else if (format === 'dot') {
        const obj = JSON.parse(automaton.export('json'));
        const lines = [];
        lines.push('digraph Automata {');
        lines.push('  rankdir=LR;');
        lines.push('  node [shape=circle];');
        obj.ACEPTACION.forEach(id => lines.push(`  ${id} [shape=doublecircle];`));
        lines.push('  _start [shape=point];');
        lines.push(`  _start -> ${obj.INICIO};`);
        obj.TRANSICIONES.forEach(t => {
          lines.push(`  ${t.from} -> ${t.to} [label="${t.symbol}"];`);
        });
        lines.push('}');
        dataStr = lines.join('\n');
        mime = 'text/vnd.graphviz';
        filename = 'automata.dot';
      } else {
        dataStr = automaton.export('json');
      }

      const blob = new Blob([dataStr], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      return { success: true, message: `Descargado: ${filename}` };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  generateConversionReport({ originalRegex, postfix, nfa, dfa, minDFA, shuntingSteps, subsetSteps, hopcroftSteps }) {
    const parts = [];
    parts.push(`Expresión original: ${originalRegex}`);
    parts.push(`Postfija: ${postfix}`);
    if (nfa) parts.push(`AFN: ${nfa.states.size} estados`);
    if (dfa) parts.push(`AFD: ${dfa.states.size} estados`);
    if (minDFA) parts.push(`AFD Mínimo: ${minDFA.states.size} estados`);
    if (shuntingSteps) {
      parts.push('\n== Pasos Shunting ==');
      shuntingSteps.forEach(s => parts.push(`${s.step}. ${s.description}: ${s.expression}`));
    }
    if (subsetSteps) {
      parts.push('\n== Pasos Subconjuntos (primeros) ==');
      subsetSteps.slice(0, 10).forEach(s => parts.push(`${s.step}. ${s.action}`));
    }
    if (hopcroftSteps) {
      parts.push('\n== Pasos Hopcroft ==');
      hopcroftSteps.forEach(s => parts.push(`${s.step}. ${s.action}`));
    }
    return parts.join('\n');
  }

  // Expuesto para el panel de resultados
  toText(automaton) { return toText(automaton); }
}
