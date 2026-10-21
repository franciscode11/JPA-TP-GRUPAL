package com.facturaarca.repository;

import com.facturaarca.dto.FacturaReporteDTO;
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

    public List<FacturaReporteDTO> buscarFacturasFiltradas(
            Date fechaDesde,
            Date fechaHasta,
            String estado,
            Double montoMinimo
    ) {
        StringBuilder jpql = new StringBuilder("""
                SELECT new com.facturaarca.dto.FacturaReporteDTO(
                    f.id,
                    f.numero,
                    f.fechaEmision,
                    COALESCE(c.denominacion, 'Consumidor Final'),
                    ci.denominacion,
                    pv.descripcion,
                    f.importeTotal,
                    COUNT(d),
                    f.estado,
                    f.observaciones
                )
                FROM FacturaVenta f
                LEFT JOIN f.cliente c
                JOIN f.condicionIva ci
                JOIN f.puntoVenta pv
                LEFT JOIN f.detalles d
                WHERE 1 = 1
                """);

        Map<String, Object> parametros = new LinkedHashMap<>();

        if (fechaDesde != null) {
            jpql.append(" AND f.fechaEmision >= :fechaDesde");
            parametros.put("fechaDesde", fechaDesde);
        }
        if (fechaHasta != null) {
            jpql.append(" AND f.fechaEmision <= :fechaHasta");
            parametros.put("fechaHasta", fechaHasta);
        }
        if (estado != null) {
            jpql.append(" AND UPPER(f.estado) = :estado");
            parametros.put("estado", estado);
        }
        if (montoMinimo != null) {
            jpql.append(" AND f.importeTotal >= :montoMinimo");
            parametros.put("montoMinimo", montoMinimo);
        }

        jpql.append("""
                 GROUP BY f.id, f.numero, f.fechaEmision, c.denominacion,
                         ci.denominacion, pv.descripcion, f.importeTotal,
                         f.estado, f.observaciones
                ORDER BY f.fechaEmision, f.numero
                """);

        TypedQuery<FacturaReporteDTO> query = entityManager.createQuery(jpql.toString(), FacturaReporteDTO.class);
        parametros.forEach(query::setParameter);
        return query.getResultList();
    }
}
