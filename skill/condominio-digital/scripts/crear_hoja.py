#!/usr/bin/env python3
"""Crea la hoja de captura mensual (.xlsx) a partir de la ficha del condominio.

Uso:  python3 crear_hoja.py ficha.json salida.xlsx

La hoja sigue la estructura que lee assets/apps-script/Code.gs (el script único):
una pestaña por mes (desde finanzas.desde hasta diciembre), etiquetas en la
columna B, «Mes y año» en C5, saldo inicial encadenado al saldo final del mes
anterior, cobros por unidad, egresos fijos y variables con liga al comprobante
y proyectos. Se sube a Drive y se abre como Hoja de Google
(Archivo → Guardar como Hojas de Google).

Nunca escribe datos de vecinos: solo los nombres de las unidades.
"""
import json
import sys
from datetime import date

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

MESES = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO",
         "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"]
AZUL = PatternFill("solid", fgColor="DDEBF7")      # celdas que se capturan
GRIS = PatternFill("solid", fgColor="F2F2F2")      # encabezados de sección
NEGRITA = Font(bold=True)
TITULO = Font(bold=True, size=14)
FINO = Side(style="thin", color="BFBFBF")
MONEDA = '"$"#,##0.00;[Red]-"$"#,##0.00'


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def pestana(wb, ficha, nombre, anio, mes, previa):
    h = wb.create_sheet(nombre)
    c = ficha["condominio"]
    unidades = ficha["unidades"]["lista"]
    cuota = num(ficha["cobros"]["cuota"])
    agua_aparte = ficha["cobros"]["agua"]["modalidad"] in ("medidor individual", "derrama", "pipas")
    casa = num(ficha["cobros"].get("casaClub", {}).get("renta")) > 0
    gastos = [g for g in ficha["gastos"]["fijos"] if str(g.get("concepto", "")).strip()]

    h.column_dimensions["A"].width = 2
    h.column_dimensions["B"].width = 44
    for col in "CDE":
        h.column_dimensions[col].width = 20
    fila = [0]

    def escribe(b="", cv=None, dv=None, ev=None, estilo=None, azul=False, fmt=None):
        fila[0] += 1
        r = fila[0]
        if b != "":
            h.cell(r, 2, b)
        for col, v in ((3, cv), (4, dv), (5, ev)):
            if v is not None:
                cel = h.cell(r, col, v)
                if fmt:
                    cel.number_format = fmt
                if azul:
                    cel.fill = AZUL
        if estilo == "titulo":
            h.cell(r, 2).font = TITULO
        elif estilo == "seccion":
            for col in range(2, 6):
                h.cell(r, col).fill = GRIS
                h.cell(r, col).font = NEGRITA
        elif estilo == "negrita":
            for col in range(2, 6):
                h.cell(r, col).font = NEGRITA
        return r

    escribe(c["nombre"].upper() + " · Captura mensual de cuentas", estilo="titulo")              # 1
    escribe("Captura solo las celdas en azul. Lo demás se calcula solo.")                         # 2
    escribe()                                                                                      # 3
    escribe("DATOS DEL MES", estilo="seccion")                                                     # 4
    r_mes = escribe("Mes y año", "=DATE(%d,%d,1)" % (anio, mes))                                    # 5 → C5
    h.cell(r_mes, 3).number_format = "mmmm yyyy"
    r_ini = escribe("Saldo inicial ($)", 0, azul=previa is None, fmt=MONEDA)
    escribe("Número de unidades", len(unidades))
    escribe("Cuota de mantenimiento", cuota, fmt=MONEDA, azul=True)
    escribe()
    escribe("RESUMEN DEL MES · se calcula solo", estilo="seccion")
    r_res_manto = escribe("(+) Mantenimiento cobrado", 0, fmt=MONEDA)
    r_res_agua = escribe("(+) Agua cobrada", 0, fmt=MONEDA) if agua_aparte else None
    r_res_casa = escribe("(+) Renta de casa club", 0, fmt=MONEDA) if casa else None
    r_res_fijos = escribe("(−) Egresos fijos", 0, fmt=MONEDA)
    r_res_var = escribe("(−) Egresos variables", 0, fmt=MONEDA)
    r_fin = escribe("SALDO FINAL DEL MES", 0, fmt=MONEDA, estilo="negrita")
    escribe()

    escribe("COBROS POR DEPARTAMENTO", estilo="seccion")
    escribe("Unidad", "Mantenimiento", "Agua", "Extraordinario y otros", estilo="negrita")
    r_u0 = fila[0] + 1
    for u in unidades:
        escribe(u, None, None, None)
        for col in ((3, 4, 5) if agua_aparte else (3, 5)):
            h.cell(fila[0], col).fill = AZUL
            h.cell(fila[0], col).number_format = MONEDA
    r_u1 = fila[0]
    r_tot_cob = escribe("TOTAL COBRADO", "=SUM(C%d:C%d)" % (r_u0, r_u1), "=SUM(D%d:D%d)" % (r_u0, r_u1), "=SUM(E%d:E%d)" % (r_u0, r_u1), fmt=MONEDA, estilo="negrita")
    escribe()

    r_tot_casa = None
    if casa:
        escribe("OTROS INGRESOS (renta de casa club y otros)", estilo="seccion")
        escribe("Concepto", "Monto", "Fecha del evento", estilo="negrita")
        r0 = fila[0] + 1
        for _ in range(4):
            escribe("", None, None)
            h.cell(fila[0], 2).fill = AZUL
            h.cell(fila[0], 3).fill = AZUL
            h.cell(fila[0], 3).number_format = MONEDA
        r_tot_casa = escribe("TOTAL", "=SUM(C%d:C%d)" % (r0, fila[0]), fmt=MONEDA, estilo="negrita")
        escribe()

    def egresos(titulo, conceptos, libres):
        escribe(titulo, estilo="seccion")
        escribe("Concepto", "Monto", "Comprobante (liga de Drive)", estilo="negrita")
        r0 = fila[0] + 1
        for g in conceptos:
            nombre = g["concepto"] + (" · " + g["proveedor"] if g.get("proveedor") else "")
            escribe(nombre, None, None)
            h.cell(fila[0], 3).fill = AZUL
            h.cell(fila[0], 3).number_format = MONEDA
            h.cell(fila[0], 4).fill = AZUL
        for _ in range(libres):
            escribe("", None, None)
            for col in (2, 3, 4):
                h.cell(fila[0], col).fill = AZUL
            h.cell(fila[0], 3).number_format = MONEDA
        return escribe("TOTAL", "=SUM(C%d:C%d)" % (r0, fila[0]), fmt=MONEDA, estilo="negrita")

    r_tot_fijos = egresos("EGRESOS FIJOS (servicios)", gastos, 3)
    escribe()
    r_tot_var = egresos("EGRESOS VARIABLES", [], 12)
    escribe()
    escribe("PROYECTOS EN CURSO", estilo="seccion")
    escribe("Proyecto", "Estado", "Avance o liga", estilo="negrita")
    for _ in range(4):
        escribe("", None, None)
        for col in (2, 3, 4):
            h.cell(fila[0], col).fill = AZUL

    # Fórmulas del resumen (ya se conocen todas las filas)
    if previa is not None:
        ref = previa[0] if " " not in previa[0] else "'%s'" % previa[0]
        h.cell(r_ini, 3, "=%s!C%d" % (ref, previa[1]))
    h.cell(r_res_manto, 3, "=C%d" % r_tot_cob)
    if r_res_agua:
        h.cell(r_res_agua, 3, "=D%d" % r_tot_cob)
    if r_res_casa:
        h.cell(r_res_casa, 3, "=C%d" % r_tot_casa)
    h.cell(r_res_fijos, 3, "=C%d" % r_tot_fijos)
    h.cell(r_res_var, 3, "=C%d" % r_tot_var)
    sumas = "+".join("C%d" % r for r in (r_res_manto, r_res_agua, r_res_casa) if r) + "+E%d" % r_tot_cob
    h.cell(r_fin, 3, "=C%d+%s-C%d-C%d" % (r_ini, sumas, r_res_fijos, r_res_var))
    for row in h.iter_rows(min_row=1, max_row=fila[0], min_col=2, max_col=5):
        for cel in row:
            cel.border = Border(bottom=FINO)
            cel.alignment = Alignment(vertical="center")
    h.freeze_panes = "C1"
    return r_fin, r_u0, r_u1


