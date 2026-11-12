/* node pruebas/prueba-code.js — recorre la vida de un condominio con el script único. */
const assert = require("assert");
const path = require("path");
const { crearLibro, cargar } = require("./simulador");
const fs = require("fs");
const primero = l => l.find(x => fs.existsSync(x));
/* Funciona en el repositorio (pruebas/) y dentro del skill (scripts/pruebas/). */
const CODE = process.env.CODE_GS || primero([path.join(__dirname, "..", "apps-script", "Code.gs"), path.join(__dirname, "..", "..", "assets", "apps-script", "Code.gs")]);
const ficha = require(primero([path.join(__dirname, "ficha-ejemplo.json"), path.join(__dirname, "..", "..", "assets", "ejemplos", "ficha-ejemplo.json")]));
let ok = 0;
const bien = (c, t) => { assert.ok(c, t); ok++; console.log("  ✓ " + t); };

function libroEn(hoy, libroPrevio) {
  const libro = libroPrevio || crearLibro(hoy);
  if (libroPrevio) { const L = crearLibro(hoy); libro._Date = L._Date; libro.hojas.forEach(h => {}); }
  return libro;
}
function fila(h, etiqueta, desde) {
  for (let f = desde || 1; f < 260; f++) if (String(h._valor(f, 2)).trim() === etiqueta) return f;
  throw new Error("No encontré " + etiqueta + " en " + h.getName());
}
function capturar(libro, hoja, pagos, fijos, variables, agua) {
  const h = libro.getSheetByName(hoja);
  const c0 = fila(h, "COBROS POR DEPARTAMENTO");
  Object.keys(pagos).forEach(u => { h._celdas[fila(h, u, c0) + ",3"] = pagos[u]; });
  if (agua) Object.keys(agua).forEach(u => { h._celdas[fila(h, u, c0) + ",4"] = agua[u]; });
  const fF = fila(h, "EGRESOS FIJOS (servicios)");
  Object.keys(fijos || {}).forEach(c => { h._celdas[fila(h, c, fF) + ",3"] = fijos[c]; });
  const fV = fila(h, "EGRESOS VARIABLES") + 2;
  (variables || []).forEach((v, i) => { h._celdas[(fV + i) + ",2"] = v[0]; h._celdas[(fV + i) + ",3"] = v[1]; });
}
const todos = (monto, salvo) => Object.fromEntries(ficha.unidades.lista.filter(u => !(salvo || []).includes(u)).map(u => [u, monto]));

console.log("1 · Configurar con la ficha (hoy 12 nov 2026, finanzas desde sep 2026)");
const f = JSON.parse(JSON.stringify(ficha)); f.finanzas.desde = "2026-09";
let libro = crearLibro("2026-11-12");
let S = cargar(CODE, libro);
const res = S.configurarDesdeFicha(JSON.stringify(f));
const nombres = libro.getSheets().map(h => h.getName());
bien(["Septiembre 2026", "Octubre 2026", "Noviembre 2026", "Diciembre 2026"].every(n => nombres.includes(n)), "crea las pestañas de septiembre a diciembre");
bien(!nombres.includes("Enero 2027"), "no crea meses más allá de lo necesario");
bien(["Config", "Unidades", "Correos", "Reportes"].every(n => nombres.includes(n)), "crea Config, Unidades, Correos y Reportes");
bien(S._disparadores.map(t => t.fn + "@" + t.dia).sort().join() === "mantenimientoMensual@25,reporteProgramado@10", "instala los dos automáticos (día 10 y 25)");
const sep = libro.getSheetByName("Septiembre 2026"), oct = libro.getSheetByName("Octubre 2026");
bien(sep._valor(fila(sep, "Saldo inicial ($)"), 3) === 5000, "septiembre arranca con el saldo inicial de la ficha");
bien(/^='Septiembre 2026'!C\d+$/.test(oct._celdas[fila(oct, "Saldo inicial ($)") + ",3"]), "octubre encadena su saldo al cierre de septiembre");
const fF = fila(sep, "EGRESOS FIJOS (servicios)");
bien(sep._valor(fF + 2, 2) === "Vigilancia · Seguridad X" && sep._valor(fF + 2, 3) === "", "gastos fijos: concepto precargado SIN monto de ejemplo");
bien(/Siguiente paso/.test(res), "el resultado explica el siguiente paso");
S.configurarDesdeFicha(JSON.stringify(f));
bien(libro.getSheets().length === nombres.length, "configurar dos veces no duplica pestañas");
assert.throws(() => S.configurarDesdeFicha('{"version":"otra"}')); ok++; console.log("  ✓ rechaza un archivo que no es ficha");

