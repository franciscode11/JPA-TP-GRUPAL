# Guía de alta y homologación ARCA para el TP

Actualizada el 17 de noviembre de 2026.

## Qué vamos a hacer

El sistema guarda primero una factura local con estado `PENDIENTE`. Luego, una acción separada solicita autorización a ARCA mediante WSAA y WSFEv1. La factura pasa a `EMITIDA` únicamente cuando ARCA responde con resultado aprobado y entrega un CAE.

Todo este procedimiento se realiza en homologación. Los comprobantes obtenidos en este ambiente son de prueba y no tienen validez fiscal.

## Antes de empezar

Necesitan:

1. Una persona humana con CUIT y Clave Fiscal habilitada.
2. Acceso al portal de ARCA.
3. OpenSSL instalado. En macOS y Linux suele estar disponible desde la terminal.
4. Un lugar privado, fuera del repositorio, para guardar la clave y el certificado.

El WSASS de homologación no es delegable. La adhesión debe hacerla una persona humana ingresando con su propia Clave Fiscal. Luego, desde WSASS, el certificado puede autorizarse para representar al CUIT que corresponda.

## Obtener CUIT y Clave Fiscal si todavía no las tienen

1. Ingresen a la sección oficial de inscripción de ARCA.
2. Para una persona humana con DNI argentino, pueden iniciar el alta desde CUIT Digital o desde la aplicación ARCA Móvil.
3. Completen la validación de identidad, domicilio y datos que solicite ARCA.
4. Verifiquen que la CUIT esté activa y que puedan ingresar al portal con Clave Fiscal.

Para el TP no hace falta emitir nada en producción. La cuenta real se usa para identificarse y obtener acceso al ambiente de homologación.

## Adherir el servicio WSASS

1. Ingresen al portal de ARCA con CUIT y Clave Fiscal de una persona humana.
2. Abran `Administrador de Relaciones de Clave Fiscal`.
3. Elijan la opción para adherir un servicio.
4. Busquen `WSASS - Autoservicio de Acceso a WebServices (TESTING/HOMOLOGACIÓN)`.
5. Confirmen la adhesión.
6. Cierren la sesión y vuelvan a ingresar si el servicio todavía no aparece.
7. Abran WSASS y confirmen que el encabezado indique `TESTING/HOMOLOGACIÓN`.

## Generar la clave privada y el CSR

Creen una carpeta privada fuera del repositorio. En estos ejemplos se usa `~/arca-homologacion`:

```bash
mkdir -p ~/arca-homologacion
chmod 700 ~/arca-homologacion
cd ~/arca-homologacion
```

Generen una clave RSA de 2048 bits:

```bash
openssl genrsa -out factura-tp.key 2048
chmod 600 factura-tp.key
```

Generen el CSR. Reemplacen `NOMBRE DEL GRUPO` y `20123456789` por sus datos. La CUIT debe tener 11 dígitos, sin guiones. Debe existir un espacio entre `CUIT` y el número:

```bash
openssl req -new \
  -key factura-tp.key \
  -subj "/C=AR/O=NOMBRE DEL GRUPO/CN=factura-tp/serialNumber=CUIT 20123456789" \
  -out factura-tp.csr
```

Revisen el pedido antes de subirlo:

```bash
openssl req -in factura-tp.csr -noout -subject -verify
```

La clave `factura-tp.key` es secreta. No se sube a GitHub, no se envía por WhatsApp y no se comparte por correo.

## Crear el certificado en WSASS

1. Dentro de WSASS, abran `Nuevo Certificado`.
2. Escriban un alias claro, por ejemplo `factura-tp-grupo`.
3. Confirmen que la CUIT mostrada coincida con la CUIT incluida en el CSR.
4. Abran `factura-tp.csr` con un editor de texto y copien el bloque completo, incluidas las líneas `BEGIN CERTIFICATE REQUEST` y `END CERTIFICATE REQUEST`.
5. Peguen el CSR en el formulario PKCS#10.
6. Presionen `Crear DN y obtener certificado`.
7. Guarden la respuesta como `factura-tp.crt` o `factura-tp.pem` dentro de la carpeta privada.

Si el alias ya existe, usen `Agregar certificado a alias` en lugar de crear un DN nuevo.

## Autorizar el acceso a WSFEv1

1. En WSASS, abran `Crear autorización a servicio`.
2. Seleccionen el alias `factura-tp-grupo`.
3. En `CUIT representado`, indiquen el CUIT que emitirá los comprobantes de prueba.
4. En la lista de servicios, elijan el servicio de Facturación Electrónica identificado como `wsfe`.
5. Confirmen con `Crear autorización de acceso`.
6. Abran `Autorizaciones` y verifiquen que aparezcan el alias, el CUIT representado y el servicio `wsfe`.

## Verificar el certificado descargado

Ejecuten:

```bash
openssl x509 -in factura-tp.crt -noout -subject -issuer -dates
```

