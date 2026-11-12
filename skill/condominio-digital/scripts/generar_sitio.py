#!/usr/bin/env python3
"""Genera el sitio del condominio a partir de la ficha (lo mismo que el botón
«Descargar mi sitio» del configurador, para cuando Claude arma el sitio).

Uso:
  python3 generar_sitio.py ficha.json SALIDA/ [--api URL_EXEC] [--clave CLAVE] [--zip]

- Copia la plantilla assets/sitio/ a SALIDA/ y escribe SALIDA/js/condominio.js.
- --api: dirección /exec del Apps Script (sin ella, el sitio muestra datos de ejemplo marcados).
- --clave: clave de las finanzas; solo se guarda su SHA-256. Nunca se escribe la clave.
- --zip: además deja SALIDA.zip listo para arrastrar a Cloudflare Pages.
Nunca escribe datos de vecinos: ni la lista de unidades, ni nombres, ni teléfonos.
"""
import argparse, hashlib, json, re, shutil, sys
from datetime import date
from pathlib import Path

AQUI = Path(__file__).resolve().parent
PLANTILLA = next((p for p in [AQUI.parent / "assets" / "sitio", AQUI.parent.parent.parent / "sitio"] if (p / "js" / "sitio.js").exists()), None)
API_RE = re.compile(r"^https://script\.google\.com/macros/s/[\w-]+/exec$")


def config(f, api, clave_hash):
    c, co, cb = f["condominio"], f.get("comunicacion", {}), f["cobros"]
    vida, ad = f.get("vida", {}), f.get("administracion", {})
    return {
        "version": f["version"],
        "condominio": {k: c.get(k, "") for k in ("nombre", "nombreCorto", "ciudad", "estado", "tipo", "logo", "colorPrincipal", "colorSecundario")},
        "unidades": {"total": len(f["unidades"].get("lista", [])) or f["unidades"].get("total", 0), "nombre": f["unidades"].get("nombre", "unidad")},
        "cobros": {"cuota": float(cb.get("cuota") or 0), "diaLimite": int(cb.get("diaLimite") or 10), "recargo": cb.get("recargo", {}),
                   "adicionales": [a for a in cb.get("adicionales", []) if a.get("concepto")], "agua": cb.get("agua", {}),
                   "casaClub": cb.get("casaClub", {}), "banco": cb.get("banco", {}), "formasPago": cb.get("formasPago", [])},
        "gastos": {"fijos": [{"concepto": g["concepto"]} for g in f.get("gastos", {}).get("fijos", []) if g.get("concepto")]},
        "comunicacion": {"modulos": co.get("modulos", ["finanzas"]), "diaReporte": int(co.get("diaReporte") or 10)},
        "vida": {"reglamento": vida.get("reglamento", ""), "areas": [a for a in vida.get("areas", []) if a.get("nombre")],
                 "sanciones": [s for s in vida.get("sanciones", []) if s.get("conducta")], "fechas": [x for x in vida.get("fechas", []) if x.get("evento")]},
        "contacto": {"correo": ad.get("correoCondominio", ""), "horario": ad.get("horario", ""), "administra": ad.get("tipo", ""), "empresa": ad.get("empresa", ""),
                     "responsables": [{"rol": r.get("rol", ""), "correo": r.get("correo", "")} for r in ad.get("responsables", []) if r.get("rol") or r.get("correo")]},
        "sitio": {"api": api or "", "claveHash": clave_hash, "ejemplo": not api, "generado": date.today().isoformat()},
    }


def clabe_ok(clabe):
    d = re.sub(r"\s", "", clabe or "")
    if not d:
        return True
    if not re.fullmatch(r"\d{18}", d):
        return False
    s = sum((int(x) * (3, 7, 1)[i % 3]) % 10 for i, x in enumerate(d[:17]))
    return (10 - s % 10) % 10 == int(d[17])


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("ficha"); ap.add_argument("salida"); ap.add_argument("--api", default=""); ap.add_argument("--clave", default=""); ap.add_argument("--zip", action="store_true")
    a = ap.parse_args()
    if PLANTILLA is None:
        sys.exit("No encontré la plantilla del sitio (assets/sitio).")
    f = json.load(open(a.ficha, encoding="utf-8"))
    if f.get("version") != "condominio-digital/1":
        sys.exit("Ese archivo no es una ficha condominio-digital/1.")
    if a.api and not API_RE.match(a.api.strip()):
        sys.exit("La dirección debe ser https://script.google.com/macros/s/…/exec (no /dev).")
    if not clabe_ok(f["cobros"].get("banco", {}).get("clabe")):
        print("AVISO: la CLABE de la ficha no pasa el dígito verificador; revísala con la persona.", file=sys.stderr)
    if f.get("finanzas", {}).get("conClave") == "sí" and not a.clave:
        print("AVISO: la ficha pide clave para finanzas y no diste --clave: las finanzas quedan abiertas.", file=sys.stderr)
    salida = Path(a.salida)
    if salida.exists():
        shutil.rmtree(salida)
    shutil.copytree(PLANTILLA, salida)
    h = hashlib.sha256(a.clave.strip().encode()).hexdigest() if a.clave.strip() else ""
    conf = config(f, a.api.strip(), h)
    (salida / "js" / "condominio.js").write_text(
        "/* Configuración del sitio, generada el %s desde la ficha. Nunca lleva datos de vecinos. */\nwindow.CONDOMINIO = %s;\n"
        % (conf["sitio"]["generado"], json.dumps(conf, ensure_ascii=False, indent=2)), encoding="utf-8")
    texto = json.dumps(conf, ensure_ascii=False)
    assert not any(u in texto for u in f["unidades"].get("lista", []) if len(u) > 3 and re.search(r"[A-Za-z]", u) and re.search(r"\d", u)), "una unidad se coló en condominio.js"
    if a.zip:
        shutil.make_archive(str(salida), "zip", root_dir=salida.parent, base_dir=salida.name)
    print("Sitio generado en", salida, "· conectado" if a.api else "· con datos de ejemplo (falta --api)", "· con clave" if h else "")


if __name__ == "__main__":
    main()
