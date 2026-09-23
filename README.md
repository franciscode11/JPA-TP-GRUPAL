# JPA-TP-GRUPAL

Trabajo práctico grupal de Desarrollo de Software.

## Integrantes

1. Francisco Valles - 52147
2. Ulises Lucato - 52021
3. Joaquín Echenagorría - 51964
4. Lautaro de Coninck - 51954
5. Joaquín Cortez - 51948
6. Octavio Crescini - 51949

## TP3 - Consultas avanzadas con JPQL

El TP3 implementa las veinte consultas indicadas en la consigna usando JPQL sobre las entidades ya mapeadas en TP2. Las consultas se encuentran en `com.facturaarca.ConsultasJpql` y se ejecutan contra PostgreSQL mediante la unidad de persistencia `FacturacionPU`.

JPQL consulta entidades y atributos Java, no tablas ni columnas SQL. Por ejemplo, se escribe `FacturaVenta f` y `f.importeTotal`; Hibernate se encarga de traducirlo a SQL y de respetar los schemas definidos en el mapeo.

### Cómo ejecutar

1. Iniciar PostgreSQL y comprobar que exista la base `facturacion_orm` configurada en `persistence.xml`.
2. Compilar el proyecto:

```bash
mvn clean package
```

3. Cargar los datos de ejemplo para JPQL:

```bash
mvn exec:java -Dexec.mainClass=com.facturaarca.CargaDatosJpql
```

4. Ejecutar las veinte consultas:

```bash
mvn exec:java -Dexec.mainClass=com.facturaarca.ConsultasJpql
```

`CargaDatosJpql` es idempotente: busca el usuario marcador `admin_jpql` y no vuelve a insertar el conjunto de ejemplo si este ya existe. No borra los datos anteriores de la base.

### Relación entre consignas e implementación

| Consultas | Técnica JPQL utilizada |
| --- | --- |
| 1 y 2 | Consulta de entidad completa y proyección con `Object[]`. |
| 3 a 6 | `WHERE`, navegación por relaciones, `BETWEEN`, `AND`, `OR`, `IS NULL`, `LIKE` y `LOWER`. |
| 7 a 9 | `DISTINCT`, `ORDER BY`, agregaciones `COUNT/SUM/AVG` e `IN`. |
| 10 a 13 | Path expression, `JOIN`, `LEFT JOIN` y `DISTINCT` para evitar facturas repetidas. |
| 14 | Subconsulta con `AVG` en `WHERE`. |
| 15 a 17 | `GROUP BY`, `HAVING` y agregaciones sobre relaciones. |
| 18 y 19 | Subconsultas correlacionadas con `EXISTS` y `NOT EXISTS`. |
| 20 | `CASE WHEN` para clasificar facturas por importe. |

### Puntos para explicar en la defensa

- `em.createQuery(jpql, Clase.class)` crea una consulta tipada. Cuando la proyección tiene varias columnas se usa `Object[].class` porque cada resultado es un arreglo de valores.
- Los parámetros se declaran con `:nombre` dentro de JPQL y se asignan con `.setParameter("nombre", valor)`. Esto evita concatenar datos en la consulta.
- La navegación `f.usuarioCarga.usuario` sigue una asociación `@ManyToOne` sin escribir la clave foránea manualmente.
- En `JOIN f.detalles d`, `f` es la cabecera de factura y `d` cada detalle asociado. `LEFT JOIN` conserva la fila de un artículo aunque no tenga marca.
- `GROUP BY` agrupa filas antes de calcular agregados; `HAVING` filtra los grupos ya formados. Por eso la consulta 16 usa `HAVING COUNT(f) > :minimoFacturas`.
- En las consultas 18 y 19, la subconsulta se relaciona con la consulta externa comparando la marca o el artículo actual. Esa referencia es lo que las hace correlacionadas.
- `CASE` devuelve una columna calculada sin modificar ningún registro de la base.
