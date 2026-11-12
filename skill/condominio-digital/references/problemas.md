# Si algo falla: síntoma → causa → arreglo

| Síntoma | Causa probable | Arreglo |
|---|---|---|
| No aparece el menú Condominio | la hoja tardó o no es la copia de la plantilla | recargar; Extensiones → Apps Script debe mostrar `Code.gs` con contenido; si está vacío, pegar `assets/apps-script/Code.gs` |
| «Ese archivo no es una ficha condominio-digital/1» | subió otro archivo o una ficha vieja | descargar la ficha de nuevo del configurador |
| «Probar conexión» dice que no respondió | acceso «Solo yo», dirección `/dev`, o no se implementó | Implementar → Administrar implementaciones: acceso «Cualquier persona»; copiar la `/exec` |
| Responde pero «no es el script de esta plataforma» | pegó la dirección de otro proyecto (p. ej. un script viejo) | menú Condominio → Ver la dirección de mi sitio |
| «Administrar implementaciones» está vacío / «nunca se ha implementado» | abrió otro proyecto de Apps Script, no el de la hoja | abrir desde la hoja: Extensiones → Apps Script |
| El sitio muestra «Datos de ejemplo» | el sitio se descargó sin dirección `/exec` | pegarla en el configurador y descargar el sitio otra vez; en Cloudflare, «Crear implementación» con la carpeta nueva |
| Un mes no aparece | su pestaña no tiene cobros ni gastos, o es un mes futuro, o es anterior a `finanzas_desde` | capturar; revisar Config |
| Un mes «parece copia» y no se publica | duplicó la pestaña anterior sin capturar | usar «Preparar la pestaña del mes siguiente» (nace vacía) |
| Saldo inicial no cuadra | la pestaña no apunta al saldo final del mes anterior | menú Condominio → Revisar que todo cuadre lo dice; poner `='<Mes anterior>'!C<fila del SALDO FINAL>` |
| Morosidad rara (muy alta) | pago de varios meses capturado en un solo mes, o texto en una celda de monto | el semáforo lo señala; capturar cada mes en su pestaña |
| No llegó el reporte | mes sin datos, Correos vacía, envío en pausa, o ya enviado | pestaña Reportes dice qué pasó; probar con «Probar el reporte (solo a mí)» |
| El kit no trae botones de infografía | falta `sitio_url` en Config | pegar la dirección del sitio |
| Cambió el script y el sitio dejó de leer | se hizo «Nueva implementación» (dirección nueva) | volver a la dirección anterior con «Administrar implementaciones → Nueva versión», o actualizar la dirección en el configurador y resubir el sitio |
| Cifra mal en el sitio | error de captura | corregir en la hoja; aparece en ≤ 5 minutos |
