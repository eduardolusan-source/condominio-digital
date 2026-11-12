/* Condominio digital · script único de la hoja de captura
   Va DENTRO de la hoja plantilla (Extensiones → Apps Script). Quien hace una copia de
   la plantilla se lleva este script; no hay que pegar código.

   Menú «Condominio» (aparece al abrir la hoja):
   - Configurar con mi ficha…       sube la ficha (condominio-*.json) del configurador:
                                     crea Config, Unidades, los meses, Correos y los automáticos.
   - Ver la dirección de mi sitio    la URL /exec que se pega en el configurador.
   - Revisar que todo cuadre         semáforo de salud (también va en el kit del mes).
   - Probar el reporte (solo a mí) / Enviar el reporte del mes anterior.
   - Preparar la pestaña del mes siguiente / Archivar un año.

   Servicio web (Implementar → Aplicación web, acceso: cualquier persona):
   doGet → cifras AGREGADAS por mes para el sitio. Nunca cobros por unidad.

   Reglas que vienen de lo aprendido en La Valetta, Lahia y Las Misiones:
   - Nada de montos de ejemplo en las pestañas: solo conceptos.
   - Las claves y preferencias viven en la pestaña Config, no en el código.
   - La mora no se reinicia en enero; los meses futuros no se publican.
   - Cada mes nuevo nace con su saldo inicial encadenado al final del anterior. */

const VERSION_SCRIPT = "condominio-digital/1";
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const HOJA_CONFIG = "Config", HOJA_UNIDADES = "Unidades", HOJA_CORREOS = "Correos", HOJA_REPORTES = "Reportes", HOJA_HISTORICO = "Histórico", HOJA_LEEME = "LÉEME";
const FILAS = 260;
const ZONA = "America/Mexico_City";
const AZUL = "#ddebf7", GRIS = "#eeeeee", MONEDA = '"$"#,##0.00;[Red]-"$"#,##0.00';

/* ============================ MENÚ ============================ */

function onOpen() {
  SpreadsheetApp.getUi().createMenu("Condominio")
    .addItem("Configurar con mi ficha…", "abrirConfigurador")
    .addItem("Ver la dirección de mi sitio", "verDireccion")
    .addItem("Revisar que todo cuadre", "revisarSalud")
    .addSeparator()
    .addItem("Probar el reporte (solo a mí)", "reportePrueba")
    .addItem("Enviar ahora el reporte del mes anterior", "reporteAhora")
    .addSeparator()
    .addItem("Preparar la pestaña del mes siguiente", "prepararMesSiguiente")
    .addItem("Archivar el año anterior", "archivarAnioAnterior")
    .addToUi();
}

function aviso_(titulo, texto) {
  Logger.log(titulo + "\n" + texto);
  try { SpreadsheetApp.getUi().alert(titulo, texto, SpreadsheetApp.getUi().ButtonSet.OK); } catch (_) { /* sin interfaz (disparador) */ }
}

/* ============================ CONFIG ============================ */

function cfg_() {
  const h = SpreadsheetApp.getActive().getSheetByName(HOJA_CONFIG);
  const out = {};
  if (!h || h.getLastRow() < 2) return out;
  h.getRange(2, 1, h.getLastRow() - 1, 2).getValues().forEach(f => { if (String(f[0]).trim()) out[String(f[0]).trim()] = f[1]; });
  return out;
}
function ponerCfg_(clave, valor, para) {
  const ss = SpreadsheetApp.getActive();
  let h = ss.getSheetByName(HOJA_CONFIG);
  if (!h) { h = ss.insertSheet(HOJA_CONFIG); h.getRange(1, 1, 1, 3).setValues([["Clave", "Valor", "Para qué sirve"]]).setFontWeight("bold"); h.setFrozenRows(1); h.setColumnWidth(1, 190); h.setColumnWidth(2, 260); h.setColumnWidth(3, 420); }
  const n = Math.max(h.getLastRow() - 1, 0);
  const claves = n ? h.getRange(2, 1, n, 1).getValues().map(f => String(f[0]).trim()) : [];
  const i = claves.indexOf(clave);
  if (i >= 0) h.getRange(i + 2, 2).setValue(valor);
  else h.appendRow([clave, valor, para || ""]);
}

/* ============================ CONFIGURAR DESDE LA FICHA ============================ */

function abrirConfigurador() {
  const html = HtmlService.createHtmlOutput(
    '<div style="font:14px/1.5 Arial,sans-serif;padding:4px">' +
    '<p><b>Sube tu ficha</b> (el archivo <code>condominio-….json</code> que descargaste del configurador).</p>' +
    '<input type="file" id="f" accept=".json,application/json" style="margin:8px 0">' +
    '<p style="color:#666;font-size:12px">Se crean las pestañas de Config, Unidades, los meses desde el primero que elegiste, Correos y la programación del reporte. No se borra nada que ya exista.</p>' +
    '<button id="b" style="padding:8px 16px;font-weight:bold" disabled>Configurar</button> <span id="e" style="margin-left:8px"></span>' +
    '<pre id="r" style="white-space:pre-wrap;font-size:12px;background:#f4f4f4;padding:8px;display:none"></pre></div>' +
    '<script>let t="";document.getElementById("f").onchange=e=>{const r=new FileReader();r.onload=()=>{t=r.result;document.getElementById("b").disabled=false;};r.readAsText(e.target.files[0]);};' +
    'document.getElementById("b").onclick=()=>{document.getElementById("b").disabled=true;document.getElementById("e").textContent="Configurando… (puede tardar un minuto)";' +
    'google.script.run.withSuccessHandler(x=>{document.getElementById("e").textContent="Listo";const p=document.getElementById("r");p.style.display="block";p.textContent=x;})' +
    '.withFailureHandler(err=>{document.getElementById("e").textContent="No se pudo: "+err.message;document.getElementById("b").disabled=false;}).configurarDesdeFicha(t);};</script>'
  ).setWidth(520).setHeight(420);
  SpreadsheetApp.getUi().showModalDialog(html, "Configurar mi condominio");
}

