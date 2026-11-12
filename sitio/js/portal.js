/* Condominio digital · portal de vecinos: avisos, «lo que se está atendiendo», reservas,
   documentos, contactos útiles y formularios (correo, reportar, reservar). Lee y escribe en
   el Apps Script de la hoja (sitio.api). Lo público es impersonal: nunca unidad, nombre ni correo. */
(function () {
  "use strict";
  const S = window.SITIO || {}, C = S.C || window.CONDOMINIO || {}, esc = S.esc || (x => String(x)), API = (C.sitio && C.sitio.api) || "";
  const $ = id => document.getElementById(id);
  const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  const corta = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? parseInt(m[3], 10) + " " + MES[+m[2] - 1] : ""; };
  const diaSemana = iso => { const d = new Date(iso + "T12:00:00"); return isNaN(d) ? "" : DIAS[d.getDay()]; };
  const hoy = new Date().toISOString().slice(0, 10);
  const unidad = (C.unidades && C.unidades.nombre) || "unidad";
  const ERR = { correo: "Revisa tu correo: parece que está mal escrito.", unidad: "No encontramos esa " + unidad + ". Escríbela como aparece en tu recibo (por ejemplo «A 01»).", espera: "Recibimos varios intentos seguidos. Espera un rato e intenta de nuevo.", descripcion: "Cuéntanos un poco más: qué pasa y dónde.", area: "Elige un área de la lista.", dia: "Elige un día de hoy en adelante.", ocupado: "Ese día y horario ya está apartado. Elige otro.", folio: "Escribe el folio como te llegó (por ejemplo S-0007).", "no encontrado": "No encontramos ese folio (o el correo no coincide).", lejos: "Solo se reserva hasta 90 días antes.", tope: "Tu " + unidad + " ya tiene 2 reservas activas.", cerrada: "Esta consulta ya cerró.", opcion: "Elige una opción.", consulta: "Esa consulta ya no está activa." };
  const $0 = v => (v < 0 ? "−$" : "$") + Math.round(Math.abs(v)).toLocaleString("es-MX");

  /* Datos de ejemplo cuando el sitio aún no tiene la dirección de su hoja. */
  function ejemplo() {
    const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
    const areas = ((C.vida && C.vida.areas) || []).filter(a => a.nombre && /^s/i.test(String(a.reserva || ""))).map(a => a.nombre);
    return { ok: true, ejemplo: true,
      avisos: [{ fecha: d(-2), titulo: "Mantenimiento de la cisterna (ejemplo)", texto: "El jueves de 9:00 a 13:00 no habrá agua en áreas comunes.", importante: true }, { fecha: d(-6), titulo: "Bienvenidos al sitio (ejemplo)", texto: "Aquí verás los avisos de la administración.", importante: false }],
      solicitudes: { abiertas: 2, resueltas30: 5, lista: [{ folio: "S-0012", fecha: d(-1), categoria: "Mantenimiento", lugar: "Pasillo norte", estatus: "En proceso", respuesta: "Ya se pidió el material." }, { folio: "S-0011", fecha: d(-4), categoria: "Limpieza", lugar: "Estacionamiento", estatus: "Resuelta", respuesta: "" }] },
      reservas: areas.length ? [{ area: areas[0], dia: d(5), horario: "16:00 a 22:00", estatus: "ocupado" }] : [], areasReservables: areas,
      categorias: ["Mantenimiento", "Limpieza", "Seguridad", "Ruido o convivencia", "Agua", "Áreas comunes", "Sugerencia", "Otro"],
      documentos: [{ titulo: "Reglamento del condominio (ejemplo)", categoria: "Reglamento", liga: "#", fecha: "" }],
      contactos: [{ servicio: "Emergencias", nombre: "911", contacto: "911", nota: "24 horas" }], correos: { unidades: 6, total: (C.unidades && C.unidades.total) || 0 } };
  }
  let cache = null;
  async function portal() {
    if (cache) return cache;
    if (!API) return (cache = ejemplo());
    try { const g = JSON.parse(sessionStorage.getItem("cd.portal") || "null"); if (g && Date.now() - g.t < 120000) return (cache = g.d); } catch (_) { /* sin almacenamiento */ }
    const r = await fetch(API + "?accion=portal&t=" + Date.now(), { cache: "no-store" });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || "sin datos");
    try { sessionStorage.setItem("cd.portal", JSON.stringify({ t: Date.now(), d: j })); } catch (_) { /* sin almacenamiento */ }
    return (cache = j);
  }
  async function enviar(cuerpo) {
    if (!API) return { ok: false, error: "Este sitio todavía no está conectado a la hoja de la administración (modo de ejemplo)." };
    const r = await fetch(API, { method: "POST", body: JSON.stringify(cuerpo), headers: { "Content-Type": "text/plain;charset=utf-8" } });
    try { sessionStorage.removeItem("cd.portal"); } catch (_) { /* sin almacenamiento */ }
    return r.json();
  }
  const msg = (el, ok, t) => { el.hidden = false; el.className = "sd-msg " + (ok ? "ok" : "mal"); el.innerHTML = t; };
  const errTxt = j => ERR[j.error] || esc(j.error || "No se pudo. Intenta de nuevo.");
  const estatusCls = e => /resuelta|confirmada/i.test(e) ? "ok" : /proceso|confirmar|apartado/i.test(e) ? "medio" : /no procede|rechaz|cancel/i.test(e) ? "gris" : "nuevo";
  const nota = j => j && j.ejemplo ? '<p class="sd-nota" style="margin-top:10px">Datos de <b>ejemplo</b>: el sitio todavía no está conectado a la hoja.</p>' : "";
  const campoUnidad = () => '<label class="sd-lbl" for="fUnidad">Tu ' + esc(unidad) + '</label><input id="fUnidad" type="text" maxlength="20" autocomplete="off" placeholder="como aparece en tu recibo" required>';
  const trampa = '<div class="sd-trampa" aria-hidden="true"><label for="fWeb">No llenar</label><input id="fWeb" type="text" tabindex="-1" autocomplete="off"></div>';
  const recordar = () => { try { const u = localStorage.getItem("cd.unidad"); if (u && $("fUnidad")) $("fUnidad").value = u; } catch (_) { /* sin almacenamiento */ } };
  const guardar = () => { try { localStorage.setItem("cd.unidad", $("fUnidad").value.trim()); } catch (_) { /* sin almacenamiento */ } };

  /* ---------- Inicio ---------- */
  function avisosHTML(j) {
    if (!j.avisos.length) return "";
    return '<section class="sd-avisos" aria-label="Avisos">' + j.avisos.slice(0, 4).map(a =>
      '<article class="sd-aviso' + (a.importante ? " imp" : "") + '"><div class="sd-aviso-f">' + (a.importante ? "📌 Importante · " : "") + esc(corta(a.fecha)) + "</div><h3>" + esc(a.titulo) + "</h3>" + (a.texto ? "<p>" + esc(a.texto) + "</p>" : "") + "</article>").join("") + "</section>";
  }
  function pulsoHTML(j) {
    const s = j.solicitudes, cc = j.correos, res = (j.reservas || []).filter(r => r.dia >= hoy).slice(0, 4);
    const rv = j.reserva && j.reserva.movimientos && j.reserva.movimientos.length ? j.reserva : null;
    let h = '<h2>Así vamos</h2><div class="sd-pulso">' +
      '<a class="sd-kpi" href="solicitud.html"><b>' + s.abiertas + "</b><span>" + (s.abiertas === 1 ? "reporte en atención" : "reportes en atención") + (s.diasRespuesta != null ? " · se resuelven " + (s.diasRespuesta < 1 ? "el mismo día" : "en ~" + Math.round(s.diasRespuesta) + (Math.round(s.diasRespuesta) === 1 ? " día" : " días")) : s.resueltas30 ? " · " + s.resueltas30 + " resueltos este mes" : "") + "</span></a>" +
      (rv ? '<a class="sd-kpi" href="finanzas.html#claridad"><b>' + $0(rv.saldo) + "</b><span>fondo de reserva" + (rv.meta ? " · " + Math.round(rv.saldo / rv.meta * 100) + "% de la meta" : "") + "</span>" + (rv.meta ? '<i style="--w:' + Math.min(100, Math.max(0, Math.round(rv.saldo / rv.meta * 100))) + '%"></i>' : "") + "</a>" : "") +
      (cc.total ? '<a class="sd-kpi" href="correo.html"><b>' + cc.unidades + "/" + cc.total + "</b><span>" + esc(/[aeiou]$/i.test(unidad) ? unidad + "s" : unidad + "es") + " reciben el reporte</span><i style=\"--w:" + Math.round(cc.unidades / cc.total * 100) + '%"></i></a>' : "") + "</div>";
    const mv = j.mes;
    if (mv && mv.unidades && mv.pagaron >= mv.unidades) {
      const t = "🎉 ¡Mes verde en " + ((C.condominio || {}).nombreCorto || (C.condominio || {}).nombre || "el condominio") + "! En " + mv.nombre + " todas las " + mv.unidades + " unidades pagaron su cuota. ¡Gracias!";
      h += '<div class="sd-verde"><b>🎉 ¡Mes verde!</b><span>En ' + esc(mv.nombre) + " pagaron todas las " + mv.unidades + ' unidades. Gracias.</span><a class="btn" href="https://wa.me/?text=' + encodeURIComponent(t) + '" target="_blank" rel="noopener">Compartir</a></div>';
    }
    const cons = (j.consultas || []).filter(c => c.abierta)[0];
    if (cons) h += consultaHTML(cons);
    if (s.lista.length) h += '<h2>Lo que se está atendiendo</h2><ul class="sd-lista sd-tickets">' + s.lista.slice(0, 5).map(t => '<li><span class="sd-est ' + estatusCls(t.estatus) + '">' + esc(t.estatus) + "</span><b>" + esc(t.categoria) + "</b>" + (t.lugar ? " · " + esc(t.lugar) : "") + '<small>' + esc(t.folio) + " · " + esc(corta(t.fecha)) + (t.respuesta ? " · " + esc(t.respuesta) : "") + "</small></li>").join("") + "</ul>";
    if (res.length) h += '<h2>Próximas reservas</h2><ul class="sd-lista">' + res.map(r => "<li><b>" + esc(r.area) + "</b> · " + diaSemana(r.dia) + " " + esc(corta(r.dia)) + " · " + esc(r.horario) + ' <span class="sd-est ' + (r.estatus === "ocupado" ? "ok" : "medio") + '">' + esc(r.estatus) + "</span></li>").join("") + "</ul>";
    return h + nota(j);
  }

  function consultaHTML(c) {
    const tot = c.conteo.reduce((a, b) => a + b, 0) || 1;
    return '<h2>Tu opinión cuenta</h2><div class="sd-form sd-consulta" data-clave="' + esc(c.clave) + '"><b class="sd-preg">' + esc(c.pregunta) + "</b>" +
      c.opciones.map((o, i) => '<button type="button" class="sd-opc" data-o="' + esc(o) + '"><span>' + esc(o) + "</span><em>" + Math.round(c.conteo[i] / tot * 100) + '%</em><i style="--w:' + Math.round(c.conteo[i] / tot * 100) + '%"></i></button>').join("") +
      '<small class="sd-sub">Han opinado ' + c.participacion + " de " + c.total + " " + esc(/[aeiou]$/i.test(unidad) ? unidad + "s" : unidad + "es") + (c.cierra ? " · cierra el " + esc(corta(c.cierra)) : "") + ". Es una consulta, no sustituye a la asamblea.</small>" +
      '<div class="sd-dos" style="margin-top:6px"><input id="fVotoU" type="text" maxlength="20" placeholder="Tu ' + esc(unidad) + '" aria-label="Tu ' + esc(unidad) + '"><button type="button" class="btn primario" id="fVotar" disabled>Elige una opción</button></div><p id="mVoto" class="sd-msg" hidden role="status"></p></div>';
  }

  /* ---------- Páginas ---------- */
  const VISTAS = {
    correo() {
      return '<h1 class="sd-titulo">📩 Recibe el reporte por correo</h1><p class="sd-sub">Cada mes, las cuentas del mes anterior en PDF. Se envía con <b>copia oculta</b>: nadie ve tu correo.</p>' +
        '<form id="fCorreo" class="sd-form" novalidate>' + campoUnidad() +
        '<label class="sd-lbl" for="fNombre">Nombre (opcional)</label><input id="fNombre" type="text" maxlength="60" autocomplete="name">' +
        '<label class="sd-lbl" for="fCorreoIn">Correo electrónico</label><input id="fCorreoIn" type="email" maxlength="120" inputmode="email" autocomplete="email" placeholder="tucorreo@ejemplo.com">' + trampa +
        '<label class="sd-check"><input type="checkbox" id="fAcepto"><span>Acepto el <a href="privacidad.html" target="_blank" rel="noopener">aviso de privacidad</a>: mi correo solo se usa para enviarme el reporte y avisos de la administración, y puedo darme de baja cuando quiera.</span></label>' +
        '<button class="btn primario sd-ancho" type="submit">Registrar mi correo</button><p id="mCorreo" class="sd-msg" hidden role="status"></p></form>' +
        '<p class="sd-sub" style="margin-top:12px">¿Son varios en tu ' + esc(unidad) + "? Cada quien registra su propio correo.</p>" +
        '<details class="sd-faq"><summary>Ya no quiero recibirlo</summary><form id="fBaja" class="sd-form" novalidate><label class="sd-lbl" for="fBajaIn">Tu correo</label><input id="fBajaIn" type="email" maxlength="120" inputmode="email"><button class="btn sd-ancho" type="submit">Darme de baja</button><p id="mBaja" class="sd-msg" hidden role="status"></p></form></details>';
    },
    solicitud() {
      const cats = ["Mantenimiento", "Limpieza", "Seguridad", "Ruido o convivencia", "Agua", "Áreas comunes", "Sugerencia", "Otro"];
      return '<h1 class="sd-titulo">🛠️ Reportar algo</h1><p class="sd-sub">Una fuga, un foco fundido, un ruido, una sugerencia. Te damos un folio para seguirlo. En el sitio solo se ve el tipo y su estatus, nunca quién lo reportó.</p>' +
        '<form id="fSol" class="sd-form" novalidate><span class="sd-lbl">¿De qué se trata?</span><div class="sd-chips" id="fCat">' + cats.map((c, i) => '<button type="button" data-c="' + esc(c) + '"' + (i === 0 ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"') + ">" + esc(c) + "</button>").join("") + "</div>" +
        '<label class="sd-lbl" for="fLugar">¿Dónde?</label><input id="fLugar" type="text" maxlength="80" placeholder="Pasillo del 2º piso, estacionamiento, alberca…">' +
        '<label class="sd-lbl" for="fDesc">¿Qué pasa?</label><textarea id="fDesc" rows="4" maxlength="1000" placeholder="Describe lo que ves. Si es urgente (fuga fuerte, riesgo), llama además a la administración."></textarea>' +
        campoUnidad() + '<label class="sd-lbl" for="fMail">Correo para avisarte (opcional)</label><input id="fMail" type="email" maxlength="120" inputmode="email" autocomplete="email">' + trampa +
        '<button class="btn primario sd-ancho" type="submit">Enviar reporte</button><p id="mSol" class="sd-msg" hidden role="status"></p></form>' +
        '<h2>Seguir un reporte</h2><form id="fFolio" class="sd-form sd-fila" novalidate><input id="fFolioIn" type="text" maxlength="8" placeholder="S-0007" aria-label="Folio"><button class="btn" type="submit">Consultar</button></form><div id="mFolio"></div>' +
        '<div id="pz-pulso"></div>';
    },
    reservar() {
      return '<h1 class="sd-titulo">📅 Reservar un área</h1><p class="sd-sub">Mira los días apartados, elige el tuyo y la administración te confirma por correo.</p>' +
        '<p id="pz-reglas" class="sd-nota" hidden></p>' +
        '<form id="fRes" class="sd-form" novalidate><label class="sd-lbl" for="fArea">Área</label><select id="fArea"></select><div id="pz-cal"><p class="sd-sub">Cargando disponibilidad…</p></div>' +
        '<input id="fDia" type="hidden"><span class="sd-lbl" id="fDiaT">⏰ Elige un día en el calendario</span><div class="sd-hs" id="fHs"></div><input id="fHora" type="hidden">' +
        campoUnidad() + '<label class="sd-lbl" for="fResMail">Correo para confirmarte</label><input id="fResMail" type="email" maxlength="120" inputmode="email" autocomplete="email">' + trampa +
        '<button class="btn primario sd-ancho" type="submit">Pedir la reserva</button><p id="mRes" class="sd-msg" hidden role="status"></p></form>' +
        '<details class="sd-faq"><summary>Cancelar una reserva</summary><form id="fCan" class="sd-form" novalidate><label class="sd-lbl" for="fCanF">Folio</label><input id="fCanF" type="text" maxlength="8" placeholder="R-0003"><label class="sd-lbl" for="fCanM">El correo con que reservaste</label><input id="fCanM" type="email" maxlength="120" inputmode="email"><button class="btn sd-ancho" type="submit">Cancelar y liberar el día</button><p id="mCan" class="sd-msg" hidden role="status"></p></form></details>';
    },
    cuenta() {
      return '<h1 class="sd-titulo">🏠 Mi estado de cuenta</h1><p class="sd-sub">Lo que debe tu ' + esc(unidad) + ', mes por mes. Necesitas la clave que te llegó por correo o que te dio la administración.</p>' +
        '<form id="fCta" class="sd-form" novalidate>' + campoUnidad() + '<label class="sd-lbl" for="fClave">Clave de acceso</label><input id="fClave" type="password" inputmode="numeric" maxlength="12" autocomplete="current-password" placeholder="6 dígitos">' +
        '<label class="sd-check"><input type="checkbox" id="fRecordar"><span>Recordar en este dispositivo</span></label><button class="btn primario sd-ancho" type="submit">Ver mi estado de cuenta</button><p id="mCta" class="sd-msg" hidden role="status"></p></form><div id="pz-cuenta"></div>' +
        '<p class="sd-sub" style="margin-top:12px">¿No tienes clave? Regístrate en <a href="correo.html">Recibe el reporte</a> y pídela a la administración. Tu estado de cuenta es privado: nadie más lo ve.</p>';
    },
    acuerdos() { return '<h1 class="sd-titulo">🤝 Acuerdos</h1><p class="sd-sub">Lo que se decidió, por qué, quién se encarga y en qué va. Se actualiza desde la hoja de la administración.</p><div id="pz-acuerdos"><p class="sd-sub">Cargando…</p></div>'; },
    documentos() { return '<h1 class="sd-titulo">📂 Documentos</h1><p class="sd-sub">Actas, reglamento, contratos y otros documentos que la administración comparte.</p><div id="pz-docs"><p class="sd-sub">Cargando…</p></div>'; }
  };

  const main = $("pagina");
  if (main && VISTAS[S.pagina]) main.innerHTML = VISTAS[S.pagina]();
  recordar();

  /* ---------- Llenar con datos ---------- */
  portal().then(j => {
    if ($("pz-avisos")) $("pz-avisos").innerHTML = avisosHTML(j);
    if ($("pz-pulso")) $("pz-pulso").innerHTML = pulsoHTML(j);
    if ($("pz-contactos") && j.contactos.length) $("pz-contactos").innerHTML = '<h2>Contactos útiles</h2><ul class="sd-lista">' + j.contactos.map(c => "<li><b>" + esc(c.servicio) + "</b>" + (c.nombre ? " · " + esc(c.nombre) : "") + (c.contacto ? '<br><a href="' + (/@/.test(c.contacto) ? "mailto:" : "tel:") + esc(c.contacto.replace(/[^\d+@.\w-]/g, "")) + '">' + esc(c.contacto) + "</a>" : "") + (c.nota ? ' <span class="sd-chip">' + esc(c.nota) + "</span>" : "") + "</li>").join("") + "</ul>";
    if ($("pz-docs")) {
      const g = {}; j.documentos.forEach(d => { (g[d.categoria] = g[d.categoria] || []).push(d); });
      $("pz-docs").innerHTML = Object.keys(g).length ? Object.keys(g).map(k => "<h2>" + esc(k) + '</h2><div class="sd-rejilla">' + g[k].map(d => '<a class="sd-tarjeta" href="' + esc(d.liga) + '" target="_blank" rel="noopener"><div class="ico">📄</div><b>' + esc(d.titulo) + "</b><span>" + (d.fecha ? esc(S.fechaTxt ? S.fechaTxt(d.fecha) : d.fecha) : "Abrir documento") + "</span></a>").join("") + "</div>").join("") + nota(j) : '<p class="sd-nota">Todavía no hay documentos publicados.</p>';
    }
    if ($("pz-reglas") && j.reglasReserva) { $("pz-reglas").hidden = false; $("pz-reglas").textContent = j.reglasReserva; }
    if ($("pz-finanzas")) $("pz-finanzas").innerHTML = claridadHTML(j);
    if ($("pz-acuerdos")) {
      const A = j.acuerdos || [];
      $("pz-acuerdos").innerHTML = A.length ? '<ul class="sd-lista sd-acuerdos">' + A.map(a => '<li><span class="sd-est ' + estatusCls(/cumplido/i.test(a.estado) ? "resuelta" : /curso/i.test(a.estado) ? "proceso" : /cancel/i.test(a.estado) ? "no procede" : "") + '">' + esc(a.estado) + "</span><b>" + esc(a.acuerdo) + "</b>" + (a.porque ? "<p>" + esc(a.porque) + "</p>" : "") + "<small>" + [a.responsable ? "👤 " + esc(a.responsable) : "", a.compromiso ? "📅 " + esc(corta(a.compromiso)) : "", a.fecha ? "acordado el " + esc(corta(a.fecha)) : ""].filter(Boolean).join(" · ") + "</small></li>").join("") + "</ul>" + nota(j) : '<p class="sd-nota">Todavía no hay acuerdos registrados.</p>';
    }
    document.querySelectorAll(".sd-consulta").forEach(box => {
      let elegida = null;
      box.addEventListener("click", async e => {
        const b = e.target.closest(".sd-opc");
        if (b) { elegida = b.dataset.o; box.querySelectorAll(".sd-opc").forEach(x => x.classList.toggle("on", x === b)); $("fVotar").disabled = false; $("fVotar").textContent = "Enviar mi opinión"; return; }
        if (e.target.id !== "fVotar" || !elegida) return;
        const r = await enviar({ accion: "voto", consulta: box.dataset.clave, opcion: elegida, unidad: $("fVotoU").value });
        msg($("mVoto"), r.ok, r.ok ? "✓ Gracias. Si vuelves a opinar, cuenta tu última respuesta." : errTxt(r));
        if (r.ok) try { localStorage.setItem("cd.unidad", $("fVotoU").value.trim()); } catch (_) { /* sin almacenamiento */ }
      });
      try { const u = localStorage.getItem("cd.unidad"); if (u) $("fVotoU").value = u; } catch (_) { /* sin almacenamiento */ }
    });
    if ($("pz-cal")) {
      const areas = j.areasReservables || [];
      $("fArea").innerHTML = areas.map(a => "<option>" + esc(a) + "</option>").join("");
      if (!areas.length) { $("fRes").insertAdjacentHTML("beforebegin", '<p class="sd-nota">Por ahora no hay áreas que se reserven desde el sitio.</p>'); $("fRes").hidden = true; return; }
      const FR = ["Mañana · 9 a 14 h", "Tarde · 15 a 20 h", "Noche · 19 a 23 h", "Todo el día"];
      const choca = (x, y) => { const n = t => String(t).toLowerCase(); if (n(x) === n(y) || /todo el d|día completo/.test(n(x) + n(y))) return true; const r = t => /mañana/.test(n(t)) ? [9, 14] : /tarde/.test(n(t)) ? [15, 20] : /noche/.test(n(t)) ? [19, 23] : ((m => m ? [+m[1], +m[2]] : null)(String(t).match(/(\d{1,2})(?::\d{2})?\s*(?:a|-|–)\s*(\d{1,2})/))); const p = r(x), q = r(y); return p && q ? p[0] < q[1] && q[0] < p[1] : false; };
      const isoD = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      const t0 = new Date(); t0.setHours(12, 0, 0, 0); const HOYc = isoD(t0), TOPEc = isoD(new Date(t0.getTime() + 90 * 864e5));
      let mesV = new Date(t0.getFullYear(), t0.getMonth(), 1);
      const DS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"], MS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
      const largo = s2 => { const d = new Date(s2 + "T12:00:00"); return DS[d.getDay()] + " " + d.getDate() + " de " + MS[d.getMonth()]; };
      const pintar = () => {
        const a = $("fArea").value, oc = {}; (j.reservas || []).filter(r => r.area === a).forEach(r => { (oc[r.dia] = oc[r.dia] || []).push(r); });
        const libres = s2 => FR.filter(f => !(oc[s2] || []).some(r => choca(r.horario, f)));
        const hueco = (mesV.getDay() + 6) % 7, nd = new Date(mesV.getFullYear(), mesV.getMonth() + 1, 0).getDate(), lim = new Date(TOPEc + "T12:00:00");
        let g = ""; for (let n = 1; n <= nd; n++) { const s2 = isoD(new Date(mesV.getFullYear(), mesV.getMonth(), n)), fuera = s2 < HOYc || s2 > TOPEc, li = libres(s2);
          g += '<button type="button" class="sd-d' + (s2 === HOYc ? " hoy" : "") + (oc[s2] ? (li.length ? " parcial" : " lleno") : "") + (s2 === $("fDia").value ? " sel" : "") + '" data-d="' + s2 + '"' + (fuera || !li.length ? " disabled" : "") + ">" + n + "</button>"; }
        $("pz-cal").innerHTML = '<div class="sd-mes"><div class="sd-mes-h"><button type="button" id="mAnt"' + (mesV.getFullYear() === t0.getFullYear() && mesV.getMonth() === t0.getMonth() ? " disabled" : "") + '>‹</button><b>' + MS[mesV.getMonth()] + " " + mesV.getFullYear() + '</b><button type="button" id="mSig"' + (mesV.getFullYear() * 12 + mesV.getMonth() >= lim.getFullYear() * 12 + lim.getMonth() ? " disabled" : "") + '>›</button></div>' +
          '<div class="sd-mes-s"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div><div class="sd-mes-g">' + "<span></span>".repeat(hueco) + g + '</div><div class="sd-ley"><span>libre</span><span class="p">apartado en parte</span><span class="l">ocupado</span></div></div>' + nota(j);
        const dia = $("fDia").value;
        $("fDiaT").textContent = dia ? "⏰ " + largo(dia).replace(/^./, c => c.toUpperCase()) : "⏰ Elige un día en el calendario";
        $("fHs").innerHTML = dia ? libres(dia).length ? FR.map(f => { const ok = libres(dia).indexOf(f) >= 0, p = f.split(" · "); return '<button type="button" class="sd-h' + ($("fHora").value === f ? " sel" : "") + '" data-hr="' + esc(f) + '"' + (ok ? "" : " disabled") + "><b>" + esc(p[0]) + "</b><small>" + (ok ? esc(p[1] || "") : "ocupado") + "</small></button>"; }).join("") : "" : "";
      };
      $("fArea").onchange = () => { $("fDia").value = ""; $("fHora").value = ""; pintar(); };
      $("pz-cal").onclick = e => { const b = e.target.closest("[data-d]"); if (b && !b.disabled) { $("fDia").value = b.dataset.d; $("fHora").value = ""; pintar(); $("fDiaT").scrollIntoView({ behavior: "smooth", block: "center" }); }
        if (e.target.id === "mAnt") { mesV = new Date(mesV.getFullYear(), mesV.getMonth() - 1, 1); pintar(); } if (e.target.id === "mSig") { mesV = new Date(mesV.getFullYear(), mesV.getMonth() + 1, 1); pintar(); } };
      $("fHs").onclick = e => { const b = e.target.closest("[data-hr]"); if (b && !b.disabled) { $("fHora").value = b.dataset.hr; pintar(); } };
      pintar();
    }
  }).catch(e => {
    console.warn("[Portal] " + e.message);
    ["pz-pulso", "pz-docs", "pz-cal"].forEach(id => { if ($(id)) $(id).innerHTML = '<p class="sd-nota">No pudimos leer la información en este momento. Intenta en unos minutos.</p>'; });
  });

  /* Finanzas · «Más claridad»: solo lo que tenga datos. */
  function claridadHTML(j) {
    let h = "";
    const rv = j.reserva && j.reserva.movimientos && j.reserva.movimientos.length ? j.reserva : null;
    if (rv) h += '<section class="sd-tarjeta"><span>Fondo de reserva · aparte de la caja del mes</span><div class="sd-dato">' + $0(rv.saldo) + "</div>" +
      (rv.meta ? '<div class="sd-barra"><i style="--w:' + Math.min(100, Math.max(0, rv.saldo / rv.meta * 100)).toFixed(1) + '%"></i></div><span>' + Math.round(rv.saldo / rv.meta * 100) + "% de la meta de " + $0(rv.meta) + "</span>" : "") +
      '<ul class="sd-lista" style="margin-top:8px">' + rv.movimientos.map(m => "<li>" + esc(corta(m.fecha)) + " · " + esc(m.concepto) + ' <b style="float:right">' + (m.monto >= 0 ? "+" : "") + $0(m.monto) + "</b></li>").join("") + "</ul></section>";
    const pr = (j.presupuesto || []).filter(p => p.presupuesto > 0);
    if (pr.length) {
      const max = Math.max.apply(null, pr.map(p => Math.max(p.presupuesto, p.real)).concat([1]));
      h += '<section class="sd-tarjeta"><span>Presupuesto contra lo gastado · promedio de los últimos meses cerrados</span>' + pr.map(p => {
        const dif = p.real - p.presupuesto, pct = p.presupuesto ? Math.round(dif / p.presupuesto * 100) : 0;
        return '<div class="sd-pres"><div class="sd-pres-n"><b>' + esc(p.concepto) + '</b><small class="' + (pct > 10 ? "mal" : "ok") + '">' + (Math.abs(pct) <= 3 ? "en lo previsto" : (pct > 0 ? "+" : "") + pct + "%") + '</small></div><div class="sd-pres-b"><i class="real" style="--w:' + (p.real / max * 100).toFixed(1) + '%"></i><i class="meta" style="--x:' + (p.presupuesto / max * 100).toFixed(1) + '%"></i></div><small>' + $0(p.real) + " de " + $0(p.presupuesto) + " al mes</small></div>";
      }).join("") + '<small class="sd-sub">La raya marca lo presupuestado.</small></section>';
    }
    const a = j.antiguedad;
    if (a && a.uno + a.dosTres + a.masTres > 0) {
      const tot = a.uno + a.dosTres + a.masTres;
      h += '<section class="sd-tarjeta"><span>¿Desde cuándo se debe? · al cierre de ' + esc(a.corte) + '</span><div class="sd-antig">' +
        [["1 mes", a.uno, "uno"], ["2 a 3 meses", a.dosTres, "dos"], ["más de 3", a.masTres, "tres"]].map(x => '<div class="' + x[2] + '" style="flex:' + Math.max(x[1], 0.0001) + '">' + (x[1] ? "<b>" + x[1] + "</b>" : "") + "</div>").join("") + '</div><div class="sd-antig-l"><span>🟡 1 mes: ' + a.uno + "</span><span>🟠 2 a 3: " + a.dosTres + "</span><span>🔴 más de 3: " + a.masTres + "</span></div>" +
        '<small class="sd-sub">' + tot + " " + esc(/[aeiou]$/i.test(unidad) ? unidad + "s" : unidad + "es") + " con atraso, sin decir cuáles. Atenderlas pronto evita que la deuda crezca.</small></section>";
    }
    return h ? '<h2 id="claridad">Más claridad</h2><div class="sd-claridad">' + h + "</div>" + nota(j) : "";
  }

  /* Mi cuenta, estilo Misiones: total grande, tarjetas por concepto, renglones que se tocan y ventanas cortas. */
  let CTA = null;
  const Lc = (k, v, cls) => '<div class="cuenta-l' + (cls ? " " + cls : "") + '"><span>' + k + "</span><b>" + v + "</b></div>";
  const vent = (t, h, b) => (window.ventana ? window.ventana(t, h, b) : alert(t));
  function cuentaHTML(j) {
    CTA = j;
    const debe = j.debe > 0.5, ct = (C.contacto || {});
    const pieza = (ico, k, v, ok, info) => '<button class="sd-pz' + (ok ? " ok" : "") + '" data-cinfo="' + info + '"><span>' + ico + "</span><b>" + (ok ? "✓" : $0(v)) + "</b><small>" + k + "</small></button>";
    let h = '<section class="sd-total"><span>' + esc(j.unidad) + " · debes hoy</span><div class=\"sd-big " + (debe ? "mal" : "bien") + '">' + (debe ? $0(j.debe) : "✓ Al corriente") + "</div>" +
      '<div class="sd-pzs">' + pieza("🧾", "Mantenimiento", j.debe, !debe, "manto") + (j.adelantado > 0.5 ? pieza("⏩", "Adelantado", j.adelantado, false, "adelantado") : "") + (j.aFavor > 0.5 ? pieza("💚", "A favor", j.aFavor, false, "favor") : "") + "</div>" +
      '<div class="sd-dos" style="margin-top:10px"><a class="btn primario" href="pagar.html">💳 Pagar</a><button class="btn" type="button" id="ctaComo">🧮 Ver la cuenta</button></div></section>';
    h += '<h2>🧾 Mes por mes</h2><ul class="sd-lista sd-cta">' +
      j.adelantos.map(a => '<li><button class="sd-fila" data-cmes="' + a.id + '"><b>' + esc(a.nombre) + '</b><span class="sd-est">adelantado</span><i>›</i></button></li>').join("") +
      j.meses.map(m => '<li><button class="sd-fila" data-cmes="' + m.id + '"><b>' + esc(m.nombre) + "</b>" + (m.diferencia < -0.5 ? '<span class="sd-est ' + (m.enCurso ? "medio" : "mal") + '">' + (m.enCurso ? "por pagar" : "falta " + $0(-m.diferencia)) + "</span>" : '<span class="sd-est ok">✓ pagado</span>') + "<i>›</i></button></li>").join("") + "</ul>";
    const para = ct.correo ? "mailto:" + ct.correo + "?subject=" + encodeURIComponent("Mi estado de cuenta · " + j.unidad) + "&body=" + encodeURIComponent("Hola. Revisé «Mi cuenta» de " + j.unidad + " y no me cuadra: ") : "https://wa.me/?text=" + encodeURIComponent("Hola, administración. Revisé «Mi cuenta» de " + j.unidad + " y no me cuadra: ");
    return h + '<a class="btn sd-ancho sd-wa" href="' + para + '" target="_blank" rel="noopener">🤔 ¿No te cuadra? Escribe a la administración</a>';
  }
  function cuentaMes(id) {
    const m = CTA.meses.find(x => x.id === id), a = CTA.adelantos.find(x => x.id === id);
    if (a) return vent("⏩ " + a.nombre, Lc("Pagaste por adelantado", $0(a.manto), "tot"));
    vent((m.diferencia >= -0.5 ? "✓ " : "") + m.nombre, Lc("Cuota", $0(m.cuota)) + Lc("Registrado", $0(m.manto)) + (m.agua ? Lc("Agua pagada", $0(m.agua)) : "") + (m.extra ? Lc("Otros pagos", $0(m.extra)) : "") + Lc(m.diferencia < -0.5 ? "Falta" : "Diferencia", $0(Math.abs(m.diferencia)), "tot") +
      (m.diferencia < -0.5 ? '<div class="acc"><a class="p" href="pagar.html">💳 Cómo pagar</a></div>' : ""));
  }
  function cuentaComo() {
    const cu = CTA.meses.reduce((a, m) => a + m.cuota, 0), re = CTA.meses.reduce((a, m) => a + m.manto, 0);
    vent("🧮 Tu cuenta", Lc(CTA.meses.length + " × " + $0(CTA.cuota), $0(cu)) + Lc("− Registrado", $0(re)) + (CTA.inicial ? Lc("Saldo archivado a " + esc(CTA.inicial.hasta), $0(CTA.inicial.saldo)) : "") + Lc("Debes hoy", $0(CTA.debe), "tot"));
  }
  document.addEventListener("click", e => {
    if (!CTA) return;
    const b = e.target.closest("[data-cmes],[data-cinfo],#ctaComo"); if (!b) return;
    if (b.id === "ctaComo") return cuentaComo();
    if (b.dataset.cmes) return cuentaMes(b.dataset.cmes);
    const I = { manto: ["🧾 Mantenimiento", Lc("Pendiente", $0(CTA.debe), "tot")], adelantado: ["⏩ Adelantado", '<p class="exp">Meses pagados antes de tiempo. Se aplican cuando lleguen.</p>'], favor: ["💚 A favor", '<p class="exp">Pagaste de más: cubre tus siguientes cuotas.</p>'] }[b.dataset.cinfo];
    if (I) vent(I[0], I[1]);
  });

  /* ---------- Formularios ---------- */
  const on = (id, fn) => { const f = $(id); if (f) f.addEventListener("submit", async e => { e.preventDefault(); const b = f.querySelector("button[type=submit]"); b.disabled = true; try { await fn(); } catch (err) { msg(f.querySelector(".sd-msg") || f, false, "No hubo conexión con la hoja. Intenta en unos minutos."); } b.disabled = false; }); };
  if ($("fCat")) $("fCat").onclick = e => { const b = e.target.closest("[data-c]"); if (!b) return; [...$("fCat").children].forEach(x => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", x === b); }); };
  on("fCorreo", async () => {
    if (!$("fAcepto").checked) { msg($("mCorreo"), false, "Marca la casilla del aviso de privacidad."); return; }
    const j = await enviar({ accion: "correo", unidad: $("fUnidad").value, nombre: $("fNombre").value, correo: $("fCorreoIn").value, web: $("fWeb").value });
    if (j.ok) { guardar(); msg($("mCorreo"), true, "✓ ¡Listo! Te enviamos un correo de confirmación. Si no lo ves, revisa tu carpeta de spam."); $("fCorreoIn").value = ""; } else msg($("mCorreo"), false, errTxt(j));
  });
  on("fBaja", async () => { const j = await enviar({ accion: "correo", baja: true, correo: $("fBajaIn").value }); msg($("mBaja"), j.ok, j.ok ? "✓ Listo. Si tu correo estaba registrado, ya no recibirás el reporte." : errTxt(j)); });
  on("fSol", async () => {
    const cat = ($("fCat").querySelector(".on") || {}).dataset;
    const j = await enviar({ accion: "solicitud", categoria: cat ? cat.c : "Otro", lugar: $("fLugar").value, descripcion: $("fDesc").value, unidad: $("fUnidad").value, correo: $("fMail").value, web: $("fWeb").value });
    if (j.ok) { guardar(); msg($("mSol"), true, "✓ Recibido. Tu folio es <b>" + esc(j.folio) + "</b>. Guárdalo para consultarlo aquí abajo."); $("fDesc").value = ""; $("fLugar").value = ""; $("fFolioIn").value = j.folio; } else msg($("mSol"), false, errTxt(j));
  });
  async function consultarFolio(f) {
    if (!API) { $("mFolio").innerHTML = '<p class="sd-nota">Modo de ejemplo: todavía no hay folios reales.</p>'; return; }
    const r = await fetch(API + "?accion=folio&folio=" + encodeURIComponent(f.trim()) + "&t=" + Date.now(), { cache: "no-store" }), j = await r.json();
    $("mFolio").innerHTML = j.ok ? '<div class="sd-tarjeta"><span class="sd-est ' + estatusCls(j.estatus) + '">' + esc(j.estatus) + "</span><b>" + esc(j.folio) + " · " + esc(j.categoria || j.area) + "</b><span>" + esc(j.descripcion || (j.dia + " · " + j.horario)) + "</span>" + (j.respuesta || j.nota ? '<p class="sd-nota" style="margin:10px 0 0"><b>Respuesta:</b> ' + esc(j.respuesta || j.nota) + "</p>" : "") + "</div>" : '<p class="sd-msg mal">' + errTxt(j) + "</p>";
  }
  on("fFolio", () => consultarFolio($("fFolioIn").value));
  const qf = new URLSearchParams(location.search).get("folio");
  if (qf && $("fFolioIn")) { $("fFolioIn").value = qf; consultarFolio(qf).catch(() => {}); }
  try { const g = JSON.parse(localStorage.getItem("cd.cuenta") || "null"); if (g && $("fClave")) { $("fUnidad").value = g.u; $("fClave").value = g.c; $("fRecordar").checked = true; setTimeout(() => $("fCta").requestSubmit(), 0); } } catch (_) { /* sin almacenamiento */ }
  on("fCta", async () => {
    const j = await enviar({ accion: "cuenta", unidad: $("fUnidad").value, clave: $("fClave").value });
    if (!j.ok) { msg($("mCta"), false, j.error === "clave" ? "Los datos no coinciden: revisa cómo escribiste tu " + esc(unidad) + " y la clave que te llegó por correo, o pídela a la administración." : errTxt(j)); $("pz-cuenta").innerHTML = ""; return; }
    $("mCta").hidden = true; guardar(); $("pz-cuenta").innerHTML = cuentaHTML(j);
    try { if ($("fRecordar").checked) localStorage.setItem("cd.cuenta", JSON.stringify({ u: $("fUnidad").value.trim(), c: $("fClave").value.trim() })); else localStorage.removeItem("cd.cuenta"); } catch (_) { /* sin almacenamiento */ }
  });
  on("fCan", async () => { const j = await enviar({ accion: "cancelar", folio: $("fCanF").value, correo: $("fCanM").value }); msg($("mCan"), j.ok, j.ok ? "✓ Cancelada. El día quedó libre para alguien más." : errTxt(j)); });
  on("fRes", async () => {
    if (!$("fDia").value || !$("fHora").value) { msg($("mRes"), false, "Elige día y horario."); return; }
    const j = await enviar({ accion: "reserva", area: $("fArea").value, dia: $("fDia").value, horario: $("fHora").value, unidad: $("fUnidad").value, correo: $("fResMail").value, web: $("fWeb").value });
    if (j.ok) { guardar(); msg($("mRes"), true, "✓ Pedida. Folio <b>" + esc(j.folio) + "</b>. Te llega la confirmación por correo."); } else msg($("mRes"), false, errTxt(j));
  });
})();
