# Apps Script: patrones probados

## El script único (`assets/apps-script/Code.gs`)
Vive dentro de la hoja plantilla; quien copia la hoja se lleva el script. Preferencias en la pestaña **Config**
(clave · valor · para qué sirve), no en el código: `nombre`, `nombre_corto`, `cuota_mantenimiento`, `dia_limite`,
`agua_aparte`, `finanzas_desde`, `gastos_fijos` (separados por |), `correo_condominio`, `reporte_copia`,
`reporte_envio` (automático · pausa), `dia_reporte`, `sitio_url`, `tono`.
Funciones del menú: `abrirConfigurador` → `configurarDesdeFicha(json)`, `verDireccion`, `revisarSalud`,
`reportePrueba`, `reporteAhora`, `prepararMesSiguiente`, `archivarAnioAnterior`. Disparadores:
`reporteProgramado` (día del reporte, 9:00) y `mantenimientoMensual` (día 25, 6:00). Para quien mantiene la
plataforma: `prepararPlantillaMaestra` deja la pestaña LÉEME; el proyecto de Apps Script debe llamarse
«Condominio digital» (es el nombre que ve la persona en la pantalla de permisos).
JSON de `doGet`: `{ ok, servicio: "condominio-digital", version, generado, hoy, condominio{nombre,unidades,cuota},
meses[{id, anio, nombre, corto, unidades, cuota, saldoIni, saldoFin, ingresos{manto,agua,extra},
egresos{fijos,variables}, cobranza{pagaron,pct}, detalle{fijos,variables:[[concepto,monto,liga?]]},
mora{acumulada,unidades,adelantos,unidadesAdelanto}, enCurso}], proyectos[], pagosFuturos[{id,pagaron}] }`.

## Adaptar una hoja propia
Si la persona ya tiene otra estructura, parte de `variantes/Code-excel-o-hoja.gs` y conserva el mismo JSON de
salida: así el sitio plantilla funciona sin cambios.

## Publicar y actualizar
- Implementar → Nueva implementación → Aplicación web · Ejecutar como **yo** · Acceso **cualquier persona**.
  La URL termina en `/exec`; va en `API_URL` del sitio.
- Cambiar el código: Implementar → Administrar implementaciones → lápiz → Versión **nueva** → Implementar.
  **La URL no cambia.** (La URL "de biblioteca" `…/macros/library/d/…/18` que muestra Google no se usa.)
- Si el script guarda una clave privada en el código (`CLAVE_ADMIN`), al pegar una versión nueva hay que
  conservar la línea del editor: el repositorio lleva una de ejemplo.

## Lectura robusta
- Buscar etiquetas normalizadas: `norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"")`.
  Ojo: "(−) Gastos fijos" y "GASTOS FIJOS (ordinarios)" normalizan igual → buscar secciones **después** del
  bloque de cobros.
- Leer un rango grande de una vez (`getRange(1,2,240,5).getValues()`), nunca celda por celda.
- Números: aceptar `$35,200.00`, `35.200,00`, `(2,273.54)`, `-$918.11`.
- Ligas: `getRichTextValues()` (hipervínculo), fórmula `HYPERLINK`, o URL escrita.
- Mes: del nombre de la pestaña; año del nombre o de la celda "Mes y año" (sumar 12 h para evitar que la zona
  horaria lo vuelva 31 de diciembre).

## Morosidad agregada (el cálculo central)
Por unidad: saldo = Σ pagado − Σ cuotas transcurridas, **sin reiniciar en enero**. Meses futuros: sus pagos
suman como adelanto pero no cobran cuota. Publicar solo: acumulada (suma de saldos negativos), unidades con
saldo negativo, adelantos (suma de positivos) y unidades con adelanto. Borrar `pagosPorUnidad` antes de responder.

## Detectar errores de captura (avisos, no se publican)
- Pestaña copiada sin capturar: mismas cifras que el mes anterior y saldo inicial ≠ saldo final anterior → no publicar.
- Saldo inicial que no encadena con el final del mes inmediato anterior (incluido diciembre → enero).
- Dos pestañas para el mismo mes.

## Caché
`CacheService` 5 minutos (`?fresh=1` la salta). Limpiarla tras escribir (egresos, archivo de año).

## Excel en lugar de Hoja de Google
`SpreadsheetApp.openById` no abre `.xlsx`. Opción buena: pedir "Archivo → Guardar como Hojas de Google".
Opción automática: copiar convirtiendo con Drive REST (`POST /drive/v3/files/{id}/copy` con
`mimeType: application/vnd.google-apps.spreadsheet`, token `ScriptApp.getOAuthToken()`), guardar el id de la
copia en `PropertiesService` y rehacerla cuando cambie `getLastUpdated()` del Excel.

## Disparadores
- `onMonthDay(10).atHour(9).inTimezone("America/Mexico_City")` para el reporte.
- `onMonthDay(25)` para preparar la pestaña del mes siguiente y (en marzo) archivar el año anterior.
- Instalar borrando antes los del mismo nombre (idempotente).

## Probar sin Google
Un simulador mínimo de `SpreadsheetApp` en Node (hojas como matrices) permite probar el script con la
estructura real antes de pegarlo. Cuidado: fechas creadas fuera del contexto `vm` no pasan `instanceof Date`.