function configurarDesdeFicha(texto) {
  const f = typeof texto === "string" ? JSON.parse(texto) : texto;
  if (!f || f.version !== VERSION_SCRIPT) throw new Error("Ese archivo no es una ficha " + VERSION_SCRIPT + ". Descárgala de nuevo del configurador.");
  const unidades = (f.unidades && f.unidades.lista || []).map(u => String(u).trim()).filter(Boolean);
  if (!unidades.length) throw new Error("La ficha no trae unidades.");
  const desde = String(f.finanzas && f.finanzas.desde || "");
  if (!/^\d{4}-\d{2}$/.test(desde)) throw new Error("La ficha no dice desde qué mes publicar.");
  const candado = LockService.getScriptLock(); candado.waitLock(30000);
  const hechos = [];
  try {
    const ss = SpreadsheetApp.getActive();
    const c = f.condominio || {}, co = f.cobros || {}, cm = f.comunicacion || {}, ad = f.administracion || {};
    const fijos = ((f.gastos && f.gastos.fijos) || []).map(g => String(g.concepto || "").trim() + (g.proveedor ? " · " + String(g.proveedor).trim() : "")).filter(s => s && s !== " · ");
    const agua = ["medidor individual", "derrama", "pipas"].indexOf(String(co.agua && co.agua.modalidad || "")) >= 0;
    [["nombre", c.nombre || "", "Nombre del condominio"],
     ["nombre_corto", c.nombreCorto || c.nombre || "", "Como aparece en mensajes"],
     ["cuota_mantenimiento", Number(co.cuota) || 0, "Cuota mensual por unidad"],
     ["dia_limite", Number(co.diaLimite) || 10, "Día límite de pago"],
     ["agua_aparte", agua ? "sí" : "no", "sí = columna de agua en cobros"],
     ["finanzas_desde", desde, "Primer mes que se publica en el sitio"],
     ["gastos_fijos", fijos.join(" | "), "Conceptos que nacen en cada mes nuevo (separados por |)"],
     ["correo_condominio", ad.correoCondominio || "", "Correo oficial"],
     ["reporte_copia", ad.correoCopia || ad.correoCondominio || Session.getEffectiveUser().getEmail(), "Recibe la copia del reporte y el kit de WhatsApp"],
     ["reporte_envio", (cm.modulos || []).indexOf("reporte") >= 0 ? "automático" : "pausa", "automático · pausa (solo te llega el kit)"],
     ["dia_reporte", Number(cm.diaReporte) || 10, "Día del mes en que sale el reporte"],
     ["sitio_url", "", "Dirección del sitio publicado (para las ligas del correo)"],
     ["tono", cm.tono || "cercano", "cercano · formal"]
    ].forEach(x => ponerCfg_(x[0], x[1], x[2]));
    hechos.push("Config lista.");

    let hu = ss.getSheetByName(HOJA_UNIDADES);
    if (!hu) hu = ss.insertSheet(HOJA_UNIDADES);
    hu.clear();
    hu.getRange(1, 1, 1, 2).setValues([["Unidad", "Notas"]]).setFontWeight("bold");
    hu.getRange(2, 1, unidades.length, 1).setValues(unidades.map(u => [u]));
    hu.setFrozenRows(1);
    hechos.push("Unidades: " + unidades.length + ".");

    /* Meses: del primero elegido al mes siguiente al de hoy (mínimo hasta diciembre de ese año). */
    const hoy = Utilities.formatDate(new Date(), ZONA, "yyyy-MM");
    let hasta = desde.slice(0, 4) + "-12";
    const sig = mesSiguiente_(hoy, 1);
    if (sig > hasta) hasta = sig;
    const creados = [];
    for (let id = desde; id <= hasta; id = mesSiguiente_(id, 1)) {
      if (buscarMes_(ss, id)) continue;
      crearMes_(ss, id, id === desde ? Number(f.finanzas.saldoInicial) || 0 : null);
      creados.push(nombreMes_(id));
    }
    hechos.push(creados.length ? "Meses creados: " + creados.join(", ") + "." : "Los meses ya existían.");

    asegurarHoja_(ss, HOJA_CORREOS, ["Unidad", "Nombre", "Correo", "Recibe el reporte (sí / no)"]);
    asegurarHoja_(ss, HOJA_REPORTES, ["Fecha", "Mes", "Qué pasó", "Destinatarios", "PDF", "Salud"]);
    instalarDisparadores_();
    hechos.push("Automáticos: reporte el día " + (Number(cm.diaReporte) || 10) + " y pestaña del mes siguiente el día 25.");
    const leeme = ss.getSheetByName(HOJA_LEEME);
    if (leeme) ss.setActiveSheet(leeme);
    CacheService.getScriptCache().remove("finanzas");
  } finally { candado.releaseLock(); }
  hechos.push("", "Siguiente paso: Implementar → Nueva implementación → Aplicación web (Ejecutar como: yo · Acceso: cualquier persona) y pega la dirección /exec en el configurador.");
  return hechos.join("\n");
}

function asegurarHoja_(ss, nombre, encabezados) {
  if (ss.getSheetByName(nombre)) return;
  const h = ss.insertSheet(nombre);
  h.getRange(1, 1, 1, encabezados.length).setValues([encabezados]).setFontWeight("bold");
  h.setFrozenRows(1);
}

function verDireccion() {
  let url = "";
  try { url = ScriptApp.getService().getUrl() || ""; } catch (_) { /* sin implementación */ }
  aviso_("La dirección de tu sitio", url
    ? "Esta es la dirección del servicio (termina en /exec). Pégala en el configurador:\n\n" + url + "\n\nSi cambias el script: Implementar → Administrar implementaciones → lápiz → Nueva versión. Así la dirección no cambia."
    : "Todavía no está publicado. Ve a Implementar → Nueva implementación → engrane → Aplicación web · Ejecutar como: yo · Acceso: cualquier persona → Implementar.");
}

/* ============================ PESTAÑAS DE MES ============================ */

function nombreMes_(id) { const m = parseInt(id.slice(5), 10) - 1; return MESES[m].charAt(0).toUpperCase() + MESES[m].slice(1) + " " + id.slice(0, 4); }
function mesSiguiente_(id, paso) { const d = new Date(parseInt(id.slice(0, 4), 10), parseInt(id.slice(5), 10) - 1 + (paso || 1), 1); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2); }
function buscarMes_(ss, id) { return ss.getSheets().find(h => { const i = infoMes_(h); return i && i.id === id; }) || null; }

/* Crea la pestaña de un mes con la estructura que lee el script. Saldo inicial: el número
   dado, o fórmula al saldo final del mes anterior si existe. Sin montos de ejemplo. */
