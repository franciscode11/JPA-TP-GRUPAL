# Plan para la próxima etapa

Este archivo conserva las decisiones revisadas el 21 de octubre de 2026. El README debe continuar mostrando solamente los integrantes.

## Alcance confirmado por las consignas

- Mantener Spring Boot como backend.
- Mantener HTML5 y TypeScript como frontend mientras no exista una indicación escrita que reemplace esta tecnología por Next.js.
- Agregar filtros por número, fechas, cliente y estado de información a ARCA.
- Implementar paginación primero en el backend y luego consumirla desde el frontend.
- Buscar clientes y artículos de lista de precios sin descargar catálogos completos.
- Bloquear modificaciones cuando una factura haya sido autorizada por ARCA.

## Datos y catálogos

- Eliminar definitivamente facturas, clientes, artículos y precios cargados solamente como datos de prueba.
- Desactivar las cargas automáticas que puedan volver a insertarlos.
- Incorporar el catálogo completo de condiciones frente al IVA admitidas por ARCA.
- Crear CRUD de clientes, incluyendo CUIT/CUIL, denominación, contacto y domicilio.
- Crear CRUD de artículos, rubros, marcas, listas de precios y precios por artículo.
- Permitir crear un cliente o artículo desde el formulario de factura y seleccionarlo al terminar.

## Facturas y reportes

- Reemplazar la consulta que devuelve una lista completa por una respuesta paginada.
- Agregar los filtros indicados por el profesor y ordenamiento estable.
- Mantener los reportes generales filtrados.
- Agregar PDF y Excel por comprobante con cabecera, receptor, detalles, IVA, total y estado ARCA.
- Diferenciar borrador local, pendiente de ARCA, autorizado y rechazado.

## Integración ARCA segura

- No habilitar producción para el trabajo práctico.
- Mostrar siempre si se está en modo demostración u homologación y aclarar que no tiene validez fiscal.
- Crear una interfaz de integración con dos implementaciones: simulación académica y homologación oficial.
- Obtener credenciales mediante WSAA y solicitar autorización mediante WSFEv1.
- Consultar el último número autorizado antes de informar una factura.
- Guardar resultado, CAE, vencimiento, observaciones y motivos de rechazo.
- Usar variables de entorno para CUIT, certificado y clave privada. Nunca guardar secretos en GitHub.
- Bloquear actualización y eliminación después de una autorización aprobada.
- Explicar que una factura fiscal autorizada se corrige mediante una nota de crédito asociada, no mediante eliminación física.

## Interfaz futura

- Incorporar un sidebar con Facturas, Clientes, Productos, Listas de precios y Configuración ARCA.
- Mantener la estética monocromática, simple y accesible.
- Actualizar la guía PDF para la exposición.
- Probar backend, frontend y recorrido completo antes de subir la entrega.
