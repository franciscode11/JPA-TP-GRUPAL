package com.facturaarca.service;

import com.facturaarca.dto.FacturaDetalleRequestDTO;
import com.facturaarca.dto.FacturaReporteDTO;
import com.facturaarca.dto.FacturaRequestDTO;
import com.facturaarca.model.Articulo;
import com.facturaarca.model.Cliente;
import com.facturaarca.model.CondicionIva;
import com.facturaarca.model.FacturaVenta;
import com.facturaarca.model.ListaPrecioArticulo;
import com.facturaarca.model.PuntoVenta;
import com.facturaarca.model.TipoMoneda;
import com.facturaarca.model.Usuario;
import com.facturaarca.repository.ClienteRepository;
import com.facturaarca.repository.CondicionIvaRepository;
import com.facturaarca.repository.FacturaReporteRepository;
import com.facturaarca.repository.FacturaRepository;
import com.facturaarca.repository.ListaPrecioArticuloRepository;
import com.facturaarca.repository.PuntoVentaRepository;
import com.facturaarca.repository.TipoMonedaRepository;
import com.facturaarca.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Date;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class FacturaServiceTest {

    private final FacturaRepository facturaRepository = mock(FacturaRepository.class);
    private final FacturaReporteRepository reporteRepository = mock(FacturaReporteRepository.class);
    private final ClienteRepository clienteRepository = mock(ClienteRepository.class);
    private final CondicionIvaRepository condicionIvaRepository = mock(CondicionIvaRepository.class);
    private final PuntoVentaRepository puntoVentaRepository = mock(PuntoVentaRepository.class);
    private final TipoMonedaRepository tipoMonedaRepository = mock(TipoMonedaRepository.class);
    private final ListaPrecioArticuloRepository precioRepository = mock(ListaPrecioArticuloRepository.class);
    private final UsuarioRepository usuarioRepository = mock(UsuarioRepository.class);

    private final FacturaService service = new FacturaService(
            facturaRepository,
            reporteRepository,
            clienteRepository,
            condicionIvaRepository,
            puntoVentaRepository,
            tipoMonedaRepository,
            precioRepository,
            usuarioRepository
    );

    @BeforeEach
    void prepararRelaciones() {
        Usuario usuario = new Usuario();
        usuario.setId(1L);
        when(usuarioRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(usuario));

        Cliente cliente = new Cliente();
        cliente.setId(2L);
        cliente.setDenominacion("Cliente de prueba");
        when(clienteRepository.findById(2L)).thenReturn(Optional.of(cliente));

        CondicionIva condicionIva = new CondicionIva();
        condicionIva.setId(3L);
        condicionIva.setDenominacion("Consumidor Final");
        when(condicionIvaRepository.findById(3L)).thenReturn(Optional.of(condicionIva));

        PuntoVenta puntoVenta = new PuntoVenta();
        puntoVenta.setId(4L);
        puntoVenta.setDescripcion("Casa Central");
        when(puntoVentaRepository.findById(4L)).thenReturn(Optional.of(puntoVenta));

        TipoMoneda moneda = new TipoMoneda();
        moneda.setId(5L);
        when(tipoMonedaRepository.findById(5L)).thenReturn(Optional.of(moneda));

        Articulo articulo = new Articulo();
        articulo.setId(6L);
        articulo.setDenominacion("Mouse");
        ListaPrecioArticulo precio = new ListaPrecioArticulo();
        precio.setId(7L);
        precio.setArticulo(articulo);
        precio.setPrecioVenta(1000);
        when(precioRepository.findFirstByArticuloIdOrderByIdDesc(6L)).thenReturn(Optional.of(precio));

        when(facturaRepository.saveAndFlush(any(FacturaVenta.class))).thenAnswer(invocacion -> {
            FacturaVenta factura = invocacion.getArgument(0);
            factura.setId(8L);
            return factura;
        });
    }

    @Test
    void creaLaFacturaCalculaImportesYPersisteElDetalleEnCascada() {
        FacturaRequestDTO request = new FacturaRequestDTO(
                1001L,
                new Date(),
                2L,
                3L,
                4L,
                5L,
                "EMITIDA",
                "Venta web",
                List.of(new FacturaDetalleRequestDTO(6L, 2d, 10d))
        );

        FacturaReporteDTO resultado = service.crear(request);

        assertThat(resultado.getId()).isEqualTo(8L);
        assertThat(resultado.getImporteTotal()).isEqualTo(2178d);
        assertThat(resultado.getCantidadItems()).isEqualTo(1);
        assertThat(resultado.getEstado()).isEqualTo("EMITIDA");
    }

    @Test
    void rechazaUnRangoDeFechasInvertido() {
        assertThatThrownBy(() -> service.buscarFacturasFiltradas(new Date(2), new Date(1), null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("fechaDesde");
    }

    @Test
    void rechazaUnMontoNegativo() {
        assertThatThrownBy(() -> service.buscarFacturasFiltradas(null, null, null, -1d))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("montoMinimo");
    }
}
