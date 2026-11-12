---
name: condominio-digital
description: Acompaña a una administración o mesa directiva de condominio (México) a montar y mantener su plataforma digital gratuita a partir de su ficha (archivo condominio-*.json del configurador) — hoja de captura en Google Sheets con menú «Condominio», sitio para vecinos con finanzas claras en celular, reporte mensual automático por correo, infografías para WhatsApp, reglas y áreas comunes — usando Google, Cloudflare Pages o GitHub y Claude. Úsalo cuando alguien quiera "hacer la página del condominio", "publicar las cuentas a los vecinos", "conectar mi hoja al sitio", "automatizar el reporte mensual", "mandar la morosidad sin exhibir a nadie", cuando se atore en un paso del configurador o de la guía (permisos de Google, Implementar, /exec, Cloudflare), o para mantener uno de estos sitios (cambio de año, mes que no aparece, cifra mal, script nuevo). También para guiar paso a paso a alguien sin experiencia técnica.
---

# Condominio digital

Destilado de tres implementaciones reales en Querétaro (La Valetta, Lahia y Las Misiones, 2026). La
plataforma ya hace casi todo sola; tu papel es **acompañar, diagnosticar y adaptar**, no reescribir.

## Cómo está armada (léelo una vez)

| Pieza | Dónde | Qué hace |
|---|---|---|
| Configurador | `assets/configurador/index.html` (publicado en la web del proyecto) | La persona llena la ficha (modo rápido de 5 datos o completo), ve la vista previa, prueba la conexión y descarga su sitio en .zip |
| Hoja plantilla | copia de Google Sheets con `assets/apps-script/Code.gs` adentro | Menú **Condominio**: configurar con la ficha, ver dirección, revisar que todo cuadre (semáforo), reporte, mes siguiente, archivar año |
| Servicio web | el mismo `Code.gs` publicado como Aplicación web (`/exec`) | Entrega cifras **agregadas** por mes; nunca cobros por unidad |
| Sitio | `assets/sitio/` + `js/condominio.js` generado | Inicio, Finanzas (tablero de 6 indicadores), Cómo pagar (CLABE para copiar), Reglas y áreas, Ayuda, Aviso de privacidad, Infografía |
| Guía con imágenes | `assets/guia/index.html` | Cada clic dibujado: copia, permisos, Implementar, Cloudflare, rutina mensual |
| Portal de vecinos | mismas piezas (`Code.gs` + `js/portal.js`) | Avisos, Reportar algo con folio y aviso automático, Reservas, Documentos, Recibe el reporte (alta y baja), recordatorio privado de pago, fondo de reserva, presupuesto contra lo gastado, antigüedad de la morosidad y consultas rápidas. Detalle: `references/portal-vecinos.md` |

Flujo normal de la persona (sin ti): configurador → descarga ficha → «Hacer mi copia de la hoja» → menú
Condominio → Configurar con mi ficha → Implementar como Aplicación web → pega `/exec` en el configurador →
Descargar mi sitio (.zip) → arrastrar a Cloudflare Pages → pegar la dirección del sitio en `Config → sitio_url`.

## Principios no negociables

1. **Privacidad primero.** Lo público es SIEMPRE agregado: montos y número de unidades. Nunca nombres ni números
   de unidad en el sitio, en el JSON del script, en correos masivos ni en infografías (sus íconos se acomodan al
   azar cada mes). La clave del sitio NO protege lo que el script publica: cualquiera con la URL lo lee.
2. **La hoja es la fuente de verdad.** Se captura solo en celdas azules; el script lee por **etiqueta** (columna
   B). Las cifras se corrigen en la hoja, nunca en el sitio ni en el código.
3. **Nada de montos de ejemplo en la hoja.** Las pestañas nacen con conceptos, no con cantidades (en Las Misiones
   un "Administración $7,000" de ejemplo se publicó como gasto real durante meses).
4. **Cada imagen y cifra dice su periodo** ("Cierre de octubre 2026", "Avance al 12 de noviembre"). Un mes futuro
   (pago adelantado) nunca se muestra como mes; cuenta como saldo a favor.
