package com.facturaarca;

import com.facturaarca.model.CondicionIva;
import com.facturaarca.model.Usuario;
import com.facturaarca.repository.CondicionIvaRepository;
import com.facturaarca.repository.UsuarioRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;

@Component
public class CatalogosIniciales implements ApplicationRunner {

    private static final List<CondicionIvaBase> CONDICIONES_IVA = List.of(
            new CondicionIvaBase(1, "IVA Responsable Inscripto"),
            new CondicionIvaBase(4, "IVA Sujeto Exento"),
            new CondicionIvaBase(5, "Consumidor Final"),
            new CondicionIvaBase(6, "Responsable Monotributo"),
            new CondicionIvaBase(7, "Sujeto No Categorizado"),
            new CondicionIvaBase(8, "Proveedor del Exterior"),
            new CondicionIvaBase(9, "Cliente del Exterior"),
            new CondicionIvaBase(10, "IVA Liberado - Ley 19.640"),
            new CondicionIvaBase(13, "Monotributista Social"),
            new CondicionIvaBase(15, "IVA No Alcanzado"),
            new CondicionIvaBase(16, "Monotributo Trabajador Independiente Promovido")
    );

    private final CondicionIvaRepository condicionIvaRepository;
    private final UsuarioRepository usuarioRepository;

    public CatalogosIniciales(
            CondicionIvaRepository condicionIvaRepository,
            UsuarioRepository usuarioRepository
    ) {
        this.condicionIvaRepository = condicionIvaRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        Usuario usuario = usuarioRepository.findFirstByOrderByIdAsc().orElse(null);
        if (usuario == null) {
            return;
        }

        Date ahora = new Date();
        for (CondicionIvaBase base : CONDICIONES_IVA) {
            if (condicionIvaRepository.existsByCodigoAfip(base.codigo())) {
                continue;
            }
            CondicionIva condicion = new CondicionIva();
            condicion.setCodigoAfip(base.codigo());
            condicion.setDenominacion(base.denominacion());
            condicion.setFechaAlta(ahora);
            condicion.setFechaModificacion(ahora);
            condicion.setUsuarioCarga(usuario);
            condicion.setUsuarioModificacion(usuario);
            condicionIvaRepository.save(condicion);
        }
    }

    private record CondicionIvaBase(int codigo, String denominacion) {
    }
}
