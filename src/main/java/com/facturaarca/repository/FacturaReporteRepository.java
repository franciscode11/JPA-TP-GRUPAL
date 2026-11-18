package com.facturaarca.repository;

import com.facturaarca.dto.FacturaReporteDTO;
import com.facturaarca.dto.PaginaDTO;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import org.springframework.stereotype.Repository;

import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Repository
public class FacturaReporteRepository {

    @PersistenceContext
    private EntityManager entityManager;

    public PaginaDTO<FacturaReporteDTO> buscarPagina(
            Date fechaDesde, Date fechaHasta, String estado, Double montoMinimo,
            Long numeroFactura, Long clienteId, Boolean informadaArca,
            int pagina, int tamanio
    ) {
        Consulta consulta = construirConsulta(
                fechaDesde, fechaHasta, estado, montoMinimo, numeroFactura, clienteId, informadaArca
        );
        TypedQuery<FacturaReporteDTO> datos = entityManager.createQuery(
                consulta.jpqlDatos(), FacturaReporteDTO.class
        );
        aplicarParametros(datos, consulta.parametros());
        datos.setFirstResult(pagina * tamanio);
        datos.setMaxResults(tamanio);

        TypedQuery<Long> total = entityManager.createQuery(consulta.jpqlTotal(), Long.class);
        aplicarParametros(total, consulta.parametros());
        return PaginaDTO.crear(datos.getResultList(), pagina, tamanio, total.getSingleResult());
    }

    public List<FacturaReporteDTO> buscarTodos(
            Date fechaDesde, Date fechaHasta, String estado, Double montoMinimo,
            Long numeroFactura, Long clienteId, Boolean informadaArca
    ) {
        Consulta consulta = construirConsulta(
                fechaDesde, fechaHasta, estado, montoMinimo, numeroFactura, clienteId, informadaArca
        );
        TypedQuery<FacturaReporteDTO> query = entityManager.createQuery(
                consulta.jpqlDatos(), FacturaReporteDTO.class
        );
        aplicarParametros(query, consulta.parametros());
        return query.getResultList();
    }

    public List<FacturaReporteDTO> buscarFacturasFiltradas(
            Date fechaDesde, Date fechaHasta, String estado, Double montoMinimo
    ) {
        return buscarTodos(fechaDesde, fechaHasta, estado, montoMinimo, null, null, null);
    }

    private Consulta construirConsulta(
            Date fechaDesde, Date fechaHasta, String estado, Double montoMinimo,
            Long numeroFactura, Long clienteId, Boolean informadaArca
    ) {
        StringBuilder condiciones = new StringBuilder(" WHERE 1 = 1");
        Map<String, Object> parametros = new LinkedHashMap<>();
        agregarFiltros(
                condiciones, parametros, fechaDesde, fechaHasta, estado, montoMinimo,
                numeroFactura, clienteId, informadaArca
        );

        String datos = """
                SELECT new com.facturaarca.dto.FacturaReporteDTO(
                    f.id, f.numero, f.fechaEmision,
                    COALESCE(c.denominacion, 'Consumidor Final'),
                    ci.denominacion, pv.descripcion, f.importeTotal,
                    COUNT(d), f.estado, f.observaciones, f.cae, f.resultadoAfip, f.motivoRechazo, pv.numero
                )
                FROM FacturaVenta f
                LEFT JOIN f.cliente c
                JOIN f.condicionIva ci
                JOIN f.puntoVenta pv
                LEFT JOIN f.detalles d
                """ + condiciones + """

                GROUP BY f.id, f.numero, f.fechaEmision, c.denominacion,
                         ci.denominacion, pv.descripcion, f.importeTotal,
                         f.estado, f.observaciones, f.cae, f.resultadoAfip, f.motivoRechazo, pv.numero
                ORDER BY f.fechaEmision DESC, f.numero DESC, f.id DESC
                """;

        String total = """
                SELECT COUNT(f.id)
                FROM FacturaVenta f
                LEFT JOIN f.cliente c
                """ + condiciones;
        return new Consulta(datos, total, parametros);
    }

    private void agregarFiltros(
            StringBuilder jpql, Map<String, Object> parametros,
            Date fechaDesde, Date fechaHasta, String estado, Double montoMinimo,
            Long numeroFactura, Long clienteId, Boolean informadaArca
    ) {
        agregar(jpql, parametros, fechaDesde, "fechaDesde", " AND f.fechaEmision >= :fechaDesde");
        agregar(jpql, parametros, fechaHasta, "fechaHasta", " AND f.fechaEmision <= :fechaHasta");
        agregar(jpql, parametros, estado, "estado", " AND UPPER(f.estado) = :estado");
        agregar(jpql, parametros, montoMinimo, "montoMinimo", " AND f.importeTotal >= :montoMinimo");
        agregar(jpql, parametros, numeroFactura, "numeroFactura", " AND f.numero = :numeroFactura");
        agregar(jpql, parametros, clienteId, "clienteId", " AND c.id = :clienteId");
        if (informadaArca != null) {
            jpql.append(informadaArca ? " AND f.cae IS NOT NULL" : " AND f.cae IS NULL");
        }
    }

    private void agregar(
            StringBuilder jpql, Map<String, Object> parametros,
            Object valor, String nombre, String condicion
    ) {
        if (valor == null) {
            return;
        }
        jpql.append(condicion);
        parametros.put(nombre, valor);
    }

    private <T> void aplicarParametros(TypedQuery<T> query, Map<String, Object> parametros) {
        parametros.forEach(query::setParameter);
    }

    private record Consulta(String jpqlDatos, String jpqlTotal, Map<String, Object> parametros) {
    }
}
