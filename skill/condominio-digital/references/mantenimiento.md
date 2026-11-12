# Mantenimiento: meses, años y versiones

## Cada mes (lo hace la plataforma)
- Día 25 (`mantenimientoMensual`): crea la pestaña del mes siguiente, vacía, con su saldo inicial encadenado.
- Día del reporte (`reporteProgramado`, Config `dia_reporte`): arma el PDF del mes anterior, lo guarda en Drive
  («<nombre> · Reportes/AAAA-MM»), lo envía con copia oculta a Correos (si `reporte_envio` = automático) y manda
  a `reporte_copia` el **kit**: semáforo, texto de WhatsApp con botón y botones de infografía.
- Candados: no envía si el mes no tiene datos (avisa), no repite un mes ya enviado, todo queda en Reportes.

## Semáforo (menú Condominio → Revisar que todo cuadre)
Rojo: texto donde va un monto, pestañas duplicadas o copiadas. Amarillo: saldo sin encadenar, cobro > 3 cuotas
en un mes, gastos sin cobros, mes anterior sin capturar, falta `sitio_url`, Correos vacía con envío automático.
Lo que dice el semáforo es privado (puede nombrar unidades): solo va a la administración.

## Cambio de año — una sola hoja viva
Pestañas con año en el nombre («Enero 2027»), saldo de enero encadenado a diciembre, mora sin reinicio. En marzo,
`mantenimientoMensual` archiva el año anterior (`archivarAnio_`): guarda cifras agregadas y la foto privada de
saldos por unidad en la pestaña oculta Histórico y oculta las pestañas. Nada se borra; el sitio sigue mostrando
ese año con el selector. Manual: menú Condominio → Archivar el año anterior.

## Actualizar el script
Pegar el `Code.gs` nuevo → guardar → Implementar → Administrar implementaciones → lápiz → **Nueva versión** →
Implementar. La dirección no cambia. Las preferencias viven en la pestaña Config, así que no se pierden al pegar.
Antes de entregar un cambio: `node scripts/pruebas/prueba-code.js`.
