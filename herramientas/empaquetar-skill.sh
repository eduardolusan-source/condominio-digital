#!/usr/bin/env bash
# Arma el .zip del skill condominio-digital con las piezas vivas del repositorio
# (script, sitio, configurador, guía y pruebas), para subirlo a Claude:
# Configuración → Capacidades → Skills → Subir.
# Uso: herramientas/empaquetar-skill.sh [salida.zip]
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
SALIDA="$(realpath -m "${1:-$RAIZ/condominio-digital-skill.zip}")"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
S="$TMP/condominio-digital"
cp -r "$RAIZ/skill/condominio-digital" "$S"
mkdir -p "$S/assets/apps-script" "$S/assets/configurador" "$S/scripts/pruebas"
cp "$RAIZ/apps-script/Code.gs" "$S/assets/apps-script/Code.gs"
cp -r "$RAIZ/sitio" "$S/assets/sitio"
cp "$RAIZ/index.html" "$S/assets/configurador/index.html"
cp -r "$RAIZ/guia" "$S/assets/guia"
cp "$RAIZ/pruebas/simulador.js" "$RAIZ/pruebas/prueba-code.js" "$S/scripts/pruebas/"
rm -rf "$S"/scripts/__pycache__; find "$S" -name '.DS_Store' -delete
# Nada privado dentro del paquete: ni IDs de hojas reales ni direcciones /exec reales.
if grep -rEq 'AKfycb[A-Za-z0-9_-]{20,}|1igWyol|1GauI7' "$S"; then echo "Hay un identificador real dentro del skill; revísalo." >&2; exit 1; fi
( cd "$S/scripts/pruebas" && node prueba-code.js >/dev/null && rm -f salida-doget.json ) || { echo "Las pruebas del script fallaron dentro del paquete." >&2; exit 1; }
rm -f "$SALIDA"; ( cd "$TMP" && zip -qr "$SALIDA" condominio-digital )
echo "Skill empaquetado: $SALIDA ($(unzip -l "$SALIDA" | tail -1 | awk '{print $2}') archivos)"