function crearMes_(ss, id, saldoInicial) {
  const cfg = cfg_();
  const hu = ss.getSheetByName(HOJA_UNIDADES);
  const unidades = hu && hu.getLastRow() > 1 ? hu.getRange(2, 1, hu.getLastRow() - 1, 1).getValues().map(f => String(f[0]).trim()).filter(Boolean) : [];
  const fijos = String(cfg.gastos_fijos || "").split("|").map(s => s.trim()).filter(Boolean);
  const anio = parseInt(id.slice(0, 4), 10), mes = parseInt(id.slice(5), 10);
  const h = ss.insertSheet(nombreMes_(id));
  const F = [];
  const fila = (b, c, d, e) => { F.push([b == null ? "" : b, c == null ? "" : c, d == null ? "" : d, e == null ? "" : e]); return F.length; };
  fila(String(cfg.nombre || "CONDOMINIO").toUpperCase() + " · " + nombreMes_(id));
  fila("Captura solo las celdas azules. Lo demás se calcula solo. Comprobantes: inserta la liga de Drive en la columna D.");
  fila();
  fila("DATOS DEL MES");
  fila("Mes y año", "=DATE(" + anio + "," + mes + ",1)");                       // fila 5 → C5
  const rIni = fila("Saldo inicial ($)", 0);
  fila("Número de unidades", unidades.length);
  fila("Cuota de mantenimiento", Number(cfg.cuota_mantenimiento) || 0);
  fila();
  fila("RESUMEN DEL MES · se calcula solo");
  const rM = fila("(+) Mantenimiento cobrado"), rA = fila("(+) Agua cobrada"), rO = fila("(+) Otros ingresos");
  const rF = fila("(−) Egresos fijos"), rV = fila("(−) Egresos variables");
  const rFin = fila("SALDO FINAL DEL MES");
  fila();
  const rCob = fila("COBROS POR DEPARTAMENTO");
  fila("Unidad", "Mantenimiento", "Agua", "Extraordinario y otros");
  const u0 = F.length + 1;
  unidades.forEach(u => fila(u));
  const u1 = Math.max(F.length, u0);
  if (!unidades.length) fila("(agrega las unidades en la pestaña Unidades)");
  const rTotCob = fila("TOTAL COBRADO", "=SUM(C" + u0 + ":C" + u1 + ")", "=SUM(D" + u0 + ":D" + u1 + ")", "=SUM(E" + u0 + ":E" + u1 + ")");
  fila();
  const rOtr = fila("OTROS INGRESOS");
  fila("Concepto", "Monto", "Comprobante");
  const o0 = F.length + 1; for (let i = 0; i < 4; i++) fila();
  const rTotOtr = fila("TOTAL", "=SUM(C" + o0 + ":C" + (o0 + 3) + ")");
  fila();
  const rFij = fila("EGRESOS FIJOS (servicios)");
  fila("Concepto", "Monto", "Comprobante (liga de Drive)");
  const f0 = F.length + 1; fijos.forEach(g => fila(g)); for (let i = 0; i < 3; i++) fila();
  const rTotFij = fila("TOTAL", "=SUM(C" + f0 + ":C" + (F.length) + ")");
  fila();
  const rVar = fila("EGRESOS VARIABLES");
  fila("Concepto", "Monto", "Comprobante (liga de Drive)");
  const v0 = F.length + 1; for (let i = 0; i < 12; i++) fila();
  const rTotVar = fila("TOTAL", "=SUM(C" + v0 + ":C" + (F.length) + ")");
  fila();
  const rPro = fila("PROYECTOS EN CURSO");
  fila("Proyecto", "Estado", "Avance o liga");
  const p0 = F.length + 1; for (let i = 0; i < 4; i++) fila();

  F[rM - 1][1] = "=C" + rTotCob; F[rA - 1][1] = "=D" + rTotCob; F[rO - 1][1] = "=E" + rTotCob + "+C" + rTotOtr;
  F[rF - 1][1] = "=C" + rTotFij; F[rV - 1][1] = "=C" + rTotVar;
  F[rFin - 1][1] = "=C" + rIni + "+C" + rM + "+C" + rA + "+C" + rO + "-C" + rF + "-C" + rV;
  /* Saldo inicial: número dado o fórmula al cierre del mes anterior (también diciembre → enero). */
  const prev = buscarMes_(ss, mesSiguiente_(id, -1));
  if (saldoInicial != null) F[rIni - 1][1] = saldoInicial;
  else if (prev) F[rIni - 1][1] = "='" + prev.getName() + "'!C" + (filaEtiqueta_(prev, "saldofinaldelmes") || 16);

  h.getRange(1, 2, F.length, 4).setValues(F);
  h.setColumnWidth(1, 16); h.setColumnWidth(2, 340); [3, 4, 5].forEach(c => h.setColumnWidth(c, 170));
  h.getRange(1, 2).setFontWeight("bold").setFontSize(13);
  h.getRange(5, 3).setNumberFormat("mmmm yyyy");
  [4, 10, rCob, rOtr, rFij, rVar, rPro].forEach(r => h.getRange(r, 2, 1, 4).setBackground(GRIS).setFontWeight("bold"));
  [rFin, rTotCob, rTotOtr, rTotFij, rTotVar].forEach(r => h.getRange(r, 2, 1, 4).setFontWeight("bold"));
  h.getRange(6, 3, 3, 1).setNumberFormat(MONEDA);
  h.getRange(7, 3).setNumberFormat("0");
  h.getRange(rM, 3, rFin - rM + 1, 1).setNumberFormat(MONEDA);
  if (unidades.length) h.getRange(u0, 3, unidades.length, 3).setBackground(AZUL).setNumberFormat(MONEDA);
  h.getRange(rTotCob, 3, 1, 3).setNumberFormat(MONEDA);
  h.getRange(o0, 2, 4, 3).setBackground(AZUL); h.getRange(o0, 3, 5, 1).setNumberFormat(MONEDA);
  h.getRange(f0, 3, rTotFij - f0, 2).setBackground(AZUL); h.getRange(f0, 2, rTotFij - f0, 1).setBackground(AZUL); h.getRange(f0, 3, rTotFij - f0 + 1, 1).setNumberFormat(MONEDA);
  h.getRange(v0, 2, rTotVar - v0, 3).setBackground(AZUL); h.getRange(v0, 3, rTotVar - v0 + 1, 1).setNumberFormat(MONEDA);
  h.getRange(p0, 2, 4, 3).setBackground(AZUL);
  if (saldoInicial != null) h.getRange(rIni, 3).setBackground(AZUL);
  h.setFrozenRows(0);
  /* Si el mes siguiente ya existía, ahora apunta al cierre de éste. */
  const sig = buscarMes_(ss, mesSiguiente_(id, 1));
  if (sig) {
    const ri = filaEtiqueta_(sig, "saldoinicial");
    const actual = ri ? sig.getRange(ri, 3).getFormula() : "x";
    if (ri && (!actual || /^='?[^'!]+'?!C\d+$/.test(actual))) sig.getRange(ri, 3).setFormula("='" + h.getName() + "'!C" + rFin);
  }
  return h;
}

function filaEtiqueta_(h, clave, desde, hasta) {
  const vals = h.getRange(1, 2, FILAS, 1).getValues();
  for (let i = desde || 0; i < Math.min(hasta || FILAS, vals.length); i++) if (norm_(vals[i][0]).indexOf(clave) === 0) return i + 1;
  return 0;
}

function prepararMesSiguiente() {
  const ss = SpreadsheetApp.getActive();
  const sig = mesSiguiente_(Utilities.formatDate(new Date(), ZONA, "yyyy-MM"), 1);
  if (buscarMes_(ss, sig)) { aviso_("Pestaña del mes siguiente", nombreMes_(sig) + " ya existe."); return sig; }
  crearMes_(ss, sig, null);
  aviso_("Pestaña del mes siguiente", "Creé " + nombreMes_(sig) + " en blanco, con su saldo inicial encadenado al mes anterior.");
  return sig;
}

/* ============================ LECTURA ============================ */

function infoMes_(hoja) {
  const n = sinAcentos_(hoja.getName().trim().toLowerCase());
  const m = /^([a-z]+)(?:\s+(\d{4}))?$/.exec(n);
  if (!m) return null;
  const mes = MESES.indexOf(m[1]);
  if (mes < 0) return null;
  let anio = m[2] ? parseInt(m[2], 10) : null;
  if (!anio) {
    const v = hoja.getRange("C5").getValue();
    if (v instanceof Date) anio = new Date(v.getTime() + 12 * 3600 * 1000).getFullYear();
    else { const t = /(\d{4})\s*$/.exec(String(v || "")); if (t) anio = parseInt(t[1], 10); }
  }
  if (!anio) anio = new Date().getFullYear();
  return { hoja: hoja, mes: mes, anio: anio, id: anio + "-" + ("0" + (mes + 1)).slice(-2) };
}
function hojasMes_(ss) { return ss.getSheets().map(infoMes_).filter(Boolean).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0); }

