package com.facturaarca.repository;

import com.facturaarca.model.Cliente;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ClienteRepository extends JpaRepository<Cliente, Long> {
    org.springframework.data.domain.Page<Cliente> findByDenominacionContainingIgnoreCaseOrCuitCuilContaining(
            String nombre, String documento, org.springframework.data.domain.Pageable pagina);
    List<Cliente> findAllByOrderByDenominacionAsc();
}
