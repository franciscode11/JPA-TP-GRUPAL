package com.facturaarca.repository;

import com.facturaarca.model.FacturaVenta;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FacturaRepository extends JpaRepository<FacturaVenta, Long> {
}
