# Tablero (assets/sitio/js/tablero.js + css/tablero.css)

Motor común. No se modifica por condominio: se configura. Si se mejora, copiar a todos los sitios.

## Uso
```js
const t = Tablero.montar(document.getElementById("tablero"), OPCIONES);
t.actualizar(modelo);          // en el sitio plantilla: datos de ejemplo si no hay /exec; si hay, la respuesta en vivo
```

## Modelo que espera
```js
{ unidades, cuota,
  meses: [{ id: "2026-08", anio, nombre, corto, saldoIni, saldoFin, vivo,
            ingresos: [{ nombre, monto }],
            grupos: [{ clave, nombre, monto, cuota: true|false, items: [{ concepto, detalle, monto, liga }] }],
            cobranza: { pagaron, pct }, mora: { acumulada, unidades, adelantos, unidadesAdelanto } | null,
            agua: { cobrado, pagado } | null, deudaAgua: { monto, unidades } | null,
            indicadores: [[etiqueta, valorTexto]], carpeta }],
  proyectos: [{ nombre, estado, monto, montoEtiqueta, avance, liga, nota }],
  morosidadFoto: { fecha, total, unidades, titulo, partes: [{ nombre, monto, unidades, nota }], nota } | null,
  revision: [{ tipo: "incongruencia"|"observacion", titulo, detalle }] | null,
  fuente: { vivo, generado, texto } }
```
`grupos[].cuota: false` excluye ese gasto de "¿en qué se va tu cuota?" (p. ej. pipas pagadas con derrama).

## OPCIONES
- `clave` (sessionStorage), `sexto: "reserva" | "agua"`, `agua: { titulo, frase, cobro, gasto, tile, explica, nota }`.
- `rubros: [{ nombre, re }]` — el orden fija el color (paleta categórica validada para daltonismo). Máximo 7;
  lo demás va a "Otros". `re` puede ser `{ test: t => … }` para reglas compuestas.
- `excluirDeCuota: /^agua/i`.
- `textos: { titulo, aviso (HTML), notaCuota, notaCobranza, notaSaldo, notaProyectos, notaRevision, privacidad, notaMorosidad, moraDesde, acerca (HTML) }`.

## Vistas
Portada con 6 indicadores (saldo con tendencia · ¿alcanzó el mes? · quién pagó · cuotas atrasadas · agua o reserva ·
en qué se va la cuota) + mosaico de secciones: `#meses`, `#mes-AAAA-MM` (deslizar cambia de mes), `#graficas`,
`#gastos`, `#morosidad`, `#agua`, `#proyectos`, `#revision`, `#acerca`. El mes en curso se marca "en curso".
Meses futuros se descartan solos.

## Página
`<body class="tb-pagina">` (menú en una fila deslizable en celular; omitir si el sitio ya tiene menú hamburguesa).
En el sitio plantilla, `js/finanzas.js` ya traduce el JSON de `Code.gs` al modelo del tablero; los rubros salen de los gastos fijos de la ficha.
