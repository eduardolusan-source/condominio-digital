# Condominio digital

Plataforma gratuita para que la administración de un condominio publique sus cuentas a los vecinos de forma
clara y **siempre agregada**, sin programar: una hoja de Google con menú propio, un sitio para vecinos y un
reporte mensual automático. Nació de tres condominios reales en Querétaro (La Valetta, Lahia y Las Misiones, 2026).

## Cómo lo usa una administración

1. Abre el **configurador** (`index.html`, publicado en GitHub Pages) y llena la ficha: modo rápido (5 datos) o completo.
2. Hace su copia de la **hoja plantilla** y en el menú **Condominio → Configurar con mi ficha** sube el archivo.
3. Publica el script como Aplicación web y pega la dirección `/exec` en el configurador.
4. Descarga su **sitio** (.zip) y lo arrastra a Cloudflare Pages. Listo.

La **guía con imágenes** (`guia/`) dibuja cada clic. Si se atora, le da su ficha a Claude con el skill `condominio-digital`.

## Qué hay aquí

| Carpeta | Qué es |
|---|---|
| `index.html` | Configurador: ficha, importar de Excel, CLABE con dígito verificador, contraste, vista previa, prueba de conexión, descarga del sitio |
| `apps-script/Code.gs` | El script único que vive dentro de la hoja plantilla: configurar con ficha, lectura por etiquetas, JSON agregado, semáforo de salud, reporte mensual con kit de WhatsApp, cambio de año |
| `sitio/` | Plantilla del sitio para vecinos; se configura con `js/condominio.js` (lo genera el configurador). Incluye el portal: avisos, reportar con folio, reservas, documentos, registro de correos, consultas y «Más claridad» en finanzas |
| `guia/` | Guía paso a paso con pantallas dibujadas |
| `skill/condominio-digital/` | Skill para Claude (instrucciones y referencias); `herramientas/empaquetar-skill.sh` arma el .zip con las piezas vivas |
| `docs/estudio-plataformas.md` | Qué hacen las plataformas condominales, qué adoptamos, qué no y por qué (con fuentes y la ley aplicable) |
| `pruebas/` | Simulador de Google Sheets y pruebas del script; prueba de punta a punta del configurador |

## Privacidad

Lo público es siempre agregado: montos y número de unidades. El script nunca entrega cobros por unidad; el sitio
nunca recibe la lista de unidades; las infografías acomodan sus íconos al azar. La clave del sitio es cortesía:
lo que publica el script lo puede leer cualquiera con la dirección, por eso solo trae sumas.

## Para quien mantiene la plataforma

**Publicar el configurador:** Settings → Pages → Branch `main` / root. Queda en `https://<usuario>.github.io/condominio-digital/`.

**Crear la hoja plantilla (una vez):**
1. Hoja de Google nueva con la cuenta de la plataforma → Extensiones → Apps Script.
2. Renombra el proyecto a **Condominio digital** (es lo que ve la gente en la pantalla de permisos) y pega `apps-script/Code.gs`.
3. Ejecuta `prepararPlantillaMaestra` (crea la pestaña LÉEME) y autoriza.
4. Compartir → Cualquier persona con el enlace → **Lector**. Copia el enlace y cambia `/edit…` por `/copy`.
5. Pega ese enlace en `PLANTILLA_URL` dentro de `index.html`.

**Cambiar el script:** edita `apps-script/Code.gs`, corre las pruebas y actualiza la plantilla. Las copias que ya
existen no cambian solas: a cada administración se le da el archivo nuevo para pegar y publicar con
«Administrar implementaciones → Nueva versión».

**Pruebas:**
```bash
node pruebas/prueba-code.js                       # script en el simulador (72 comprobaciones)
python3 -m http.server 8766 &                     # luego:
node pruebas/e2e-configurador.js <libs> <capturas> # configurador y sitio descargado (26 comprobaciones)
```
`<libs>` es una carpeta con `npm i jszip@3.10.1 xlsx@0.18.5` (la prueba sirve esas librerías en lugar del CDN).

**Empaquetar el skill:** `herramientas/empaquetar-skill.sh condominio-digital.zip`
