// testAutomata.js
import fs from "fs";

/**
 * Simula un AFD simple definido en JSON
 */
function simularAutomata(automata) {
  const transiciones = new Map();
  for (const t of automata.TRANSICIONES) {
    const key = `${t.from},${t.symbol}`;
    transiciones.set(key, t.to);
  }

  console.log("\n===============================");
  console.log( automata.DESCRIPCION);
  console.log("===============================\n");

  let correctos = 0;
  for (const p of automata.PRUEBAS) {
    let estado = automata.INICIO;
    for (const simbolo of p.cadena) {
      const key = `${estado},${simbolo}`;
      if (!transiciones.has(key)) {
        estado = null;
        break;
      }
      estado = transiciones.get(key);
    }

    const aceptada =
      estado && automata.ACEPTACION.includes(estado)
        ? "ACEPTADA"
        : "RECHAZADA";

    const ok = aceptada === p.esperado ? "y" : "n";
    if (ok === "y") correctos++;

    console.log(
      `${ok} Cadena: '${p.cadena || "ε"}' → Resultado: ${aceptada.padEnd(
        9
      )} (esperado: ${p.esperado}) | ${p.razon}`
    );
  }

  console.log(
    `  ${correctos}/${automata.PRUEBAS.length} pruebas correctas\n`
  );
}

// === Ejecutar ===
const file = process.argv[2];
if (!file) {
  console.error("Uso: node testAutomata.js <archivo.json>");
  process.exit(1);
}

try {
  const contenido = fs.readFileSync(file, "utf-8");
  const automatas = JSON.parse(contenido);

  if (!Array.isArray(automatas)) {
    simularAutomata(automatas);
  } else {
    let i = 1;
    for (const automata of automatas) {
      console.log(` Test ${i++}`);
      simularAutomata(automata);
    }
  }
} catch (e) {
  console.error(" Error leyendo el archivo:", e.message);
}
