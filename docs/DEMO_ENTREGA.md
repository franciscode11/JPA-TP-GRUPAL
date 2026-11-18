# Demostración de homologación

El backend es Spring Boot. El frontend es HTML y TypeScript. Los datos se guardan en PostgreSQL.

1. Abrir el sistema y comprobar que indica Homologación, sin validez fiscal.
2. Buscar por número, cliente o fechas. Los filtros y la paginación se resuelven en el backend.
3. Pulsar Nueva factura. La fecha se elige con calendario y el estado inicial es PENDIENTE.
4. Buscar el cliente en el explorador, por nombre o documento. Su condición de IVA se completa automáticamente y no se edita desde la factura.
5. Buscar un producto Apple en su lista de precios Mayorista o Minorista. Agregar cantidad y bonificación. Los precios en pesos son orientativos para el laboratorio; los iPod son reacondicionados.
6. Guardar el borrador. Se puede editar o eliminar mientras siga pendiente.
7. Solicitar CAE en homologación. ARCA consulta y valida los datos; una respuesta rechazada conserva el borrador y muestra su motivo.
8. Si ARCA aprueba, guardar número, CAE y vencimiento; bloquear edición y eliminación y abrir Ver factura.

## Prueba comprobada

La base local para la exposición se preparó inicialmente con 26 comprobantes: 25 borradores con fechas entre el 24/10/2026 y el 17/11/2026, y una Factura C de Casa Central del 18/11/2026 por $2.394.000, identificador 00001-00000005, CAE 86461073642520. Es una prueba de homologación. Las altas posteriores cambian el contador y el tamaño de la última página.

La API devuelve 10, 10 y 6 registros al solicitar pagina=0, pagina=1 y pagina=2 con tamanio=10. Se verificaron 26 IDs distintos; la paginación se resuelve con offset y límite en la consulta del backend.

Los borradores antiguos permiten mostrar filtros y paginación. Para emitir uno, editar su fecha para que no sea anterior al último comprobante autorizado en su punto de venta. Antes de solicitar CAE, el sistema consulta FECompUltimoAutorizado y FECompConsultar y valida esa fecha.

El número incluye punto de venta y correlativo. 00001-00000002 y 00002-00000002 son comprobantes distintos. Existe una restricción única por punto de venta y número en la base para este laboratorio de Factura C.

Los clientes ficticios y comprobantes de las pruebas anteriores se retiraron de la base local, con respaldo recuperable fuera del repositorio. El explorador muestra clientes con condición de IVA registrada; esa condición se completa automáticamente y no se puede cambiar en la factura. No cambiar una condición tributaria únicamente para superar una validación de ARCA.

## Qué explicar

- WSAA autentica mediante certificado y firma CMS y devuelve Token y Sign. Se reutiliza el ticket hasta su vencimiento; su archivo local tiene acceso restringido y no se publica.
- WSFEv1 permite consultar el último número y solicitar autorización. Devuelve datos XML, no el PDF de una factura.
- La Factura C no discrimina IVA: los nuevos borradores usan el precio de lista como importe final antes de bonificaciones. Las autorizaciones anteriores conservan sus importes históricos.
- El modal muestra los datos y subtotales persistidos, CAE y vencimiento. PDF y Excel del buscador son reportes del resultado filtrado.
- Exportaciones requieren el circuito de Factura E y están fuera del cliente WSFEv1 de este laboratorio.
- Los secretos de homologación se configuran localmente; no están en GitHub.

## Alcance revisado

Consignas visibles: HTML/TypeScript, Spring, conexión ARCA, filtros, paginación backend/frontend, exploradores de clientes y precios de artículos y bloqueo de comprobantes autorizados.
La guía de 11 páginas explica cómo obtener el CAE; no solicita expresamente un PDF individual, Next.js, un sidebar ni altas de clientes/productos. Esas mejoras adicionales no se implementan como requisitos del profesor.
