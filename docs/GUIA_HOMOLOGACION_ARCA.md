# Guía simple para conectar el TP con ARCA

Esta guía es únicamente para `HOMOLOGACIÓN`: todo es de prueba y no tiene validez fiscal.

## Qué tenés que hacer vos

Vos solamente tenés que entrar a ARCA, habilitar WSASS, cargar el archivo que voy a prepararte, descargar el certificado y autorizar `wsfe`. No tenés que programar ni ejecutar comandos.

Nunca me pases tu Clave Fiscal ni tu contraseña.

## Paso 1 - Pasame tres datos

Decime por el chat:

1. CUIT de la persona que entra a ARCA, con 11 números y sin guiones.
2. CUIT que emitirá las facturas. Indicame si es el mismo.
3. Si el emisor es monotributista, responsable inscripto o exento.

Con esos datos preparo en tu computadora la clave privada y el archivo CSR.

## Paso 2 - Habilitar WSASS

Entrá al sitio oficial:

https://auth.arca.gob.ar/

Después seguí este recorrido:

1. Ingresá con CUIT y Clave Fiscal de una persona humana.
2. Abrí `Administrador de relaciones`.
3. Elegí `Nueva relación` o `Adherir servicio`.
4. Entrá en `ARCA - Servicios interactivos`.
5. Buscá `WSASS - Autogestión Certificados Homologación`.
6. Seleccionalo y confirmá.
7. Cerrá sesión y volvé a entrar.
8. Buscá `WSASS` en el buscador de servicios y abrilo.

Guía oficial de esta pantalla:

https://www.arca.gob.ar/ws/WSASS/WSASS_como_adherirse.pdf

## Paso 3 - Crear el certificado

Esperá a que yo te confirme que el archivo CSR está listo. Después, dentro de WSASS:

1. Abrí `Nuevo Certificado`.
2. Como alias escribí `factura-arca-homo`.
3. Pegá o cargá el CSR que yo te indique.
4. Presioná `Crear DN y Obtener Certificado`.
5. Descargá el certificado generado.
6. Guardalo en la carpeta `Descargas`.

No abras ni modifiques el certificado. Sólo decime el nombre exacto del archivo descargado.

## Paso 4 - Autorizar la facturación

Sin salir de WSASS:

1. Abrí `Crear Autorización a Servicio`.
2. Seleccioná el alias `factura-arca-homo`.
3. En `CUIT representado` escribí el CUIT que emitirá las facturas.
4. En servicio seleccioná `wsfe`.
5. Presioná `Crear Autorización de Acceso`.
6. Abrí `Autorizaciones`.
7. Comprobá que aparezcan el alias, el CUIT representado y `wsfe`.

## Paso 5 - Avisame y termino yo

Mandame un mensaje con:

1. `Certificado descargado`.
2. Nombre del archivo guardado en Descargas.
3. Confirmación de que la autorización `wsfe` aparece creada.

Yo me encargo de:

- Verificar que certificado y clave correspondan.
- Configurar el proyecto.
- Elegir el tipo de factura correcto para la prueba.
- Revisar el punto de venta.
- Levantar el servidor.
- Probar WSAA y WSFEv1.
- Dejar lista la primera emisión de homologación.

## Resumen corto

1. Me pasás los dos CUIT y la condición fiscal.
2. Yo preparo el CSR.
3. Vos habilitás WSASS.
4. Vos cargás el CSR y descargás el certificado.
5. Vos autorizás `wsfe`.
6. Me decís dónde quedó el certificado.
7. Yo configuro y pruebo todo.

## Importante

- No me pases tu contraseña ni tu Clave Fiscal.
- No subas la clave privada a GitHub, Drive o WhatsApp.
- No uses opciones de producción.
- Todo debe decir `TESTING/HOMOLOGACIÓN`.
