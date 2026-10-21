package com.facturaarca.repository;

import com.facturaarca.model.TipoMoneda;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TipoMonedaRepository extends JpaRepository<TipoMoneda, Long> {
    List<TipoMoneda> findAllByOrderByDenominacionAsc();
}
