package com.facturaarca.repository;

import com.facturaarca.model.ListaPrecioArticulo;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ListaPrecioArticuloRepository extends JpaRepository<ListaPrecioArticulo, Long> {

    @EntityGraph(attributePaths = "articulo")
    Optional<ListaPrecioArticulo> findFirstByArticuloIdOrderByIdDesc(Long articuloId);

    @EntityGraph(attributePaths = "articulo")
    List<ListaPrecioArticulo> findAllByOrderByArticuloDenominacionAsc();
}
