-- El laboratorio emite Factura C. La numeración es única dentro de cada punto de venta.
DO $$
BEGIN
    IF to_regclass('factura_venta_schema.factura_venta') IS NULL THEN RETURN; END IF;
    CREATE UNIQUE INDEX IF NOT EXISTS uq_factura_punto_numero
        ON factura_venta_schema.factura_venta (punto_venta_id, numero)
        WHERE numero IS NOT NULL;
END $$;
