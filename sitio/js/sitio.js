/* Condominio digital · arma el sitio a partir de js/condominio.js.
   Cada página trae <body data-pagina="…"> y un <main id="pagina">; este archivo pone el
   encabezado, el menú (según los módulos elegidos), los colores de marca, el pie y el
   contenido de las páginas informativas. Así, cambiar un dato es cambiar condominio.js. */
(function () {
  "use strict";
  /* Vista previa dentro del configurador: toma la configuración que se está editando. */
  let VISTA = false;
  try { if (/[?&]vista=/.test(location.search) && window.parent !== window && window.parent.CONDOMINIO_VISTA) { window.CONDOMINIO = window.parent.CONDOMINIO_VISTA; VISTA = true; } } catch (_) { /* otro origen */ }
  const C = window.CONDOMINIO || {};
  const co = C.condominio || {}, cb = C.cobros || {}, vida = C.vida || {}, ct = C.contacto || {};
  const mods = (C.comunicacion && C.comunicacion.modulos) || ["finanzas"];
  const tiene = m => mods.indexOf(m) >= 0;
  const pagina = document.body.dataset.pagina || "inicio";
  const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const $ = v => "$" + Math.round(Number(v) || 0).toLocaleString("es-MX");
  const nombre = co.nombre || "Nuestro condominio", corto = co.nombreCorto || nombre;
  const unidad = (C.unidades && C.unidades.nombre) || "unidad";

  /* ---------- Colores: la marca y un texto que se lea encima ---------- */
  function luminancia(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || ""); if (!m) return 0.2;
    const c = [0, 2, 4].map(i => parseInt(m[1].substr(i, 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  const raiz = document.documentElement.style;
  if (co.colorPrincipal) raiz.setProperty("--marca", co.colorPrincipal);
  if (co.colorSecundario) raiz.setProperty("--marca-2", co.colorSecundario);
  raiz.setProperty("--sobre-marca", luminancia(co.colorPrincipal || "#0f6b5a") > 0.45 ? "#111" : "#fff");
  const meta = document.querySelector('meta[name="theme-color"]') || document.head.appendChild(Object.assign(document.createElement("meta"), { name: "theme-color" }));
  meta.content = co.colorPrincipal || "#0f6b5a";
  if (co.logo) { const l = document.createElement("link"); l.rel = "icon"; l.href = co.logo; document.head.appendChild(l); }

  /* ---------- Menú ---------- */
  const PAGINAS = [
    ["inicio", "index.html", "Inicio", true],
    ["finanzas", "finanzas.html", "Finanzas", tiene("finanzas")],
    ["pagar", "pagar.html", "Cómo pagar", true],
    ["reglas", "reglas.html", "Reglas y áreas", tiene("reglamento") || tiene("areas") || tiene("sanciones") || tiene("avisos") || tiene("asambleas")],
    ["ayuda", "ayuda.html", "Ayuda", true]
  ].filter(p => p[3]);
  const iniciales = corto.split(/\s+/).filter(w => w.length > 2 || /^[A-Z]/.test(w)).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "C";
  const tituloPag = { inicio: "", finanzas: "Finanzas", pagar: "Cómo pagar", reglas: "Reglas y áreas comunes", ayuda: "Ayuda", privacidad: "Aviso de privacidad" }[pagina];
  document.title = (tituloPag ? tituloPag + " · " : "") + nombre;

  const header = document.createElement("header");
  header.className = "sd-header";
  header.innerHTML = '<div class="inner"><a class="sd-marca" href="index.html' + (VISTA ? "?vista=1" : "") + '">' +
    (co.logo ? '<img class="sd-logo" src="' + esc(co.logo) + '" alt="">' : '<span class="sd-iniciales" aria-hidden="true">' + esc(iniciales) + "</span>") +
    '<span class="sd-nombre">' + esc(corto) + "</span></a>" +
    '<button class="sd-menu-btn" type="button" aria-expanded="false" aria-controls="sd-nav">Menú</button>' +
    '<nav class="sd-nav" id="sd-nav">' + PAGINAS.map(p => '<a href="' + p[1] + (VISTA ? "?vista=1" : "") + '"' + (p[0] === pagina ? ' class="activo" aria-current="page"' : "") + ">" + p[2] + "</a>").join("") + "</nav></div>";
  document.body.insertBefore(header, document.body.firstChild);
  const btn = header.querySelector(".sd-menu-btn"), nav = header.querySelector(".sd-nav");
  btn.addEventListener("click", () => { const a = nav.classList.toggle("abierto"); btn.setAttribute("aria-expanded", a); });

  const footer = document.createElement("footer");
  footer.className = "sd-footer";
  footer.innerHTML = '<div class="inner"><span>' + esc(nombre) + (co.ciudad ? " · " + esc(co.ciudad) : "") + "</span>" +
    '<a href="privacidad.html">Aviso de privacidad</a>' + (ct.correo ? '<a href="mailto:' + esc(ct.correo) + '">' + esc(ct.correo) + "</a>" : "") +
    "<span>Las cifras se publican siempre agregadas, sin identificar a nadie.</span></div>";
  document.body.appendChild(footer);

  /* ---------- Contenido de cada página ---------- */
  const main = document.getElementById("pagina");
  const tarjeta = (href, ico, t, d) => '<a class="sd-tarjeta" href="' + href + (VISTA ? "?vista=1" : "") + '"><div class="ico">' + ico + "</div><b>" + esc(t) + "</b><span>" + d + "</span></a>";
  const recargo = () => {
    const r = cb.recargo || {};
    if (!r.tipo || r.tipo === "ninguno") return "";
    return r.tipo === "porcentaje" ? r.valor + "% de recargo" : r.tipo === "fijo" ? $(r.valor) + " de recargo" : esc(r.valor || r.tipo);
  };

  const VISTAS = {
    inicio() {
      const prox = proximaFecha();
      return '<section class="sd-hero"><h1>' + esc(nombre) + "</h1><p>" + esc([co.ciudad, co.estado].filter(Boolean).join(", ")) + (C.unidades && C.unidades.total ? " · " + C.unidades.total + " " + plural(unidad, C.unidades.total) : "") + "</p></section>" +
        '<div class="sd-rejilla">' +
        (tiene("finanzas") ? tarjeta("finanzas.html", "📊", "Las cuentas", "cuánto entró, en qué se gastó y cuánto hay en caja, mes por mes") : "") +
        tarjeta("pagar.html", "💳", "Cómo pagar", "cuota de " + $(cb.cuota) + " antes del día " + (cb.diaLimite || 10) + " · CLABE para copiar") +
        (PAGINAS.some(p => p[0] === "reglas") ? tarjeta("reglas.html", "📘", "Reglas y áreas comunes", "horarios, reglamento y fechas importantes") : "") +
        tarjeta("ayuda.html", "💬", "Ayuda", "preguntas frecuentes y a quién escribir") + "</div>" +
        (prox ? '<h2>Próxima fecha</h2><div class="sd-tarjeta"><b>' + esc(prox.evento) + "</b><span>" + esc(prox.texto) + "</span></div>" : "") +
        (C.sitio && C.sitio.ejemplo ? '<p class="sd-nota" style="margin-top:18px">Este sitio muestra <b>datos de ejemplo</b> hasta que la administración conecte su hoja de captura.</p>' : "");
    },
    pagar() {
      const b = cb.banco || {};
      const clabe = String(b.clabe || "").replace(/\D/g, "");
      const formas = (cb.formasPago || []).join(", ");
      return '<h1 class="sd-titulo">Cómo pagar</h1><p class="sd-sub">Cuota mensual de mantenimiento por ' + esc(unidad) + ".</p>" +
        '<div class="sd-rejilla"><div class="sd-tarjeta"><span>Cuota mensual</span><div class="sd-dato">' + $(cb.cuota) + '</div><span>antes del día ' + (cb.diaLimite || 10) + " de cada mes" + (recargo() ? " · después: " + recargo() : "") + "</span></div>" +
        (clabe ? '<div class="sd-tarjeta"><span>Transferencia' + (b.banco ? " · " + esc(b.banco) : "") + '</span><div class="sd-copiar"><span class="sd-clabe" id="clabe">' + clabe.replace(/(\d{4})(?=\d)/g, "$1 ") + '</span></div><span>' + (b.titular ? "A nombre de " + esc(b.titular) + "<br>" : "") + (b.referencia ? "Referencia: <strong>" + esc(b.referencia) + "</strong>" : "") + '</span><p style="margin:10px 0 0"><button class="btn primario" type="button" id="copiarClabe">Copiar CLABE</button></p></div>' : "") +
        "</div>" +
        ((cb.adicionales || []).length ? "<h2>Otras cuotas</h2><ul class=\"sd-lista\">" + cb.adicionales.map(a => "<li><b>" + esc(a.concepto) + "</b> · " + $(a.monto) + (a.periodo ? ' <span class="sd-chip">' + esc(a.periodo) + "</span>" : "") + "</li>").join("") + "</ul>" : "") +
        (cb.agua && cb.agua.modalidad && cb.agua.modalidad !== "incluida en la cuota" ? "<h2>El agua</h2><p>Se paga aparte: <b>" + esc(cb.agua.modalidad) + "</b>." + (cb.agua.detalle ? " " + esc(cb.agua.detalle) : "") + "</p>" : "") +
        (cb.casaClub && Number(cb.casaClub.renta) ? "<h2>Casa club</h2><p>Renta: <b>" + $(cb.casaClub.renta) + "</b>" + (Number(cb.casaClub.deposito) ? " · depósito " + $(cb.casaClub.deposito) : "") + ".</p>" : "") +
        '<p class="sd-nota" style="margin-top:20px">' + (formas ? "Formas de pago: " + esc(formas) + ". " : "") + "Guarda tu comprobante" + (ct.correo ? ' y envíalo a <a href="mailto:' + esc(ct.correo) + '">' + esc(ct.correo) + "</a>" : "") + ". Un pago adelantado cuenta para el mes que cubre.</p>";
    },
    reglas() {
      let h = '<h1 class="sd-titulo">Reglas y áreas comunes</h1><p class="sd-sub">Lo esencial para convivir bien.</p>';
      const areas = (vida.areas || []).filter(a => a.nombre);
      if (areas.length) h += "<h2>Áreas comunes</h2><div class=\"sd-rejilla\">" + areas.map(a => '<div class="sd-tarjeta"><b>' + esc(a.nombre) + "</b><span>" + [a.horario ? "🕘 " + esc(a.horario) : "", a.reglas ? esc(a.reglas) : "", a.reserva === "sí" ? "Se reserva con la administración" + (Number(a.costo) ? " · " + $(a.costo) : "") : ""].filter(Boolean).join("<br>") + "</span></div>").join("") + "</div>";
      const fechas = (vida.fechas || []).filter(f => f.evento);
      if (fechas.length) h += "<h2>Fechas importantes</h2><ul class=\"sd-lista\">" + fechas.map(f => "<li><b>" + esc(f.evento) + "</b>" + (f.fecha ? ' <span class="sd-chip">' + esc(fechaTxt(f.fecha)) + "</span>" : ' <span class="sd-chip">fecha por definir</span>') + (f.aviso ? "<br><span style=\"color:var(--ink-2)\">" + esc(f.aviso) + "</span>" : "") + "</li>").join("") + "</ul>";
      const sanc = (vida.sanciones || []).filter(s => s.falta || s.conducta);
      if (sanc.length) h += "<h2>Sanciones</h2><ul class=\"sd-lista\">" + sanc.map(s => "<li><b>" + esc(s.falta || s.conducta) + "</b>" + (s.sancion ? " · " + esc(s.sancion) : "") + (s.fundamento ? '<br><span style="color:var(--ink-2)">Fundamento: ' + esc(s.fundamento) + "</span>" : "") + "</li>").join("") + "</ul>";
      if (vida.reglamento && !/^no/i.test(vida.reglamento)) h += "<h2>Reglamento</h2><p>El condominio cuenta con reglamento" + (/protocol/i.test(vida.reglamento) ? " protocolizado ante notario" : "") + ". Pide tu copia a la administración" + (ct.correo ? ' en <a href="mailto:' + esc(ct.correo) + '">' + esc(ct.correo) + "</a>" : "") + ".</p>";
      return h;
    },
    ayuda() {
      const preguntas = [
        ["¿De dónde salen las cifras de finanzas?", "De la hoja de captura que lleva la administración. El sitio la lee directamente; si algo no cuadra, se corrige en la hoja y se refleja aquí en unos minutos."],
        ["¿Por qué no aparece quién debe?", "Por protección de datos personales. La morosidad se publica siempre agregada: cuánto se debe en total y cuántas " + plural(unidad, 2) + ", nunca cuáles."],
        ["Pagué por adelantado, ¿dónde lo veo?", "Los pagos adelantados se cuentan como saldo a favor y aparecen en la sección de morosidad como «adelantos», sin identificar a nadie."],
        ["¿Cada cuándo se actualiza?", "Cada vez que la administración captura. Al abrir Finanzas, la etiqueta «En vivo» indica que estás viendo la hoja actual."],
        tiene("reporte") ? ["¿Llega un reporte por correo?", "Sí: el día " + ((C.comunicacion && C.comunicacion.diaReporte) || 10) + " de cada mes se envía el resumen del mes anterior en PDF. Si quieres recibirlo, pide a la administración que agregue tu correo."] : null,
        ["Encontré un error, ¿qué hago?", "Escribe a la administración con el mes y el dato. No compartas datos de otros vecinos."]
      ].filter(Boolean);
      const resp = (ct.responsables || []).filter(r => r.rol || r.correo);
      return '<h1 class="sd-titulo">Ayuda</h1><p class="sd-sub">Preguntas frecuentes de vecinas y vecinos.</p>' +
        preguntas.map(p => '<details class="sd-faq"><summary>' + esc(p[0]) + "</summary><p>" + esc(p[1]) + "</p></details>").join("") +
        "<h2>Contacto</h2><ul class=\"sd-lista\">" + (ct.correo ? '<li><b>Administración</b>' + (ct.empresa ? " · " + esc(ct.empresa) : "") + '<br><a href="mailto:' + esc(ct.correo) + '">' + esc(ct.correo) + "</a>" + (ct.horario ? " · " + esc(ct.horario) : "") + "</li>" : "") +
        resp.map(r => "<li><b>" + esc(r.rol || "") + "</b>" + (r.correo ? '<br><a href="mailto:' + esc(r.correo) + '">' + esc(r.correo) + "</a>" : "") + "</li>").join("") + "</ul>";
    },
    privacidad() {
      const resp = ct.empresa ? esc(ct.empresa) + ", administradora de " + esc(nombre) : "La administración de " + esc(nombre) + " (" + esc(ct.administra || "mesa directiva") + ")";
      return '<h1 class="sd-titulo">Aviso de privacidad simplificado</h1><p class="sd-sub">Conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.</p>' +
        '<div class="sd-tarjeta"><p><b>Responsable.</b> ' + resp + ".</p>" +
        "<p><b>Qué datos usamos.</b> Para administrar el condominio usamos el número de " + esc(unidad) + ", los pagos de cuotas y, si lo das, tu correo para enviarte el reporte mensual. Estos datos están en la hoja privada de la administración.</p>" +
        "<p><b>Qué publicamos.</b> En este sitio, en correos colectivos y en imágenes para grupos solo aparecen <b>cifras agregadas</b>: totales de ingresos y gastos, y cuánto se debe en conjunto y en cuántas " + plural(unidad, 2) + ". Nunca nombres, números de " + esc(unidad) + " ni montos de una persona.</p>" +
        "<p><b>Correos.</b> El reporte mensual se envía con copia oculta. Puedes dejar de recibirlo respondiendo al correo.</p>" +
        "<p><b>Tus derechos (ARCO).</b> Puedes pedir acceso, rectificación, cancelación u oposición" + (ct.correo ? ' escribiendo a <a href="mailto:' + esc(ct.correo) + '">' + esc(ct.correo) + "</a>" : " con la administración") + ".</p>" +
        '<p style="margin:0;color:var(--muted);font-size:.85rem">Última actualización: ' + esc(fechaTxt((C.sitio && C.sitio.generado) || "")) + ".</p></div>";
    }
  };

  function plural(p, n) { if (n === 1) return p; return /[aeiou]$/i.test(p) ? p + "s" : p + "es"; }
  function fechaTxt(iso) {
    const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(iso || ""); if (!m) return iso || "";
    const MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    return (m[3] ? parseInt(m[3], 10) + " de " : "") + MES[parseInt(m[2], 10) - 1] + " de " + m[1];
  }
  function proximaFecha() {
    const hoy = new Date().toISOString().slice(0, 10);
    const f = (vida.fechas || []).filter(x => x.evento && x.fecha && x.fecha >= hoy).sort((a, b) => a.fecha < b.fecha ? -1 : 1)[0];
    return f ? { evento: f.evento, texto: fechaTxt(f.fecha) + (f.aviso ? " · " + f.aviso : "") } : null;
  }

  if (main && VISTAS[pagina]) main.innerHTML = VISTAS[pagina]();
  const bc = document.getElementById("copiarClabe");
  if (bc) bc.addEventListener("click", async () => {
    const t = String((cb.banco || {}).clabe || "").replace(/\D/g, "");
    try { await navigator.clipboard.writeText(t); bc.textContent = "✓ Copiada"; }
    catch (_) { const r = document.createRange(); r.selectNodeContents(document.getElementById("clabe")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); bc.textContent = "Selecciónala y cópiala"; }
    setTimeout(() => { bc.textContent = "Copiar CLABE"; }, 2500);
  });
  window.SITIO = { C: C, tiene: tiene, esc: esc };
})();
