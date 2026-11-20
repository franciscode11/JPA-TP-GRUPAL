-- Ejecución manual y exclusiva sobre la base LOCAL de demostración.
-- Personas ficticias: estos DNI sintéticos NO acreditan identidades reales
-- ni son un padrón oficial de usuarios de ARCA. Usar sólo en homologación.
-- Se pueden buscar con "Cliente de prueba" para mostrar páginas de 20.
-- Idempotente: no modifica clientes existentes ni sus condiciones fiscales.
BEGIN;
DO $$
DECLARE
    usuario_demo bigint;
    iva_demo bigint;
    contacto_demo bigint;
    domicilio_demo bigint;
    documento_demo text;
    nombre_demo text;
    i integer;
BEGIN
    SELECT id INTO STRICT usuario_demo FROM usuario ORDER BY id LIMIT 1;
    SELECT id INTO STRICT iva_demo FROM condicion_iva WHERE codigoafip = 5;
    FOR i IN 1..24 LOOP
        nombre_demo := 'Cliente de prueba ' || lpad(i::text, 2, '0');
        documento_demo := (40010000 + i)::text;
        IF EXISTS (SELECT 1 FROM cliente WHERE denominacion = nombre_demo
                   AND numerodocumento = documento_demo AND tipodocumento = 96) THEN
            CONTINUE;
        END IF;
        IF EXISTS (SELECT 1 FROM cliente WHERE numerodocumento = documento_demo) THEN
            RAISE EXCEPTION 'Documento ya utilizado: %', documento_demo;
        END IF;
        INSERT INTO contacto (email) VALUES ('cliente-prueba-' || i || '@example.invalid')
            RETURNING id INTO contacto_demo;
        INSERT INTO domicilio (nombrecalle, numerocalle)
            VALUES ('Domicilio ficticio de demostración', i::text)
            RETURNING id INTO domicilio_demo;
        INSERT INTO cliente (fechaalta, fechamodificacion, cuitcuil, denominacion,
            usuario_carga_id, usuario_modificacion_id, contacto_id, domicilio_id,
            numerodocumento, tipodocumento, condicion_iva_id)
        VALUES (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, documento_demo, nombre_demo,
            usuario_demo, usuario_demo, contacto_demo, domicilio_demo,
            documento_demo, 96, iva_demo);
    END LOOP;
END $$;
COMMIT;
