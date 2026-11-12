/* Simulador mínimo de Google Sheets / Apps Script para probar apps-script/Code.gs sin Google.
   Evalúa las fórmulas que usa la plantilla: =SUM(C1:C9), =C5+C6-C7, ='Hoja'!C16, =DATE(a,m,d). */
const vm = require("vm"), fs = require("fs");

function crearLibro(hoy) {
  const RealDate = Date;
  const ahora = new RealDate(hoy + "T12:00:00-06:00").getTime();
  class FakeDate extends RealDate { constructor(...a) { a.length ? super(...a) : super(ahora); } static now() { return ahora; } }
  const hojas = [];
  const libro = {
    hojas,
    getSheets: () => hojas.slice(),
    getSheetByName: n => hojas.find(h => h.getName() === n) || null,
    insertSheet: (n, i) => { if (hojas.some(h => h.getName() === n)) throw new Error("Ya existe " + n); const h = crearHoja(n, libro, FakeDate); i == null ? hojas.push(h) : hojas.splice(i, 0, h); return h; },
    setActiveSheet: h => h,
    _Date: FakeDate
  };
  return libro;
}

function colNum(s) { return s.toUpperCase().charCodeAt(0) - 64; }

function crearHoja(nombre, libro, FakeDate) {
  const celdas = {};           // "f,c" → valor crudo (fórmula si empieza con "=")
  let oculta = false;
  const h = {
    _celdas: celdas,
    getName: () => nombre,
    getLastRow: () => { let m = 0; Object.keys(celdas).forEach(k => { const v = celdas[k]; if (v !== "" && v != null) m = Math.max(m, +k.split(",")[0]); }); return m; },
    getRange: (a, b, c, d) => {
      if (typeof a === "string") {
        if (/^[A-Z]:[A-Z]$/.test(a)) return rango(h, 1, colNum(a[0]), 1000, 1);
        const m = /^([A-Z])(\d+)$/.exec(a); return rango(h, +m[2], colNum(m[1]), 1, 1);
      }
      return rango(h, a, b, c || 1, d || 1);
    },
    appendRow: f => { const r = h.getLastRow() + 1; f.forEach((v, i) => { celdas[r + "," + (i + 1)] = v; }); },
    insertRowBefore: r => { const nuevo = {}; Object.keys(celdas).forEach(k => { const [f, c] = k.split(",").map(Number); nuevo[(f >= r ? f + 1 : f) + "," + c] = celdas[k]; }); Object.keys(celdas).forEach(k => delete celdas[k]); Object.assign(celdas, nuevo); },
    clear: () => { Object.keys(celdas).forEach(k => delete celdas[k]); },
    setFrozenRows: () => {}, setColumnWidth: () => {},
    hideSheet: () => { oculta = true; }, showSheet: () => { oculta = false; }, isSheetHidden: () => oculta,
    _valor: (f, c, pila) => evaluar(celdas[f + "," + c], libro, h, pila || 0, FakeDate)
  };
  return h;
}

function rango(h, fila, col, nf, nc) {
  const mat = fn => Array.from({ length: nf }, (_, r) => Array.from({ length: nc }, (_, c) => fn(fila + r, col + c)));
  const crudo = (r, c) => h._celdas[r + "," + c];
  const r = {
    getValues: () => mat((f, c) => h._valor(f, c)),
    getValue: () => h._valor(fila, col),
    getFormula: () => { const v = crudo(fila, col); return typeof v === "string" && v[0] === "=" ? v : ""; },
    getFormulas: () => mat((f, c) => { const v = crudo(f, c); return typeof v === "string" && v[0] === "=" ? v : ""; }),
    getRichTextValues: () => mat(() => ({ getLinkUrl: () => null, getRuns: () => [] })),
    setValues: m => { m.forEach((f, i) => f.forEach((v, j) => { h._celdas[(fila + i) + "," + (col + j)] = v; })); return r; },
    setValue: v => { h._celdas[fila + "," + col] = v; return r; },
    setFormula: f => { h._celdas[fila + "," + col] = f; return r; }
  };
  ["setNumberFormat", "setFontWeight", "setFontSize", "setBackground"].forEach(k => { r[k] = () => r; });
  return r;
}