def main(ruta_ficha, ruta_salida):
    ficha = json.load(open(ruta_ficha, encoding="utf-8"))
    assert ficha.get("version") == "condominio-digital/1", "No es una ficha condominio-digital/1"
    desde = ficha["finanzas"]["desde"]
    anio, mes0 = int(desde[:4]), int(desde[5:7])
    wb = Workbook()
    leeme = wb.active
    leeme.title = "LÉEME"
    lineas = [
        ficha["condominio"]["nombre"] + " · hoja de captura",
        "",
        "1. Sube este archivo a Google Drive y ábrelo: Archivo → Guardar como Hojas de Google.",
        "2. Cada mes captura SOLO las celdas en azul de la pestaña del mes.",
        "3. Un pago adelantado se anota en la pestaña del mes que cubre.",
        "4. El comprobante de cada gasto va como liga (Insertar → Vínculo), no como nombre de archivo.",
        "5. No cambies los nombres de las secciones (columna B): el script los busca por nombre.",
        "6. Desde enero del año siguiente, las pestañas llevan año: ENERO %d, FEBRERO %d…" % (anio + 1, anio + 1),
        "",
        "Lo que se publica en el sitio es siempre agregado: nunca cobros por departamento.",
    ]
    for i, t in enumerate(lineas, 1):
        leeme.cell(i, 1, t)
    leeme["A1"].font = TITULO
    leeme.column_dimensions["A"].width = 100

    previa = None
    saldo = num(ficha["finanzas"].get("saldoInicial"))
    for m in range(mes0, 13):
        nombre = MESES[m - 1]
        r_fin, _, _ = pestana(wb, ficha, nombre, anio, m, previa)
        if previa is None:
            wb[nombre]["C6"] = saldo
        previa = (nombre, r_fin)
    wb.save(ruta_salida)
    print("Hoja creada:", ruta_salida, "·", 13 - mes0, "meses ·", len(ficha["unidades"]["lista"]), "unidades")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
