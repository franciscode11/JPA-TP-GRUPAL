package com.facturaarca.repository;

import com.facturaarca.model.PuntoVenta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PuntoVentaRepository extends JpaRepository<PuntoVenta, Long> {
    List<PuntoVenta> findAllByOrderByNumeroAsc();
}
