# Patrones probados en Las Misiones (nov. 2026)

Reglas de negocio que los vecinos ya validaron. Úsalas tal cual al adaptar un condominio con necesidades parecidas.

## Lo que cuenta como pagado
- **La hoja manda.** Pagado = lo que está en la pestaña del mes (captura a mano o pago confirmado en la bandeja).
- **Reportado no es pagado.** El vecino registra su pago → la bandeja lo pinta en amarillo en la celda del mes y guarda
  la referencia (`Hoja!C19=color=monto`) en la columna M de Pagos. «Mi depto» resta esos montos hasta que la mesa
  confirma; se muestra como «en revisión», nunca como pagado. Rechazado = prefijo `RETIRADO`.
- **Se cobra desde un mes de arranque** (`finanzas_desde`). Con una administración nueva sin datos de la anterior,
  no se suponen adeudos previos aunque la anterior los haya dejado anotados; lo que alguien pague de antes se
  agradece como aportación («🙏 Gracias») y no se presenta como deuda. El agua previa tampoco se cobra.
- **Cuota extraordinaria** aparte: nombre, monto, pagado y pendiente, sumada de todas las pestañas; entra al total.
- **Adelantos** separados del total (saldo a favor), nunca como mes.
- «Llenar con lo que debo» en Registrar pago excluye lo que ya está en revisión (si no, se cobra dos veces).

## Interfaz para un vecino escéptico o mayor
- Total grande arriba; debajo, una tarjeta por concepto (🧾 cuota · 💧 agua · ⭐ extraordinaria) con su monto.
- Cada renglón es un botón que abre una ventana (`js/ventana.js`, `<dialog>` que sube desde abajo) con el detalle:
  qué se cobró, qué se pagó, de qué fecha. «🧮 Ver la cuenta» abre la suma completa.
- «🤔 ¿No te cuadra?» manda un correo o WhatsApp a la mesa con el depto ya escrito.
- Mosaico de accesos en portada con el mismo estilo para todos y flecha «›»: un mosaico relleno parece «ya
  seleccionado». Sin colores que sugieran estado si no lo hay.
- Botón «Aa» (letra grande) recordado en el navegador; botones de 44 px o más.
- Textos asertivos: «Antes de octubre 2026 · no se cobra», no un párrafo que lo explique.

## Casa club (reservas con calendario)
- Pestaña «Reservas casa club» con folio CC-0001, horarios fijos: Mañana 9–14, Tarde 15–20, Noche 19–23, Día
  completo. Tarde y Noche se cruzan; Día completo choca con todo. Hasta 90 días antes, máximo 2 activas por depto.
- Lo público solo dice qué día y horario está ocupado, nunca quién. «Tus reservas» (con cancelar) se ve al dar el depto.
- Vista de mes con días libre / apartado en parte / ocupado; al tocar un día salen solo los horarios libres.
- La plataforma ya trae lo mismo en Reservar (`chocaHorario_` en `Code.gs`), para cualquier área reservable.

## Otras piezas
- **Proveedores:** conserje y seguridad/accesos con botón de llamar y de WhatsApp. Solo datos que el proveedor
  aceptó publicar.
- **Qué hacer si…** y **Bienvenida**: una pantalla cada una, con teléfonos tocables.
- **Validar mis cuentas** (cuentas.html) se deja como está: los vecinos ya la conocen.
- Por decisión de asamblea, Misiones muestra los adeudos por depto sin clave («presión de pares»). En la plataforma
  el comportamiento por omisión es la clave por unidad; no copies la excepción sin un acuerdo explícito.

## Mesa directiva y reuniones (mesa.html, reunion.html, minutas.html)
- Una sola entrada con clave para la mesa: accesos a bandeja de pagos, casa club por confirmar (✓/✕ con correo al
  depto), egresos y lecturas, más el ciclo de la reunión y el seguimiento de acuerdos (tocar el estado lo cambia).
- Pasos visibles arriba (Preparar · Convocar · En vivo · Acuerdos y minuta): la mesa siempre sabe en qué va.
- El orden del día nace con tres temas base (bienvenida y quórum, informe, asuntos generales); cada tema es «se
  informa» o «se vota» con sus opciones (Sí, No, Abstención por omisión). Borrador guardado en el navegador.
- En vivo: la mesa toca la asistencia y el voto de cada depto (vale el último; tocar de nuevo borra); la página de
  los vecinos se actualiza cada 8 s y muestra «En vivo». Al terminar, los acuerdos ya vienen escritos con el resultado.
- Votos guardados en la pestaña Votos como «R20261120·t1», sin mezclar con la asamblea vieja.
- Lo que no hay que repetir: láminas hechas a mano (la presentación se arma con el orden del día) y páginas de asamblea
  fijas que había que reescribir para cada junta.
