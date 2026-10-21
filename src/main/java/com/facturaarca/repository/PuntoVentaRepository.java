package com.facturaarca.repository;

import com.facturaarca.model.PuntoVenta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PuntoVentaRepository extends JpaRepository<PuntoVenta, Long> {
    List<PuntoVenta> findAllByOrderByNumeroAsc();

    Optional<PuntoVenta> findFirstByNumeroOrderByIdAsc(int numero);
}
