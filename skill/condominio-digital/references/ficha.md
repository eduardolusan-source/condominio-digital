# La ficha del condominio (condominio-digital/1)

La genera el configurador y se descarga como `condominio-<clave>.json`. Ejemplo: `assets/ejemplos/ficha-ejemplo.json`.
En modo rápido trae lo indispensable (nombre, unidades, cuota, correo, primer mes); lo demás queda con valores por omisión.

## Fase 0 · Leer y validar
1. Si `version` no es `condominio-digital/1`, pide una ficha nueva del configurador.
2. Resume en 5 líneas (nombre, unidades, cuota, agua, primer mes y módulos) y pide confirmación.
3. Huecos: pregunta solo lo indispensable para el paso siguiente.
4. Si trae nombres de vecinos o adeudos por unidad (no debería), no los uses en nada público y avísalo.
5. CLABE: 18 dígitos y dígito verificador (pesos 3,7,1; `(10 − Σ(dᵢ·pᵢ mod 10) mod 10) mod 10`). `generar_sitio.py` avisa si no cuadra.

## Qué hace cada campo

| Campo | Lo usa | Para |
|---|---|---|
| `condominio.nombre`, `nombreCorto` | hoja (Config `nombre`, `nombre_corto`), sitio | títulos, remitente del reporte, encabezado |
| `condominio.logo`, `colorPrincipal`, `colorSecundario` | sitio | encabezado (texto blanco u oscuro según contraste), gráficas |
| `unidades.lista` | hoja (pestaña Unidades, renglones de cobros) | **nunca** va al sitio; el sitio solo recibe `total` |
| `administracion.correoCondominio`, `correoCopia` | hoja (Config `correo_condominio`, `reporte_copia`) | quién recibe el kit mensual |
| `administracion.responsables` | sitio (Ayuda) | solo rol y correo; nunca nombre ni teléfono |
| `cobros.cuota`, `diaLimite`, `recargo`, `adicionales` | hoja (`cuota_mantenimiento`, `dia_limite`), sitio (Cómo pagar) | |
| `cobros.agua.modalidad` | hoja (`agua_aparte`), sitio | medidor, derrama o pipas → columna de agua, sexto indicador «El agua» |
| `cobros.banco` | sitio (Cómo pagar, botón Copiar CLABE) | |
| `gastos.fijos[].concepto` (+ proveedor) | hoja (`gastos_fijos`: conceptos precargados SIN monto), sitio (rubros de «¿en qué se va tu cuota?») | |
| `finanzas.desde`, `saldoInicial` | hoja | primera pestaña y su saldo; meses anteriores no se publican |
| `finanzas.conClave` | configurador / `generar_sitio.py --clave` | portón SHA-256 (cortesía, no seguridad) |
| `comunicacion.modulos` | hoja (`reporte_envio`), sitio (menú) | `reporte` → envío automático; `reglamento/areas/…` → página Reglas |
| `comunicacion.diaReporte`, `tono` | hoja (`dia_reporte`, `tono`) | disparador del reporte |
| `vida.areas`, `fechas`, `sanciones`, `reglamento` | sitio (Reglas y áreas) | |
| `sitio.api`, `sitio.claveHash` | configurador | se llenan en «Conecta y publica» |
| `cuentas.*` | tú | qué cuentas faltan y qué tan detallada debe ser la guía (`nivel`) |
