package com.facturaarca.repository;

import com.facturaarca.model.FacturaVenta;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import java.util.Optional;

public interface FacturaRepository extends JpaRepository<FacturaVenta, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<FacturaVenta> findOneById(Long id);
}
