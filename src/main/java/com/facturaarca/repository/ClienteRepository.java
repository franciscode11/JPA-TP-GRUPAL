package com.facturaarca.repository;

import com.facturaarca.model.Cliente;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ClienteRepository extends JpaRepository<Cliente, Long> {
    @org.springframework.data.jpa.repository.Query("""
            SELECT c FROM Cliente c WHERE c.fechaBaja IS NULL AND c.condicionIva IS NOT NULL
            AND (:texto = '' OR LOWER(c.denominacion) LIKE LOWER(CONCAT('%', :texto, '%'))
                OR c.cuitCuil LIKE CONCAT('%', :texto, '%') OR c.numeroDocumento LIKE CONCAT('%', :texto, '%'))
            """)
    org.springframework.data.domain.Page<Cliente> buscarParaExplorador(
            @org.springframework.data.repository.query.Param("texto") String texto, org.springframework.data.domain.Pageable pagina);
    List<Cliente> findAllByOrderByDenominacionAsc();
}
