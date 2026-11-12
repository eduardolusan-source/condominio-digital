/* Datos de EJEMPLO con la forma exacta que entrega el Apps Script (condominio-digital/1).
   Se usan mientras el sitio no tiene la dirección /exec de su hoja, y en la vista previa del
   configurador. Se calculan con la cuota, el número de unidades y los gastos fijos del
   condominio, así que se parecen a la realidad, pero NO son cifras reales. */
window.datosEjemplo = function (C) {
  const cb = (C && C.cobros) || {}, U = Number(C && C.unidades && C.unidades.total) || 20, cuota = Number(cb.cuota) || 1500;
  const fijos = ((C && C.gastos && C.gastos.fijos) || []).map(g => g.concepto).filter(Boolean);
  const conceptos = fijos.length ? fijos : ["Vigilancia", "Limpieza", "Luz de áreas comunes"];
  const NOM = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const hoy = new Date(), anio = hoy.getFullYear(), mesHoy = hoy.getMonth();
  let semilla = U * 7 + cuota;
  const azar = () => { semilla = (semilla * 9301 + 49297) % 233280; return semilla / 233280; };
  const presupuesto = U * cuota * 0.78;
  const pesos = conceptos.map((_, i) => 1 / (i + 1.4)), sp = pesos.reduce((a, b) => a + b, 0);
  const meses = [];
  let saldo = U * cuota * 1.6, debe = 0, nDebe = 0;
  for (let m = 0; m <= mesHoy; m++) {
    const enCurso = m === mesHoy;
    const avance = enCurso ? Math.min(1, hoy.getDate() / 12) : 1;
    const pagaron = Math.round(U * (enCurso ? 0.9 * avance : 0.84 + azar() * 0.14));
    const manto = pagaron * cuota;
    const fij = conceptos.map((c, i) => [c, Math.round(presupuesto * pesos[i] / sp * (0.95 + azar() * 0.1) * (enCurso ? avance : 1))]);
    const variables = azar() > 0.45 && !enCurso ? [["Reparación de bomba", Math.round(1500 + azar() * 4000)], ["Material de limpieza", Math.round(500 + azar() * 900)]] : [];
    const tf = fij.reduce((a, b) => a + b[1], 0), tv = variables.reduce((a, b) => a + b[1], 0);
    const ini = saldo; saldo = ini + manto - tf - tv;
    if (!enCurso) { const nuevos = U - pagaron; nDebe = Math.max(1, Math.round(nuevos * 0.6)); debe = Math.max(cuota, debe * 0.55 + nuevos * cuota * 0.7); }
    meses.push({
      id: anio + "-" + String(m + 1).padStart(2, "0"), anio: anio, nombre: NOM[m], corto: NOM[m].slice(0, 3), unidades: U, cuota: cuota,
      saldoIni: Math.round(ini), saldoFin: Math.round(saldo),
      ingresos: { manto: manto, agua: 0, extra: 0 }, egresos: { fijos: tf, variables: tv },
      cobranza: { pagaron: pagaron, pct: Math.round(pagaron / U * 1000) / 10 },
      detalle: { fijos: fij, variables: variables },
      mora: { acumulada: Math.round(debe), unidades: nDebe, adelantos: cuota * 2, unidadesAdelanto: 1 },
      enCurso: enCurso
    });
  }
  return { ok: true, servicio: "condominio-digital", ejemplo: true, generado: new Date().toISOString(), hoy: meses[meses.length - 1].id,
    condominio: { nombre: (C && C.condominio && C.condominio.nombre) || "", unidades: U, cuota: cuota }, meses: meses,
    proyectos: [{ nombre: "Impermeabilización (ejemplo)", estado: "en cotización", liga: "", avance: "3 cotizaciones" }], pagosFuturos: [] };
};
