# Hoja de captura mensual

Una pestaña por mes con la misma plantilla. Nombre: `ENERO` (primer año) y `ENERO 2027` en adelante, o
`Octubre` / `Enero 2027`. Celda "Mes y año" con fecha del día 1 (`=DATE(2026,10,1)`), solo para el año.

Estructura (columna B = etiqueta, C… = valores). Las etiquetas importan: el script las busca normalizadas
(sin acentos ni signos), así que pueden moverse de fila.

```
DATOS DEL MES
  Mes y año                     =DATE(2026,10,1)
  Saldo inicial ($)             ='SEPTIEMBRE'!C<fila del saldo final>     ← encadenado
  Número de unidades            16
  Cuota de mantenimiento        1500
RESUMEN DEL MES · se calcula solo
  (+) Mantenimiento cobrado     =suma de cobros
  (+) Agua cobrada              …
  (−) Gastos fijos / ordinarios …
  (−) Gastos variables / extraordinarios …
  SALDO FINAL DEL MES           =inicial + ingresos − egresos
COBROS POR DEPARTAMENTO
  Depto | Mantenimiento | Agua | Extraordinario | (Deuda de agua)
  … una fila por unidad …
  TOTAL COBRADO
GASTOS FIJOS (ordinarios)
  Proveedor | Descripción | Monto | Liga al comprobante (Drive)
  TOTAL
GASTOS VARIABLES (extraordinarios)
  … igual …
  TOTAL
PROYECTOS EN CURSO
  Proyecto | Estado | Presupuesto | Avance o liga
```

Reglas para quien captura:
- Un pago de un mes futuro se anota en la pestaña de ese mes (el script lo cuenta como adelanto).
- El comprobante va como **liga** (Insertar → vínculo), no como nombre de archivo: con nombre no se enlaza.
- Al duplicar una pestaña para el mes nuevo, vaciar montos y encadenar el saldo inicial (o dejar que el
  script cree el mes: ver mantenimiento).
- Pestañas especiales que conviven: `Config` (clave · valor · descripción), `Pagos`, `Agua`, `Correos`,
  `Reportes`, `Histórico`. No son meses y el script las ignora como tales.