function leerMes_(info) {
  const h = info.hoja;
  const vals = h.getRange(1, 2, FILAS, 4).getValues();               // B:E
  const et = vals.map(f => norm_(f[0]));
  const filaDe = (clave, desde, hasta) => { for (let i = desde || 0; i < Math.min(hasta || FILAS, et.length); i++) if (et[i].indexOf(clave) === 0) return i; return -1; };
  const fCob = filaDe("cobrospordepartamento");
  const tope = fCob > 0 ? fCob : 30;
  const seccion = clave => filaDe(clave, fCob > 0 ? fCob + 1 : 0);
  const fOtr = seccion("otrosingresos"), fFij = seccion("egresosfijos"), fVar = seccion("egresosvariables"), fPro = seccion("proyectosencurso");
  const numRes = clave => { const i = filaDe(clave, 0, tope); return i < 0 ? null : num_(vals[i][1]); };
  const unidades = Math.round(numRes("numerodeunidades") || 0);
  const cuota = numRes("cuotademantenimiento") || 0;
  const renglones = (inicio, conTotal) => {
    const out = [];
    if (inicio < 0) return out;
    let vacias = 0;
    for (let i = inicio + 2; i < et.length; i++) {
      const e = et[i];
      if (conTotal && e.indexOf("total") === 0) break;
      if (!conTotal && /^(egresos|cobros|proyectos|otrosingresos)/.test(e)) break;
      if (!e && !String(vals[i][1]).trim()) { if (++vacias >= 8) break; continue; }
      vacias = 0;
      out.push({ fila: i + 1, b: String(vals[i][0]).trim(), c: vals[i][1], d: vals[i][2], e: vals[i][3] });
    }
    return out;
  };
  const cobros = renglones(fCob, true).filter(r => r.b && r.b.charAt(0) !== "(");
  const pagosPorUnidad = cobros.map(r => [r.b, num_(r.c)]);
  const noNumericos = cobros.filter(r => [r.c, r.d, r.e].some(v => v !== "" && v != null && typeof v !== "number" && !/^[\s$\d.,-]+$/.test(String(v)))).map(r => r.fila);
  const manto = pagosPorUnidad.reduce((a, b) => a + b[1], 0);
  const agua = cobros.reduce((a, r) => a + num_(r.d), 0);
  const extra = cobros.reduce((a, r) => a + num_(r.e), 0);
  const otros = renglones(fOtr, true).reduce((a, r) => a + num_(r.c), 0);
  const ligas = ligas_(h, Math.min(fFij < 0 ? FILAS : fFij, fVar < 0 ? FILAS : fVar));
  const items = lista => lista.filter(r => r.b && num_(r.c)).map(r => { const it = [r.b, red_(num_(r.c))]; if (ligas[r.fila]) it.push(ligas[r.fila]); return it; });
  const fijos = items(renglones(fFij, true)), variables = items(renglones(fVar, true));
  const totF = fijos.reduce((a, b) => a + b[1], 0), totV = variables.reduce((a, b) => a + b[1], 0);
  const proyectos = renglones(fPro, false).filter(r => r.b).map(r => {
    const d = String(r.d || "").trim(), liga = /^https?:\/\//.test(d) ? d : "";
    return { nombre: r.b, estado: String(r.c || "").trim(), liga: liga, avance: liga ? "" : d };
  });
  const saldoIni = numRes("saldoinicial") || 0;
  const iFin = filaDe("saldofinaldelmes", 0, tope);
  const saldoFin = iFin >= 0 && String(vals[iFin][1]) !== "" ? num_(vals[iFin][1]) : saldoIni + manto + agua + extra + otros - totF - totV;
  const pagaron = pagosPorUnidad.filter(p => p[1] > 0).length;
  const n = unidades || cobros.length;
  return {
    id: info.id, anio: info.anio, nombre: MESES[info.mes].charAt(0).toUpperCase() + MESES[info.mes].slice(1), corto: CORTOS[info.mes],
    unidades: n, cuota: cuota,
    saldoIni: red_(saldoIni), saldoFin: red_(saldoFin),
    ingresos: { manto: red_(manto), agua: red_(agua), extra: red_(extra + otros) },
    egresos: { fijos: red_(totF), variables: red_(totV) },
    cobranza: { pagaron: pagaron, pct: red_(n ? pagaron / n * 100 : 0, 1) },
    detalle: { fijos: fijos, variables: variables },
    proyectos: proyectos,
    capturado: manto > 0 || agua > 0 || extra > 0 || otros > 0 || totF > 0 || totV > 0,
    pagosPorUnidad: pagosPorUnidad,
    _hoja: h.getName(), _noNumericos: noNumericos, _filaCobros: fCob + 1
  };
}

function ligas_(h, inicio) {
  const out = {};
  if (inicio >= FILAS) return out;
  const r = h.getRange(inicio + 1, 4, FILAS - inicio, 1);
  const ricos = r.getRichTextValues(), formulas = r.getFormulas(), valores = r.getValues();
  for (let i = 0; i < ricos.length; i++) {
    let url = ricos[i][0] && ricos[i][0].getLinkUrl();
    if (!url && ricos[i][0]) { const runs = ricos[i][0].getRuns(); for (let k = 0; k < runs.length && !url; k++) url = runs[k].getLinkUrl(); }
    if (!url) { const m = /HYPERLINK\(\s*"([^"]+)"/i.exec(formulas[i][0] || ""); if (m) url = m[1]; }
    if (!url && /^https?:\/\//.test(String(valores[i][0]).trim())) url = String(valores[i][0]).trim();
    if (url) out[inicio + 1 + i] = url;
  }
  return out;
}

/* Todo junto: meses publicables, mora agregada (sin reinicio anual), meses futuros como
   adelanto, años archivados desde Histórico. conPrivado deja datos internos para la salud. */
function armarFinanzas_(conPrivado) {
  const ss = SpreadsheetApp.getActive();
  const cfg = cfg_();
  const desde = String(cfg.finanzas_desde || "").trim();
  const hoyId = Utilities.formatDate(new Date(), ZONA, "yyyy-MM");
  const hist = historico_(ss);
  const meses = [], futuros = [], avisos = [], proyectos = {};
  let prev = null;
  hojasMes_(ss).forEach(info => {
    if (desde && info.id < desde) return;
    if (hist[info.id] && info.hoja.isSheetHidden()) return;
    const m = leerMes_(info);
    if (!m.capturado) return;
    if (m.id > hoyId) { futuros.push(m); return; }
    if (prev && prev.id === m.id) { avisos.push({ nivel: "alerta", texto: "Hay dos pestañas para " + m.nombre + " " + m.anio + "; se usa la primera." }); return; }
    if (prev && firma_(prev) === firma_(m) && Math.abs(m.saldoIni - prev.saldoFin) > 0.5) { avisos.push({ nivel: "alerta", texto: m.nombre + " " + m.anio + " parece una copia de " + prev.nombre.toLowerCase() + " sin capturar; no se publica." }); return; }
    if (prev && prev.id === mesSiguiente_(m.id, -1) && Math.abs(m.saldoIni - prev.saldoFin) > 0.5) avisos.push({ nivel: "aviso", texto: "El saldo inicial de " + m.nombre.toLowerCase() + " " + m.anio + " no es el saldo final de " + prev.nombre.toLowerCase() + "." });
    m.proyectos.forEach(p => { proyectos[p.nombre.toLowerCase()] = p; });
    meses.push(m); prev = m;
  });
  Object.keys(hist).forEach(id => { if (!meses.some(m => m.id === id)) meses.push(Object.assign({ archivado: true }, hist[id].mes, { _saldos: hist[id].saldos })); });
  meses.sort((a, b) => a.id < b.id ? -1 : 1);
  let saldos = {};
  meses.forEach((m, i) => {
    if (m.archivado) saldos = JSON.parse(JSON.stringify(m._saldos || {}));
    else {
      m.pagosPorUnidad.forEach(([u, p]) => { saldos[u] = (saldos[u] || 0) + p - m.cuota; });
      if (i === meses.length - 1) futuros.forEach(fu => fu.pagosPorUnidad.forEach(([u, p]) => { saldos[u] = (saldos[u] || 0) + p; }));
      const v = Object.keys(saldos).map(k => saldos[k]), neg = v.filter(x => x < -0.5), pos = v.filter(x => x > 0.5);
      m.mora = { acumulada: red_(-neg.reduce((a, b) => a + b, 0)), unidades: neg.length, adelantos: red_(pos.reduce((a, b) => a + b, 0)), unidadesAdelanto: pos.length };
    }
    m.enCurso = m.id === hoyId;
    if (conPrivado) m._saldos = JSON.parse(JSON.stringify(saldos));
    else { delete m._saldos; delete m._hoja; delete m._noNumericos; delete m._filaCobros; }
    delete m.pagosPorUnidad; delete m.archivado; delete m.proyectos; delete m.capturado;
  });
  const ult = meses[meses.length - 1];
  return {
    ok: true, servicio: "condominio-digital", version: VERSION_SCRIPT, generado: new Date().toISOString(), hoy: hoyId,
    condominio: { nombre: String(cfg.nombre || ""), unidades: ult ? ult.unidades : 0, cuota: ult ? ult.cuota : Number(cfg.cuota_mantenimiento) || 0 },
    meses: meses, proyectos: Object.keys(proyectos).map(k => proyectos[k]),
    pagosFuturos: futuros.map(f => ({ id: f.id, pagaron: f.cobranza.pagaron })),
    _avisos: conPrivado ? avisos : undefined
  };
}
function firma_(m) { return [m.saldoIni, m.ingresos.manto, m.ingresos.agua, m.ingresos.extra, m.egresos.fijos, m.egresos.variables].join("|"); }

/* ============================ SERVICIO WEB ============================ */

function doGet(e) {
  const p = (e && e.parameter) || {};
  try {
    const cache = CacheService.getScriptCache();
    if (!p.fresh) { const g = cache.get("finanzas"); if (g) return json_(g); }
    const d = armarFinanzas_(false);
    delete d._avisos;
    const s = JSON.stringify(d);
    try { cache.put("finanzas", s, 300); } catch (_) { /* respuesta grande: sin caché */ }
    return json_(s);
  } catch (err) {
    return json_(JSON.stringify({ ok: false, error: String(err.message || err) }));
  }
}
function json_(s) { return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.JSON); }

