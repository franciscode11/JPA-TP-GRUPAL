DO $$
BEGIN
    IF to_regclass('factura_venta_schema.factura_venta') IS NULL
       OR to_regclass('factura_venta_schema.factura_venta_detalle') IS NULL THEN
        RETURN;
    END IF;

    DELETE FROM factura_venta_schema.factura_venta_detalle
     WHERE factura_id IN (
        SELECT id
          FROM factura_venta_schema.factura_venta
         WHERE numero = 1
           AND LOWER(COALESCE(observaciones, '')) LIKE '%prueba%'
     );

    DELETE FROM factura_venta_schema.factura_venta
     WHERE numero = 1
       AND LOWER(COALESCE(observaciones, '')) LIKE '%prueba%';
END
$$;
