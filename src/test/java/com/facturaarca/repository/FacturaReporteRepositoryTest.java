package com.facturaarca.repository;

import com.facturaarca.dto.FacturaReporteDTO;
import com.facturaarca.model.AuditoriaApp;
import com.facturaarca.model.Articulo;
import com.facturaarca.model.CondicionIva;
import com.facturaarca.model.FacturaVenta;
import com.facturaarca.model.FacturaVentaDetalle;
import com.facturaarca.model.ListaPrecio;
import com.facturaarca.model.ListaPrecioArticulo;
import com.facturaarca.model.PuntoVenta;
import com.facturaarca.model.TipoMoneda;
import com.facturaarca.model.Usuario;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Date;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(FacturaReporteRepository.class)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class FacturaReporteRepositoryTest {

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private FacturaReporteRepository repository;

    @BeforeEach
    void cargarDatos() {
        Usuario usuario = new Usuario();
        usuario.setUsuario("tester");
        usuario.setClave("1234");
        usuario.setNombre("Test");
        usuario.setApellido("Runner");
        entityManager.persist(usuario);

        PuntoVenta puntoVenta = new PuntoVenta();
        puntoVenta.setNumero(1);
        puntoVenta.setDescripcion("Sucursal Central");
        auditar(puntoVenta, usuario);
        entityManager.persist(puntoVenta);

        CondicionIva condicionIva = new CondicionIva();
        condicionIva.setCodigoAfip(5);
        condicionIva.setDenominacion("Consumidor Final");
        auditar(condicionIva, usuario);
        entityManager.persist(condicionIva);

        TipoMoneda moneda = new TipoMoneda();
        moneda.setCodigoAfip("PES");
        moneda.setDenominacion("Peso Argentino");
        moneda.setSimbolo("$");
        auditar(moneda, usuario);
        entityManager.persist(moneda);

        Articulo articulo = new Articulo();
        articulo.setCodigo("ART-TEST");
        articulo.setDenominacion("Artículo de prueba");
        auditar(articulo, usuario);
        entityManager.persist(articulo);

        ListaPrecio listaPrecio = new ListaPrecio();
        listaPrecio.setCodigo("LP-TEST");
        listaPrecio.setDenominacion("Lista de prueba");
        auditar(listaPrecio, usuario);
        entityManager.persist(listaPrecio);

        ListaPrecioArticulo precio = new ListaPrecioArticulo();
        precio.setArticulo(articulo);
        precio.setListaPrecio(listaPrecio);
        precio.setPrecioVenta(1000);
        auditar(precio, usuario);
        entityManager.persist(precio);

        FacturaVenta factura = new FacturaVenta();
        factura.setNumero(1001L);
        factura.setFechaEmision(fecha(2026, 3, 15));
        factura.setPuntoVenta(puntoVenta);
        factura.setCondicionIva(condicionIva);
        factura.setTipoMoneda(moneda);
        factura.setEstado("EMITIDA");
        factura.setImporteTotal(1500);
        auditar(factura, usuario);

        FacturaVentaDetalle detalleUno = detalle("Producto A", 1000, precio);
        FacturaVentaDetalle detalleDos = detalle("Producto B", 500, precio);
        factura.agregarDetalle(detalleUno);
        factura.agregarDetalle(detalleDos);
        entityManager.persist(factura);
        entityManager.flush();
        entityManager.clear();
    }

    @Test
    void proyectaElDtoYCuentaLosDetallesSinCargarLaEntidadCompleta() {
        List<FacturaReporteDTO> resultado = repository.buscarFacturasFiltradas(null, null, null, null);

        assertThat(resultado).singleElement().satisfies(dto -> {
            assertThat(dto.getNumeroFactura()).isEqualTo(1001L);
            assertThat(dto.getClienteDenominacion()).isEqualTo("Consumidor Final");
            assertThat(dto.getCondicionIva()).isEqualTo("Consumidor Final");
            assertThat(dto.getPuntoVentaDescripcion()).isEqualTo("Sucursal Central");
            assertThat(dto.getImporteTotal()).isEqualTo(1500);
            assertThat(dto.getCantidadItems()).isEqualTo(2);
        });
    }

    @Test
    void combinaLosFiltrosOpcionales() {
        assertThat(repository.buscarFacturasFiltradas(
                fecha(2026, 3, 1), fecha(2026, 3, 31), "EMITIDA", 1000d
        )).hasSize(1);

        assertThat(repository.buscarFacturasFiltradas(
                null, null, "ANULADA", null
        )).isEmpty();

        assertThat(repository.buscarFacturasFiltradas(
                null, null, null, 2000d
        )).isEmpty();
    }

    private FacturaVentaDetalle detalle(String descripcion, double subtotal, ListaPrecioArticulo precio) {
        FacturaVentaDetalle detalle = new FacturaVentaDetalle();
        detalle.setListaPrecioArticulo(precio);
        detalle.setDescripcion(descripcion);
        detalle.setCantidad(1);
        detalle.setPrecioUnitario(subtotal);
        detalle.setImporteNeto(subtotal);
        detalle.setImporteSubtotal(subtotal);
        return detalle;
    }

    private void auditar(AuditoriaApp entidad, Usuario usuario) {
        Date ahora = new Date();
        entidad.setFechaAlta(ahora);
        entidad.setFechaModificacion(ahora);
        entidad.setUsuarioCarga(usuario);
        entidad.setUsuarioModificacion(usuario);
    }

    private Date fecha(int anio, int mes, int dia) {
        return Date.from(LocalDate.of(anio, mes, dia)
                .atStartOfDay(ZoneId.systemDefault())
                .toInstant());
    }
}
