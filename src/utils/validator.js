export default class Validator {
  validateRegex(regex) {
    const errors = [];
    if (typeof regex !== 'string' || regex.trim() === '') errors.push('Expresión vacía.');
    // Paréntesis balanceados simples
    let bal = 0;
    for (const c of regex) {
      if (c === '(') bal++;
      if (c === ')') bal--;
      if (bal < 0) errors.push('Paréntesis de cierre extra.');
    }
    if (bal > 0) errors.push('Paréntesis sin cerrar.');
    return { isValid: errors.length === 0, errors };
  }

  validateInputString(word, alphabetSet) {
    const errors = [];
    if (word == null) return { isValid: true, errors: [] };
    for (const ch of word) {
      if (!alphabetSet.has(ch)) errors.push(`Símbolo "${ch}" no pertenece al alfabeto del autómata.`);
    }
    return { isValid: errors.length === 0, errors };
  }
}