console.log("2 · Captura y lo que publica el sitio");
capturar(libro, "Septiembre 2026", todos(1800), { "Vigilancia · Seguridad X": 20000, "Limpieza": 8000 }, [["Bomba de agua", 3500]]);
capturar(libro, "Octubre 2026", todos(1800, ["A 03", "PH 24"]), { "Vigilancia · Seguridad X": 20000, "Limpieza": 8000 });
capturar(libro, "Noviembre 2026", todos(1800, ["A 03", "A 04", "A 05", "PH 24"]), { "Vigilancia · Seguridad X": 20000 });
capturar(libro, "Diciembre 2026", { "A 01": 1800 }, {});
const d = JSON.parse(S.doGet({ parameter: { fresh: 1 } }).texto);
bien(d.ok && d.servicio === "condominio-digital", "doGet responde ok con formato condominio-digital");
bien(d.meses.map(m => m.id).join() === "2026-09,2026-10,2026-11", "publica sep–nov; diciembre (pago adelantado) no aparece como mes");
const [ms, mo, mn] = d.meses;
bien(ms.saldoFin === 5000 + 24 * 1800 - 28000 - 3500, "saldo final de septiembre = 5000 + 43,200 − 31,500");
bien(mo.saldoIni === ms.saldoFin, "el saldo inicial de octubre es el cierre de septiembre");
bien(mo.mora.acumulada === 3600 && mo.mora.unidades === 2, "octubre: 2 unidades deben $3,600");
bien(mn.mora.acumulada === 3600 * 2 + 1800 * 2 - 0 && mn.mora.unidades === 4, "noviembre: la mora se acumula (A 03 y PH 24 deben dos meses)");
bien(mn.mora.adelantos === 1800 && mn.mora.unidadesAdelanto === 1, "el pago de diciembre cuenta como adelanto");
bien(mn.enCurso && !mo.enCurso, "noviembre va marcado en curso");
bien(d.pagosFuturos.length === 1 && d.pagosFuturos[0].id === "2026-12", "reporta que hay pagos futuros sin decir de quién");
const texto = JSON.stringify(d);
bien(!/A 0\d|PH 2\d|pagosPorUnidad|_saldos|_hoja/.test(texto), "el JSON público no trae ninguna unidad ni dato interno");
bien(mo.detalle.fijos.length === 2 && mo.detalle.fijos[0][0] === "Vigilancia · Seguridad X", "detalle de gastos con su concepto");

console.log("3 · Semáforo de salud");
let s = S.salud_();
bien(s.color === "amarillo" && s.puntos.some(p => /sitio_url/.test(p.texto)) && s.puntos.some(p => /Correos está vacía/.test(p.texto)), "amarillo: falta sitio_url y la pestaña Correos está vacía");
const nov = libro.getSheetByName("Noviembre 2026");
nov._celdas[fila(nov, "A 03", fila(nov, "COBROS POR DEPARTAMENTO")) + ",3"] = "pagó";
nov._celdas[fila(nov, "A 04", fila(nov, "COBROS POR DEPARTAMENTO")) + ",3"] = 9000;
s = S.salud_();
bien(s.color === "rojo" && s.puntos.some(p => /texto donde va un monto/.test(p.texto)), "rojo: detecta texto en una celda de monto");
bien(s.puntos.some(p => /A 04 tiene \$9,000/.test(p.texto) || /A 04 tiene/.test(p.texto)), "avisa de un cobro de más de 3 cuotas (privado, solo para la administración)");
nov._celdas[fila(nov, "A 03", fila(nov, "COBROS POR DEPARTAMENTO")) + ",3"] = "";
nov._celdas[fila(nov, "A 04", fila(nov, "COBROS POR DEPARTAMENTO")) + ",3"] = "";
S.ponerCfg_("sitio_url", "https://fresnos.pages.dev/");

