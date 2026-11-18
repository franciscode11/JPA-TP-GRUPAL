-- Precios finales orientativos en ARS para el laboratorio, no cotizaciones comerciales.
-- Los iPod son equipos usados/reacondicionados. Se conserva el catálogo anterior para el historial.
DO $$
DECLARE
    usuario_n BIGINT;
    marca_n BIGINT;
    rubro_n BIGINT;
    articulo_n BIGINT;
    lista_n BIGINT;
    producto RECORD;
    lista RECORD;
BEGIN
    IF to_regclass('public.articulo') IS NULL THEN RETURN; END IF;
    SELECT id INTO usuario_n FROM usuario ORDER BY id LIMIT 1;
    IF usuario_n IS NULL THEN RETURN; END IF;

    UPDATE articulo SET fechabaja=CURRENT_TIMESTAMP, usuario_baja_id=usuario_n
      WHERE fechabaja IS NULL AND codigo NOT LIKE 'APL-%';
    UPDATE lista_precio_articulo SET fechabaja=CURRENT_TIMESTAMP, usuario_baja_id=usuario_n
      WHERE fechabaja IS NULL AND articulo_id IN (SELECT id FROM articulo WHERE fechabaja IS NOT NULL);

    SELECT id INTO marca_n FROM marca WHERE denominacion='Apple' ORDER BY id LIMIT 1;
    IF marca_n IS NULL THEN
        INSERT INTO marca (codigo,denominacion,fechaalta,fechamodificacion,usuario_carga_id,usuario_modificacion_id)
        VALUES (100,'Apple',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,usuario_n,usuario_n) RETURNING id INTO marca_n;
    END IF;
    SELECT id INTO rubro_n FROM rubro WHERE denominacion='Tecnología Apple' ORDER BY id LIMIT 1;
    IF rubro_n IS NULL THEN
        INSERT INTO rubro (codigo,denominacion,fechaalta,fechamodificacion,usuario_carga_id,usuario_modificacion_id)
        VALUES (100,'Tecnología Apple',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,usuario_n,usuario_n) RETURNING id INTO rubro_n;
    END IF;

    FOR producto IN SELECT * FROM (VALUES
        ('APL-IP15-128','iPhone 15 128 GB',1400000),
        ('APL-IP16-128','iPhone 16 128 GB',1700000),
        ('APL-IP16P-256','iPhone 16 Pro 256 GB',2400000),
        ('APL-MBA-M3','MacBook Air 13 M3 16 GB / 256 GB',2400000),
        ('APL-MBA-M4','MacBook Air 13 M4 16 GB / 256 GB',2800000),
        ('APL-MBP-M4','MacBook Pro 14 M4 16 GB / 512 GB',3900000),
        ('APL-IPOD-T7','iPod touch 7 128 GB · Reacondicionado',320000),
        ('APL-IPOD-C6','iPod classic 160 GB · Reacondicionado',280000)
    ) AS p(codigo,nombre,precio) LOOP
        SELECT id INTO articulo_n FROM articulo WHERE codigo=producto.codigo ORDER BY id LIMIT 1;
        IF articulo_n IS NULL THEN
            INSERT INTO articulo (codigo,denominacion,marca_id,rubro_id,fechaalta,fechamodificacion,usuario_carga_id,usuario_modificacion_id)
            VALUES (producto.codigo,producto.nombre,marca_n,rubro_n,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,usuario_n,usuario_n)
            RETURNING id INTO articulo_n;
        END IF;
        FOR lista IN SELECT 'LP001' AS codigo,'Minorista' AS nombre,1.0 AS factor
            UNION ALL SELECT 'LP-JPQL','Mayorista',0.9 LOOP
            SELECT id INTO lista_n FROM lista_precio WHERE codigo=lista.codigo ORDER BY id LIMIT 1;
            IF lista_n IS NULL THEN
                INSERT INTO lista_precio (codigo,denominacion,fechaalta,fechamodificacion,usuario_carga_id,usuario_modificacion_id)
                VALUES (lista.codigo,lista.nombre,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,usuario_n,usuario_n) RETURNING id INTO lista_n;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM lista_precio_articulo WHERE articulo_id=articulo_n AND lista_precio_id=lista_n) THEN
                INSERT INTO lista_precio_articulo (articulo_id,lista_precio_id,precioventa,fechaalta,fechamodificacion,usuario_carga_id,usuario_modificacion_id)
                VALUES (articulo_n,lista_n,ROUND(producto.precio*lista.factor),CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,usuario_n,usuario_n);
            END IF;
        END LOOP;
    END LOOP;
END $$;
