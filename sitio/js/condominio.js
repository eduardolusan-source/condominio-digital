/* Configuración del sitio. La genera el configurador (paso «Descargar mi sitio») a partir de
   la ficha del condominio; no hace falta editarla a mano. Nunca lleva datos de vecinos. */
window.CONDOMINIO = {
  "version": "condominio-digital/1",
  "condominio": { "nombre": "Residencial Los Fresnos", "nombreCorto": "Los Fresnos", "ciudad": "Corregidora", "estado": "Querétaro", "tipo": "vertical", "logo": "", "colorPrincipal": "#0f6b5a", "colorSecundario": "#c0843e" },
  "unidades": { "total": 24, "nombre": "departamento" },
  "cobros": {
    "cuota": 1800, "diaLimite": 10, "recargo": { "tipo": "ninguno", "valor": "" },
    "adicionales": [{ "concepto": "Cuota extraordinaria impermeabilización", "monto": 2500, "periodo": "una vez" }],
    "agua": { "modalidad": "incluida en la cuota", "detalle": "" },
    "casaClub": { "renta": 800, "deposito": "" },
    "banco": { "banco": "BBVA", "titular": "Condominio Residencial Los Fresnos A.C.", "clabe": "012180001234567899", "referencia": "número de departamento" },
    "formasPago": ["transferencia"]
  },
  "gastos": { "fijos": [{ "concepto": "Vigilancia" }, { "concepto": "Limpieza" }] },
  "comunicacion": { "modulos": ["finanzas", "reporte", "infografias", "reglamento", "areas"], "diaReporte": 10 },
  "vida": {
    "reglamento": "sí, protocolizado",
    "areas": [{ "nombre": "Alberca", "horario": "8:00 a 20:00", "reglas": "", "reserva": "no", "costo": "" }],
    "sanciones": [],
    "fechas": [{ "fecha": "", "evento": "Asamblea ordinaria anual", "aviso": "" }]
  },
  "contacto": { "correo": "mesa.fresnos@ejemplo.com", "horario": "", "administra": "mesa directiva", "empresa": "", "responsables": [{ "rol": "Presidencia de la mesa directiva", "correo": "presidencia@ejemplo.com" }] },
  "sitio": { "api": "", "claveHash": "", "ejemplo": true, "generado": "2026-11-12" }
};