console.log("4 · Reporte del día 10");
S.reportePrueba();
let kit = S._correos.pop();
bien(/\[Prueba\] Kit de octubre 2026/.test(kit.asunto) && kit.para === "mesa.fresnos@ejemplo.com", "la prueba manda el kit de octubre (mes cerrado) solo a la administración");
bien(/infografia\.html\?tipo=cuotas&mes=2026-10/.test(kit.o.htmlBody) && /fresnos\.pages\.dev\/infografia/.test(kit.o.htmlBody), "el kit trae botones de infografía con el periodo y la dirección del sitio");
bien(!/A 0\d|PH 2\d/.test(kit.cuerpo + S._archivos[0].html), "ni el kit ni el PDF mencionan unidades");
S.generarReporte_({ modo: "vecinos" });
kit = S._correos.pop();
bien(/Correos está vacía/.test(kit.o.htmlBody) && S._correos.length === 0, "sin correos: no envía a vecinos y lo dice en el kit");
const hc = libro.getSheetByName("Correos");
hc.appendRow(["A 01", "x", "uno@ejemplo.mx", "sí"]); hc.appendRow(["A 02", "y", "dos@ejemplo.mx", "no"]); hc.appendRow(["A 05", "z", "UNO@ejemplo.mx", ""]);
S.generarReporte_({ modo: "vecinos" });
const envio = S._correos.find(c => c.o.bcc);
bien(envio && envio.o.bcc === "uno@ejemplo.mx", "envía en copia oculta, respeta «no» y quita duplicados");
const antes = S._correos.length;
S.generarReporte_({ modo: "vecinos" });
bien(S._correos.length === antes, "no envía dos veces el mismo mes");
bien(libro.getSheetByName("Reportes").getLastRow() >= 4, "deja bitácora en Reportes");

console.log("5 · Cambio de año");
libro._Date = crearLibro("2026-12-25")._Date; S = cargar(CODE, libro);
S.mantenimientoMensual();
const ene = libro.getSheetByName("Enero 2027");
bien(!!ene && /^='Diciembre 2026'!C\d+$/.test(ene._celdas[fila(ene, "Saldo inicial ($)") + ",3"]), "el 25 de diciembre nace Enero 2027 encadenado a diciembre");
capturar(libro, "Diciembre 2026", todos(1800, ["A 03"]), { "Vigilancia · Seguridad X": 20000, "Limpieza": 8000 });
libro._Date = crearLibro("2027-01-20")._Date; S = cargar(CODE, libro);
capturar(libro, "Enero 2027", todos(1800, ["A 03"]), { "Vigilancia · Seguridad X": 21000 });
let d2 = JSON.parse(S.doGet({ parameter: { fresh: 1 } }).texto);
const dic = d2.meses.find(m => m.id === "2026-12"), en = d2.meses.find(m => m.id === "2027-01");
bien(en.saldoIni === dic.saldoFin, "enero 2027 arranca con el cierre de diciembre");
bien(en.mora.acumulada > dic.mora.acumulada - 0.5 && en.mora.unidades >= 1, "la mora NO se reinicia en enero");
const moraEnero = en.mora.acumulada;
libro._Date = crearLibro("2027-03-25")._Date; S = cargar(CODE, libro);
S.prepararMesSiguiente(); // abril (feb/mar faltarían en la vida real; aquí solo probamos el archivo)
S.archivarAnio_(2026, false);
d2 = JSON.parse(S.doGet({ parameter: { fresh: 1 } }).texto);
bien(d2.meses.filter(m => m.anio === 2026).length === 4, "2026 archivado sigue publicándose desde Histórico");
bien(libro.getSheetByName("Septiembre 2026").isSheetHidden(), "las pestañas de 2026 quedan ocultas, no borradas");
bien(d2.meses.find(m => m.id === "2027-01").mora.acumulada === moraEnero, "la mora de enero no cambia después de archivar");
bien(!/A 0\d|PH 2\d/.test(JSON.stringify(d2)), "el JSON sigue sin unidades después de archivar");

console.log("\n" + ok + " comprobaciones correctas");
fs.writeFileSync(path.join(__dirname, "salida-doget.json"), S.doGet({ parameter: { fresh: 1 } }).texto);
