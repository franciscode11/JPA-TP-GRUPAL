package com.facturaarca.repository;

import com.facturaarca.model.CondicionIva;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CondicionIvaRepository extends JpaRepository<CondicionIva, Long> {
    List<CondicionIva> findAllByOrderByDenominacionAsc();

    boolean existsByCodigoAfip(int codigoAfip);
}