/* ============================ SALUD (SEMÁFORO) ============================ */

/* Revisa errores de captura comunes. Devuelve { color, puntos[] }. Nada de esto se publica. */
function salud_() {
  const cfg = cfg_();
  const puntos = [];
  let d;
  try { d = armarFinanzas_(true); } catch (err) { return { color: "rojo", puntos: [{ nivel: "alerta", texto: "No pude leer la hoja: " + err.message }] }; }
  (d._avisos || []).forEach(a => puntos.push(a));
  const cuota = Number(cfg.cuota_mantenimiento) || d.condominio.cuota || 0;
  const hoy = new Date(), hoyId = d.hoy, ant = mesSiguiente_(hoyId, -1);
  const ss = SpreadsheetApp.getActive();
  hojasMes_(ss).forEach(info => {
    if (cfg.finanzas_desde && info.id < cfg.finanzas_desde) return;
    if (info.id > hoyId || info.hoja.isSheetHidden()) return;
    const m = leerMes_(info);
    if (m._noNumericos.length) puntos.push({ nivel: "alerta", texto: info.hoja.getName() + ": hay texto donde va un monto (filas " + m._noNumericos.join(", ") + "). El script lo cuenta como 0." });
    if (cuota) m.pagosPorUnidad.forEach(([u, p]) => { if (p > cuota * 3) puntos.push({ nivel: "aviso", texto: info.hoja.getName() + ": " + u + " tiene $" + p.toLocaleString("es-MX") + " de mantenimiento (más de 3 cuotas). ¿Pagó varios meses? Anótalos en la pestaña de cada mes." }); });
    if (m.egresos.fijos + m.egresos.variables > 0 && m.ingresos.manto === 0 && info.id < hoyId) puntos.push({ nivel: "aviso", texto: info.hoja.getName() + " tiene gastos pero ningún cobro capturado." });
  });
  if (!buscarMes_(ss, ant) || !d.meses.some(m => m.id === ant)) { if (hoy.getDate() >= (Number(cfg.dia_reporte) || 10)) puntos.push({ nivel: "aviso", texto: nombreMes_(ant) + " todavía no tiene cobros ni gastos capturados." }); }
  if (!String(cfg.sitio_url || "").trim()) puntos.push({ nivel: "aviso", texto: "Falta la dirección del sitio en Config (sitio_url): los correos no podrán ligar al sitio." });
  if (/autom/i.test(String(cfg.reporte_envio || "")) && correos_().length === 0) puntos.push({ nivel: "aviso", texto: "El reporte está en automático pero la pestaña Correos está vacía." });
  const color = puntos.some(p => p.nivel === "alerta") ? "rojo" : puntos.length ? "amarillo" : "verde";
  return { color: color, puntos: puntos };
}
function revisarSalud() {
  const s = salud_();
  const icono = { verde: "✅ Todo cuadra", amarillo: "⚠️ Hay cosas por revisar", rojo: "🛑 Hay errores que corregir" }[s.color];
  aviso_(icono, s.puntos.length ? s.puntos.map(p => (p.nivel === "alerta" ? "• (error) " : "• ") + p.texto).join("\n") : "No encontré problemas en la captura.");
  return s;
}

/* ============================ REPORTE MENSUAL ============================ */

function reporteProgramado() { try { prepararMesSiguienteSilencioso_(); } catch (_) { /* sigue */ } generarReporte_({ modo: "vecinos" }); }
function reportePrueba() { generarReporte_({ modo: "prueba" }); aviso_("Reporte de prueba", "Te llegó a tu correo (Config → reporte_copia). No se envió a los vecinos."); }
function reporteAhora() { generarReporte_({ modo: "vecinos" }); aviso_("Reporte", "Listo. Revisa la pestaña Reportes para ver qué pasó."); }
function prepararMesSiguienteSilencioso_() { const ss = SpreadsheetApp.getActive(), sig = mesSiguiente_(Utilities.formatDate(new Date(), ZONA, "yyyy-MM"), 1); if (!buscarMes_(ss, sig)) crearMes_(ss, sig, null); }

function correos_() {
  const h = SpreadsheetApp.getActive().getSheetByName(HOJA_CORREOS);
  if (!h || h.getLastRow() < 2) return [];
  const vistos = {};
  return h.getRange(2, 1, h.getLastRow() - 1, 4).getValues().filter(f => !/^no$/i.test(String(f[3]).trim()))
    .map(f => String(f[2]).trim().toLowerCase()).filter(c => /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(c) && !vistos[c] && (vistos[c] = true));
}

