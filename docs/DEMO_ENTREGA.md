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

El 18/11/2026 se autorizó una Factura C de Casa Central por $15.000, número 2, CAE 86461073172045. Es una prueba de homologación.

El borrador 17 no sirve como ejemplo de solicitud válida: tiene fecha del 17, condición Cliente del Exterior y un CUIT ficticio. ARCA devolvió primero error 10015 por documento no registrado y posteriormente 10016 por número o fecha. Deben corregirse los datos reales de la operación antes de reintentar. No cambiar la condición tributaria únicamente para superar la validación.

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
