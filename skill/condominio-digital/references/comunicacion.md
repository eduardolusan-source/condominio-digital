# Comunicación: correo formal y WhatsApp visual

## Reporte del día del reporte (incluido en assets/apps-script/Code.gs)
Segundo archivo del proyecto de Apps Script; usa `finanzas_()` y `config_()` del primero.
- PDF de una hoja (HTML → `Utilities.newBlob(html,"text/html").getAs("application/pdf")`; usar tablas y estilos
  en línea, no flex/grid).
- Correo a la pestaña `Correos` en **copia oculta**, de 40 en 40; omitir "no", repetidos e inválidos.
- Kit para quien administra: texto de WhatsApp, botón `https://wa.me/?text=…`, botones a infografías.
- Candados: mes sin datos → solo aviso; una vez por mes (`PropertiesService`); `Config → reporte_envio = pausa`.
- La prueba ("solo a mí") usa el mismo mes que el envío real: el anterior ya cerrado.
- Menú en la hoja (`onOpen`): Probar · Enviar ahora · Preparar mes siguiente · Instalar programación.

## Infografías (assets/sitio/infografia.html)
SVG 1080×1350 dibujado en el navegador con cifras agregadas; "Compartir a WhatsApp" usa `navigator.share({files})`
(si no hay, descarga). Fuente incrustada en base64 para que la imagen exportada se vea igual. Tipos y estilos:
- `cuotas` (cierre del mes): edificio de noche, calle de casitas, alcancía, buzones, balcón con macetas.
- `avance` (mes en curso, animado en pantalla): barras contra el calendario del mes; edificio y tinaco que se llenan.
- `agua` (¿alcanzó?): tinaco, gotas, vaso.
- `aguadeuda` (recibos pendientes): garrafones, llaves.
El estilo rota cada mes; etiqueta de periodo arriba; acomodo al azar con semilla del mes (nunca deptos reales).

## Tono
Corto, en positivo, sin exhibir. "12 de 16 al corriente", no "4 morosos". El correo invita a revisar el detalle;
WhatsApp invita a pagar con la ruta exacta ("tu recibo está en la página Agua").