function generarReporte_(opc) {
  const cfg = cfg_();
  const copia = String(cfg.reporte_copia || Session.getEffectiveUser().getEmail()).trim();
  const d = armarFinanzas_(false);
  const props = PropertiesService.getScriptProperties();
  const ant = mesSiguiente_(Utilities.formatDate(new Date(), ZONA, "yyyy-MM"), -1);
  const cerrados = d.meses.filter(x => x.id <= ant);
  const objetivo = opc.mes || (opc.modo === "prueba" && !d.meses.some(x => x.id === ant) && cerrados.length ? cerrados[cerrados.length - 1].id : ant);
  const m = d.meses.find(x => x.id === objetivo);
  const nombre = MESES[parseInt(objetivo.slice(5), 10) - 1] + " " + objetivo.slice(0, 4);
  const s = salud_();
  const remitente = "Administración · " + (cfg.nombre_corto || cfg.nombre || "Condominio");
  if (!m) {
    MailApp.sendEmail(copia, "⚠ No se envió el reporte de " + nombre, "La pestaña de " + nombre + " no tiene cobros ni gastos capturados, así que no se envió nada a los vecinos.\n\nCuando esté capturada: menú Condominio → Enviar ahora el reporte del mes anterior.", { name: remitente });
    bitacora_(objetivo, "No enviado: el mes no tiene datos", "", "", s.color);
    return;
  }
  if (opc.modo === "vecinos" && props.getProperty("reporteEnviado_" + objetivo)) return;
  const k = indicadores_(d, m, cfg);
  const pdf = pdf_(k).setName((cfg.nombre_corto || "Condominio") + " · cuentas de " + nombre + ".pdf");
  const carpeta = carpeta_(objetivo);
  const archivo = carpeta.createFile(pdf);
  const wa = textoWhatsapp_(k);
  let dest = [];
  const pausa = !/autom/i.test(String(cfg.reporte_envio || ""));
  if (opc.modo === "vecinos" && !pausa) {
    dest = correos_();
    for (let i = 0; i < dest.length; i += 40) MailApp.sendEmail(copia, "Las cuentas de " + nombre + " · " + k.condominio, wa.replace(/[*_]/g, ""), { name: remitente, bcc: dest.slice(i, i + 40).join(","), htmlBody: correoVecinos_(k), attachments: [pdf] });
    if (dest.length) props.setProperty("reporteEnviado_" + objetivo, new Date().toISOString());
  }
  const estado = opc.modo === "prueba" ? "PRUEBA: no se envió a los vecinos." : pausa ? "En pausa (Config → reporte_envio): no se envió a los vecinos." : dest.length ? "Enviado a " + dest.length + " correos (copia oculta)." : "La pestaña Correos está vacía: no se envió a los vecinos.";
  MailApp.sendEmail(copia, (opc.modo === "prueba" ? "[Prueba] " : "") + "Kit de " + nombre + " · " + k.condominio, wa, { name: remitente, attachments: [pdf], htmlBody: kitHtml_(k, wa, estado, s, archivo.getUrl(), String(cfg.sitio_url || "").replace(/\/+$/, "")) });
  bitacora_(objetivo, estado, dest.length, archivo.getUrl(), s.color);
}

function indicadores_(d, m, cfg) {
  const U = m.unidades || d.condominio.unidades || 1, cuota = m.cuota || d.condominio.cuota;
  const ing = m.ingresos.manto + m.ingresos.agua + m.ingresos.extra, egr = m.egresos.fijos + m.egresos.variables;
  const grupos = {};
  m.detalle.fijos.forEach(it => { const c = String(it[0]).split(" · ")[0]; grupos[c] = (grupos[c] || 0) + it[1]; });
  const rubros = Object.keys(grupos).map(c => [c, grupos[c] / U]).sort((a, b) => b[1] - a[1]);
  const delAnio = d.meses.filter(x => x.anio === m.anio && x.id <= m.id);
  return {
    condominio: String(cfg.nombre_corto || cfg.nombre || "Condominio"), id: m.id, mes: MESES[parseInt(m.id.slice(5), 10) - 1], anio: m.anio,
    unidades: U, cuota: cuota, saldoIni: m.saldoIni, saldoFin: m.saldoFin, ing: ing, egr: egr, res: ing - egr,
    manto: m.ingresos.manto, agua: m.ingresos.agua, extra: m.ingresos.extra, fijos: m.egresos.fijos, variables: m.egresos.variables,
    gastos: m.detalle.fijos.concat(m.detalle.variables).slice().sort((a, b) => b[1] - a[1]),
    pagaron: m.cobranza.pagaron, mora: m.mora || null, rubros: rubros, costoUnidad: rubros.reduce((a, r) => a + r[1], 0),
    resAnio: delAnio.reduce((a, x) => a + x.ingresos.manto + x.ingresos.agua + x.ingresos.extra - x.egresos.fijos - x.egresos.variables, 0), mesesAnio: delAnio.length,
    tono: String(cfg.tono || "cercano")
  };
}

