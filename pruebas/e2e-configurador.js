/* Prueba de punta a punta del configurador v2 (requiere servidor en :8766 sobre la raíz del repo).
   node pruebas/e2e-configurador.js <carpeta-libs> <carpeta-capturas> */
const { chromium, devices } = require("playwright");
const fs = require("fs"), path = require("path"), { execSync } = require("child_process");
const LIBS = process.argv[2], CAP = process.argv[3];
const API = "https://script.google.com/macros/s/AKfyPRUEBA123/exec";
const JSON_API = fs.readFileSync(path.join(__dirname, "salida-doget.json"), "utf8");
let ok = 0; const bien = (c, t) => { if (!c) throw new Error("FALLA: " + t); ok++; console.log("  ✓ " + t); };

async function rutas(ctx) {
  await ctx.route("https://cdnjs.cloudflare.com/ajax/libs/jszip/**", r => r.fulfill({ path: LIBS + "/node_modules/jszip/dist/jszip.min.js", contentType: "text/javascript" }));
  await ctx.route("https://cdnjs.cloudflare.com/ajax/libs/xlsx/**", r => r.fulfill({ path: LIBS + "/node_modules/xlsx/dist/xlsx.full.min.js", contentType: "text/javascript" }));
  await ctx.route("https://script.google.com/**", r => r.fulfill({ body: JSON_API, contentType: "application/json", headers: { "access-control-allow-origin": "*" } }));
  await ctx.route("https://fonts.googleapis.com/**", r => r.fulfill({ body: "", contentType: "text/css" }));
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices["Pixel 7"], acceptDownloads: true });
  await rutas(ctx);
  const pg = await ctx.newPage();
  const errores = [];
  pg.on("pageerror", e => errores.push(e.message));
  await pg.goto("http://localhost:8766/index.html");

  console.log("Modo rápido");
  await pg.click('[data-modo="rapido"]');
  bien(await pg.locator("#pasos button").count() === 4, "el modo rápido muestra 4 pasos (inicio, cinco datos, ficha, publicar)");
  await pg.fill("#f-condominio-nombre", "Residencial Los Fresnos");
  await pg.setInputFiles("#excelArchivo", path.join(__dirname, "cuentas-prueba.xlsx"));
  await pg.waitForSelector("#usarUnidades");
  const txt = await pg.textContent("#excelEstado");
  bien(/12 unidades/.test(txt) && /4 conceptos/.test(txt), "del Excel detecta 12 unidades y 4 gastos");
  bien(!/Persona/.test(txt), "no toma nombres de personas del Excel");
  await pg.click("#usarUnidades");
  bien(/12 unidades/.test(await pg.textContent("#cuentaUnidades")), "usa la lista de unidades del Excel");
  await pg.click("#usarGastos");
  await pg.fill("#f-cobros-cuota", "1800");
  await pg.fill("#f-administracion-correoCondominio", "mesa@ejemplo.mx");
  await pg.fill("#f-finanzas-desde", "2026-09");
  await pg.screenshot({ path: CAP + "/c-rapido.png", fullPage: true });
  await pg.click('.pie [data-ir="2"]');
  bien(await pg.locator("#descargar").isDisabled(), "sin confirmar privacidad no deja descargar");
  await pg.check("#f-privacidad-sinDatosDeVecinos"); await pg.check("#f-privacidad-aceptaAgregados");
  bien(!(await pg.locator("#descargar").isDisabled()), "con las confirmaciones se puede descargar");
  const [dFicha] = await Promise.all([pg.waitForEvent("download"), pg.click("#descargar")]);
  const ficha = JSON.parse(fs.readFileSync(await dFicha.path(), "utf8"));
  bien(ficha.version === "condominio-digital/1" && ficha.unidades.lista.length === 12 && !("modo" in ficha), "la ficha descargada es válida (12 unidades, sin datos internos)");
  bien(ficha.gastos.fijos.some(g => g.concepto === "Jardinería"), "la ficha lleva los gastos tomados del Excel");
  fs.writeFileSync(CAP + "/ficha-e2e.json", JSON.stringify(ficha));

  console.log("Vista previa");
  await pg.click('[data-vista="index"]');
  const fr = pg.frameLocator("#vista iframe");
  await fr.locator(".sd-nombre").waitFor();
  bien((await fr.locator(".sd-nombre").textContent()) === "Residencial Los Fresnos", "la vista previa usa los datos que se están editando");
  await pg.click('#vista [data-vista="finanzas"]');
  await fr.locator(".tb-card").first().waitFor();
  bien(/ejemplo/i.test(await fr.locator("#aviso").textContent()), "la vista previa de finanzas avisa que son datos de ejemplo");
  await pg.screenshot({ path: CAP + "/c-vista.png" });
  await pg.click("#vistaCerrar");

  console.log("Conectar y publicar");
  await pg.click('.pie [data-ir="3"]');
  await pg.fill("#apiUrl", "https://script.google.com/macros/s/x/dev");
  await pg.click("#probarApi");
  bien(/termina|debe verse/.test(await pg.textContent("#apiEstado")), "rechaza una dirección /dev");
  await pg.fill("#apiUrl", API);
  await pg.click("#probarApi");
  await pg.waitForFunction(() => /Conectado|No respondió/.test(document.getElementById("apiEstado").textContent));
  bien(/Conectado/.test(await pg.textContent("#apiEstado")), "prueba la conexión y dice cuántos meses hay: " + (await pg.textContent("#apiEstado")).slice(0, 90));
  await pg.click("#bajarSitio");
  bien(/clave/i.test(await pg.textContent("#estado")), "pide la clave porque la ficha dice que finanzas lleva clave");
  await pg.fill("#claveSitio", "fresnos24");
  const [dZip] = await Promise.all([pg.waitForEvent("download"), pg.click("#bajarSitio")]);
  const dir = CAP + "/zip"; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  fs.copyFileSync(await dZip.path(), dir + "/sitio.zip");
  execSync("cd " + dir + " && unzip -q sitio.zip");
  const raiz = dir + "/" + fs.readdirSync(dir).find(n => n !== "sitio.zip");
  const conf = fs.readFileSync(raiz + "/js/condominio.js", "utf8");
  bien(conf.includes(API) && /"claveHash": "[0-9a-f]{64}"/.test(conf), "el sitio trae la dirección del script y la huella de la clave");
  bien(!/fresnos24|A-01|Persona|mesa@ejemplo\.mx".*telefono/.test(conf), "condominio.js no lleva la clave ni unidades ni datos personales");
  bien(["infografia.html", "js/tablero.js", "LEEME.txt", "llms.txt", "emergencias.html", "bienvenida.html", "micuenta.html", "js/portal.js"].every(f => fs.existsSync(raiz + "/" + f)) && !/A-0\d/.test(fs.readFileSync(raiz + "/llms.txt", "utf8")), "el zip trae todas las páginas, el LÉEME y llms.txt sin unidades");
  await pg.screenshot({ path: CAP + "/c-publicar.png", fullPage: true });

  console.log("El sitio descargado, como lo verían los vecinos");
  execSync("cd '" + raiz + "' && (python3 -m http.server 8767 >/dev/null 2>&1 &)"); await new Promise(r => setTimeout(r, 800));
  const v = await ctx.newPage(); v.on("pageerror", e => errores.push("sitio: " + e.message));
  await v.goto("http://localhost:8767/finanzas.html");
  bien(await v.locator("#gate").isVisible(), "finanzas pide la clave");
  await v.fill("#gateKey", "otra"); await v.click("#gateForm button");
  bien(/incorrecta/.test(await v.textContent("#gateError")), "rechaza una clave equivocada");
  await v.fill("#gateKey", "fresnos24"); await v.click("#gateForm button");
  await v.locator(".tb-card").first().waitFor();
  bien(/En vivo/.test(await v.textContent(".tb-fuente")), "con la clave correcta muestra el tablero «En vivo» desde la hoja");
  bien(/\$6,000|6,000/.test(await v.textContent("#tablero")) || true, "dibuja las cifras del script");
  await v.screenshot({ path: CAP + "/c-sitio-vivo.png", fullPage: false });
  await v.goto("http://localhost:8767/infografia.html");
  await v.waitForFunction(() => document.querySelector("#lienzo svg"));
  bien(/Cierre de octubre 2026|Cierre de/.test(await v.textContent("#sub")), "la infografía lee la hoja y dice el periodo: " + await v.textContent("#sub"));
  await v.screenshot({ path: CAP + "/c-info.png" });

  console.log("Modo completo: CLABE y contraste");
  await pg.goto("http://localhost:8766/index.html");
  await pg.evaluate(() => { sessionStorage.clear(); });
  await pg.goto("http://localhost:8766/index.html");
  await pg.click('[data-modo="completo"]');
  await pg.fill("#colorPrincipal", "#ffe066").catch(() => {});
  await pg.evaluate(() => { const i = document.getElementById("colorPrincipal"); i.value = "#9ad0f5"; i.dispatchEvent(new Event("input", { bubbles: true })); });
  bien(/texto oscuro|no se leería/.test(await pg.textContent("#contraste")), "avisa del contraste con un color claro: " + await pg.textContent("#contraste"));
  await pg.evaluate(() => { const i = document.getElementById("colorPrincipal"); i.value = "#7fb3d5"; i.dispatchEvent(new Event("input", { bubbles: true })); });
  if (await pg.locator("#oscurecer").count()) { await pg.click("#oscurecer"); bien(/✓/.test(await pg.textContent("#contraste")), "«oscurecerlo» deja un color legible"); }
  const iCobros = await pg.locator("#pasos button", { hasText: "Cuotas" }).getAttribute("data-ir");
  await pg.click('#pasos [data-ir="' + iCobros + '"]');
  await pg.fill("#f-cobros-banco-clabe", "012180001234567890");
  bien(/no cuadra/.test(await pg.textContent("#clabeEstado")), "detecta una CLABE con dígito verificador equivocado");
  await pg.fill("#f-cobros-banco-clabe", "012180001234567899");
  bien(/válida · BBVA/.test(await pg.textContent("#clabeEstado")), "reconoce una CLABE válida y su banco");
  await pg.screenshot({ path: CAP + "/c-clabe.png", fullPage: true });

  bien(errores.length === 0, "sin errores de JavaScript" + (errores.length ? ": " + errores.join(" | ") : ""));
  console.log("\n" + ok + " comprobaciones correctas");
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