El certificado y la clave deben corresponder entre sí. Verifíquenlo comparando sus claves públicas:

```bash
openssl pkey -in factura-tp.key -pubout -outform pem | openssl sha256
openssl x509 -in factura-tp.crt -pubkey -noout | openssl sha256
```

Los dos resultados SHA-256 deben ser iguales.

## Configurar el proyecto

Desde una terminal, definan las variables sin copiar los archivos al repositorio:

```bash
export ARCA_ENABLED=true
export ARCA_CUIT=20123456789
export ARCA_PRIVATE_KEY_PATH="$HOME/arca-homologacion/factura-tp.key"
export ARCA_CERTIFICATE_PATH="$HOME/arca-homologacion/factura-tp.crt"
export ARCA_COMPROBANTE_TIPO=11
```

`ARCA_COMPROBANTE_TIPO=11` corresponde a Factura C. No cambien el tipo sin confirmar antes la condición tributaria del emisor y el tipo de comprobante habilitado en el punto de venta de homologación.

El proyecto fija internamente estos endpoints de prueba:

- WSAA: `https://wsaahomo.afip.gov.ar/ws/services/LoginCms`
- WSFEv1: `https://wswhomo.afip.gov.ar/wsfev1/service.asmx`

La aplicación rechaza endpoints que no contengan `homo`, para evitar una emisión accidental en producción.

## Levantar y probar

1. Compilen el frontend:

```bash
cd frontend
npm install
npm run build
cd ..
```

2. Ejecuten el backend:

```bash
mvn spring-boot:run
```

3. Abran `http://localhost:8080`.
4. La franja superior debe mostrar `Homologación ARCA` y confirmar que las credenciales están listas.
5. Presionen `Nueva factura`, completen la cabecera y agreguen un artículo desde el maestro de listas de precios.
6. Presionen `Guardar pendiente`.
7. En la tabla, presionen `Emitir ARCA` y confirmen la solicitud.
8. Si ARCA aprueba, el estado cambia a `EMITIDA`, aparece el CAE y la factura deja de poder editarse o eliminarse.

## Qué hace el servidor durante la emisión

1. Crea un TRA para el servicio `wsfe`.
2. Firma el TRA con la clave privada y el certificado mediante CMS/PKCS#7.
3. Envía la firma a WSAA y recibe `Token` y `Sign`.
4. Consulta `FECompUltimoAutorizado` para conocer el último número aprobado.
5. Usa el número siguiente para llamar a `FECAESolicitar`.
6. Si el resultado es `A`, guarda el número definitivo, CAE, vencimiento y estado `EMITIDA`.
7. Si el resultado es rechazado, conserva la factura como `PENDIENTE` y guarda el motivo para corregirla.

## Errores frecuentes

- `La configuración de ARCA está incompleta`: falta una variable o la ruta no apunta a un archivo válido.
- Error de certificado o firma: la clave privada no corresponde al certificado, el certificado venció o el archivo no es PEM.
- `No autorizado para el servicio`: falta crear la autorización `wsfe` para el alias y CUIT representado.
- Punto de venta inválido: el punto de venta configurado en la base no coincide con uno habilitado en homologación.
- Número de comprobante incorrecto: no debe inventarse al emitir. El sistema consulta el último autorizado y usa el siguiente.
- Condición IVA o tipo de comprobante inválidos: revisen la condición del receptor y el tipo A, B o C habilitado para el emisor.
- Diferencia de hora: verifiquen que la fecha y hora del equipo sean correctas, porque WSAA valida la vigencia del TRA.

## Producción no forma parte de esta entrega

Homologación y producción usan certificados, autorizaciones y endpoints distintos. Para pasar a producción se requiere un análisis fiscal real, un certificado de producción y una configuración separada. No reutilicen el certificado de testing ni cambien manualmente las URLs de este TP.

## Fuentes oficiales consultadas

- ARCA, certificados para testing y producción: https://www.arca.gob.ar/ws/documentacion/certificados.asp
- ARCA, manual de WSASS: https://arca.gob.ar/ws/WSASS/WSASS_manual.pdf
- ARCA, adhesión a WSASS: https://arca.gob.ar/ws/WSASS/WSASS_como_adherirse.pdf
- ARCA, documentación de WSAA: https://www.arca.gob.ar/ws/documentacion/wsaa.asp
- ARCA, entorno de prueba de factura electrónica: https://arca.gob.ar/fe/ayuda/entorno-prueba.asp
- ARCA, manual del desarrollador WSFEv1: https://www.arca.gob.ar/fe/documentos/manual-desarrollador-ARCA-COMPG-v4-0.pdf
- ARCA, inscripción de CUIT: https://arca.gob.ar/inscripcion/cuit-cdi/

También se revisó el PDF entregado con el proyecto y el ZIP de referencia. Se usaron como material de comparación, pero las URLs, la separación entre ambientes y el procedimiento de certificados se corrigieron con documentación oficial vigente.
