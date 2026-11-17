DO $$
BEGIN
    IF to_regclass('factura_venta_schema.factura_venta') IS NULL
       OR to_regclass('factura_venta_schema.factura_venta_detalle') IS NULL THEN
        RETURN;
    END IF;

    DELETE FROM factura_venta_schema.factura_venta_detalle;
    DELETE FROM factura_venta_schema.factura_venta;
END
$$;
