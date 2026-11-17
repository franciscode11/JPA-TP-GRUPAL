# Guía única: conectar el TP con ARCA en homologación

Actualizada el 17 de noviembre de 2026. Esta guía parte de que ya tienen una cuenta y pueden ingresar a ARCA con Clave Fiscal.

El procedimiento es exclusivamente para `TESTING/HOMOLOGACIÓN`. Los comprobantes y CAE obtenidos allí son de prueba y no tienen validez fiscal. No cambien las URLs del proyecto por las de producción.

## Datos que deben definir antes de empezar

Anoten dos CUIT sin guiones:

- `CUIT_CERTIFICADO`: CUIT de la persona humana que inicia sesión y usa WSASS. El CSR debe llevar exactamente esta CUIT.
- `CUIT_EMISOR`: CUIT que el sistema representará al pedir el CAE. Puede ser el mismo CUIT o el de la empresa representada.

Elijan además el tipo de comprobante de la demostración:

- `11` para Factura C, normalmente si el emisor es monotributista o exento.
- `6` para Factura B.
- `1` para Factura A.

Para el TP conviene probar un único tipo compatible con la condición del emisor. Si no saben cuál corresponde, confírmenlo con el profesor o contador antes de elegirlo.

## Paso 1 — Adherir WSASS en ARCA

1. Ingresen a ARCA con Clave Fiscal de una persona humana.
2. Abran `Administrador de Relaciones de Clave Fiscal`.
3. Seleccionen la opción para adherir un servicio.
4. Busquen y adhieran `WSASS - Autoservicio de Acceso a WebServices (TESTING/HOMOLOGACIÓN)`.
5. Confirmen la relación.
6. Cierren sesión, vuelvan a ingresar y abran WSASS.
7. Verifiquen que la pantalla diga `TESTING/HOMOLOGACIÓN`.

WSASS no es delegable: este paso se hace con la Clave Fiscal de una persona humana.

## Paso 2 — Crear la clave privada y el CSR en la Mac

Abandonen cualquier servidor que esté usando la terminal con `Control + C`. Luego ejecuten este bloque, reemplazando el CUIT de ejemplo por la CUIT de la persona conectada a WSASS:

```bash
export CUIT_CERTIFICADO=20123456789
export ARCA_DIR="$HOME/arca-homologacion-factura"

mkdir -p "$ARCA_DIR"
chmod 700 "$ARCA_DIR"

openssl genrsa -out "$ARCA_DIR/factura-arca-homo.key" 2048
chmod 600 "$ARCA_DIR/factura-arca-homo.key"

openssl req -new \
  -key "$ARCA_DIR/factura-arca-homo.key" \
  -subj "/C=AR/O=TP Facturacion/CN=factura-arca-homo/serialNumber=CUIT ${CUIT_CERTIFICADO}" \
  -out "$ARCA_DIR/factura-arca-homo.csr"

openssl req \
  -in "$ARCA_DIR/factura-arca-homo.csr" \
  -noout -subject -verify
```

El último comando debe mostrar `verify OK` y un `serialNumber` con la CUIT correcta. Si no coincide, vuelvan a generar el CSR antes de continuar.

Copien el CSR al portapapeles:

```bash
pbcopy < "$ARCA_DIR/factura-arca-homo.csr"
```

No compartan ni suban `factura-arca-homo.key`. Es la clave privada.

## Paso 3 — Crear el certificado en WSASS

1. Dentro de WSASS, entren a `Nuevo Certificado`.
2. En nombre simbólico o alias escriban `factura-arca-homo`. Si ya existe, usen otro alias claro.
3. Comprueben que la CUIT no editable sea la misma de `CUIT_CERTIFICADO`.
4. En la solicitud PKCS#10 peguen el contenido copiado con `Command + V`.
5. Deben quedar incluidas las líneas `BEGIN CERTIFICATE REQUEST` y `END CERTIFICATE REQUEST`.
6. Presionen `Crear DN y Obtener Certificado`.
7. Copien la respuesta completa, desde `BEGIN CERTIFICATE` hasta `END CERTIFICATE`.

Con el certificado todavía en el portapapeles, vuelvan a la terminal y guárdenlo:

```bash
pbpaste > "$ARCA_DIR/factura-arca-homo.crt"

openssl x509 \
  -in "$ARCA_DIR/factura-arca-homo.crt" \
  -noout -subject -issuer -dates
```

Si `openssl x509` da error, el archivo no contiene únicamente el certificado PEM. Vuelvan a copiar el bloque completo desde WSASS.

## Paso 4 — Comprobar que certificado y clave corresponden

```bash
openssl pkey \
  -in "$ARCA_DIR/factura-arca-homo.key" \
  -pubout -outform pem | openssl sha256

openssl x509 \
  -in "$ARCA_DIR/factura-arca-homo.crt" \
  -pubkey -noout | openssl sha256
```

Los dos valores SHA-256 deben ser idénticos. Si son diferentes, el certificado fue creado con otra clave y no funcionará.

## Paso 5 — Autorizar el servicio de factura electrónica

1. En WSASS abran `Crear Autorización a Servicio`.
2. Seleccionen el alias creado, por ejemplo `factura-arca-homo`.
3. Revisen la CUIT del DN; es la del certificado.
4. En `CUIT representado` escriban el `CUIT_EMISOR` que usará el TP.
5. En servicio elijan `wsfe`, correspondiente al acceso usado por WSFEv1.
6. Presionen `Crear Autorización de Acceso`.
7. Entren a `Autorizaciones` y verifiquen alias, CUIT representado y servicio `wsfe`.

