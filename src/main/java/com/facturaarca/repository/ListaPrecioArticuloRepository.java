package com.facturaarca.repository;

import com.facturaarca.model.ListaPrecioArticulo;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

public interface ListaPrecioArticuloRepository extends JpaRepository<ListaPrecioArticulo, Long> {

    @EntityGraph(attributePaths = {"articulo", "listaPrecio"})
    Optional<ListaPrecioArticulo> findById(Long id);

    @EntityGraph(attributePaths = "articulo")
    List<ListaPrecioArticulo> findAllByOrderByArticuloDenominacionAsc();

    @EntityGraph(attributePaths = {"articulo", "listaPrecio"})
    @Query("""
            SELECT precio
            FROM ListaPrecioArticulo precio
            WHERE (:listaPrecioId IS NULL OR precio.listaPrecio.id = :listaPrecioId)
              AND precio.id = (
                  SELECT MIN(otro.id)
                  FROM ListaPrecioArticulo otro
                  WHERE LOWER(otro.listaPrecio.codigo) = LOWER(precio.listaPrecio.codigo)
                    AND LOWER(otro.articulo.codigo) = LOWER(precio.articulo.codigo)
              )
              AND (:texto = '' OR LOWER(precio.articulo.codigo) LIKE LOWER(CONCAT('%', :texto, '%'))
                   OR LOWER(precio.articulo.denominacion) LIKE LOWER(CONCAT('%', :texto, '%')))
            ORDER BY precio.articulo.denominacion, precio.articulo.codigo
            """)
    Page<ListaPrecioArticulo> buscarParaExplorador(
            @Param("listaPrecioId") Long listaPrecioId,
            @Param("texto") String texto,
            Pageable pageable
    );
}
