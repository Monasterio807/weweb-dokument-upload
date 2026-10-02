// =============================================================================
// wortlaut.check.mjs — «Mein Betrieb» darf in keinem Kundentext vorkommen
// Nach-Release-Audit 02.10.2026, I05#1 und K2#1: das Menue heisst «Betriebsangaben»,
// Texte, die auf «Mein Betrieb» verweisen, fuehren in eine Sackgasse.
//
//   node --test tests/wortlaut.check.mjs
//
// Geprueft wird nur, was ein Kunde lesen kann: Kommentarzeilen und HTML-Kommentare
// zaehlen nicht, die Stellung der Property-Beschriftungen in ww-config.js auch nicht.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const sfc = readFileSync(join(here, "..", "src", "wwElement.vue"), "utf8");

function kundentext(quelle) {
  const ohneHtmlKommentare = quelle.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ""));
  const ohneBlockKommentare = ohneHtmlKommentare.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ""));
  return ohneBlockKommentare.split("\n").map((z, i) => ({ nr: i + 1, text: z }))
    .filter((z) => !/^\s*\/\//.test(z.text))
    .map((z) => ({ nr: z.nr, text: z.text.replace(/\s\/\/\s.*$/, "") }));
}

test("Wortlaut: «Mein Betrieb» steht in keinem Kundentext, das Menue heisst «Betriebsangaben»", () => {
  const treffer = kundentext(sfc).filter((z) => /Mein Betrieb/.test(z.text));
  assert.deepEqual(treffer, [], `«Mein Betrieb» in Zeile(n): ${treffer.map((t) => t.nr).join(", ")}`);
});