No alcanza con crear el certificado: sin esta autorización WSFE rechazará la operación.

## Paso 6 — Revisar el punto de venta de homologación

WSFE sólo acepta puntos de venta habilitados para la CUIT representada. El proyecto ofrece los puntos 1 y 2. Primero intenten con el punto 1 (`Casa Central`).

Si ARCA informa que el punto de venta es inválido, consulten el asignado mediante `FEParamGetPtosVenta` o el ABM correspondiente. Para ver los puntos locales:

```bash
PGPASSWORD=factura123 psql \
  -h localhost -U factura_user -d facturacion_orm \
  -c "SELECT id, numero, descripcion FROM punto_venta ORDER BY numero;"
```

Si, por ejemplo, ARCA indica que deben usar el punto `3`, actualicen Casa Central así:

```bash
PGPASSWORD=factura123 psql \
  -h localhost -U factura_user -d facturacion_orm \
  -c "UPDATE punto_venta SET numero = 3 WHERE descripcion ILIKE '%Casa Central%';"
```

Reemplacen `3` por el número real devuelto por ARCA. No inventen el punto de venta.

## Paso 7 — Configurar y levantar el proyecto

En una terminal nueva ejecuten el bloque completo. Reemplacen `CUIT_EMISOR` y el tipo de comprobante:

```bash
cd /Users/francisco/Downloads/FacturaArca

export ARCA_ENABLED=true
export ARCA_CUIT=CUIT_EMISOR
export ARCA_PRIVATE_KEY_PATH="$HOME/arca-homologacion-factura/factura-arca-homo.key"
export ARCA_CERTIFICATE_PATH="$HOME/arca-homologacion-factura/factura-arca-homo.crt"
export ARCA_COMPROBANTE_TIPO=11

npm install --prefix frontend
npm run build --prefix frontend
mvn spring-boot:run
```

Ejemplo: si el CUIT representado es `20999999999`, la línea debe ser `export ARCA_CUIT=20999999999`, sin comillas ni guiones.

No cierren esa terminal mientras usan el sistema. El servidor queda en `http://localhost:8080`.

## Paso 8 — Confirmar la configuración

En otra terminal ejecuten:

```bash
curl http://localhost:8080/api/arca/estado
```

La respuesta correcta debe contener:

```text
"configurada":true
"ambiente":"HOMOLOGACIÓN"
```

Si dice `configurada:false`, revisen `ARCA_ENABLED`, la CUIT y las rutas de los archivos.

## Paso 9 — Hacer la primera prueba completa

1. Abran `http://localhost:8080`.
2. La franja superior debe indicar `Homologación ARCA` y `Credenciales listas`.
3. Presionen `Nueva factura`.
4. Elijan fecha, cliente, condición IVA, punto de venta y moneda.
5. Abran `Buscar artículo`, elijan Minorista o Mayorista y agreguen un artículo.
6. Presionen `Guardar pendiente`.
7. El sistema mostrará un borrador sin número fiscal. Esto es correcto.
8. En la tabla presionen `Emitir ARCA` y confirmen.
9. El servidor pide un ticket a WSAA, consulta el último número autorizado y solicita el CAE a WSFEv1.
10. Si ARCA aprueba, guarda número, CAE y vencimiento, cambia a `EMITIDA` y bloquea la edición.
11. Si ARCA rechaza, el borrador queda `PENDIENTE` para corregirlo.

## Paso 10 — Qué revisar si falla

- `La configuración de ARCA está incompleta`: falta una variable, la CUIT no tiene 11 dígitos o una ruta no existe.
- Error de firma: certificado y clave no corresponden, o el certificado venció.
- `No autorizado para el servicio`: falta autorizar `wsfe` para el alias y el CUIT representado.
- Error de CUIT representada: `ARCA_CUIT` no coincide con la CUIT autorizada en WSASS.
- Punto de venta inválido: el número elegido no está habilitado para esa CUIT en homologación.
- Tipo de comprobante inválido: `ARCA_COMPROBANTE_TIPO` no corresponde al emisor o receptor.
- Error de fecha u hora: activen fecha y hora automáticas en macOS y reinicien el servidor.

## Comandos de verificación rápida

```bash
ls -l "$HOME/arca-homologacion-factura"

openssl x509 \
  -in "$HOME/arca-homologacion-factura/factura-arca-homo.crt" \
  -noout -subject -issuer -dates

curl http://localhost:8080/api/arca/estado
```

La carpeta debe contener la clave `.key`, el CSR `.csr` y el certificado `.crt`. Ninguno debe estar dentro del repositorio.

## Fuentes oficiales verificadas

- ARCA, certificados de homologación: https://www.arca.gob.ar/ws/documentacion/certificados.asp
- ARCA, manual WSASS: https://www.arca.gob.ar/ws/WSASS/html/
- ARCA, generación del CSR: https://www.arca.gob.ar/ws/WSASS/html/generarcsr.html
- ARCA, creación del certificado: https://www.arca.gob.ar/ws/WSASS/html/crearcertificado.html
- ARCA, creación de autorización: https://www.arca.gob.ar/ws/WSASS/html/crearautorizacion.html
- ARCA, documentación WSAA: https://www.arca.gob.ar/ws/documentacion/wsaa.asp
- ARCA, documentación WSFEv1: https://www.arca.gob.ar/fe/ayuda/webservice.asp

El proyecto usa únicamente estos endpoints de prueba:

- WSAA: `https://wsaahomo.afip.gov.ar/ws/services/LoginCms`
- WSFEv1: `https://wswhomo.afip.gov.ar/wsfev1/service.asmx`
