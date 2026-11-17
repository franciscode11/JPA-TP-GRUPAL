package com.facturaarca.repository;

import com.facturaarca.model.ListaPrecio;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ListaPrecioRepository extends JpaRepository<ListaPrecio, Long> {
    List<ListaPrecio> findAllByOrderByDenominacionAsc();
}