function evaluar(v, libro, hoja, pila, FakeDate) {
  if (v == null) return "";
  if (typeof v !== "string" || v[0] !== "=") return v;
  if (pila > 200) throw new Error("Referencia circular");
  const ref = (hojaN, c, f) => { const hh = hojaN ? libro.getSheetByName(hojaN) : hoja; if (!hh) throw new Error("#REF " + hojaN); const x = hh._valor(+f, colNum(c), pila + 1); return typeof x === "number" ? x : (x === "" ? 0 : x); };
  let e = v.slice(1);
  let m = /^DATE\((\d+),(\d+),(\d+)\)$/.exec(e);
  if (m) return new FakeDate(+m[1], +m[2] - 1, +m[3]);
  e = e.replace(/SUM\(([A-Z])(\d+):[A-Z](\d+)\)/g, (_, c, f1, f2) => { let s = 0; for (let f = +f1; f <= +f2; f++) { const x = ref(null, c, f); s += typeof x === "number" ? x : 0; } return "(" + s + ")"; });
  e = e.replace(/'([^']+)'!([A-Z])(\d+)/g, (_, n, c, f) => "(" + ref(n, c, f) + ")");
  e = e.replace(/([A-Za-zÁÉÍÓÚÑáéíóúñ]+(?: \d{4})?)!([A-Z])(\d+)/g, (_, n, c, f) => "(" + ref(n, c, f) + ")");
  e = e.replace(/\b([A-Z])(\d+)\b/g, (_, c, f) => "(" + ref(null, c, f) + ")");
  if (!/^[\d\s.+\-()eE]*$/.test(e)) throw new Error("Fórmula no soportada: " + v);
  return Function("return " + e)();
}

function cargar(rutas, libro, opciones) {
  opciones = opciones || {};
  const cache = {}, props = {}, correos = [], disparadores = [], archivos = [];
  const ctx = {
    console, JSON, Math, Object, Array, String, Number, parseInt, parseFloat, isFinite, encodeURIComponent, RegExp, Error,
    Date: libro._Date,
    Logger: { log: s => { if (opciones.verLog) console.log("[log]", s); } },
    SpreadsheetApp: { getActive: () => libro, getUi: () => { throw new Error("sin interfaz"); } },
    Session: { getEffectiveUser: () => ({ getEmail: () => "admin@ejemplo.mx" }) },
    MailApp: { sendEmail: (para, asunto, cuerpo, o) => correos.push({ para, asunto, cuerpo, o: o || {} }) },
    DriveApp: (() => { const carpeta = n => ({ getName: () => n, getFoldersByName: () => ({ hasNext: () => false }), createFolder: x => carpeta(x), createFile: b => { archivos.push(b); return { getUrl: () => "https://drive/" + archivos.length }; } }); return { getFoldersByName: () => ({ hasNext: () => false }), createFolder: n => carpeta(n) }; })(),
    CacheService: { getScriptCache: () => ({ get: k => cache[k] || null, put: (k, v) => { cache[k] = v; }, remove: k => { delete cache[k]; } }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    ScriptApp: {
      getProjectTriggers: () => disparadores.slice(),
      deleteTrigger: t => disparadores.splice(disparadores.indexOf(t), 1),
      newTrigger: fn => { const t = { fn, getHandlerFunction: () => fn }; const ch = { timeBased: () => ch, onMonthDay: d => { t.dia = d; return ch; }, atHour: () => ch, inTimezone: () => ch, create: () => { disparadores.push(t); return t; } }; return ch; },
      getService: () => ({ getUrl: () => opciones.url || "" })
    },
    ContentService: { MimeType: { JSON: "json" }, createTextOutput: s => ({ setMimeType: () => ({ texto: s }) }) },
    HtmlService: { createHtmlOutput: () => ({ setWidth: () => ({ setHeight: () => ({}) }) }) },
    Utilities: {
      formatDate: (d, tz, f) => { const x = new Date(d.getTime() - 6 * 3600e3).toISOString(); return f === "yyyy-MM" ? x.slice(0, 7) : x.slice(0, 10); },
      newBlob: (html) => ({ getAs: () => ({ html, setName(n) { this.nombre = n; return this; } }) })
    }
  };
  vm.createContext(ctx);
  [].concat(rutas).forEach(r => vm.runInContext(fs.readFileSync(r, "utf8"), ctx, { filename: r }));
  ctx._correos = correos; ctx._disparadores = disparadores; ctx._props = props; ctx._archivos = archivos;
  return ctx;
}

module.exports = { crearLibro, cargar };
