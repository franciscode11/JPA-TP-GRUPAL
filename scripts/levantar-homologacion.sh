#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export ARCA_CERTIFICATE_PATH="${ARCA_CERTIFICATE_PATH:-$HOME/Downloads/factura-arca-homo.crt}"
export ARCA_PRIVATE_KEY_PATH="${ARCA_PRIVATE_KEY_PATH:-$HOME/.config/factura-arca/homologacion/factura-arca-homo.key}"
for archivo in "$ARCA_CERTIFICATE_PATH" "$ARCA_PRIVATE_KEY_PATH"; do
  if [[ ! -r "$archivo" ]]; then
    echo "No se puede leer $archivo. Revisá las rutas del certificado y de la clave." >&2
    exit 1
  fi
done
sujeto=$(openssl x509 -in "$ARCA_CERTIFICATE_PATH" -noout -subject -nameopt RFC2253)
cuit=$(sed -nE 's/.*serialNumber=CUIT ([0-9]{11})(,.*)?$/\1/p' <<< "$sujeto")
if [[ ! "$cuit" =~ ^[0-9]{11}$ ]]; then
  echo "El certificado no contiene una CUIT válida en el campo serialNumber." >&2
  exit 1
fi
export ARCA_CUIT="$cuit" ARCA_ENABLED=true ARCA_COMPROBANTE_TIPO=11
exec mvn spring-boot:run
