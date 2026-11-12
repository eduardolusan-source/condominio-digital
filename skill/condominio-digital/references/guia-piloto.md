# Guiar a alguien sin experiencia técnica

Meta: hoja configurada, sitio publicado y (si eligió) reporte mensual programado. Con el modo rápido se logra en
una hora. Reglas: un paso por mensaje mientras la persona ejecuta; di DÓNDE está el botón; pide que confirme qué
ve; anticipa las pantallas que asustan. La guía con imágenes (`assets/guia/index.html`, publicada junto al
configurador) dibuja cada pantalla: mándala al paso exacto (`…/guia/#permisos`).

## 0. Antes
- Cuenta de Google **del condominio** (accounts.google.com → Crear cuenta → Para mi trabajo o empresa). Que al
  menos dos personas de la mesa tengan acceso.
- `cuentas.nivel = bajo`: decide tú lo técnico y explica en una línea por qué.

## 1. Configurador
Modo rápido (5 datos) si quiere ver algo funcionando hoy; completo si trae CLABE, gastos y reglas a la mano. Si ya
llevan Excel, «Toma de ahí las unidades y los gastos» los detecta (solo nombres, nunca montos ni personas).

## 2. Hoja
«Hacer mi copia de la hoja» → menú Condominio → Configurar con mi ficha. Permisos: elegir cuenta → Configuración
avanzada → Ir a… (no seguro) → Permitir. Explica: «es tu propio programita; Google avisa porque no lo publicó una
empresa».

## 3. Implementar
Extensiones → Apps Script → Implementar → Nueva implementación → engrane → Aplicación web · Ejecutar como: yo ·
Acceso: cualquier persona → Implementar → copiar la `/exec` → pegarla en el configurador → Probar conexión.

## 4. Sitio
Descargar mi sitio (.zip) → descomprimir → Cloudflare: Workers y Pages → Crear → Pages → Cargar recursos →
nombre → arrastrar carpeta → Implementar sitio. Copiar `…pages.dev` a Config → `sitio_url`.
Alternativa GitHub Pages (si la persona usa Claude Code): `scripts/generar_sitio.py` → repositorio
`condominio-<clave>` → Settings → Pages → Branch main / root.

## 5. Revisar con la persona, en su celular
Nombre y colores, Cómo pagar (CLABE correcta), Finanzas «En vivo» con un mes capturado que coincida con la hoja,
que no aparezca ninguna unidad, la clave (si lleva).

## 6. Reporte
Llenar la pestaña Correos (unidad, nombre, correo, «no» si no quiere) → Condominio → Probar el reporte (solo a mí)
→ revisar el kit que llega. Si prefiere revisar antes de enviar a todos: Config → `reporte_envio` = pausa.

## 7. Cierre
Deja el bloque de `references/estado.md` completo y dile qué hace cada mes: capturar, revisar el semáforo,
reenviar el kit al grupo.
