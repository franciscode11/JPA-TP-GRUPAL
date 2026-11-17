DO $$
BEGIN
    IF to_regclass('public.lista_precio') IS NULL THEN
        RETURN;
    END IF;

    UPDATE public.lista_precio
       SET denominacion = CASE
           WHEN LOWER(codigo) = 'lp001' THEN 'Minorista'
           WHEN LOWER(codigo) = 'lp-jpql' THEN 'Mayorista'
           ELSE denominacion
       END
     WHERE LOWER(codigo) IN ('lp001', 'lp-jpql');
END
$$;
