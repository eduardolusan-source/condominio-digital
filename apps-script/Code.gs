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
    .addItem("Enviar a cada unidad su clave de «Mi cuenta»", "enviarClaves")
    .addItem("Revisar que todo cuadre", "revisarSalud")
    .addSeparator()
    .addItem("Probar el reporte (solo a mí)", "reportePrueba")
    .addItem("Enviar ahora el reporte del mes anterior", "reporteAhora")
    .addSeparator()
    .addItem("Probar el recordatorio de pago (solo a mí)", "recordatorioPrueba")
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
     ["tono", cm.tono || "cercano", "cercano · formal"],
     ["recordatorio_pago", "no", "sí = el día límite menos 3, cada correo registrado de una unidad con adeudo recibe un aviso PRIVADO con su saldo"],
     ["meta_reserva", Math.round((Number(co.cuota) || 0) * unidades.length * 3), "Meta del fondo de reserva (por omisión: 3 meses de cuotas)"],
     ["reglas_reserva", "Se reserva con al menos 2 días de anticipación y hasta 90 días antes. Máximo 2 reservas activas por unidad. Cancela con tu folio si ya no la usarás.", "Reglas de reserva que se muestran en el sitio"],
     ["accesos_permitidos", "", "Correos de la mesa que pueden ver esta hoja (separados por coma); cualquier otro acceso enciende el semáforo"],
     ["agenda", (((f.vida || {}).fechas) || []).filter(x => x.evento).map(x => (x.fecha ? x.fecha + " · " : "") + x.evento + (x.aviso ? " (" + x.aviso + ")" : "")).join(" | "), "Fechas clave del año (separadas por |); el kit del mes te recuerda las que tocan"],
     ["areas_reservables", ((f.vida && f.vida.areas) || []).filter(a => a.nombre && /^s/i.test(String(a.reserva || ""))).map(a => a.nombre).join(" | "), "Áreas que se reservan desde el sitio (separadas por |)"]
    ].forEach(x => ponerCfg_(x[0], x[1], x[2]));
    hechos.push("Config lista.");

    let hu = ss.getSheetByName(HOJA_UNIDADES);
    if (!hu) hu = ss.insertSheet(HOJA_UNIDADES);
    /* Conserva claves y notas si se vuelve a configurar. */
    const previas = {};
    if (hu.getLastRow() > 1) hu.getRange(2, 1, hu.getLastRow() - 1, 3).getValues().forEach(r => { previas[norm_(r[0])] = r; });
    hu.clear();
    hu.getRange(1, 1, 1, 3).setValues([["Unidad", "Notas", "Clave de acceso (privada)"]]).setFontWeight("bold");
    hu.getRange(2, 1, unidades.length, 3).setValues(unidades.map(u => { const p = previas[norm_(u)]; return [u, p ? p[1] : "", p && String(p[2]).trim() ? String(p[2]).trim() : claveNueva_()]; }));
    try { hu.getRange(2, 3, unidades.length, 1).setNumberFormat("@"); } catch (_) { /* formato */ }
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
    prepararPortal_(ss, f);
    try { const aj = accesosAjenos_(); if (aj.length) hechos.push("⚠️ " + aj[0].texto); else hechos.push("Privacidad: la hoja solo la ve tu cuenta" + (String(ad.correoCondominio || "") ? " y las de la administración" : "") + "."); } catch (_) { /* sin permiso */ }
    hechos.push("Portal de vecinos: Avisos, Solicitudes y Documentos" + (ss.getSheetByName(HOJA_RES) ? ", Reservas" : "") + (ss.getSheetByName(HOJA_PRES) ? ", Presupuesto" : "") + (ss.getSheetByName(HOJA_FONDO) ? ", Fondo de reserva" : "") + (ss.getSheetByName(HOJA_ENC) ? ", Consultas" : "") + ".");
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
    porUnidad: Object.fromEntries(cobros.map(r => [r.b, { manto: num_(r.c), agua: num_(r.d), extra: num_(r.e) }])),
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
    if (!conPrivado) delete m.porUnidad;
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
    if (p.accion === "portal") {
      const c = CacheService.getScriptCache(), g = !p.fresh && c.get("portal");
      if (g) return json_(g);
      const t = JSON.stringify(portal_());
      try { c.put("portal", t, 120); } catch (_) { /* grande */ }
      return json_(t);
    }
    if (p.accion === "folio") return json_(JSON.stringify(consultaFolio_(p.folio)));
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
  if (/autom/i.test(String(cfg.reporte_envio || "")) && correos_().length === 0) puntos.push({ nivel: "aviso", texto: "El reporte está en automático pero la pestaña Correos está vacía. Comparte la página «Recibe el reporte» del sitio." });
  try { saludPortal_().forEach(x => puntos.push(x)); } catch (_) { /* portal sin pestañas */ }
  try { accesosAjenos_().forEach(x => puntos.push(x)); } catch (_) { /* sin permiso para leer accesos */ }
  const color = puntos.some(p => p.nivel === "alerta") ? "rojo" : puntos.some(p => p.nivel === "aviso") ? "amarillo" : "verde";
  return { color: color, puntos: puntos };
}
function revisarSalud() {
  const s = salud_();
  const icono = { verde: "✅ Todo cuadra", amarillo: "⚠️ Hay cosas por revisar", rojo: "🛑 Hay errores que corregir" }[s.color];
  aviso_(icono, s.puntos.length ? s.puntos.map(p => (p.nivel === "alerta" ? "• (error) " : p.nivel === "nota" ? "ℹ️ " : "• ") + p.texto).join("\n") : "No encontré problemas en la captura.");
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
    (function () { const a = agendaDelMes_(); return a.length ? '<div style="background:#eef3fb;border-radius:10px;padding:10px 14px;margin:0 0 12px"><b>📅 Este mes toca:</b><ul style="margin:6px 0 0 18px;padding:0">' + a.map(x => "<li>" + esc_(x) + "</li>").join("") + "</ul></div>" : ""; })() +
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
  ScriptApp.getProjectTriggers().filter(t => ["reporteProgramado", "mantenimientoMensual", "recordatorioProgramado", "alEditar"].indexOf(t.getHandlerFunction()) >= 0).forEach(t => ScriptApp.deleteTrigger(t));
  const dia = Math.min(28, Math.max(1, Number(cfg_().dia_reporte) || 10));
  ScriptApp.newTrigger("reporteProgramado").timeBased().onMonthDay(dia).atHour(9).inTimezone(ZONA).create();
  ScriptApp.newTrigger("mantenimientoMensual").timeBased().onMonthDay(25).atHour(6).inTimezone(ZONA).create();
  const lim = Math.min(28, Math.max(1, (Number(cfg_().dia_limite) || 10) - 3));
  ScriptApp.newTrigger("recordatorioProgramado").timeBased().onMonthDay(lim).atHour(10).inTimezone(ZONA).create();
  ScriptApp.newTrigger("alEditar").forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
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

/* ============================ PORTAL DE VECINOS ============================ */
/* Lo que suelen traer las plataformas condominales (avisos, solicitudes con folio, reservas,
   documentos, contactos útiles, registro de correos y recordatorio de pago), con la regla de
   la casa: lo público es agregado o impersonal; unidad, nombre y correo se quedan en la hoja. */

const HOJA_ACU = "Acuerdos", ENC_ACU = ["Fecha", "Acuerdo", "Por qué", "Responsable (rol)", "Fecha compromiso", "Estado"], EST_ACU = ["Pendiente", "En curso", "Cumplido", "Cancelado"];
const HOJA_FONDO = "Fondo de reserva", HOJA_PRES = "Presupuesto", HOJA_ENC = "Consultas", HOJA_VOTOS = "Votos (privado)";
const ENC_FONDO = ["Fecha", "Movimiento", "Monto (+ entra / − sale)", "Nota"], ENC_PRES = ["Concepto", "Presupuesto mensual"];
const ENC_ENC = ["Clave", "Pregunta", "Opciones (separadas por |)", "Cierra el", "Activa (sí/no)"], ENC_VOTOS = ["Fecha", "Consulta", "Unidad", "Opción"];
const HOJA_AVISOS = "Avisos", HOJA_SOL = "Solicitudes", HOJA_RES = "Reservas", HOJA_DOCS = "Documentos", HOJA_CONT = "Contactos útiles";
const ENC_AVISOS = ["Fecha", "Título", "Texto", "Vigente hasta", "Importante (sí/no)"];
const ENC_SOL = ["Folio", "Fecha", "Unidad (privado)", "Categoría", "Lugar", "Descripción", "Correo (privado)", "Estatus", "Respuesta de la administración", "Actualizado"];
const ENC_RES = ["Folio", "Solicitada el", "Área", "Día", "Horario", "Unidad (privado)", "Correo (privado)", "Estatus", "Nota de la administración"];
const ENC_DOCS = ["Título", "Categoría", "Liga (Drive)", "Fecha"];
const ENC_CONT = ["Servicio", "Nombre", "Teléfono o correo", "Horario o nota"];
const EST_SOL = ["Recibida", "En proceso", "Resuelta", "No procede"];
const EST_RES = ["Por confirmar", "Confirmada", "Rechazada", "Cancelada"];
const CATEGORIAS = ["Mantenimiento", "Limpieza", "Seguridad", "Ruido o convivencia", "Agua", "Áreas comunes", "Sugerencia", "Otro"];

/* Crea solo lo que el condominio va a usar: Avisos, Solicitudes y Documentos siempre (son
   ligeros y ahorran tiempo); Reservas si hay áreas que se reservan; Presupuesto si la ficha trae
   montos de gastos fijos; Fondo de reserva y Consultas solo si se eligieron en la ficha. */
function prepararPortal_(ss, ficha) {
  const f = ficha || {}, mods = ((f.comunicacion || {}).modulos) || [];
  const nueva = (n, enc) => { if (ss.getSheetByName(n)) return null; const h = ss.insertSheet(n); h.getRange(1, 1, 1, enc.length).setValues([enc]).setFontWeight("bold"); h.setFrozenRows(1); return h; };
  const av = nueva(HOJA_AVISOS, ENC_AVISOS);
  if (av) av.getRange(2, 1, 1, 5).setValues([[new Date(), "Bienvenidos al sitio del condominio", "Aquí verás los avisos de la administración. Para recibir el reporte mensual, registra tu correo en «Recibe el reporte».", "", "no"]]);
  nueva(HOJA_SOL, ENC_SOL); nueva(HOJA_DOCS, ENC_DOCS);
  if (String(cfg_().areas_reservables || "").trim() || !ficha) nueva(HOJA_RES, ENC_RES);
  const fijos = ((f.gastos || {}).fijos || []).filter(g => String(g.concepto || "").trim() && Number(g.monto) > 0);
  if (fijos.length) { const pr = nueva(HOJA_PRES, ENC_PRES); if (pr) pr.getRange(2, 1, fijos.length, 2).setValues(fijos.map(g => [String(g.concepto).trim(), Number(g.monto)])); }
  if (mods.indexOf("fondo") >= 0) nueva(HOJA_FONDO, ENC_FONDO);
  if (mods.indexOf("acuerdos") >= 0 || mods.indexOf("asambleas") >= 0) nueva(HOJA_ACU, ENC_ACU);
  if (mods.indexOf("consultas") >= 0) { nueva(HOJA_ENC, ENC_ENC); nueva(HOJA_VOTOS, ENC_VOTOS); }
  const val = (n, col, lista) => { const h = ss.getSheetByName(n); if (!h) return; try { h.getRange(2, col, 500, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(lista, true).setAllowInvalid(true).build()); } catch (_) { /* sin validación */ } };
  val(HOJA_SOL, 8, EST_SOL); val(HOJA_RES, 8, EST_RES); val(HOJA_AVISOS, 5, ["sí", "no"]); val(HOJA_ENC, 5, ["sí", "no"]); val(HOJA_ACU, 6, EST_ACU);
}

/* Agenda del mes para el kit: lo que toca según las fechas clave de la ficha (Config → agenda). */
function agendaDelMes_() {
  const mes = MESES[parseInt(Utilities.formatDate(new Date(), ZONA, "yyyy-MM").slice(5), 10) - 1];
  return String(cfg_().agenda || "").split("|").map(x => x.trim()).filter(Boolean)
    .filter(x => { const n = sinAcentos_(x.toLowerCase()); return n.indexOf(sinAcentos_(mes)) >= 0 || /cada|mensual|todos los meses/.test(n); });
}

function filas_(n, ancho) { const h = SpreadsheetApp.getActive().getSheetByName(n); return h && h.getLastRow() > 1 ? h.getRange(2, 1, h.getLastRow() - 1, ancho).getValues() : []; }
function fechaISO_(v) { if (Object.prototype.toString.call(v) === "[object Date]" && !isNaN(v)) return Utilities.formatDate(v, ZONA, "yyyy-MM-dd"); const t = String(v || "").trim(); return /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : ""; }
function unidades_() { return filas_(HOJA_UNIDADES, 1).map(f => String(f[0]).trim()).filter(Boolean); }
function unidadValida_(u) { const n = norm_(u); return unidades_().find(x => norm_(x) === n) || ""; }
function limite_(clave, max) { const c = CacheService.getScriptCache(), k = "lim_" + clave.slice(0, 200), n = Number(c.get(k) || 0); if (n >= max) return false; c.put(k, String(n + 1), 3600); return true; }
function correoOk_(c) { return c.length <= 120 && /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[a-z]{2,}$/.test(c); }
function limpio_(s, n) { return String(s == null ? "" : s).replace(/^[=+\-@\t\r]+/, "").replace(/\s+/g, " ").trim().slice(0, n); }
function folio_(prefijo) { const p = PropertiesService.getScriptProperties(), k = "folio_" + prefijo, n = Number(p.getProperty(k) || 0) + 1; p.setProperty(k, String(n)); return prefijo + "-" + ("000" + n).slice(-4); }
function remitente_() { const c = cfg_(); return "Administración · " + (c.nombre_corto || c.nombre || "Condominio"); }
function avisarAdmin_(asunto, texto) { const c = cfg_(); const a = String(c.reporte_copia || c.correo_condominio || "").trim(); if (a) MailApp.sendEmail(a, asunto, texto, { name: remitente_() }); }
function sitio_() { return String(cfg_().sitio_url || "").replace(/\/+$/, ""); }

/* Lo que ve cualquiera en el sitio: nada que identifique a una unidad o persona. */
function portal_() {
  const hoy = Utilities.formatDate(new Date(), ZONA, "yyyy-MM-dd");
  const avisos = filas_(HOJA_AVISOS, 5).filter(f => String(f[1]).trim() && (!fechaISO_(f[3]) || fechaISO_(f[3]) >= hoy))
    .map(f => ({ fecha: fechaISO_(f[0]), titulo: limpio_(f[1], 120), texto: limpio_(f[2], 1200), importante: /^s/i.test(String(f[4])) }))
    .sort((a, b) => (b.importante - a.importante) || (a.fecha < b.fecha ? 1 : -1)).slice(0, 12);
  const sol = filas_(HOJA_SOL, ENC_SOL.length).filter(f => String(f[0]).trim());
  const abiertas = sol.filter(f => !/resuelta|no procede/i.test(String(f[7])));
  const atendiendo = sol.slice().reverse().slice(0, 15).map(f => ({ folio: String(f[0]), fecha: fechaISO_(f[1]), categoria: String(f[3]), lugar: limpio_(f[4], 60), estatus: String(f[7] || "Recibida"), respuesta: limpio_(f[8], 300) }));
  const resueltas30 = sol.filter(f => /resuelta/i.test(String(f[7])) && f[9] && (new Date() - new Date(f[9])) < 30 * 864e5).length;
  const reservas = filas_(HOJA_RES, ENC_RES.length).filter(f => fechaISO_(f[3]) >= hoy && /confirmada|por confirmar/i.test(String(f[7])))
    .map(f => ({ area: String(f[2]), dia: fechaISO_(f[3]), horario: limpio_(f[4], 40), estatus: /confirmada/i.test(String(f[7])) ? "ocupado" : "apartado" }))
    .sort((a, b) => a.dia < b.dia ? -1 : 1).slice(0, 60);
  const docs = filas_(HOJA_DOCS, 4).filter(f => String(f[0]).trim() && /^https?:\/\//.test(String(f[2]).trim()))
    .map(f => ({ titulo: limpio_(f[0], 120), categoria: limpio_(f[1], 40) || "General", liga: String(f[2]).trim(), fecha: fechaISO_(f[3]) }));
  const contactos = filas_(HOJA_CONT, 4).filter(f => String(f[0]).trim() && (String(f[1]).trim() || String(f[2]).trim()))
    .map(f => ({ servicio: limpio_(f[0], 60), nombre: limpio_(f[1], 60), contacto: limpio_(f[2], 80), nota: limpio_(f[3], 80) }));
  const cc = conCorreo_();
  const conResp = sol.filter(f => /resuelta/i.test(String(f[7])) && f[9] && f[1]).map(f => (new Date(f[9]) - new Date(f[1])) / 864e5).filter(x => x >= 0);
  const diasRespuesta = conResp.length ? Math.round(conResp.reduce((a, b) => a + b, 0) / conResp.length * 10) / 10 : null;
  let extra = {};
  try { extra = finanzasPortal_(); } catch (err) { Logger.log("finanzasPortal_: " + err.message); }
  return { ok: true, servicio: "condominio-digital", generado: new Date().toISOString(), avisos: avisos, solicitudes: { abiertas: abiertas.length, resueltas30: resueltas30, diasRespuesta: diasRespuesta, lista: atendiendo },
    reglasReserva: String(cfg_().reglas_reserva || ""), acuerdos: acuerdos_(), mes: extra.mes || null, consultas: consultas_(), reserva: extra.reserva || null, presupuesto: extra.presupuesto || [], antiguedad: extra.antiguedad || null,
    reservas: reservas, areasReservables: String(cfg_().areas_reservables || "").split("|").map(s => s.trim()).filter(Boolean), categorias: CATEGORIAS,
    documentos: docs, contactos: contactos, correos: { unidades: cc.con, total: cc.total } };
}

/* Seguimiento con el folio: solo quien lo tiene ve su descripción. */
function consultaFolio_(folio) {
  const f = String(folio || "").trim().toUpperCase();
  if (!/^[SR]-\d{4}$/.test(f)) return { ok: false, error: "folio" };
  if (!limite_("folio_" + f, 30)) return { ok: false, error: "espera" };
  if (f[0] === "S") {
    const x = filas_(HOJA_SOL, ENC_SOL.length).find(r => String(r[0]).toUpperCase() === f);
    return x ? { ok: true, tipo: "solicitud", folio: f, fecha: fechaISO_(x[1]), categoria: String(x[3]), lugar: String(x[4]), descripcion: String(x[5]), estatus: String(x[7] || "Recibida"), respuesta: String(x[8] || ""), actualizado: fechaISO_(x[9]) } : { ok: false, error: "no encontrado" };
  }
  const x = filas_(HOJA_RES, ENC_RES.length).find(r => String(r[0]).toUpperCase() === f);
  return x ? { ok: true, tipo: "reserva", folio: f, area: String(x[2]), dia: fechaISO_(x[3]), horario: String(x[4]), estatus: String(x[7] || "Por confirmar"), nota: String(x[8] || "") } : { ok: false, error: "no encontrado" };
}

function doPost(e) {
  const candado = LockService.getScriptLock();
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (String(d.web || "").trim()) return json_(JSON.stringify({ ok: true }));        // campo trampa: robots
    candado.waitLock(10000);
    const r = d.accion === "cuenta" ? miCuenta_(d) : d.accion === "correo" ? registrarCorreo_(d) : d.accion === "solicitud" ? nuevaSolicitud_(d) : d.accion === "reserva" ? nuevaReserva_(d)
      : d.accion === "cancelar" ? cancelarReserva_(d) : d.accion === "voto" ? votar_(d) : { ok: false, error: "accion" };
    CacheService.getScriptCache().remove("portal");
    return json_(JSON.stringify(r));
  } catch (err) { return json_(JSON.stringify({ ok: false, error: String(err.message || err) })); }
  finally { try { candado.releaseLock(); } catch (_) { /* sin candado */ } }
}

function registrarCorreo_(d) {
  const correo = String(d.correo || "").trim().toLowerCase();
  if (!correoOk_(correo)) return { ok: false, error: "correo" };
  const baja = d.baja === true || d.baja === "1";
  const unidad = baja ? "" : unidadValida_(d.unidad);
  if (!baja && !unidad) return { ok: false, error: "unidad" };
  if (!limite_("correo_" + correo, 3) || !limite_("correos_hora", 40)) return { ok: false, error: "espera" };
  const ss = SpreadsheetApp.getActive();
  let h = ss.getSheetByName(HOJA_CORREOS);
  if (!h) { asegurarHoja_(ss, HOJA_CORREOS, ["Unidad", "Nombre", "Correo", "Recibe el reporte (sí / no)"]); h = ss.getSheetByName(HOJA_CORREOS); }
  if (!String(h.getRange(1, 5).getValue()).trim()) h.getRange(1, 5, 1, 2).setValues([["Actualizado el", "Cómo llegó"]]);
  const filas = h.getLastRow() > 1 ? h.getRange(2, 1, h.getLastRow() - 1, 4).getValues() : [];
  const mias = []; filas.forEach((f, i) => { if (String(f[2]).trim().toLowerCase() === correo) mias.push(i + 2); });
  const nombreC = cfg_().nombre_corto || cfg_().nombre || "el condominio";
  if (baja) {
    mias.forEach(r => { h.getRange(r, 4).setValue("no"); h.getRange(r, 5, 1, 2).setValues([[new Date(), "baja desde el sitio"]]); });
    if (mias.length) MailApp.sendEmail(correo, "Ya no recibirás el reporte de " + nombreC, "Listo: dejaste de recibir el reporte mensual de " + nombreC + ".\n\nSi fue un error, vuelve a registrarte en el sitio" + (sitio_() ? ": " + sitio_() + "/correo.html" : "") + ".", { name: remitente_() });
    return { ok: true };
  }
  const nombre = limpio_(d.nombre, 60), fila = [unidad, nombre, correo, "sí", new Date(), "formulario del sitio"];
  if (mias.length) { if (!nombre) fila[1] = filas[mias[0] - 2][1]; h.getRange(mias[0], 1, 1, 6).setValues([fila]); }
  else h.getRange(h.getLastRow() + 1, 1, 1, 6).setValues([fila]);
  MailApp.sendEmail(correo, "Quedaste registrado · reporte mensual de " + nombreC,
    "Hola" + (nombre ? " " + nombre : "") + ":\n\nTu correo quedó registrado (" + unidad + ") para recibir cada mes el reporte de cuentas de " + nombreC + ". Se envía con copia oculta: nadie más ve tu correo.\n\n" +
    "Si no fuiste tú o quieres dejar de recibirlo, responde a este correo o date de baja en " + (sitio_() ? sitio_() + "/correo.html" : "la página «Recibe el reporte» del sitio") + ".", { name: remitente_() });
  return { ok: true };
}

function conCorreo_() {
  const total = unidades_(), con = {};
  filas_(HOJA_CORREOS, 4).forEach(f => { const u = norm_(f[0]); if (u && /@/.test(String(f[2])) && !/^no$/i.test(String(f[3]).trim())) con[u] = true; });
  const faltan = total.filter(u => !con[norm_(u)]);
  return { con: total.length - faltan.length, total: total.length, faltan: faltan };
}
function correosDeUnidad_(u) { const n = norm_(u); return filas_(HOJA_CORREOS, 4).filter(f => norm_(f[0]) === n && !/^no$/i.test(String(f[3]).trim())).map(f => String(f[2]).trim().toLowerCase()).filter(correoOk_); }

function nuevaSolicitud_(d) {
  const unidad = unidadValida_(d.unidad);
  if (!unidad) return { ok: false, error: "unidad" };
  const desc = limpio_(d.descripcion, 1000);
  if (desc.length < 8) return { ok: false, error: "descripcion" };
  const correo = String(d.correo || "").trim().toLowerCase();
  if (correo && !correoOk_(correo)) return { ok: false, error: "correo" };
  if (!limite_("sol_" + norm_(unidad), 5) || !limite_("sol_hora", 30)) return { ok: false, error: "espera" };
  const cat = CATEGORIAS.indexOf(d.categoria) >= 0 ? d.categoria : "Otro";
  const ss = SpreadsheetApp.getActive();
  if (!ss.getSheetByName(HOJA_SOL)) prepararPortal_(ss, null);
  const h = ss.getSheetByName(HOJA_SOL), folio = folio_("S");
  h.getRange(h.getLastRow() + 1, 1, 1, ENC_SOL.length).setValues([[folio, new Date(), unidad, cat, limpio_(d.lugar, 80), desc, correo, "Recibida", "", new Date()]]);
  avisarAdmin_("Nueva solicitud " + folio + " · " + cat, unidad + " reportó: " + desc + "\n\nLugar: " + (limpio_(d.lugar, 80) || "—") + "\n\nAtiéndela en la pestaña Solicitudes: cambia el Estatus y escribe la respuesta. Si dejó correo, le llega el aviso solo.");
  if (correo) MailApp.sendEmail(correo, "Recibimos tu solicitud " + folio, "Tu folio es " + folio + ". Te avisaremos por correo cuando cambie su estatus.\n\nConsúltalo cuando quieras en " + (sitio_() ? sitio_() + "/solicitud.html?folio=" + folio : "la página «Reportar» del sitio") + ".", { name: remitente_() });
  return { ok: true, folio: folio };
}

function nuevaReserva_(d) {
  const unidad = unidadValida_(d.unidad);
  if (!unidad) return { ok: false, error: "unidad" };
  const areas = String(cfg_().areas_reservables || "").split("|").map(s => s.trim()).filter(Boolean);
  const area = areas.find(a => norm_(a) === norm_(d.area));
  if (!area) return { ok: false, error: "area" };
  const dia = fechaISO_(d.dia), hoy = Utilities.formatDate(new Date(), ZONA, "yyyy-MM-dd");
  if (!dia || dia < hoy) return { ok: false, error: "dia" };
  const tope = Utilities.formatDate(new Date(Date.now() + 90 * 864e5), ZONA, "yyyy-MM-dd");
  if (dia > tope) return { ok: false, error: "lejos" };
  const activas = filas_(HOJA_RES, ENC_RES.length).filter(f => norm_(f[5]) === norm_(unidad) && fechaISO_(f[3]) >= hoy && /confirmada|por confirmar/i.test(String(f[7]))).length;
  if (activas >= 2) return { ok: false, error: "tope" };
  const horario = limpio_(d.horario, 40) || "todo el día";
  const correo = String(d.correo || "").trim().toLowerCase();
  if (!correoOk_(correo)) return { ok: false, error: "correo" };
  if (!limite_("res_" + norm_(unidad), 5)) return { ok: false, error: "espera" };
  const ocupado = filas_(HOJA_RES, ENC_RES.length).some(f => norm_(f[2]) === norm_(area) && fechaISO_(f[3]) === dia && /confirmada|por confirmar/i.test(String(f[7])) && chocaHorario_(String(f[4]), horario));
  if (ocupado) return { ok: false, error: "ocupado" };
  const ss = SpreadsheetApp.getActive();
  if (!ss.getSheetByName(HOJA_RES)) prepararPortal_(ss, null);
  const h = ss.getSheetByName(HOJA_RES), folio = folio_("R");
  h.getRange(h.getLastRow() + 1, 1, 1, ENC_RES.length).setValues([[folio, new Date(), area, dia, horario, unidad, correo, "Por confirmar", ""]]);
  avisarAdmin_("Reserva por confirmar " + folio + " · " + area + " · " + dia, unidad + " pidió " + area + " el " + dia + " (" + horario + ").\n\nConfírmala o recházala en la pestaña Reservas (columna Estatus): le llega el aviso solo.");
  MailApp.sendEmail(correo, "Recibimos tu reserva " + folio, area + " · " + dia + " · " + horario + "\n\nQueda «por confirmar»: te avisaremos por correo cuando la administración la confirme.", { name: remitente_() });
  return { ok: true, folio: folio };
}

/* Disparador instalable al editar: si la administración cambia el Estatus de una solicitud o
   reserva, se avisa por correo a quien la hizo (solo si dejó correo). */
function alEditar(e) {
  try {
    const h = e.range.getSheet(), n = h.getName(), r = e.range.getRow(), c = e.range.getColumn();
    if (r < 2 || [HOJA_SOL, HOJA_RES].indexOf(n) < 0) return;
    if (n === HOJA_SOL && (c === 8 || c === 9)) {
      const f = h.getRange(r, 1, 1, ENC_SOL.length).getValues()[0];
      h.getRange(r, 10).setValue(new Date());
      if (c === 8 && correoOk_(String(f[6]).trim())) MailApp.sendEmail(String(f[6]).trim(), "Tu solicitud " + f[0] + ": " + f[7], "Estatus: " + f[7] + (f[8] ? "\nRespuesta de la administración: " + f[8] : "") + "\n\nDetalle: " + (sitio_() ? sitio_() + "/solicitud.html?folio=" + f[0] : "página «Reportar» del sitio"), { name: remitente_() });
    }
    if (n === HOJA_RES && c === 8) {
      const f = h.getRange(r, 1, 1, ENC_RES.length).getValues()[0];
      if (correoOk_(String(f[6]).trim())) MailApp.sendEmail(String(f[6]).trim(), "Tu reserva " + f[0] + ": " + f[7], f[2] + " · " + fechaISO_(f[3]) + " · " + f[4] + "\nEstatus: " + f[7] + (f[8] ? "\nNota: " + f[8] : ""), { name: remitente_() });
    }
    CacheService.getScriptCache().remove("portal");
  } catch (err) { Logger.log("alEditar: " + err.message); }
}

/* Recordatorio PRIVADO de pago: a cada correo registrado de una unidad con saldo pendiente,
   solo su propio saldo. Se activa con Config → recordatorio_pago = sí. */
function recordatorioProgramado() { if (/^s/i.test(String(cfg_().recordatorio_pago || ""))) recordatorio_(false); }
function recordatorioPrueba() { const n = recordatorio_(true); aviso_("Recordatorio de pago", n ? "Te llegó un ejemplo con " + n + " unidad(es) con adeudo. A los vecinos no se les envió nada." : "Ninguna unidad tiene adeudo: no habría a quién enviarle."); }
function recordatorio_(prueba) {
  const d = armarFinanzas_(true), ult = d.meses.filter(m => !m.enCurso).slice(-1)[0] || d.meses.slice(-1)[0];
  if (!ult || !ult._saldos) return 0;
  const cfg = cfg_(), mes = ult.nombre.toLowerCase() + " " + ult.anio, pagar = sitio_() ? sitio_() + "/pagar.html" : "la página «Cómo pagar» del sitio";
  const deben = Object.keys(ult._saldos).filter(u => ult._saldos[u] < -0.5);
  let ejemplo = "";
  deben.forEach(u => {
    const texto = "Hola:\n\nAl cierre de " + mes + ", " + u + " tiene un saldo pendiente de " + $_(-ult._saldos[u]) + " de cuotas de mantenimiento.\n\nCómo pagar: " + pagar + "\nSi ya pagaste, ignora este mensaje (puede tardar en reflejarse).\n\nEste aviso es privado: solo lo recibe el correo registrado de tu unidad.";
    if (prueba) { if (!ejemplo) ejemplo = texto; return; }
    correosDeUnidad_(u).forEach(c => MailApp.sendEmail(c, "Recordatorio de pago · " + (cfg.nombre_corto || cfg.nombre || "Condominio"), texto, { name: remitente_() }));
  });
  if (prueba && ejemplo) MailApp.sendEmail(String(cfg.reporte_copia || Session.getEffectiveUser().getEmail()), "[Prueba] Recordatorio de pago", "Así le llegaría a cada unidad con adeudo (" + deben.length + " en total):\n\n" + ejemplo, { name: remitente_() });
  if (!prueba) bitacora_(ult.id, "Recordatorio de pago a " + deben.length + " unidad(es) con adeudo", deben.length, "", "");
  return deben.length;
}

/* Para el semáforo y el kit: pendientes de atención (privado). */
function saludPortal_() {
  const out = [], hoy = new Date();
  const sol = filas_(HOJA_SOL, ENC_SOL.length).filter(f => String(f[0]).trim() && !/resuelta|no procede/i.test(String(f[7])));
  const viejas = sol.filter(f => (hoy - new Date(f[1])) > 7 * 864e5);
  if (viejas.length) out.push({ nivel: "aviso", texto: viejas.length + " solicitud(es) de vecinos llevan más de una semana sin resolverse: " + viejas.map(f => f[0]).join(", ") + "." });
  else if (sol.length) out.push({ nivel: "nota", texto: sol.length + " solicitud(es) abiertas en la pestaña Solicitudes." });
  const res = filas_(HOJA_RES, ENC_RES.length).filter(f => /por confirmar/i.test(String(f[7])) && fechaISO_(f[3]) >= Utilities.formatDate(hoy, ZONA, "yyyy-MM-dd"));
  if (res.length) out.push({ nivel: "aviso", texto: res.length + " reserva(s) por confirmar: " + res.map(f => f[0] + " (" + f[2] + ", " + fechaISO_(f[3]) + ")").join(", ") + "." });
  const cc = conCorreo_();
  if (cc.total && cc.con < cc.total && cc.con > 0) out.push({ nivel: "nota", texto: "Correos: " + cc.con + " de " + cc.total + " unidades registradas. Faltan: " + cc.faltan.slice(0, 20).join(", ") + (cc.faltan.length > 20 ? "…" : "") + "." });
  return out;
}

/* ---------- Lo que piden las buenas prácticas de rendición de cuentas ---------- */

/* Fondo de reserva por separado del saldo operativo, presupuesto contra lo gastado y
   antigüedad de la morosidad (cuántas unidades deben 1 mes, 2–3 o más). Todo agregado. */
function finanzasPortal_() {
  const cfg = cfg_(), out = {};
  const mov = filas_(HOJA_FONDO, 4).filter(f => String(f[1]).trim() || num_(f[2]));
  const saldo = red_(mov.reduce((a, f) => a + num_(f[2]), 0));
  out.reserva = { saldo: saldo, meta: Number(cfg.meta_reserva) || 0, movimientos: mov.slice(-5).reverse().map(f => ({ fecha: fechaISO_(f[0]), concepto: limpio_(f[1], 80), monto: red_(num_(f[2])) })) };
  const d = armarFinanzas_(true);
  const cerrados = d.meses.filter(m => !m.enCurso && !m.archivado).slice(-3);
  const pres = filas_(HOJA_PRES, 2).filter(f => String(f[0]).trim() && num_(f[1]) > 0);
  out.presupuesto = pres.map(f => {
    const c = norm_(f[0]);
    const real = cerrados.length ? cerrados.reduce((a, m) => a + m.detalle.fijos.concat(m.detalle.variables).filter(it => norm_(String(it[0]).split(" · ")[0]).indexOf(c) === 0).reduce((x, it) => x + it[1], 0), 0) / cerrados.length : 0;
    return { concepto: limpio_(f[0], 60), presupuesto: red_(num_(f[1])), real: red_(real) };
  });
  out.presupuestoMeses = cerrados.map(m => m.nombre + " " + m.anio);
  const cer = d.meses.filter(m => !m.enCurso).slice(-1)[0];
  if (cer) out.mes = { nombre: cer.nombre + " " + cer.anio, pagaron: cer.cobranza.pagaron, unidades: cer.unidades, saldo: cer.saldoFin, sobro: red_(cer.ingresos.manto + cer.ingresos.agua + cer.ingresos.extra - cer.egresos.fijos - cer.egresos.variables) };
  const ult = d.meses.filter(m => !m.enCurso).slice(-1)[0];
  if (ult && ult._saldos && ult.cuota) {
    const b = { uno: 0, dosTres: 0, masTres: 0 };
    Object.keys(ult._saldos).forEach(u => { const meses = -ult._saldos[u] / ult.cuota; if (meses > 3.01) b.masTres++; else if (meses > 1.01) b.dosTres++; else if (meses > 0.01) b.uno++; });
    out.antiguedad = Object.assign({ corte: ult.nombre + " " + ult.anio }, b);
  }
  return out;
}

/* ---------- Consultas rápidas a los vecinos (no sustituyen a la asamblea) ---------- */

function consultas_() {
  const hoy = Utilities.formatDate(new Date(), ZONA, "yyyy-MM-dd");
  const votos = filas_(HOJA_VOTOS, 4), total = unidades_().length;
  return filas_(HOJA_ENC, 5).filter(f => String(f[0]).trim() && String(f[1]).trim() && /^s/i.test(String(f[4]))).map(f => {
    const clave = String(f[0]).trim(), opciones = String(f[2]).split("|").map(x => x.trim()).filter(Boolean), cierra = fechaISO_(f[3]);
    const ultimo = {};                                           // el último voto de cada unidad cuenta
    votos.filter(v => String(v[1]).trim() === clave).forEach(v => { ultimo[norm_(v[2])] = String(v[3]); });
    const conteo = opciones.map(o => Object.keys(ultimo).filter(u => ultimo[u] === o).length);
    return { clave: clave, pregunta: limpio_(f[1], 200), opciones: opciones, conteo: conteo, participacion: Object.keys(ultimo).length, total: total, cierra: cierra, abierta: !cierra || cierra >= hoy };
  });
}
function votar_(d) {
  const unidad = unidadValida_(d.unidad);
  if (!unidad) return { ok: false, error: "unidad" };
  const c = consultas_().find(x => x.clave === String(d.consulta || "").trim());
  if (!c) return { ok: false, error: "consulta" };
  if (!c.abierta) return { ok: false, error: "cerrada" };
  if (c.opciones.indexOf(d.opcion) < 0) return { ok: false, error: "opcion" };
  if (!limite_("voto_" + norm_(unidad) + c.clave, 5)) return { ok: false, error: "espera" };
  const ss = SpreadsheetApp.getActive();
  if (!ss.getSheetByName(HOJA_VOTOS)) prepararPortal_(ss, null);
  const h = ss.getSheetByName(HOJA_VOTOS);
  h.getRange(h.getLastRow() + 1, 1, 1, 4).setValues([[new Date(), c.clave, unidad, d.opcion]]);
  return { ok: true };
}

function cancelarReserva_(d) {
  const folio = String(d.folio || "").trim().toUpperCase(), correo = String(d.correo || "").trim().toLowerCase();
  if (!/^R-\d{4}$/.test(folio) || !correoOk_(correo)) return { ok: false, error: "folio" };
  if (!limite_("cancelar_" + folio, 5)) return { ok: false, error: "espera" };
  const h = SpreadsheetApp.getActive().getSheetByName(HOJA_RES);
  const filas = filas_(HOJA_RES, ENC_RES.length), i = filas.findIndex(f => String(f[0]).toUpperCase() === folio && String(f[6]).trim().toLowerCase() === correo);
  if (i < 0) return { ok: false, error: "no encontrado" };
  h.getRange(i + 2, 8).setValue("Cancelada");
  avisarAdmin_("Reserva cancelada " + folio, filas[i][2] + " · " + fechaISO_(filas[i][3]) + " · " + filas[i][4] + " quedó libre.");
  return { ok: true };
}

/* ---------- Mi cuenta: estado de cuenta de UNA unidad, con su clave ---------- */
/* La clave vive en Unidades → columna C (privada). Se genera sola al configurar y se envía con un
   clic a los correos registrados de cada unidad. El sitio público sigue siendo agregado: el detalle
   individual solo sale con unidad + clave, por POST, con límite de intentos. */

function claveNueva_() { let c = ""; for (let i = 0; i < 6; i++) c += Math.floor(Math.random() * 10); return c; }
function claveDe_(u) { const n = norm_(u), f = filas_(HOJA_UNIDADES, 3).find(r => norm_(r[0]) === n); return f ? String(f[2]).trim() : ""; }

function miCuenta_(d) {
  const unidad = unidadValida_(d.unidad);
  const clave = String(d.clave || "").replace(/\s/g, "");
  if (!limite_("cuenta_" + norm_(d.unidad), 8) || !limite_("cuenta_hora", 150)) return { ok: false, error: "espera" };
  if (!unidad || !clave || claveDe_(unidad) !== clave) return { ok: false, error: "clave" };
  const df = armarFinanzas_(true), hoyId = df.hoy, n = norm_(unidad);
  const filaDe = m => { const k = Object.keys(m.porUnidad || {}).find(x => norm_(x) === n); return k ? m.porUnidad[k] : { manto: 0, agua: 0, extra: 0 }; };
  let saldo = 0, inicial = null;
  const meses = [];
  df.meses.forEach(m => {
    if (m.archivado) { const s = (m._saldos || {}); const k = Object.keys(s).find(x => norm_(x) === n); inicial = { hasta: m.nombre + " " + m.anio, saldo: red_(k ? s[k] : 0) }; saldo = k ? s[k] : 0; return; }
    const p = filaDe(m);
    saldo += p.manto - m.cuota;
    meses.push({ id: m.id, nombre: m.nombre + " " + m.anio, enCurso: !!m.enCurso, cuota: m.cuota, manto: red_(p.manto), agua: red_(p.agua), extra: red_(p.extra), diferencia: red_(p.manto - m.cuota) });
  });
  /* Meses futuros (pagos adelantados): están fuera de df.meses; se leen de las pestañas. */
  const adelantos = [];
  hojasMes_(SpreadsheetApp.getActive()).filter(i => i.id > hoyId).forEach(i => { const m = leerMes_(i), p = filaDe(m); if (p.manto > 0) adelantos.push({ id: m.id, nombre: m.nombre + " " + m.anio, manto: red_(p.manto) }); });
  const cfg = cfg_();
  return { ok: true, unidad: unidad, cuota: Number(cfg.cuota_mantenimiento) || 0, debe: red_(Math.max(0, -saldo)), aFavor: red_(Math.max(0, saldo)), adelantado: red_(adelantos.reduce((a, x) => a + x.manto, 0)),
    meses: meses.reverse(), adelantos: adelantos, inicial: inicial, correos: correosDeUnidad_(unidad).length, generado: new Date().toISOString() };
}

/* Menú: manda a cada correo registrado su clave (solo la de su unidad). Unidades sin correo quedan en la lista. */
function enviarClaves() {
  const cfg = cfg_(), sitio = sitio_(), nombreC = cfg.nombre_corto || cfg.nombre || "el condominio";
  const sinCorreo = [];
  let enviados = 0;
  filas_(HOJA_UNIDADES, 3).forEach(r => {
    const u = String(r[0]).trim(), c = String(r[2]).trim();
    if (!u || !c) return;
    const correos = correosDeUnidad_(u);
    if (!correos.length) { sinCorreo.push(u); return; }
    correos.forEach(x => { MailApp.sendEmail(x, "Tu clave para «Mi cuenta» · " + nombreC, "Hola:\n\nCon esta clave consultas el estado de cuenta de " + u + " (lo que debes mes por mes) en " + (sitio ? sitio + "/micuenta.html" : "la página «Mi cuenta» del sitio") + ":\n\n   " + c + "\n\nEs solo para tu unidad: no la compartas fuera de casa. Si la pierdes, pídela a la administración.", { name: remitente_() }); enviados++; });
  });
  aviso_("Claves de «Mi cuenta»", "Enviadas: " + enviados + " correo(s)." + (sinCorreo.length ? "\n\nSin correo registrado (dales su clave en persona; está en la pestaña Unidades, columna C): " + sinCorreo.join(", ") : ""));
  return { enviados: enviados, sinCorreo: sinCorreo };
}

/* Acuerdos vivos: lo que se decidió, por qué, quién (rol, no nombre) y en qué va. Los cumplidos
   de hace más de 6 meses dejan de mostrarse para que la lista no crezca sin fin. */
function acuerdos_() {
  const hoy = new Date(), viejo = Utilities.formatDate(new Date(hoy.getTime() - 183 * 864e5), ZONA, "yyyy-MM-dd");
  return filas_(HOJA_ACU, ENC_ACU.length).filter(f => String(f[1]).trim())
    .map(f => ({ fecha: fechaISO_(f[0]), acuerdo: limpio_(f[1], 200), porque: limpio_(f[2], 300), responsable: limpio_(f[3], 60), compromiso: fechaISO_(f[4]), estado: String(f[5] || "Pendiente").trim() || "Pendiente" }))
    .filter(a => !(/cumplido|cancelado/i.test(a.estado) && a.fecha && a.fecha < viejo))
    .sort((a, b) => (/cumplido|cancelado/i.test(a.estado) - /cumplido|cancelado/i.test(b.estado)) || (a.fecha < b.fecha ? 1 : -1)).slice(0, 40);
}

/* Privacidad: ¿con quién está compartida esta hoja? Si alguien que no es de la administración
   (por ejemplo, el dueño de la plantilla original) tiene acceso, el semáforo se pone en rojo. */
function accesosAjenos_() {
  const ss = SpreadsheetApp.getActive(), cfg = cfg_();
  const propias = [Session.getEffectiveUser().getEmail(), cfg.correo_condominio, cfg.reporte_copia, cfg.accesos_permitidos]
    .join(",").toLowerCase().split(/[\s,;]+/).filter(x => /@/.test(x));
  const ajenos = ss.getEditors().concat(ss.getViewers()).map(u => String(u.getEmail() || "").toLowerCase()).filter(x => x && propias.indexOf(x) < 0)
    .filter((x, i, a) => a.indexOf(x) === i);
  return ajenos.length ? [{ nivel: "alerta", texto: "Esta hoja está compartida con " + ajenos.join(", ") + ". Si no es de la administración, quítale el acceso: botón Compartir (arriba a la derecha) → junto a su nombre → Quitar acceso. Si sí lo es, agrégalo en Config → accesos_permitidos." }] : [];
}

/* ¿Se cruzan dos horarios? «Todo el día» choca con todo; tarde y noche comparten la tarde-noche;
   horarios escritos como «16:00 a 22:00» se comparan por horas. */
function chocaHorario_(a, b) {
  const na = norm_(a), nb = norm_(b);
  if (na === nb || /todoeldia|diacompleto/.test(na + nb)) return true;
  const rango = t => { if (/manana/.test(norm_(t))) return [9, 14]; if (/tarde/.test(norm_(t))) return [15, 20]; if (/noche/.test(norm_(t))) return [19, 23];
    const m = String(t).match(/(\d{1,2})(?::\d{2})?\s*(?:a|-|–)\s*(\d{1,2})/); return m ? [+m[1], +m[2]] : null; };
  const x = rango(a), y = rango(b);
  return x && y ? x[0] < y[1] && y[0] < x[1] : false;
}
