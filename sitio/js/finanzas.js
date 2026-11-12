/* Condominio digital · sección de finanzas.
   Toma la dirección /exec del Apps Script de js/condominio.js (sitio.api), traduce su JSON al
   modelo de js/tablero.js y lo dibuja. Sin dirección, muestra DATOS DE EJEMPLO marcados.
   Lo que entrega el script lo puede leer cualquiera con la URL: por eso solo trae agregados.
   La clave del sitio (sitio.claveHash, SHA-256) es cortesía, no seguridad. */
(function () {
  "use strict";
  const C = window.CONDOMINIO || {};
  const S = C.sitio || {}, co = C.condominio || {}, cb = C.cobros || {};
  const n = v => (typeof v === "number" && isFinite(v) ? v : Number(v) || 0);
  const NOM = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const aguaAparte = ["medidor individual", "derrama", "pipas"].indexOf((cb.agua || {}).modalidad) >= 0;
  const clave = "cd-" + (co.nombreCorto || co.nombre || "condominio").toLowerCase().replace(/[^a-z0-9]+/g, "");

  /* ---------- Portón ---------- */
  const gate = document.getElementById("gate"), content = document.getElementById("content");
  async function sha256(t) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, "0")).join(""); }
  document.getElementById("gateTitulo").textContent = "Las cuentas de " + (co.nombreCorto || co.nombre || "nuestro condominio");
  document.getElementById("gateForm").addEventListener("submit", async e => {
    e.preventDefault();
    const err = document.getElementById("gateError"), inp = document.getElementById("gateKey");
    if (!window.crypto || !crypto.subtle) { err.textContent = "Abre el sitio desde su dirección https para validar la clave."; return; }
    if ((await sha256(inp.value.trim())) === S.claveHash) abrir();
    else { err.textContent = "Clave incorrecta. Pídela a la administración."; inp.value = ""; inp.focus(); }
  });

  /* ---------- Del JSON del script al modelo del tablero ---------- */
  const items = l => (l || []).map(it => {
    const partes = String(it[0] || "").split(" · ");
    return { concepto: partes[0], detalle: partes.slice(1).join(" · "), monto: n(it[1]), liga: it[2] || "" };
  });
  function mes(o, vivo) {
    const num = parseInt(o.id.slice(5), 10), ing = o.ingresos || {}, egr = o.egresos || {}, det = o.detalle || {};
    const ingresos = [{ nombre: "Cuotas de mantenimiento", monto: n(ing.manto) }];
    if (aguaAparte || n(ing.agua)) ingresos.push({ nombre: "Agua", monto: n(ing.agua) });
    if (n(ing.extra)) ingresos.push({ nombre: "Otros ingresos", monto: n(ing.extra) });
    const aguaGasto = items(det.fijos).filter(it => /^agua\b/i.test(it.concepto)).reduce((a, b) => a + b.monto, 0);
    return {
      id: o.id, anio: parseInt(o.id.slice(0, 4), 10), nombre: o.nombre || NOM[num - 1], corto: o.corto || NOM[num - 1].slice(0, 3), vivo: !!vivo, enCurso: !!o.enCurso,
      saldoIni: n(o.saldoIni), saldoFin: n(o.saldoFin), ingresos: ingresos,
      grupos: [
        { clave: "fijos", nombre: "Gastos fijos", monto: n(egr.fijos), cuota: true, items: items(det.fijos) },
        { clave: "variables", nombre: "Gastos variables", monto: n(egr.variables), cuota: true, items: items(det.variables) }
      ],
      cobranza: { pagaron: n((o.cobranza || {}).pagaron), pct: n((o.cobranza || {}).pct) },
      mora: o.mora ? { acumulada: n(o.mora.acumulada), unidades: n(o.mora.unidades), adelantos: n(o.mora.adelantos), unidadesAdelanto: n(o.mora.unidadesAdelanto) } : null,
      agua: aguaAparte ? { cobrado: n(ing.agua), pagado: aguaGasto } : null,
      indicadores: []
    };
  }
  function modelo(j, vivo) {
    const meses = (j.meses || []).filter(m => /^\d{4}-\d{2}$/.test(String(m.id || ""))).map(m => mes(m, vivo)).sort((a, b) => a.id.localeCompare(b.id));
    const a = meses[0], b = meses[meses.length - 1];
    return {
      unidades: n(j.condominio && j.condominio.unidades) || n(C.unidades && C.unidades.total), cuota: n(j.condominio && j.condominio.cuota) || n(cb.cuota),
      meses: meses,
      proyectos: (j.proyectos || []).map(p => ({ nombre: p.nombre, estado: p.estado, monto: null, montoEtiqueta: "", avance: p.avance || "", liga: p.liga || "" })),
      fuente: { vivo: vivo, generado: vivo ? j.generado : null, texto: j.ejemplo ? "DATOS DE EJEMPLO, no son cifras reales" : a ? a.nombre + " a " + b.nombre.toLowerCase() + " de " + b.anio : "" }
    };
  }
  async function vivo() {
    const r = await fetch(S.api + (S.api.indexOf("?") >= 0 ? "&" : "?") + "t=" + Date.now(), { cache: "no-store", redirect: "follow" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    if (!j || !j.ok) throw new Error((j && j.error) || "respuesta sin datos");
    if (!(j.meses || []).length) throw new Error("la hoja todavía no tiene meses capturados");
    return modelo(j, true);
  }

  /* ---------- Opciones del tablero ---------- */
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rubros = ((C.gastos && C.gastos.fijos) || []).map(g => String(g.concepto || "").trim()).filter(Boolean).slice(0, 7)
    .map(c => ({ nombre: c, re: new RegExp("^" + reEsc(c), "i") }));
  const OPCIONES = {
    clave: clave,
    sexto: aguaAparte ? "agua" : "reserva",
    rubros: rubros,
    agua: aguaAparte ? { titulo: "El agua", frase: "de lo que se pagó de agua se cubrió con lo cobrado", cobro: "con el cobro de agua", gasto: "en agua", tile: "cobrado vs. pagado", explica: "El agua se cobra aparte de la cuota de mantenimiento (" + cb.agua.modalidad + ").", nota: "" } : null,
    textos: {
      titulo: "Las cuentas de " + (co.nombreCorto || co.nombre || "nuestro condominio"),
      notaCuota: aguaAparte ? "sin contar el agua, que se paga aparte" : "",
      notaProyectos: "Trabajos en evaluación o en curso, según la hoja de la administración.",
      privacidad: "Por protección de datos personales, la morosidad se informa siempre agregada: montos y número de unidades, sin identificar a nadie.",
      acerca: "<h3>De dónde salen los datos</h3><p>De la hoja de captura mensual de la administración: una pestaña por mes con cobros, gastos fijos y variables, cada gasto con la liga a su comprobante cuando existe.</p>" +
        "<p>Cuando aparece <b>En vivo</b>, la página lee la hoja cada vez que se abre (un cambio puede tardar hasta cinco minutos en verse). Un mes aparece en cuanto su pestaña tiene cobros o gastos; un pago adelantado no se muestra como mes, se cuenta como saldo a favor.</p>"
    }
  };

  let tablero = null;
  function abrir() {
    gate.hidden = true; content.hidden = false;
    try { sessionStorage.setItem(clave, "1"); } catch (_) { /* sin almacenamiento */ }
    if (tablero) return;
    tablero = Tablero.montar(document.getElementById("tablero"), OPCIONES);
    const aviso = document.getElementById("aviso");
    if (!S.api) {
      aviso.hidden = false;
      aviso.innerHTML = "<b>Datos de ejemplo.</b> Este tablero todavía no está conectado a la hoja de la administración; las cifras son inventadas para mostrar cómo se verá.";
      tablero.actualizar(modelo(window.datosEjemplo(C), false));
      return;
    }
    vivo().then(m => tablero.actualizar(m)).catch(e => {
      console.warn("[Finanzas] " + e.message);
      document.getElementById("tablero").innerHTML = '<div class="sd-tarjeta" style="text-align:center"><div class="ico">🔌</div><b>No pudimos leer la hoja en este momento</b><span>Intenta de nuevo en unos minutos. (' + window.SITIO.esc(e.message) + ")</span></div>";
    });
  }
  let ya = null;
  try { ya = sessionStorage.getItem(clave); } catch (_) { /* sin almacenamiento */ }
  if (!S.claveHash || ya === "1") abrir();
})();
