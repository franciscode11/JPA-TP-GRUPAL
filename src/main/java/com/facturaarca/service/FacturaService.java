package com.facturaarca.service;

import com.facturaarca.dto.FacturaDetalleRequestDTO;
import com.facturaarca.dto.FacturaEdicionDTO;
import com.facturaarca.dto.FacturaReporteDTO;
import com.facturaarca.dto.FacturaRequestDTO;
import com.facturaarca.exception.RecursoNoEncontradoException;
import com.facturaarca.model.AuditoriaApp;
import com.facturaarca.model.FacturaVenta;
import com.facturaarca.model.FacturaVentaDetalle;
import com.facturaarca.model.ListaPrecioArticulo;
import com.facturaarca.model.Usuario;
import com.facturaarca.repository.ClienteRepository;
import com.facturaarca.repository.CondicionIvaRepository;
import com.facturaarca.repository.FacturaReporteRepository;
import com.facturaarca.repository.FacturaRepository;
import com.facturaarca.repository.ListaPrecioArticuloRepository;
import com.facturaarca.repository.PuntoVentaRepository;
import com.facturaarca.repository.TipoMonedaRepository;
import com.facturaarca.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

@Service
public class FacturaService {

    private static final BigDecimal ALICUOTA_IVA = new BigDecimal("0.21");

    private final FacturaRepository facturaRepository;
    private final FacturaReporteRepository facturaReporteRepository;
    private final ClienteRepository clienteRepository;
    private final CondicionIvaRepository condicionIvaRepository;
    private final PuntoVentaRepository puntoVentaRepository;
    private final TipoMonedaRepository tipoMonedaRepository;
    private final ListaPrecioArticuloRepository listaPrecioArticuloRepository;
    private final UsuarioRepository usuarioRepository;

