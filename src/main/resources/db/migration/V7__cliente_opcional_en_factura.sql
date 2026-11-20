-- Las facturas a Consumidor Final pueden carecer de cliente identificado.
DO $$
BEGIN
    IF to_regclass('factura_venta_schema.factura_venta') IS NOT NULL THEN
        ALTER TABLE factura_venta_schema.factura_venta
            ALTER COLUMN cliente_id DROP NOT NULL;
    END IF;
END $$;
