# Portal de vecinos (incluido en Code.gs y en el sitio plantilla)

Criterio: que le ahorre tiempo a la administración y se entienda en dos segundos. Solo se crea lo que se usa.

**Base (siempre):** Inicio (avisos, 6–8 accesos, «Así vamos», franja de ayuda), Mi estado de cuenta (clave por unidad),
Cómo pagar (con «¿cuándo pago?»), Reportar algo, Qué hacer si… (teléfonos de la ficha), Bienvenida (compartible),
Recibe el reporte, Documentos, Ayuda (con glosario), Aviso de privacidad, botón «Aa» de letra grande y `llms.txt`.
**Opcionales (módulos de la ficha):** finanzas, reporte, infografías, reglamento/áreas, acuerdos, fondo de reserva,
consultas, reservas (si hay áreas reservables).

| Pieza | Pestaña de la hoja | Sitio | Qué hace la administración |
|---|---|---|---|
| Avisos | Avisos (fecha, título, texto, vigente hasta, importante) | Inicio | escribir un renglón; vence solo |
| Reportar algo | Solicitudes (folio S-0001…, unidad y correo PRIVADOS) | solicitud.html + «lo que se está atendiendo» | cambiar Estatus y Respuesta → el vecino recibe el correo solo (disparador `alEditar`) |
| Reservas | Reservas (solo si Config → areas_reservables) | reservar.html: vista de mes (libre / en parte / ocupado), horarios Mañana · Tarde · Noche · Todo el día que no se cruzan (`chocaHorario_`), cancelar con folio | Estatus Confirmada / Rechazada |
| Documentos | Documentos (título, categoría, liga) | documentos.html | pegar la liga de Drive |
| Recibe el reporte | Correos (alta y baja desde el sitio) | correo.html | nada; compartir la liga una vez |
| Mi estado de cuenta | Unidades → columna C «Clave de acceso (privada)», 6 dígitos, se crea al configurar y se conserva al reconfigurar | micuenta.html: unidad + clave (POST `accion=cuenta`, 8 intentos por hora) → lo que debe hoy y mes por mes | menú «Enviar a cada unidad su clave» (solo a sus correos registrados) |
| Recordatorio de pago | — (Config → recordatorio_pago = sí) | — | probarlo desde el menú; se manda privado, solo con el saldo propio |
| Fondo de reserva | Fondo de reserva (módulo «fondo») | Finanzas → Más claridad | anotar cada aportación (+) o gasto (−) |
| Presupuesto | Presupuesto (nace con los montos de la ficha) | Finanzas → Más claridad | ajustar si cambia |
| Antigüedad de la morosidad | — (se calcula) | Finanzas → Más claridad | nada |
| Consultas | Consultas + Votos (privado) (módulo «consultas») | Inicio, solo si hay una abierta | escribir la pregunta y poner Activa = sí |
| Acuerdos vivos | Acuerdos (módulo «acuerdos»): fecha, acuerdo, por qué, responsable (rol), compromiso, estado | acuerdos.html; los cumplidos de más de 6 meses se retiran solos | actualizar el Estado |
| Mes verde | — (se calcula) | Inicio: tarjeta compartible cuando todas las unidades pagaron el mes cerrado | nada |
| Qué hacer si… | — (teléfonos útiles de la ficha) | emergencias.html: fuga, luz, elevador, gas, sismo, drenaje, con botones para llamar | nada |
| llms.txt | — | resumen público en texto claro para asistentes de IA de los vecinos | nada |
| Agenda | Config → agenda (de las fechas clave de la ficha) | — | el kit dice «Este mes toca…» |

JSON público: `doGet?accion=portal` (agregado, sin unidades, correos ni descripciones) y `?accion=folio&folio=S-0001`
(detalle de un reporte para quien tiene el folio). Formularios: `doPost` con `accion` correo · solicitud · reserva ·
cancelar · voto; todos con campo trampa y límites por hora.

Privacidad en México: publicar en internet nombres, departamentos o montos de morosos se considera difusión
indebida (ver `docs/estudio-plataformas.md`); lo individual va solo por correo privado a la unidad.
