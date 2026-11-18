-- En pgAdmin, abrir Query Tool sobre facturacion_orm y ejecutar cada SELECT.
SELECT f.id AS interno, pv.numero AS punto, f.numero AS numero_fiscal,
       f.fechaemision, f.estado, f.importetotal, f.resultadoafip,
       f.cae, f.caefechavencimiento, f.fechabaja
FROM factura_venta_schema.factura_venta f
JOIN public.punto_venta pv ON pv.id = f.punto_venta_id
ORDER BY f.fechaemision DESC, f.id DESC
LIMIT 10;

-- Elegir una emitida con CAE y contrastar sus renglones con «Ver factura».
SELECT d.factura_id, d.descripcion, d.cantidad, d.preciounitario,
       d.porcentajebonificacion, d.importeiva, d.importesubtotal
FROM factura_venta_schema.factura_venta_detalle d
WHERE d.factura_id = (
    SELECT MAX(id) FROM factura_venta_schema.factura_venta WHERE cae IS NOT NULL
)
ORDER BY d.id;

SELECT estado, COUNT(*) AS comprobantes, COUNT(cae) AS con_cae
FROM factura_venta_schema.factura_venta
GROUP BY estado ORDER BY estado;