    public FacturaService(
            FacturaRepository facturaRepository,
            FacturaReporteRepository facturaReporteRepository,
            ClienteRepository clienteRepository,
            CondicionIvaRepository condicionIvaRepository,
            PuntoVentaRepository puntoVentaRepository,
            TipoMonedaRepository tipoMonedaRepository,
            ListaPrecioArticuloRepository listaPrecioArticuloRepository,
            UsuarioRepository usuarioRepository
    ) {
        this.facturaRepository = facturaRepository;
        this.facturaReporteRepository = facturaReporteRepository;
        this.clienteRepository = clienteRepository;
        this.condicionIvaRepository = condicionIvaRepository;
        this.puntoVentaRepository = puntoVentaRepository;
        this.tipoMonedaRepository = tipoMonedaRepository;
        this.listaPrecioArticuloRepository = listaPrecioArticuloRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @Transactional(readOnly = true)
    public List<FacturaReporteDTO> buscarFacturasFiltradas(
            Date fechaDesde,
            Date fechaHasta,
            String estado,
            Double montoMinimo
    ) {
        validarFiltros(fechaDesde, fechaHasta, montoMinimo);
        String estadoNormalizado = StringUtils.hasText(estado)
                ? estado.trim().toUpperCase(Locale.ROOT)
                : null;

        return facturaReporteRepository.buscarFacturasFiltradas(
                fechaDesde,
                fechaHasta,
                estadoNormalizado,
                montoMinimo
        );
    }

    @Transactional
    public FacturaReporteDTO crear(FacturaRequestDTO request) {
        validarCreacion(request);

        Usuario usuario = obtenerUsuarioSistema();
        FacturaVenta factura = new FacturaVenta();
        aplicarCabecera(factura, request);
        factura.setEstado(normalizarEstado(request.getEstado(), "EMITIDA"));
        factura.setObservaciones(limpiar(request.getObservaciones()));
        completarAuditoriaAlta(factura, usuario);

        reemplazarDetalles(factura, request.getDetalles());
        actualizarAnulacion(factura);

        return convertirAReporte(facturaRepository.saveAndFlush(factura));
    }

    @Transactional(readOnly = true)
    public FacturaEdicionDTO obtenerParaEdicion(Long id) {
        FacturaVenta factura = buscarFactura(id);
        return new FacturaEdicionDTO(
                factura.getId(),
                factura.getNumero(),
                factura.getFechaEmision(),
                factura.getCliente().getId(),
                factura.getCondicionIva().getId(),
                puntoVentaRepository.findFirstByNumeroOrderByIdAsc(factura.getPuntoVenta().getNumero())
                        .map(punto -> punto.getId())
                        .orElse(factura.getPuntoVenta().getId()),
                tipoMonedaRepository.findFirstByCodigoAfipOrderByIdAsc(factura.getTipoMoneda().getCodigoAfip())
                        .map(moneda -> moneda.getId())
                        .orElse(factura.getTipoMoneda().getId()),
                factura.getEstado(),
                factura.getObservaciones(),
                factura.getDetalles().stream()
                        .map(detalle -> new FacturaDetalleRequestDTO(
                                detalle.getListaPrecioArticulo().getArticulo().getId(),
                                detalle.getCantidad(),
                                detalle.getPorcentajeBonificacion()
                        ))
                        .toList()
        );
    }

    @Transactional
    public FacturaReporteDTO actualizar(Long id, FacturaRequestDTO request) {
        if (request == null) {
            throw new IllegalArgumentException("El cuerpo de la petición es obligatorio");
        }

        FacturaVenta factura = buscarFactura(id);

        if ("ANULADA".equals(factura.getEstado())) {
            throw new IllegalStateException("Una factura anulada se conserva como registro histórico y no puede editarse");
        }

        if (request.getNumeroFactura() != null) {
            validarNumero(request.getNumeroFactura());
            factura.setNumero(request.getNumeroFactura());
        }
        if (request.getFechaEmision() != null) {
            factura.setFechaEmision(request.getFechaEmision());
        }
        if (request.getClienteId() != null) {
            factura.setCliente(clienteRepository.findById(request.getClienteId())
                    .orElseThrow(() -> noExiste("Cliente", request.getClienteId())));
        }
        if (request.getCondicionIvaId() != null) {
            factura.setCondicionIva(condicionIvaRepository.findById(request.getCondicionIvaId())
                    .orElseThrow(() -> noExiste("Condición de IVA", request.getCondicionIvaId())));
        }
        if (request.getPuntoVentaId() != null) {
            factura.setPuntoVenta(puntoVentaRepository.findById(request.getPuntoVentaId())
                    .orElseThrow(() -> noExiste("Punto de venta", request.getPuntoVentaId())));
        }
        if (request.getTipoMonedaId() != null) {
            factura.setTipoMoneda(tipoMonedaRepository.findById(request.getTipoMonedaId())
                    .orElseThrow(() -> noExiste("Tipo de moneda", request.getTipoMonedaId())));
        }
        if (request.getEstado() != null) {
            factura.setEstado(normalizarEstado(request.getEstado(), null));
        }
        if (request.getObservaciones() != null) {
            factura.setObservaciones(limpiar(request.getObservaciones()));
        }
        if (request.getDetalles() != null) {
            if (request.getDetalles().isEmpty()) {
                throw new IllegalArgumentException("La factura debe tener al menos un detalle");
            }
            reemplazarDetalles(factura, request.getDetalles());
        }

        factura.setFechaModificacion(new Date());
        factura.setUsuarioModificacion(obtenerUsuarioSistema());
        actualizarAnulacion(factura);

        return convertirAReporte(facturaRepository.saveAndFlush(factura));
    }

    @Transactional
    public void eliminar(Long id) {
        FacturaVenta factura = buscarFactura(id);
        facturaRepository.delete(factura);
        facturaRepository.flush();
    }

    private void aplicarCabecera(FacturaVenta factura, FacturaRequestDTO request) {
        factura.setNumero(request.getNumeroFactura());
        factura.setFechaEmision(request.getFechaEmision());
        factura.setCliente(clienteRepository.findById(request.getClienteId())
                .orElseThrow(() -> noExiste("Cliente", request.getClienteId())));
        factura.setCondicionIva(condicionIvaRepository.findById(request.getCondicionIvaId())
                .orElseThrow(() -> noExiste("Condición de IVA", request.getCondicionIvaId())));
        factura.setPuntoVenta(puntoVentaRepository.findById(request.getPuntoVentaId())
                .orElseThrow(() -> noExiste("Punto de venta", request.getPuntoVentaId())));
        factura.setTipoMoneda(tipoMonedaRepository.findById(request.getTipoMonedaId())
                .orElseThrow(() -> noExiste("Tipo de moneda", request.getTipoMonedaId())));
    }

    private void reemplazarDetalles(FacturaVenta factura, List<FacturaDetalleRequestDTO> detallesRequest) {
        new ArrayList<>(factura.getDetalles()).forEach(factura::quitarDetalle);

        BigDecimal total = BigDecimal.ZERO;
        for (FacturaDetalleRequestDTO request : detallesRequest) {
            validarDetalle(request);

            ListaPrecioArticulo precioArticulo = listaPrecioArticuloRepository
                    .findFirstByArticuloIdOrderByIdDesc(request.getArticuloId())
                    .orElseThrow(() -> noExiste("Artículo con precio", request.getArticuloId()));

            BigDecimal cantidad = BigDecimal.valueOf(request.getCantidad());
            BigDecimal precio = BigDecimal.valueOf(precioArticulo.getPrecioVenta());
            BigDecimal bonificacion = BigDecimal.valueOf(valorOZero(request.getPorcentajeBonificacion()))
                    .movePointLeft(2);
            BigDecimal neto = cantidad.multiply(precio)
                    .multiply(BigDecimal.ONE.subtract(bonificacion))
                    .setScale(2, RoundingMode.HALF_UP);
            BigDecimal iva = neto.multiply(ALICUOTA_IVA).setScale(2, RoundingMode.HALF_UP);
            BigDecimal subtotal = neto.add(iva).setScale(2, RoundingMode.HALF_UP);

            FacturaVentaDetalle detalle = new FacturaVentaDetalle();
            detalle.setListaPrecioArticulo(precioArticulo);
            detalle.setDescripcion(precioArticulo.getArticulo().getDenominacion());
            detalle.setCantidad(cantidad.doubleValue());
            detalle.setPrecioUnitario(precio.doubleValue());
            detalle.setPorcentajeBonificacion(bonificacion.movePointRight(2).doubleValue());
            detalle.setImporteNeto(neto.doubleValue());
            detalle.setImporteIva(iva.doubleValue());
            detalle.setImporteSubtotal(subtotal.doubleValue());
            factura.agregarDetalle(detalle);

            total = total.add(subtotal);
        }

        double importeTotal = total.setScale(2, RoundingMode.HALF_UP).doubleValue();
        factura.setImporteTotal(importeTotal);
        factura.setImporteCobrado(importeTotal);
        factura.setImporteSaldo(0);
    }

    private FacturaVenta buscarFactura(Long id) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException("El ID de la factura debe ser válido");
        }
        return facturaRepository.findById(id)
                .orElseThrow(() -> noExiste("Factura", id));
    }

    private Usuario obtenerUsuarioSistema() {
        return usuarioRepository.findFirstByOrderByIdAsc()
                .orElseThrow(() -> new IllegalStateException(
                        "No existe un usuario para registrar la auditoría"
                ));
    }

    private void completarAuditoriaAlta(AuditoriaApp entidad, Usuario usuario) {
        Date ahora = new Date();
        entidad.setFechaAlta(ahora);
        entidad.setFechaModificacion(ahora);
        entidad.setUsuarioCarga(usuario);
        entidad.setUsuarioModificacion(usuario);
    }

    private void actualizarAnulacion(FacturaVenta factura) {
        if ("ANULADA".equals(factura.getEstado())) {
            if (factura.getFechaAnulacion() == null) {
                factura.setFechaAnulacion(new Date());
            }
        } else {
            factura.setFechaAnulacion(null);
        }
    }

    private FacturaReporteDTO convertirAReporte(FacturaVenta factura) {
        return new FacturaReporteDTO(
                factura.getId(),
                factura.getNumero(),
                factura.getFechaEmision(),
                factura.getCliente() == null ? "Consumidor Final" : factura.getCliente().getDenominacion(),
                factura.getCondicionIva().getDenominacion(),
                factura.getPuntoVenta().getDescripcion(),
                factura.getImporteTotal(),
                factura.getDetalles().size(),
                factura.getEstado(),
                factura.getObservaciones()
        );
    }

    private void validarCreacion(FacturaRequestDTO request) {
        if (request == null) {
            throw new IllegalArgumentException("El cuerpo de la petición es obligatorio");
        }
        validarNumero(request.getNumeroFactura());
        if (request.getFechaEmision() == null) {
            throw new IllegalArgumentException("La fecha de emisión es obligatoria");
        }
        if (request.getClienteId() == null
                || request.getCondicionIvaId() == null
                || request.getPuntoVentaId() == null
                || request.getTipoMonedaId() == null) {
            throw new IllegalArgumentException("Los IDs de cliente, condición de IVA, punto de venta y moneda son obligatorios");
        }
        if (request.getDetalles() == null || request.getDetalles().isEmpty()) {
            throw new IllegalArgumentException("La factura debe tener al menos un detalle");
        }
    }

    private void validarNumero(Long numeroFactura) {
        if (numeroFactura == null || numeroFactura <= 0) {
            throw new IllegalArgumentException("El número de factura debe ser mayor que cero");
        }
    }

    private void validarDetalle(FacturaDetalleRequestDTO detalle) {
        if (detalle == null || detalle.getArticuloId() == null) {
            throw new IllegalArgumentException("Cada detalle debe indicar un artículo");
        }
        if (detalle.getCantidad() == null || detalle.getCantidad() <= 0) {
            throw new IllegalArgumentException("La cantidad de cada detalle debe ser mayor que cero");
        }
        double bonificacion = valorOZero(detalle.getPorcentajeBonificacion());
        if (bonificacion < 0 || bonificacion > 100) {
            throw new IllegalArgumentException("La bonificación debe estar entre 0 y 100");
        }
    }

    private void validarFiltros(Date fechaDesde, Date fechaHasta, Double montoMinimo) {
        if (fechaDesde != null && fechaHasta != null && fechaDesde.after(fechaHasta)) {
            throw new IllegalArgumentException("fechaDesde no puede ser posterior a fechaHasta");
        }
        if (montoMinimo != null && montoMinimo < 0) {
            throw new IllegalArgumentException("montoMinimo no puede ser negativo");
        }
    }

    private String normalizarEstado(String estado, String valorPorDefecto) {
        if (!StringUtils.hasText(estado)) {
            if (valorPorDefecto != null) {
                return valorPorDefecto;
            }
            throw new IllegalArgumentException("El estado no puede estar vacío");
        }
        String normalizado = estado.trim().toUpperCase(Locale.ROOT);
        if (!List.of("EMITIDA", "PENDIENTE", "ANULADA").contains(normalizado)) {
            throw new IllegalArgumentException("El estado debe ser EMITIDA, PENDIENTE o ANULADA");
        }
        return normalizado;
    }

    private RecursoNoEncontradoException noExiste(String recurso, Long id) {
        return new RecursoNoEncontradoException(recurso + " no encontrado/a con ID " + id);
    }

    private String limpiar(String texto) {
        return StringUtils.hasText(texto) ? texto.trim() : null;
    }

    private double valorOZero(Double valor) {
        return valor == null ? 0 : valor;
    }
}
