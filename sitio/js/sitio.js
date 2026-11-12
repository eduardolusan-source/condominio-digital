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
    ["cuenta", "micuenta.html", "Mi cuenta", true],
    ["pagar", "pagar.html", "Cómo pagar", true],
    ["solicitud", "solicitud.html", "Reportar", true],
    ["reservar", "reservar.html", "Reservar", (vida.areas || []).some(a => a.nombre && /^s/i.test(String(a.reserva || "")))],
    ["documentos", "documentos.html", "Documentos", true],
    ["reunion", "reunion.html", "Reunión", tiene("asambleas")],
    ["acuerdos", "acuerdos.html", "Acuerdos", tiene("acuerdos") || tiene("asambleas")],
    ["emergencias", "emergencias.html", "Qué hacer si…", true],
    ["reglas", "reglas.html", "Reglas y áreas", tiene("reglamento") || tiene("areas") || tiene("sanciones") || tiene("avisos") || tiene("asambleas")],
    ["ayuda", "ayuda.html", "Ayuda", true]
  ].filter(p => p[3]);
  const iniciales = corto.split(/\s+/).filter(w => w.length > 2 || /^[A-Z]/.test(w)).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "C";
  const tituloPag = { inicio: "", finanzas: "Finanzas", pagar: "Cómo pagar", reglas: "Reglas y áreas comunes", ayuda: "Ayuda", privacidad: "Aviso de privacidad", solicitud: "Reportar algo", reservar: "Reservar un área", documentos: "Documentos", correo: "Recibe el reporte", cuenta: "Mi estado de cuenta", emergencias: "Qué hacer si…", bienvenida: "Bienvenida", acuerdos: "Acuerdos", reunion: "Reunión", mesa: "Mesa directiva" }[pagina];
  document.title = (tituloPag ? tituloPag + " · " : "") + nombre;

  const header = document.createElement("header");
  header.className = "sd-header";
  header.innerHTML = '<div class="inner"><a class="sd-marca" href="index.html' + (VISTA ? "?vista=1" : "") + '">' +
    (co.logo ? '<img class="sd-logo" src="' + esc(co.logo) + '" alt="">' : '<span class="sd-iniciales" aria-hidden="true">' + esc(iniciales) + "</span>") +
    '<span class="sd-nombre">' + esc(corto) + "</span></a>" +
    '<button class="sd-letra" type="button" aria-pressed="false" title="Letra más grande">Aa</button>' +
    '<button class="sd-menu-btn" type="button" aria-expanded="false" aria-controls="sd-nav">Menú</button>' +
    '<nav class="sd-nav" id="sd-nav">' + PAGINAS.map(p => '<a href="' + p[1] + (VISTA ? "?vista=1" : "") + '"' + (p[0] === pagina ? ' class="activo" aria-current="page"' : "") + ">" + p[2] + "</a>").join("") + "</nav></div>";
  document.body.insertBefore(header, document.body.firstChild);
  const btn = header.querySelector(".sd-menu-btn"), nav = header.querySelector(".sd-nav"), letra = header.querySelector(".sd-letra");
  const ponerLetra = on => { document.documentElement.classList.toggle("sd-grande", on); letra.setAttribute("aria-pressed", on); };
  try { ponerLetra(localStorage.getItem("cd.letra") === "1"); } catch (_) { /* sin almacenamiento */ }
  letra.addEventListener("click", () => { const on = !document.documentElement.classList.contains("sd-grande"); ponerLetra(on); try { localStorage.setItem("cd.letra", on ? "1" : "0"); } catch (_) { /* sin almacenamiento */ } });
  btn.addEventListener("click", () => { const a = nav.classList.toggle("abierto"); btn.setAttribute("aria-expanded", a); });

  const footer = document.createElement("footer");
  footer.className = "sd-footer";
  footer.innerHTML = '<div class="inner"><span>' + esc(nombre) + (co.ciudad ? " · " + esc(co.ciudad) : "") + "</span>" +
    '<a href="privacidad.html">Aviso de privacidad</a>' + (tiene("asambleas") ? '<a href="mesa.html">🔑 Mesa directiva</a>' : "") + (ct.correo ? '<a href="mailto:' + esc(ct.correo) + '">' + esc(ct.correo) + "</a>" : "") +
    "<span>Las cifras se publican siempre agregadas, sin identificar a nadie.</span></div>";
  document.body.appendChild(footer);

  /* ---------- Contenido de cada página ---------- */
  const main = document.getElementById("pagina");
  const accion = (href, ico, t, d) => '<a class="sd-accion" href="' + href + (VISTA ? "?vista=1" : "") + '"><span class="ico">' + ico + "</span><b>" + esc(t) + "</b><small>" + d + "</small></a>";
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
        '<div id="pz-avisos"></div>' +
        '<h2>¿Qué necesitas?</h2><div class="sd-acciones">' +
        accion("micuenta.html", "🏠", "Mi estado de cuenta", "lo que debo, mes por mes") +
        accion("pagar.html", "💳", "Pagar mi cuota", $(cb.cuota) + " antes del día " + (cb.diaLimite || 10)) +
        (tiene("finanzas") ? accion("finanzas.html", "📊", "Ver las cuentas", "en qué se gasta, mes por mes") : "") +
        accion("solicitud.html", "🛠️", "Reportar algo", "fuga, foco, ruido, sugerencia") +
        (PAGINAS.some(p => p[0] === "reservar") ? accion("reservar.html", "📅", "Reservar un área", "consulta lo disponible") : "") +
        accion("correo.html", "📩", "Recibe el reporte", "cada mes en tu correo") +
        accion("documentos.html", "📂", "Documentos", "actas, reglamento, contratos") +
        (PAGINAS.some(p => p[0] === "reglas") ? accion("reglas.html", "📘", "Reglas y áreas", "horarios y fechas") : "") +
        "</div>" +
        '<div class="sd-franja"><a href="emergencias.html' + (VISTA ? "?vista=1" : "") + '">🚨 ¿Una fuga, un corte, el elevador detenido? <b>Qué hacer si…</b></a><a href="bienvenida.html' + (VISTA ? "?vista=1" : "") + '">👋 ¿Recién llegas? <b>Bienvenida</b></a></div>' +
        '<div id="pz-pulso"></div>' +
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
        reglaMes() +
        '<p style="margin:16px 0 0"><a class="btn" href="micuenta.html">🏠 Ver cuánto debo, mes por mes</a></p>' +
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
        tiene("reporte") ? ["¿Llega un reporte por correo?", "Sí: el día " + ((C.comunicacion && C.comunicacion.diaReporte) || 10) + " de cada mes se envía el resumen del mes anterior en PDF. Regístrate tú mismo en «Recibe el reporte»: eliges tu unidad, escribes tu correo y listo. Ahí mismo te das de baja."] : null,
        ["¿Cómo reporto una fuga, un foco fundido o un ruido?", "En «Reportar algo»: eliges el tipo, describes qué pasa y dónde. Te damos un folio para seguirlo y, si dejas tu correo, te avisamos cuando cambie su estatus. En el sitio solo se ve el tipo de reporte y su estatus, nunca quién lo hizo."],
        ["¿Cómo aparto el salón o un área común?", "En «Reservar»: ves los días ya apartados, eliges día y horario, y la administración te confirma por correo."],
        ["Encontré un error, ¿qué hago?", "Escribe a la administración con el mes y el dato. No compartas datos de otros vecinos."]
      ].filter(Boolean);
      const resp = (ct.responsables || []).filter(r => r.rol || r.correo);
      const glosario = [["Cuota ordinaria", "lo que paga cada " + unidad + " al mes para operar el condominio."], ["Cuota extraordinaria", "un pago aparte, aprobado en asamblea, para algo específico (una obra, un equipo)."], ["Fondo de reserva", "ahorro para reparaciones grandes o imprevistos; se cuenta aparte de la caja del mes."], ["Indiviso", "el porcentaje de las áreas comunes que le corresponde a cada " + unidad + " según la escritura."], ["Quórum", "cuántos condóminos deben estar presentes para que una asamblea pueda decidir."], ["Morosidad", "cuotas que ya vencieron y no se han pagado; aquí se publica siempre en total, sin decir quién."], ["Protocolizar", "hacer que un notario dé fe de un acta o del reglamento para que tenga validez legal."], ["Mesa directiva", "los vecinos electos en asamblea para administrar o vigilar la administración."]];
      return '<h1 class="sd-titulo">Ayuda</h1><p class="sd-sub">Preguntas frecuentes de vecinas y vecinos.</p>' +
        preguntas.map(p => '<details class="sd-faq"><summary>' + esc(p[0]) + "</summary><p>" + esc(p[1]) + "</p></details>").join("") +
        '<details class="sd-faq"><summary>📖 Palabras del condominio, en simple</summary><dl class="sd-glosario">' + glosario.map(g => "<dt>" + esc(g[0]) + "</dt><dd>" + esc(g[1]) + "</dd>").join("") + "</dl></details>" +
        "<h2>Contacto</h2><ul class=\"sd-lista\">" + (ct.correo ? '<li><b>Administración</b>' + (ct.empresa ? " · " + esc(ct.empresa) : "") + '<br><a href="mailto:' + esc(ct.correo) + '">' + esc(ct.correo) + "</a>" + (ct.horario ? " · " + esc(ct.horario) : "") + "</li>" : "") +
        resp.map(r => "<li><b>" + esc(r.rol || "") + "</b>" + (r.correo ? '<br><a href="mailto:' + esc(r.correo) + '">' + esc(r.correo) + "</a>" : "") + "</li>").join("") + "</ul>" + '<div id="pz-contactos"></div>';
    },
    emergencias() {
      const tels = (C.contactos || []).filter(c => c.telefono);
      const tel = re => tels.find(c => re.test(c.servicio));
      const llamar = c => c ? '<a class="btn primario sd-tel" href="tel:' + esc(String(c.telefono).replace(/[^\d+]/g, "")) + '">📞 ' + esc(c.servicio) + " · " + esc(c.telefono) + "</a>" : "";
      const adm = ct.correo ? '<a class="btn sd-tel" href="mailto:' + esc(ct.correo) + '">✉️ Administración</a>' : "";
      const vig = tel(/vigil|conserj|caseta|seguridad/i), e911 = tel(/emerg|911/i) || { servicio: "Emergencias", telefono: "911" };
      const P = [
        ["💧", "Fuga de agua", ["Cierra la llave de paso de tu " + unidad + " (suele estar junto al medidor o bajo el fregadero).", "Si sale de un área común o del techo, avisa a vigilancia o a la administración.", "Si hay agua cerca de contactos eléctricos, no los toques y baja el interruptor general."], [tel(/agua|cea|fuga/i), vig]],
        ["⚡", "Se fue la luz", ["Revisa si es solo tu " + unidad + ": mira tu interruptor (pastilla).", "Si es todo el condominio o la calle, repórtalo a la CFE.", "Desconecta aparatos sensibles para cuando regrese la luz."], [tel(/luz|cfe|el[eé]ctric/i)]],
        ["🛗", "Elevador detenido con alguien dentro", ["Que no intenten abrir las puertas ni salir por su cuenta.", "Llama a vigilancia o a la administración y, si hay riesgo, al 911.", "Habla con quien está dentro para tranquilizarle."], [tel(/elevador/i), vig, e911]],
        ["🔥", "Olor a gas", ["No prendas ni apagues luces ni aparatos; no uses encendedores.", "Abre puertas y ventanas y cierra la llave del gas.", "Sal del lugar y llama desde afuera al 911 o a tu proveedor de gas."], [tel(/gas/i), e911]],
        ["🌎", "Sismo", ["Si suena la alerta, sal si puedes hacerlo rápido; si no, aléjate de ventanas.", "No uses el elevador.", "Al terminar, revisa si hay olor a gas o daños antes de volver a entrar."], [e911]],
        ["🚽", "Drenaje o fosa tapada", ["Deja de usar regaderas y excusados que se estén regresando.", "Avisa a la administración o reporta en el sitio con el lugar exacto."], [tel(/drenaje|plomer|fosa/i), vig]]
      ];
      return '<h1 class="sd-titulo">🚨 Qué hacer si…</h1><p class="sd-sub">Lo esencial, en una pantalla. Si alguien está en peligro, llama primero al 911.</p>' +
        '<div class="sd-dos" style="margin-bottom:14px">' + llamar(e911) + (vig ? llamar(vig) : adm) + "</div>" +
        P.map(x => '<details class="sd-faq"><summary>' + x[0] + " " + esc(x[1]) + "</summary><ol class=\"sd-pasos\">" + x[2].map(t => "<li>" + esc(t) + "</li>").join("") + "</ol>" +
          '<div class="sd-tels">' + x[3].filter(Boolean).filter((c, i, a) => a.indexOf(c) === i).map(llamar).join("") + "</div>" + '<p style="margin:0 0 14px"><a href="solicitud.html' + (VISTA ? "?vista=1" : "") + '">Reportarlo en el sitio ›</a></p></details>').join("") +
        (tels.length ? "<h2>Todos los teléfonos</h2><ul class=\"sd-lista\">" + tels.map(c => "<li><b>" + esc(c.servicio) + '</b> · <a href="tel:' + esc(String(c.telefono).replace(/[^\d+]/g, "")) + '">' + esc(c.telefono) + "</a>" + (c.horario ? ' <span class="sd-chip">' + esc(c.horario) + "</span>" : "") + "</li>").join("") + "</ul>" : "");
    },
    bienvenida() {
      const b = cb.banco || {}, clabe = String(b.clabe || "").replace(/\D/g, "");
      const areas = (vida.areas || []).filter(a => a.nombre);
      const texto = "👋 Bienvenida a " + nombre + "\n\n💳 Cuota: " + $(cb.cuota) + " al mes, antes del día " + (cb.diaLimite || 10) + (clabe ? "\nCLABE: " + clabe + (b.banco ? " (" + b.banco + ")" : "") + (b.referencia ? " · referencia: " + b.referencia : "") : "") +
        (areas.length ? "\n🏊 Áreas comunes: " + areas.map(a => a.nombre + (a.horario ? " (" + a.horario + ")" : "")).join(", ") : "") + (ct.correo ? "\n✉️ Administración: " + ct.correo : "") + "\n\nTodo lo demás: " + location.href.replace(/bienvenida\.html.*$/, "");
      return '<h1 class="sd-titulo">👋 Bienvenida</h1><p class="sd-sub">Lo que necesitas en tu primera semana, seas propietario o inquilino.</p><div class="sd-rejilla">' +
        '<div class="sd-tarjeta"><div class="ico">💳</div><b>Tu cuota</b><span>' + $(cb.cuota) + " al mes, antes del día " + (cb.diaLimite || 10) + '. <a href="pagar.html">Cómo pagar</a></span></div>' +
        '<div class="sd-tarjeta"><div class="ico">📩</div><b>Recibe las cuentas</b><span>Registra tu correo y cada mes te llega el reporte. <a href="correo.html">Registrarme</a></span></div>' +
        (areas.length ? '<div class="sd-tarjeta"><div class="ico">🏊</div><b>Áreas comunes</b><span>' + areas.map(a => esc(a.nombre) + (a.horario ? " · " + esc(a.horario) : "")).join("<br>") + "</span></div>" : "") +
        '<div class="sd-tarjeta"><div class="ico">🛠️</div><b>¿Algo no funciona?</b><span><a href="solicitud.html">Repórtalo</a> y te damos un folio. Emergencias: <a href="emergencias.html">qué hacer si…</a></span></div>' +
        '<div class="sd-tarjeta"><div class="ico">📘</div><b>Las reglas</b><span><a href="reglas.html">Reglas y áreas comunes</a> · <a href="ayuda.html">Ayuda</a></span></div>' +
        (ct.correo ? '<div class="sd-tarjeta"><div class="ico">✉️</div><b>Administración</b><span><a href="mailto:' + esc(ct.correo) + '">' + esc(ct.correo) + "</a>" + (ct.horario ? "<br>" + esc(ct.horario) : "") + "</span></div>" : "") +
        '</div><p style="margin:16px 0"><a class="btn primario sd-ancho" href="https://wa.me/?text=' + encodeURIComponent(texto) + '" target="_blank" rel="noopener">Compartir la bienvenida por WhatsApp</a></p>' +
        '<p class="sd-sub">Ideal para mandarla a quien llega a vivir o a rentar.</p>';
    },
    privacidad() {
      const resp = ct.empresa ? esc(ct.empresa) + ", administradora de " + esc(nombre) : "La administración de " + esc(nombre) + " (" + esc(ct.administra || "mesa directiva") + ")";
      return '<h1 class="sd-titulo">Aviso de privacidad simplificado</h1><p class="sd-sub">Conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.</p>' +
        '<div class="sd-tarjeta"><p><b>Responsable.</b> ' + resp + ".</p>" +
        "<p><b>Qué datos usamos.</b> Para administrar el condominio usamos el número de " + esc(unidad) + ", los pagos de cuotas y, si los das, tu nombre y tu correo para enviarte el reporte mensual y avisos. Estos datos están en la hoja privada de la administración.</p>" +
        "<p><b>Qué publicamos.</b> En este sitio, en correos colectivos y en imágenes para grupos solo aparecen <b>cifras agregadas</b>: totales de ingresos y gastos, y cuánto se debe en conjunto y en cuántas " + plural(unidad, 2) + ". Nunca nombres, números de " + esc(unidad) + " ni montos de una persona.</p>" +
        "<p><b>Tu estado de cuenta.</b> Lo que debe tu " + esc(unidad) + " mes por mes solo se ve en «Mi cuenta» con tu " + esc(unidad) + " y su clave privada. La clave llega a los correos registrados de tu " + esc(unidad) + ".</p>" +
        "<p><b>Reportes y reservas.</b> Si haces un reporte o una reserva, tu " + esc(unidad) + " y tu correo (si lo das) se guardan en la hoja privada para atenderte y avisarte. En el sitio solo se ven el tipo de reporte, el lugar y su estatus, o los días apartados, sin decir quién.</p>" +
        "<p><b>Recordatorios.</b> Si la administración los activa, el correo registrado de tu " + esc(unidad) + " puede recibir un aviso privado con su propio saldo pendiente. Nadie más lo recibe.</p>" +
        "<p><b>Correos.</b> El reporte mensual se envía con copia oculta. Puedes dejar de recibirlo respondiendo al correo.</p>" +
        "<p><b>Tus derechos (ARCO).</b> Puedes pedir acceso, rectificación, cancelación u oposición" + (ct.correo ? ' escribiendo a <a href="mailto:' + esc(ct.correo) + '">' + esc(ct.correo) + "</a>" : " con la administración") + ".</p>" +
        '<p style="margin:0;color:var(--muted);font-size:.85rem">Última actualización: ' + esc(fechaTxt((C.sitio && C.sitio.generado) || "")) + ".</p></div>";
    }
  };

  /* El mes en una regla: día 1 (cuota), día límite y la marca de hoy. */
  function reglaMes() {
    const hoy = new Date(), dias = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate(), d = hoy.getDate(), lim = Math.min(dias, Number(cb.diaLimite) || 10);
    const pos = x => ((x - 1) / (dias - 1) * 100).toFixed(1) + "%";
    const MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"][hoy.getMonth()];
    return '<div class="sd-regla" aria-label="Calendario de pago de ' + MES + '"><div class="sd-regla-t"><b>¿Cuándo pago?</b><span>' + (d <= lim ? "Te quedan " + (lim - d) + (lim - d === 1 ? " día" : " días") + " para pagar " + MES : "Ya pasó el día " + lim + ": paga lo antes posible") + "</span></div>" +
      '<div class="sd-regla-b"><i class="ok" style="width:' + pos(lim) + '"></i><em style="left:' + pos(1) + '">1</em><em class="lim" style="left:' + pos(lim) + '">' + lim + '</em><em style="left:100%">' + dias + '</em><s style="left:' + pos(d) + '" title="hoy"></s></div>' +
      '<div class="sd-regla-l"><span>📅 día 1: se genera la cuota</span><span>⏰ día ' + lim + ": límite</span><span>📍 hoy, " + d + " de " + MES + "</span></div></div>";
  }
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
  window.SITIO = { C: C, tiene: tiene, esc: esc, pagina: pagina, VISTA: VISTA, fechaTxt: fechaTxt };
})();