5. **Automático con candados:** no enviar si el mes no tiene datos, no enviar dos veces, poder pausar
   (`Config → reporte_envio`), dejar bitácora (pestaña Reportes).
8. **Los datos son del condominio, no de la plataforma.** La hoja es una copia propiedad de la cuenta de la administración,
   el sitio vive en su Cloudflare y el skill en su Claude; quien mantiene la plataforma no recibe ni ve nada. Nunca
   pidas que compartan su hoja contigo ni con nadie fuera de la mesa; el semáforo avisa si la hoja está compartida.
7. **Práctico antes que completo.** Si una pieza no le ahorra tiempo a la administración o no se entiende en dos
   segundos, no se agrega; lo que no tiene datos no se muestra. Lo individual (saldo, folio) va por correo privado,
   nunca al sitio: en México, publicar en internet nombres o montos de morosos es difusión indebida de datos.
6. **Una sola hoja viva.** No se crea un archivo por año: la mora no se reinicia en enero; el año viejo se archiva.

## Cómo trabajar con la persona

**Fase 0 · Ubicarla.** Pide (o lee) su ficha y valídala con `references/ficha.md`. Pregunta en qué paso va
(configurador, hoja, permisos, Implementar, sitio, Cloudflare, rutina mensual) y abre un `estado` como en
`references/estado.md`; actualízalo al final de cada paso para retomar en otra sesión.

**Si va empezando:** mándala al configurador en modo rápido y a la guía con imágenes; tú resuelves dudas.
Explica antes de cada paso qué se logra y cuánto tarda; al final, pide que confirme qué ve.

**Si se atoró:** diagnostica con `references/problemas.md` (tabla síntoma → causa → arreglo) y, si hace falta,
pide una foto de la pantalla. Palabras técnicas: tradúcelas con `references/glosario.md`.

**Si quiere que tú armes el sitio** (Claude Code con GitHub, o porque el configurador no le funciona):
`python3 scripts/generar_sitio.py ficha.json sitio/ --api <URL /exec> --clave <clave> --zip` produce
exactamente lo mismo que el botón del configurador. Publica en Cloudflare (arrastrar) o GitHub Pages
(`references/guia-piloto.md`).

**Si no puede usar la hoja plantilla** (no hay enlace de copia, o quiere un archivo): `python3
scripts/crear_hoja.py ficha.json hoja.xlsx`, súbela a Drive como Hoja de Google y pega `assets/apps-script/Code.gs`
en Extensiones → Apps Script; luego menú Condominio → Configurar con mi ficha (crea Config y lo que falte).

**Si ya tiene su propia hoja con otra estructura:** no la obligues a cambiar. Parte de
`assets/apps-script/variantes/Code-excel-o-hoja.gs` y ajusta etiquetas (`references/apps-script.md`). Prueba antes
de entregar con el simulador (abajo).

**Módulos avanzados** (agua por medidor, registro de pagos, asambleas con votación, avisos por fecha): el sitio
plantilla no los trae; adáptalos de los patrones de Las Misiones descritos en `references/vida-condominal.md` y
`references/comunicacion.md`, siempre con la misma regla de privacidad.

## Probar antes de entregar

`node scripts/pruebas/prueba-code.js` corre el script real en un simulador de Google Sheets (configurar con
ficha, captura, mora sin reinicio, semáforo, reporte, cambio de año; 38 comprobaciones). Si modificas `Code.gs`,
córrelo y agrega el caso nuevo. Lecciones de errores reales: `references/lecciones.md`.

## Guiar a alguien sin experiencia técnica
`references/guia-piloto.md`. Un paso por mensaje mientras ejecuta; di **dónde** está el botón; entrega código como
archivo `.txt`; anticipa la pantalla «Google no verificó esta app» (Configuración avanzada → Ir a… → Permitir); para
actualizar el script: Administrar implementaciones → lápiz → **Nueva versión** (la dirección no cambia).

## Mantenimiento
Cambio de mes y de año, versiones del script, semáforo de salud: `references/mantenimiento.md`.
