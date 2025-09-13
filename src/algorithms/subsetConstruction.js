// SubsetConstruction.js
import Automaton from '../models/Automaton.js';

class SubsetConstruction {
  constructor() {
    this.stateSetToId = new Map(); // "{1,2}" -> dfaStateId
    this.idToStateSet = new Map();  // dfaStateId -> Set<State(NFA)>
  }

  // ---------- Helpers básicos ----------
  stateSetToString(stateSet) {
    const ids = Array.from(stateSet).map(s => s.id).sort((a, b) => a - b);
    return `{${ids.join(',')}}`;
  }

  // Regla de aceptación por intersección con los finales del NFA (lo que pide tu profe)
  isAcceptingSetFrom(stateSet, acceptingNFAIds) {
    for (const s of stateSet) if (acceptingNFAIds.has(s.id)) return true;
    return false;
  }

  // Sellar trazabilidad NFA->DFA
  stampOriginOnDFAState(dfaState, stateSet) {
    dfaState.originNFAIds = Array.from(stateSet).map(s => s.id).sort((a, b) => a - b);
  }

  // Obtiene (o crea) un estado DFA para un conjunto de estados del NFA
  getOrCreateDFAState(dfa, stateSet, acceptingNFAIds) {
    const key = this.stateSetToString(stateSet);
    if (this.stateSetToId.has(key)) {
      const id = this.stateSetToId.get(key);
      return dfa.getState(id); // ya existe
    }
    const isAcc = this.isAcceptingSetFrom(stateSet, acceptingNFAIds);
    const dfaState = dfa.createState(isAcc);            // NO re-asignar IDs
    this.stateSetToId.set(key, dfaState.id);
    this.idToStateSet.set(dfaState.id, stateSet);
    this.stampOriginOnDFAState(dfaState, stateSet);
    return dfaState;
  }

  // move(S, a)
  move(states, symbol) {
    const result = new Set();
    states.forEach(st => {
      const targets = st.getTransitions(symbol);
      targets.forEach(t => result.add(t));
    });
    return result;
  }

  // ---------- Conversión NFA -> DFA ----------
  convertToDFA(nfa) {
    if (nfa.type !== 'NFA') throw new Error('El automata de entrada debe ser un AFN');

    // reset mapeos
    this.stateSetToId.clear();
    this.idToStateSet.clear();

    const dfa = new Automaton('DFA');

    // FUENTE DE VERDAD: estados finales del NFA
    const acceptingNFAIds = new Set(Array.from(nfa.acceptStates).map(s => s.id));

    // Tu Automaton ya NO mete 'ε' al alfabeto; no hace falta filtrarlo
    const alphabet = nfa.getAlphabet();

    // Estado inicial = ε-closure({q0})
    const initialClosure = nfa.epsilonClosure(new Set([nfa.startState]));
    const q0DFA = this.getOrCreateDFAState(dfa, initialClosure, acceptingNFAIds);
    dfa.setStartState(q0DFA);

    // BFS de conjuntos
    const pending = [initialClosure];
    const seen = new Set([this.stateSetToString(initialClosure)]);

    while (pending.length) {
      const currentSet = pending.shift();
      const fromId = this.stateSetToId.get(this.stateSetToString(currentSet));
      const fromState = dfa.getState(fromId);

      for (const a of alphabet) {
        const moveRes = this.move(currentSet, a);
        if (moveRes.size === 0) continue;

        const newSet = nfa.epsilonClosure(moveRes);
        const toState = this.getOrCreateDFAState(dfa, newSet, acceptingNFAIds);

        dfa.addTransition(fromState, a, toState);

        const key = this.stateSetToString(newSet);
        if (!seen.has(key)) {
          seen.add(key);
          pending.push(newSet);
        }
      }
    }

    // Guarda los finales del NFA en el DFA para auditorías/optimizaciones
    dfa._acceptingNFAIds = acceptingNFAIds;

    return dfa;
  }

  // ---------- Conversión con pasos ----------
  convertWithSteps(nfa) {
    try {
      this.stateSetToId.clear();
      this.idToStateSet.clear();

      const dfa = new Automaton('DFA');
      const steps = [];

      const acceptingNFAIds = new Set(Array.from(nfa.acceptStates).map(s => s.id));
      const alphabet = nfa.getAlphabet();

      const initialClosure = nfa.epsilonClosure(new Set([nfa.startState]));
      const q0DFA = this.getOrCreateDFAState(dfa, initialClosure, acceptingNFAIds);
      dfa.setStartState(q0DFA);

      steps.push({
        step: 1,
        action: 'Estado inicial del AFD',
        currentSet: this.stateSetToString(initialClosure),
        isAccepting: q0DFA.isAccepting,
        dfaStateId: q0DFA.id
      });

      let k = 2;
      const pending = [initialClosure];
      const seen = new Set([this.stateSetToString(initialClosure)]);

      while (pending.length) {
        const currentSet = pending.shift();
        const currentKey = this.stateSetToString(currentSet);
        const fromId = this.stateSetToId.get(currentKey);
        const fromState = dfa.getState(fromId);

        steps.push({ step: k++, action: `Procesando ${currentKey} (DFA ${fromId})` });

        for (const a of alphabet) {
          const moveRes = this.move(currentSet, a);
          if (moveRes.size === 0) {
            steps.push({
              step: k++,
              action: `No hay transición con '${a}'`,
              from: currentKey
            });
            continue;
          }

          const newSet = nfa.epsilonClosure(moveRes);
          const toState = this.getOrCreateDFAState(dfa, newSet, acceptingNFAIds);

          dfa.addTransition(fromState, a, toState);

          steps.push({
            step: k++,
            action: `Transición '${a}'`,
            from: currentKey,
            move: this.stateSetToString(moveRes),
            epsilonClosure: this.stateSetToString(newSet),
            toDFA: toState.id,
            toIsAccepting: toState.isAccepting
          });

          const key = this.stateSetToString(newSet);
          if (!seen.has(key)) {
            seen.add(key);
            pending.push(newSet);
          }
        }
      }

      dfa._acceptingNFAIds = acceptingNFAIds;

      return {
        success: true,
        nfa,
        dfa,
        steps,
        stateMapping: this.getStateMapping(),
        statistics: this.getStatistics(nfa, dfa)
      };

    } catch (error) {
      return { success: false, error: error.message, dfa: null };
    }
  }

