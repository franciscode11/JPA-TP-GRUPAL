DO $$
DECLARE
    condicion_default_id BIGINT;
BEGIN
    -- En una base nueva Hibernate creará las tablas después de Flyway.
    -- Este bloque sólo adapta bases creadas por las entregas anteriores.
    IF to_regclass('factura_venta_schema.factura_venta') IS NULL
       OR to_regclass('public.condicion_iva') IS NULL THEN
        RETURN;
    END IF;

    ALTER TABLE factura_venta_schema.factura_venta
        ADD COLUMN IF NOT EXISTS condicion_iva_id BIGINT;

    SELECT id
      INTO condicion_default_id
      FROM public.condicion_iva
     ORDER BY id
     LIMIT 1;

    IF condicion_default_id IS NULL THEN
        INSERT INTO public.condicion_iva (
            codigoafip,
            denominacion,
            fechaalta,
            fechamodificacion,
            usuario_carga_id,
            usuario_modificacion_id
        )
        SELECT
            5,
            'Consumidor Final',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP,
            u.id,
            u.id
        FROM public.usuario u
        ORDER BY u.id
        LIMIT 1
        RETURNING id INTO condicion_default_id;
    END IF;

    IF condicion_default_id IS NULL
       AND EXISTS (SELECT 1 FROM factura_venta_schema.factura_venta) THEN
        RAISE EXCEPTION 'No se puede migrar factura_venta: falta un usuario para auditar la condición IVA inicial';
    END IF;

    UPDATE factura_venta_schema.factura_venta
       SET condicion_iva_id = condicion_default_id
     WHERE condicion_iva_id IS NULL;

    ALTER TABLE factura_venta_schema.factura_venta
        ALTER COLUMN condicion_iva_id SET NOT NULL;

    IF NOT EXISTS (
        SELECT 1
          FROM pg_constraint
         WHERE conname = 'fk_factura_venta_condicion_iva'
           AND conrelid = 'factura_venta_schema.factura_venta'::regclass
    ) THEN
        ALTER TABLE factura_venta_schema.factura_venta
            ADD CONSTRAINT fk_factura_venta_condicion_iva
            FOREIGN KEY (condicion_iva_id)
            REFERENCES public.condicion_iva (id);
    END IF;
END
$$;