function $_(v) { v = Math.round(v); return (v < 0 ? "−$" : "$") + Math.abs(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
function esc_(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

function textoWhatsapp_(k) {
  const l = ["*" + k.condominio + " · Cuentas de " + k.mes + " " + k.anio + "* 🏠", ""];
  l.push("💰 Saldo en caja: *" + $_(k.saldoFin) + "*");
  l.push("📥 Entró " + $_(k.ing) + " · 📤 Salió " + $_(k.egr));
  l.push(k.res >= 0 ? "✅ Sobraron " + $_(k.res) : "⚠️ Faltaron " + $_(-k.res));
  l.push("👥 Pagaron su cuota: " + k.pagaron + " de " + k.unidades);
  if (k.mora) l.push(k.mora.acumulada > 0.5 ? "⏳ Cuotas atrasadas: " + $_(k.mora.acumulada) + " (" + k.mora.unidades + (k.mora.unidades === 1 ? " unidad" : " unidades") + ")" : "⏳ Nadie debe cuotas.");
  l.push("", "_Las cifras de morosidad son siempre agregadas, sin identificar a nadie._");
  return l.join("\n");
}

function correoVecinos_(k) {
  const fila = (et, v, color) => '<tr><td style="padding:8px 0;color:#52514e">' + et + '</td><td style="padding:8px 0;text-align:right;font-size:17px;font-weight:700;color:' + (color || "#111") + '">' + v + "</td></tr>";
  return '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto"><div style="background:#0f6b5a;color:#fff;padding:22px 24px;border-radius:14px 14px 0 0"><div style="font-size:13px;opacity:.85">' + esc_(k.condominio) + '</div><div style="font-size:24px;font-weight:700">Las cuentas de ' + k.mes + " " + k.anio + "</div></div>" +
    '<div style="border:1px solid #ddd;border-top:0;border-radius:0 0 14px 14px;padding:20px 24px"><div style="font-size:13px;color:#52514e">SALDO EN CAJA AL CIERRE</div><div style="font-size:36px;font-weight:800;color:' + (k.saldoFin < 0 ? "#b3261e" : "#0f6b5a") + '">' + $_(k.saldoFin) + "</div>" +
    '<table style="width:100%;border-collapse:collapse;margin-top:8px">' + fila("Entró en el mes", $_(k.ing)) + fila("Salió en el mes", $_(k.egr)) + fila(k.res >= 0 ? "Sobró" : "Faltó", $_(Math.abs(k.res)), k.res >= 0 ? "#006300" : "#b3261e") + fila("Pagaron su cuota", k.pagaron + " de " + k.unidades) +
    (k.mora ? fila("Cuotas atrasadas", $_(k.mora.acumulada), k.mora.acumulada > 0.5 ? "#b3261e" : "#006300") : "") + "</table>" +
    '<p style="font-size:13px;color:#888;line-height:1.5;margin-top:18px">Va adjunto el reporte en PDF. La morosidad se publica siempre agregada. Si prefieres no recibir estos correos, responde a este mensaje.</p></div></div>';
}

function kitHtml_(k, wa, estado, s, urlPdf, sitio) {
  const boton = (url, t, c) => '<a href="' + url + '" style="display:inline-block;background:' + c + ';color:#fff;text-decoration:none;padding:11px 18px;border-radius:999px;font-weight:700;margin:4px 6px 4px 0">' + t + "</a>";
  const sem = { verde: ["#e3f2e6", "✅ Todo cuadra en la hoja."], amarillo: ["#fff3dc", "⚠️ Revisa esto antes de compartir:"], rojo: ["#fde7e6", "🛑 Hay errores en la hoja:"] }[s.color];
  return '<div style="font-family:Arial,sans-serif;max-width:560px">' +
    '<div style="background:' + sem[0] + ';border-radius:10px;padding:12px 14px;margin-bottom:12px"><b>' + sem[1] + "</b>" + (s.puntos.length ? "<ul style=\"margin:6px 0 0 18px;padding:0\">" + s.puntos.map(p => "<li>" + esc_(p.texto) + "</li>").join("") + "</ul>" : "") + "</div>" +
    "<p><b>" + esc_(estado) + "</b></p>" +
    "<p>" + boton("https://wa.me/?text=" + encodeURIComponent(wa + (sitio ? "\n\nDetalle: " + sitio + "/finanzas.html" : "")), "Abrir WhatsApp con el mensaje", "#25d366") + "</p>" +
    (sitio ? "<p>" + boton(sitio + "/infografia.html?tipo=cuotas&mes=" + k.id, "🏢 Cierre de " + k.mes, "#0f6b5a") + boton(sitio + "/infografia.html?tipo=avance", "📈 Avance del mes", "#3fae5a") + "</p>" : '<p style="color:#b3261e">Pon la dirección del sitio en Config → sitio_url para tener aquí los botones de infografías.</p>') +
    '<pre style="white-space:pre-wrap;background:#f4f4f1;border-radius:10px;padding:14px;font-size:14px;font-family:inherit">' + esc_(wa) + "</pre>" +
    '<p style="font-size:13px;color:#888">El PDF va adjunto y queda en Drive: <a href="' + urlPdf + '">abrir</a>.</p></div>';
}

function pdf_(k) {
  const td = "padding:6px 8px;border-bottom:1px solid #e1e0d9;font-size:11px";
  const tarjeta = (et, v, sub, color) => '<td style="width:33%;padding:6px"><div style="border:1px solid #cfe3dc;border-radius:10px;padding:10px 12px"><div style="font-size:9px;color:#52514e;text-transform:uppercase;letter-spacing:1px">' + et + '</div><div style="font-size:20px;font-weight:bold;color:' + (color || "#111") + '">' + v + '</div><div style="font-size:9.5px;color:#888">' + sub + "</div></div></td>";
  const maxR = Math.max.apply(null, k.rubros.map(r => r[1]).concat([1]));
  const barras = k.rubros.slice(0, 7).map(r => '<tr><td style="font-size:10.5px;padding:3px 6px;width:40%">' + esc_(r[0]) + '</td><td><table style="border-collapse:collapse;width:' + Math.max(2, Math.round(r[1] / maxR * 100)) + '%"><tr><td style="background:#0f6b5a;height:11px;font-size:1px">&nbsp;</td></tr></table></td><td style="font-size:10.5px;text-align:right;width:16%;font-weight:bold">' + $_(r[1]) + "</td></tr>").join("");
  const gastos = k.gastos.slice(0, 14).map(g => '<tr><td style="' + td + '">' + esc_(g[0]) + '</td><td style="' + td + ';text-align:right">' + $_(g[1]) + "</td></tr>").join("");
  const html = '<html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;color:#111;margin:0">' +
    '<table style="width:100%;border-collapse:collapse;background:#0f6b5a;color:#fff"><tr><td style="padding:18px 22px"><div style="font-size:10px;letter-spacing:2px;text-transform:uppercase">' + esc_(k.condominio) + ' · Rendición de cuentas</div><div style="font-size:24px;font-weight:bold">' + k.mes.charAt(0).toUpperCase() + k.mes.slice(1) + " " + k.anio + '</div></td><td style="padding:18px 22px;text-align:right;font-size:10px">Saldo en caja al cierre<br><span style="font-size:26px;font-weight:bold">' + $_(k.saldoFin) + "</span><br>inició el mes en " + $_(k.saldoIni) + "</td></tr></table>" +
    '<table style="width:100%;border-collapse:collapse;margin-top:10px"><tr>' + tarjeta("Entró", $_(k.ing), "mantenimiento " + $_(k.manto) + (k.agua ? " · agua " + $_(k.agua) : "")) + tarjeta("Salió", $_(k.egr), "fijos " + $_(k.fijos) + " · variables " + $_(k.variables)) + tarjeta(k.res >= 0 ? "Sobró" : "Faltó", $_(Math.abs(k.res)), "en " + k.anio + ": " + $_(k.resAnio), k.res >= 0 ? "#006300" : "#b3261e") + "</tr><tr>" +
    tarjeta("Pagaron su cuota", k.pagaron + " de " + k.unidades, Math.round(k.pagaron / k.unidades * 100) + "% de las unidades") + tarjeta("Cuotas atrasadas", k.mora ? $_(k.mora.acumulada) : "—", k.mora ? k.mora.unidades + " unidad(es) · adelantado " + $_(k.mora.adelantos || 0) : "", k.mora && k.mora.acumulada > 0.5 ? "#b3261e" : "#006300") + tarjeta("Cuota mensual", $_(k.cuota), "gasto fijo por unidad: " + $_(k.costoUnidad)) + "</tr></table>" +
    '<table style="width:100%;border-collapse:collapse;margin-top:6px"><tr><td style="width:52%;vertical-align:top;padding:6px"><div style="font-size:12px;font-weight:bold;margin:4px 0 6px">¿En qué se fue tu cuota este mes?</div><table style="width:100%;border-collapse:collapse">' + barras + "</table></td>" +
    '<td style="width:48%;vertical-align:top;padding:6px"><div style="font-size:12px;font-weight:bold;margin:4px 0 6px">Gastos del mes</div><table style="width:100%;border-collapse:collapse">' + gastos + '<tr><td style="' + td + ';font-weight:bold">Total</td><td style="' + td + ';text-align:right;font-weight:bold">' + $_(k.egr) + "</td></tr></table></td></tr></table>" +
    '<div style="margin:12px 6px 0;padding:10px 12px;background:#f4f4f1;border-radius:8px;font-size:9.5px;color:#52514e">Cifras de la hoja de captura de la administración. La morosidad se publica siempre agregada, sin identificar a ninguna unidad.</div></body></html>';
  return Utilities.newBlob(html, "text/html", "reporte.html").getAs("application/pdf");
}

function carpeta_(id) {
  const nombre = (cfg_().nombre_corto || "Condominio") + " · Reportes";
  const it = DriveApp.getFoldersByName(nombre);
  const raiz = it.hasNext() ? it.next() : DriveApp.createFolder(nombre);
  const sub = raiz.getFoldersByName(id);
  return sub.hasNext() ? sub.next() : raiz.createFolder(id);
}
function bitacora_(mes, que, n, url, salud) {
  const h = SpreadsheetApp.getActive().getSheetByName(HOJA_REPORTES);
  if (!h) return;
  h.insertRowBefore(2);
  h.getRange(2, 1, 1, 6).setValues([[new Date(), mes, que, n === "" ? "" : n, url, salud || ""]]);
  h.getRange(2, 2).setNumberFormat("@").setValue(mes);
}

/* ============================ AÑOS ============================ */

function historico_(ss) {
  const h = ss.getSheetByName(HOJA_HISTORICO);
  const out = {};
  if (!h || h.getLastRow() < 2) return out;
  h.getRange(2, 1, h.getLastRow() - 1, 3).getValues().forEach(f => {
    const id = String(f[0]).trim();
    if (!/^\d{4}-\d{2}$/.test(id)) return;
    try { out[id] = { mes: JSON.parse(f[1]), saldos: JSON.parse(f[2] || "{}") }; } catch (_) { /* renglón dañado */ }
  });
  return out;
}
function archivarAnioAnterior() { archivarAnio_(new Date().getFullYear() - 1, true); }
function archivarAnio_(anio, conAviso) {
  const ss = SpreadsheetApp.getActive();
  const d = armarFinanzas_(true);
  const delAnio = d.meses.filter(m => m.anio === anio);
  if (!delAnio.length) { if (conAviso) aviso_("Archivar", "No hay meses de " + anio + " para archivar."); return 0; }
  let h = ss.getSheetByName(HOJA_HISTORICO);
  if (!h) { h = ss.insertSheet(HOJA_HISTORICO); h.getRange(1, 1, 1, 3).setValues([["Mes", "Cifras agregadas (lo que ve el sitio)", "Saldos por unidad al cierre (PRIVADO)"]]).setFontWeight("bold"); }
  const ya = historico_(ss);
  delAnio.forEach(m => {
    if (ya[m.id]) return;
    const saldos = m._saldos || {}, limpio = JSON.parse(JSON.stringify(m));
    ["_saldos", "_hoja", "_noNumericos", "_filaCobros", "enCurso"].forEach(x => delete limpio[x]);
    h.appendRow([m.id, JSON.stringify(limpio), JSON.stringify(saldos)]);
  });
  h.getRange("A:A").setNumberFormat("@");
  hojasMes_(ss).filter(i => i.anio === anio).forEach(i => { try { i.hoja.hideSheet(); } catch (_) { /* ya oculta */ } });
  try { h.hideSheet(); } catch (_) { /* visible */ }
  CacheService.getScriptCache().remove("finanzas");
  if (conAviso) aviso_("Archivar", "Año " + anio + " archivado: " + delAnio.length + " meses en Histórico y sus pestañas ocultas. Nada se borró.");
  return delAnio.length;
}
function mantenimientoMensual() {
  prepararMesSiguienteSilencioso_();
  const hoy = new Date();
  if (hoy.getMonth() === 2) {
    const anterior = hoy.getFullYear() - 1;
    if (!Object.keys(historico_(SpreadsheetApp.getActive())).some(id => id.indexOf(anterior + "-") === 0)) archivarAnio_(anterior, false);
  }
}
function instalarDisparadores_() {
  ScriptApp.getProjectTriggers().filter(t => ["reporteProgramado", "mantenimientoMensual"].indexOf(t.getHandlerFunction()) >= 0).forEach(t => ScriptApp.deleteTrigger(t));
  const dia = Math.min(28, Math.max(1, Number(cfg_().dia_reporte) || 10));
  ScriptApp.newTrigger("reporteProgramado").timeBased().onMonthDay(dia).atHour(9).inTimezone(ZONA).create();
  ScriptApp.newTrigger("mantenimientoMensual").timeBased().onMonthDay(25).atHour(6).inTimezone(ZONA).create();
}

/* ============================ PLANTILLA MAESTRA ============================ */
/* Solo para quien mantiene la plataforma: deja esta hoja como plantilla para compartir
   (Compartir → cualquier persona con el enlace puede ver; el enlace para copiar es el de
   la hoja con /copy al final en lugar de /edit). */
function prepararPlantillaMaestra() {
  const ss = SpreadsheetApp.getActive();
  let h = ss.getSheetByName(HOJA_LEEME);
  if (!h) h = ss.insertSheet(HOJA_LEEME, 0);
  h.clear();
  const t = [
    ["Hoja de captura del condominio"], [""],
    ["1. Menú Condominio → Configurar con mi ficha… y sube el archivo condominio-….json del configurador."],
    ["   (La primera vez Google pide permisos: tu cuenta → Avanzado → Ir a… → Permitir. Es tu propia copia.)"],
    ["2. Implementar → Nueva implementación → engrane → Aplicación web · Ejecutar como: yo · Acceso: cualquier persona."],
    ["3. Menú Condominio → Ver la dirección de mi sitio, y pégala en el configurador para descargar tu sitio."],
    ["4. Cada mes: captura SOLO las celdas azules de la pestaña del mes."],
    ["5. Menú Condominio → Revisar que todo cuadre, antes de compartir cifras."], [""],
    ["Lo que se publica es siempre agregado: nunca cobros por unidad ni nombres."]
  ];
  h.getRange(1, 1, t.length, 1).setValues(t);
  h.getRange(1, 1).setFontWeight("bold").setFontSize(14);
  h.setColumnWidth(1, 900);
  ponerCfg_("nombre", "", "Se llena al configurar con la ficha");
  aviso_("Plantilla", "Lista. Comparte esta hoja como «cualquier persona con el enlace: lector» y reparte el enlace terminado en /copy.");
}

/* ============================ UTILIDADES ============================ */

function sinAcentos_(s) { return String(s).normalize("NFD").replace(/[̀-ͯ]/g, ""); }
function norm_(s) { return sinAcentos_(String(s == null ? "" : s)).toLowerCase().replace(/[^a-z0-9]+/g, ""); }
function num_(v) {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  let s = String(v == null ? "" : v).trim();
  if (!s) return 0;
  const neg = /^\(.*\)$/.test(s) || /^[-−–]/.test(s) || /[-−–]\s*\$/.test(s);
  s = s.replace(/[^0-9.,]/g, "");
  const lp = s.lastIndexOf("."), lc = s.lastIndexOf(",");
  if (lp !== -1 && lc !== -1) s = lp > lc ? s.replace(/,/g, "") : s.replace(/\./g, "").replace(",", ".");
  else if (lc !== -1) { const p = s.split(","); s = (p.length === 2 && p[1].length !== 3) ? p[0] + "." + p[1] : s.replace(/,/g, ""); }
  const n = parseFloat(s);
  return isFinite(n) ? (neg ? -n : n) : 0;
}
function red_(v, dec) { const f = Math.pow(10, dec == null ? 2 : dec); return Math.round(v * f) / f; }
