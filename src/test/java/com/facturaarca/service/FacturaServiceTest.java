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
import com.facturaarca.arca.ArcaHomologacionClient;
import com.facturaarca.model.ListaPrecio;
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
    private final ArcaHomologacionClient arcaClient = mock(ArcaHomologacionClient.class);

    private final FacturaService service = new FacturaService(
            facturaRepository,
            reporteRepository,
            clienteRepository,
            condicionIvaRepository,
            puntoVentaRepository,
            tipoMonedaRepository,
            precioRepository,
            usuarioRepository,
            arcaClient
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
        ListaPrecio lista = new ListaPrecio();
        lista.setDenominacion("Minorista");
        precio.setListaPrecio(lista);
        precio.setPrecioVenta(1000);
        when(precioRepository.findById(7L)).thenReturn(Optional.of(precio));

        when(facturaRepository.saveAndFlush(any(FacturaVenta.class))).thenAnswer(invocacion -> {
            FacturaVenta factura = invocacion.getArgument(0);
            factura.setId(8L);
            return factura;
        });
    }

    @Test
    void creaLaFacturaCalculaImportesYPersisteElDetalleEnCascada() {
        FacturaRequestDTO request = new FacturaRequestDTO(
                new Date(),
                2L,
                3L,
                4L,
                5L,
                "Venta web",
                List.of(new FacturaDetalleRequestDTO(7L, 2d, 10d))
        );

        FacturaReporteDTO resultado = service.crear(request);

        assertThat(resultado.getId()).isEqualTo(8L);
        assertThat(resultado.getImporteTotal()).isEqualTo(1800d);
        assertThat(resultado.getCantidadItems()).isEqualTo(1);
        assertThat(resultado.getEstado()).isEqualTo("PENDIENTE");
        assertThat(resultado.getNumeroFactura()).isNull();
    }

    @Test
    void rechazaUnRangoDeFechasInvertido() {
        assertThatThrownBy(() -> service.buscarFacturasFiltradas(new Date(2), new Date(1), null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("fechaDesde");
    }

    @Test
    void rechazaUnaCondicionDistintaDeLaRegistradaEnElCliente() {
        CondicionIva registrada = new CondicionIva();
        registrada.setId(99L);
        registrada.setDenominacion("Responsable Monotributo");
        clienteRepository.findById(2L).orElseThrow().setCondicionIva(registrada);
        FacturaRequestDTO request = new FacturaRequestDTO(new Date(), 2L, 3L, 4L, 5L,
                null, List.of(new FacturaDetalleRequestDTO(7L, 1d, 0d)));
        assertThatThrownBy(() -> service.crear(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Responsable Monotributo");
    }

    @Test
    void validaLosLimitesEnAltasYEdiciones() {
        var detalle = new FacturaDetalleRequestDTO(7L, 999d, 100d);
        var valido = new FacturaRequestDTO(new Date(), 2L, 3L, 4L, 5L, "A".repeat(255), List.of(detalle));
        assertThat(service.crear(valido).getImporteTotal()).isZero();

        detalle.setCantidad(1010d);
        assertThatThrownBy(() -> service.crear(valido)).hasMessageContaining("999");
        assertThatThrownBy(() -> service.actualizar(8L, valido)).hasMessageContaining("999");
        detalle.setCantidad(1d);
        detalle.setPorcentajeBonificacion(Double.NaN);
        assertThatThrownBy(() -> service.crear(valido)).hasMessageContaining("bonificación");
        detalle.setPorcentajeBonificacion(0d);
        valido.setObservaciones("B".repeat(256));
        assertThatThrownBy(() -> service.actualizar(8L, valido)).hasMessageContaining("255");
        valido.setObservaciones(null);
        valido.setDetalles(java.util.Collections.nCopies(51, detalle));
        assertThatThrownBy(() -> service.crear(valido)).hasMessageContaining("50 renglones");
    }

    @Test
    void rechazaUnMontoNegativo() {
        assertThatThrownBy(() -> service.buscarFacturasFiltradas(null, null, null, -1d))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("montoMinimo");
    }
}