  // ---------- utilerías ----------
  getStateMapping() {
    const mapping = {};
    this.idToStateSet.forEach((set, id) => {
      mapping[id] = {
        dfaState: id,
        nfaStates: Array.from(set).map(s => s.id).sort((a, b) => a - b),
      };
    });
    return mapping;
  }

  countTransitions(automaton) {
    let c = 0;
    automaton.states.forEach(st => {
      st.transitions.forEach(targets => c += targets.size);
      // si quieres contar epsilons en NFAs, descomenta:
      // st.epsilonTransitions.forEach(() => c++);
    });
    return c;
  }

  getStatistics(nfa, dfa) {
    return {
      nfaStates: nfa.states.size,
      dfaStates: dfa.states.size,
      reductionRatio: ((nfa.states.size - dfa.states.size) / nfa.states.size * 100).toFixed(2) + '%',
      alphabetSize: nfa.alphabet.size,
      nfaTransitions: this.countTransitions(nfa),
      dfaTransitions: this.countTransitions(dfa)
    };
  }

  /**
   * Elimina inalcanzables del DFA preservando origen y aceptación por intersección.
   * Requiere que dfa._acceptingNFAIds exista (lo define convertToDFA/convertWithSteps).
   */
  removeUnreachableStates(dfa) {
    const reachable = new Set();
    const queue = [];
    if (dfa.startState) {
      reachable.add(dfa.startState);
      queue.push(dfa.startState);
    }

    while (queue.length) {
      const cur = queue.shift();
      cur.transitions.forEach(targets => {
        targets.forEach(t => {
          if (!reachable.has(t)) {
            reachable.add(t);
            queue.push(t);
          }
        });
      });
    }

    const opt = new Automaton('DFA');
    const mapOldToNew = new Map();
    const accNFA = dfa._acceptingNFAIds instanceof Set ? dfa._acceptingNFAIds : new Set();

    // copiar estados (re-evaluar aceptación por intersección)
    reachable.forEach(oldSt => {
      const ok = Array.isArray(oldSt.originNFAIds)
        ? oldSt.originNFAIds.some(id => accNFA.has(id))
        : oldSt.isAccepting; // fallback
      const ns = opt.createState(ok);
      // conservar origen
      ns.originNFAIds = Array.isArray(oldSt.originNFAIds) ? [...oldSt.originNFAIds] : [];
      mapOldToNew.set(oldSt, ns);
      if (oldSt === dfa.startState) {
        opt.setStartState(ns);
      }
    });

    // copiar transiciones
    reachable.forEach(oldSt => {
      const from = mapOldToNew.get(oldSt);
      oldSt.transitions.forEach((targets, sym) => {
        targets.forEach(oldTo => {
          if (reachable.has(oldTo)) {
            opt.addTransition(from, sym, mapOldToNew.get(oldTo));
          }
        });
      });
    });

    opt._acceptingNFAIds = accNFA;
    return opt;
  }
}

export default SubsetConstruction;

// --------- Utilidades opcionales para auditoría/minimización ---------

/**
 * Re-etiqueta la aceptación del DFA por intersección con los finales originales del NFA.
 * Úsalo después de minimizar o de cualquier transformación que rehaga estados.
 */
export function reconcileAcceptingByIntersection(dfa) {
  const accNFA = dfa._acceptingNFAIds || new Set();
  dfa.acceptStates.clear();
  dfa.states.forEach(st => {
    const ok = Array.isArray(st.originNFAIds)
      ? st.originNFAIds.some(id => accNFA.has(id))
      : st.isAccepting; // fallback
    st.isAccepting = ok;
    if (ok) dfa.acceptStates.add(st);
  });
  return dfa;
}

/**
 * Devuelve los IDs de estados NFA que aparecen en algún estado DFA de aceptación.
 * (La “intersección al final” que pide el profesor, como reporte)
 */
export function commonAcceptingNFAIds(dfa) {
  const res = new Set();
  const accNFA = dfa._acceptingNFAIds || new Set();
  dfa.states.forEach(st => {
    if (!st.isAccepting) return;
    if (Array.isArray(st.originNFAIds)) {
      for (const id of st.originNFAIds) {
        if (accNFA.has(id)) res.add(id);
      }
    }
  });
  return res;
}
