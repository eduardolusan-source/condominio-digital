# Lecciones (errores que ya costaron)

1. La hoja de la administración era `.xlsx`, no Hoja de Google: Apps Script no la abre.
2. Septiembre era copia de agosto sin capturar: se habría publicado dos veces el mismo mes.
3. Un vecino pagó diciembre en noviembre: el script tomó diciembre como "último mes" y la mora cobró diciembre a
   todos. → Excluir meses futuros; su pago es adelanto.
4. La mora se reiniciaba cada enero: quien debía diciembre desaparecía. → Sin reinicio.
5. Un mes creado al vuelo arrancaba con saldo inicial vacío. → Encadenar al crear.
6. Al pegar un script nuevo se perdía la clave real del editor. → Avisar siempre y dejarla aparte.
7. Nadie encuentra el editor: "en la hoja, menú Extensiones → Apps Script". Entregar el código como `.txt`.
8. La URL de "biblioteca" confunde: la que importa termina en `/exec` y no cambia entre versiones.
9. Etiquetas del resumen y de la sección normalizan igual ("(−) Gastos fijos" / "GASTOS FIJOS") → buscar secciones
   después del bloque de cobros.
10. Fechas con zona horaria: el 1 de enero a medianoche puede leerse como 31 de diciembre → sumar 12 h.
11. Gráficas en celular: el signo "−" de ejes negativos se recortaba → margen del eje según la etiqueta más larga.
12. Barras apiladas al 100 % se salían por los 2 px de separación → que los segmentos puedan encoger.
13. Muchas cifras pierden a la gente → 6 indicadores en portada y el resto en secciones.
14. Correo y WhatsApp tienen públicos y propósitos distintos → formal vs visual.
15. "Dice diciembre": toda imagen debe nombrar su periodo.

## Del paso a plataforma (noviembre 2026)
- Una plantilla con montos de ejemplo terminó publicada como gasto real: las pestañas nacen sin montos.
- Claves en el código se pierden al pegar versiones nuevas: todo va en la pestaña Config.
- «Nueva implementación» cambia la dirección y el sitio deja de leer: para actualizar, siempre «Nueva versión».
- Un proyecto de Apps Script suelto (no abierto desde la hoja) confunde: el script vive dentro de la hoja.
- Un botón de navegación con `data-modo` dentro de un contenedor con `data-modo` disparó la acción equivocada:
  en delegación de eventos, nombres de atributos únicos.
- Los vecinos registran su correo solos (Misiones, nov. 2026): capturarlos a mano era el paso que nadie hacía.
- Un recuadro que promediaba todo el año mezclaba a la administración anterior: el desglose de la cuota se cuenta
  desde que entró la administración actual (`cuotaDesde`).
- Cargar primero una copia y luego la hoja en vivo «brinca» la pantalla: esperar a la hoja con «Cargando…» y
  recordar la última respuesta en el navegador.
