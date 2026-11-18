# Demostración de homologación

Guía de estudio y comandos de arranque: [Del borrador al comprobante](Guia_para_exponer_Factura_ARCA.pdf). Las [consultas de la demo](consulta_demo.sql) se pueden ejecutar en pgAdmin sobre facturacion_orm.

1. Abrir el sistema en http://localhost:8080. La confirmación al emitir y la vista de la factura identifican el entorno de homologación.
2. Buscar por número interno, cliente o fechas. Los filtros y la paginación se resuelven en el backend.
3. Pulsar Nueva factura. La fecha se elige con calendario y el estado inicial es PENDIENTE.
4. Buscar el cliente en el explorador, por nombre o documento. Su condición de IVA se completa automáticamente y no se edita desde la factura.
5. Buscar un producto Apple en su lista de precios Mayorista o Minorista. Agregar cantidad y bonificación. Los precios en pesos son orientativos para el laboratorio; los iPod son reacondicionados.
6. Guardar el borrador. Se puede editar o dar de baja mientras siga pendiente. La baja conserva el comprobante ANULADO.
7. Solicitar CAE en homologación. ARCA consulta y valida los datos; una respuesta rechazada conserva el borrador y muestra su motivo.
8. Si ARCA aprueba, guardar número, CAE y vencimiento; bloquear edición y eliminación y abrir Ver factura.

## Prueba comprobada

El recuento cambia al crear y emitir borradores. La última consulta de consulta_demo.sql muestra los comprobantes de cada estado y cuántos tienen CAE.

Para mostrar la paginación, abrí la pestaña Red del navegador y pulsá **Página siguiente**. Cada clic solicita una página al servidor. PostgreSQL devuelve como máximo diez filas por página. Los filtros se aplican antes del límite de filas.

Para mostrar una emisión ya aprobada, buscá el número interno **78** y elegí **Ver factura**. En la grilla, cada comprobante tiene un número interno corto asignado por PostgreSQL al crear el borrador. El número persiste al emitir y la secuencia avanza aunque se elimine el último borrador. En la vista de la factura aparecen el número fiscal del punto de venta, el CAE y su vencimiento.

Para mostrar una emisión nueva, elegí un pendiente de la fecha admitida por ARCA. Antes de pedir CAE el servidor consulta el último número autorizado y su fecha para ese punto de venta y tipo de comprobante.

### Condición de IVA para la exposición

En las ventas locales de esta demo el emisor es monotributista y emite Factura C. El receptor puede ser consumidor final, monotributista o responsable inscripto. El backend valida la condición elegida contra la ficha del cliente y la informa a ARCA. Un emisor responsable inscripto habilitado sí puede emitir una A a un monotributista. [Cuadro de emisores y receptores de ARCA](https://www.arca.gob.ar/facturacion/regimen-general/)

## Qué explicar

- WSAA autentica mediante certificado y firma CMS y devuelve Token y Sign. Se reutiliza el ticket hasta su vencimiento; su archivo local tiene acceso restringido y no se publica.
- WSFEv1 permite consultar el último número y solicitar autorización. Devuelve datos XML, no el PDF de una factura.
- La Factura C no discrimina IVA: los nuevos borradores usan el precio de lista como importe final antes de bonificaciones. Las autorizaciones anteriores conservan sus importes históricos.
- El modal muestra los datos y subtotales persistidos, CAE y vencimiento. PDF y Excel del buscador son reportes del resultado filtrado.
- Exportaciones requieren el circuito de Factura E y están fuera del cliente WSFEv1 de este laboratorio.
- Los secretos de homologación se configuran localmente; no están en GitHub.

## Alcance revisado

La variante presentada integra ARCA en homologación, incluye filtros, exploradores y paginación y bloquea los comprobantes autorizados. El TP integrador actualizado especifica una variante con CAE simulado y anulación lógica de emitidas. Nuestra demo conserva los pendientes dados de baja como ANULADA por pedido del grupo. La página 9 de la guía compara los alcances y las diferencias de entrega.

## Actualización del arranque y de la baja lógica

Ejecutar com.facturaarca.Main desde IntelliJ inicia el servidor web. Maven utiliza el mismo punto de entrada. La configuración opcional de homologación se puede guardar fuera del repositorio en ~/.config/factura-arca/homologacion/application.properties.

Por pedido del grupo, Eliminar ahora da de baja sólo pendientes: conserva cabecera y detalles, marca ANULADA y registra fechaBaja, fechaAnulacion y usuarioBaja. El filtro ANULADA y Ver factura permiten consultar el historial. Las emitidas con CAE siguen bloqueadas. Esta baja de pendientes difiere del DELETE físico del integrador actualizado.
