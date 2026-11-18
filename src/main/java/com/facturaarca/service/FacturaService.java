package com.facturaarca.service;

import com.facturaarca.dto.FacturaDetalleRequestDTO;
import com.facturaarca.dto.FacturaDetalleEdicionDTO;
import com.facturaarca.dto.FacturaEdicionDTO;
import com.facturaarca.dto.FacturaReporteDTO;
import com.facturaarca.dto.FacturaRequestDTO;
import com.facturaarca.dto.PaginaDTO;
import com.facturaarca.arca.ArcaHomologacionClient;
import com.facturaarca.arca.ResultadoArca;
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
    private final ArcaHomologacionClient arcaClient;

    public FacturaService(
            FacturaRepository facturaRepository,
            FacturaReporteRepository facturaReporteRepository,
            ClienteRepository clienteRepository,
            CondicionIvaRepository condicionIvaRepository,
            PuntoVentaRepository puntoVentaRepository,
            TipoMonedaRepository tipoMonedaRepository,
            ListaPrecioArticuloRepository listaPrecioArticuloRepository,
            UsuarioRepository usuarioRepository,
            ArcaHomologacionClient arcaClient
    ) {
        this.facturaRepository = facturaRepository;
        this.facturaReporteRepository = facturaReporteRepository;
        this.clienteRepository = clienteRepository;
        this.condicionIvaRepository = condicionIvaRepository;
        this.puntoVentaRepository = puntoVentaRepository;
        this.tipoMonedaRepository = tipoMonedaRepository;
        this.listaPrecioArticuloRepository = listaPrecioArticuloRepository;
        this.usuarioRepository = usuarioRepository;
        this.arcaClient = arcaClient;
    }

    @Transactional(readOnly = true)
    public PaginaDTO<FacturaReporteDTO> buscarFacturasPaginadas(
            Date fechaDesde,
            Date fechaHasta,
            String estado,
            Double montoMinimo,
            Long numeroFactura,
            Long numeroInterno,
            Long clienteId,
            Boolean informadaArca,
            int pagina,
            int tamanio
    ) {
        validarFiltros(fechaDesde, fechaHasta, montoMinimo, numeroInterno, numeroFactura, clienteId);
        LimitesEntrada.paginacion(pagina, tamanio, 100);
        return facturaReporteRepository.buscarPagina(
                fechaDesde, fechaHasta, normalizarFiltroEstado(estado), montoMinimo,
                numeroFactura, numeroInterno, clienteId, informadaArca, pagina, tamanio
        );
    }

    @Transactional(readOnly = true)
    public List<FacturaReporteDTO> buscarFacturasFiltradas(
            Date fechaDesde,
            Date fechaHasta,
            String estado,
            Double montoMinimo,
            Long numeroFactura,
            Long numeroInterno,
            Long clienteId,
            Boolean informadaArca
    ) {
        validarFiltros(fechaDesde, fechaHasta, montoMinimo, numeroInterno, numeroFactura, clienteId);
        return facturaReporteRepository.buscarTodos(
                fechaDesde, fechaHasta, normalizarFiltroEstado(estado), montoMinimo,
                numeroFactura, numeroInterno, clienteId, informadaArca
        );
    }

    @Transactional(readOnly = true)
    public List<FacturaReporteDTO> buscarFacturasFiltradas(
            Date fechaDesde, Date fechaHasta, String estado, Double montoMinimo
    ) {
        return buscarFacturasFiltradas(
                fechaDesde, fechaHasta, estado, montoMinimo, null, null, null, null
        );
    }

    @Transactional
    public FacturaReporteDTO crear(FacturaRequestDTO request) {
        validarEntrada(request);
        validarCreacion(request);

        Usuario usuario = obtenerUsuarioSistema();
        FacturaVenta factura = new FacturaVenta();
        aplicarCabecera(factura, request);
        factura.setEstado("PENDIENTE");
        factura.setObservaciones(limpiar(request.getObservaciones()));
        completarAuditoriaAlta(factura, usuario);

        reemplazarDetalles(factura, request.getDetalles());
        validarCondicionDelCliente(factura);
        return convertirAReporte(facturaRepository.saveAndFlush(factura));
    }

    @Transactional(readOnly = true)
    public FacturaReporteDTO obtenerReporte(Long id) {
        return convertirAReporte(buscarFactura(id, false));
    }

    @Transactional(readOnly = true)
    public FacturaEdicionDTO obtenerParaEdicion(Long id) {
        FacturaVenta factura = buscarFactura(id, false);
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
                        .map(detalle -> new FacturaDetalleEdicionDTO(
                                detalle.getListaPrecioArticulo().getId(),
                                detalle.getListaPrecioArticulo().getArticulo().getId(),
                                detalle.getListaPrecioArticulo().getArticulo().getCodigo(),
                                detalle.getListaPrecioArticulo().getArticulo().getDenominacion(),
                                detalle.getListaPrecioArticulo().getListaPrecio().getDenominacion(),
                                detalle.getPrecioUnitario(),
                                detalle.getCantidad(),
                                detalle.getPorcentajeBonificacion(),
                                detalle.getImporteSubtotal()
                        ))
                        .toList(),
                factura.getCaeFechaVencimiento(),
                (Integer.valueOf(96).equals(factura.getCliente().getTipoDocumento()) ? "DNI " : "CUIT/CUIL ")
                        + (factura.getCliente().getNumeroDocumento() == null
                        ? factura.getCliente().getCuitCuil() : factura.getCliente().getNumeroDocumento()),
                factura.getFechaBaja()
        );
    }

    @Transactional
    public FacturaReporteDTO actualizar(Long id, FacturaRequestDTO request) {
        validarEntrada(request);

        FacturaVenta factura = buscarFactura(id, true);

        if (!"PENDIENTE".equals(factura.getEstado())) {
            throw new IllegalStateException("Sólo las facturas pendientes pueden editarse");
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
        if (request.getObservaciones() != null) {
            factura.setObservaciones(limpiar(request.getObservaciones()));
        }
        if (request.getDetalles() != null) {
            if (request.getDetalles().isEmpty()) {
                throw new IllegalArgumentException("La factura debe tener al menos un detalle");
            }
            reemplazarDetalles(factura, request.getDetalles());
        }

        validarCondicionDelCliente(factura);
        factura.setFechaModificacion(new Date());
        factura.setUsuarioModificacion(obtenerUsuarioSistema());
        return convertirAReporte(facturaRepository.saveAndFlush(factura));
    }

    @Transactional
    public FacturaReporteDTO emitirEnArca(Long id) {
        FacturaVenta factura = buscarFactura(id, true);
        if (!"PENDIENTE".equals(factura.getEstado())) {
            throw new IllegalStateException("La factura ya fue informada o no está pendiente");
        }

        validarCondicionDelCliente(factura);
        ResultadoArca resultado = arcaClient.emitir(factura);
        factura.setResultadoAfip(resultado.resultado());
        factura.setMotivoRechazo(resultado.aprobado() ? null : resultado.mensaje());
        factura.setFechaModificacion(new Date());
        factura.setUsuarioModificacion(obtenerUsuarioSistema());

        if (resultado.aprobado()) {
            factura.setNumero(resultado.numeroComprobante());
            factura.setCae(resultado.cae());
            factura.setCaeFechaVencimiento(resultado.vencimientoCae());
            factura.setEstado("EMITIDA");
        }
        return convertirAReporte(facturaRepository.saveAndFlush(factura));
    }

    @Transactional
    public void eliminar(Long id) {
        FacturaVenta factura = buscarFactura(id, true);
        if (!"PENDIENTE".equals(factura.getEstado())) {
            throw new IllegalStateException(
                    "Sólo se pueden dar de baja comprobantes pendientes. Las facturas emitidas están bloqueadas"
            );
        }
        Date ahora = new Date();
        Usuario usuario = obtenerUsuarioSistema();
        factura.setEstado("ANULADA");
        factura.setFechaAnulacion(ahora);
        factura.setFechaBaja(ahora);
        factura.setUsuarioBaja(usuario);
        factura.setFechaModificacion(ahora);
        factura.setUsuarioModificacion(usuario);
        facturaRepository.saveAndFlush(factura);
    }

    private void validarCondicionDelCliente(FacturaVenta factura) {
        var condicion = factura.getCliente().getCondicionIva();
        if (condicion != null && !condicion.getId().equals(factura.getCondicionIva().getId())) {
            throw new IllegalArgumentException("La condición de IVA debe coincidir con la registrada para el cliente: "
                    + condicion.getDenominacion());
        }
    }

    private void aplicarCabecera(FacturaVenta factura, FacturaRequestDTO request) {
        // El número fiscal lo asigna ARCA al aprobar la emisión.
        factura.setNumero(null);
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

            ListaPrecioArticulo precioArticulo = listaPrecioArticuloRepository
                    .findById(request.getListaPrecioArticuloId())
                    .orElseThrow(() -> noExiste("Artículo de lista de precios", request.getListaPrecioArticuloId()));

            BigDecimal cantidad = BigDecimal.valueOf(request.getCantidad());
            BigDecimal precio = BigDecimal.valueOf(precioArticulo.getPrecioVenta());
            BigDecimal bonificacion = BigDecimal.valueOf(valorOZero(request.getPorcentajeBonificacion()))
                    .movePointLeft(2);
            BigDecimal neto = cantidad.multiply(precio)
                    .multiply(BigDecimal.ONE.subtract(bonificacion))
                    .setScale(2, RoundingMode.HALF_UP);
            BigDecimal iva = BigDecimal.ZERO;
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

    private FacturaVenta buscarFactura(Long id, boolean paraModificar) {
        LimitesEntrada.identificador(id);
        if (id == null) {
            throw new IllegalArgumentException("El ID de la factura debe ser válido");
        }
        return (paraModificar ? facturaRepository.findOneById(id) : facturaRepository.findById(id))
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
                factura.getObservaciones(),
                factura.getCae(),
                factura.getResultadoAfip(),
                factura.getMotivoRechazo(),
                factura.getPuntoVenta().getNumero()
        );
    }

    private void validarEntrada(FacturaRequestDTO request) {
        if (request == null) {
            throw new IllegalArgumentException("El cuerpo de la petición es obligatorio");
        }
        LimitesEntrada.fecha(request.getFechaEmision());
        LimitesEntrada.longitud(request.getObservaciones(), 255, "Observaciones");
        LimitesEntrada.identificador(request.getClienteId());
        LimitesEntrada.identificador(request.getPuntoVentaId());
        LimitesEntrada.identificador(request.getCondicionIvaId());
        LimitesEntrada.identificador(request.getTipoMonedaId());
        if (request.getDetalles() != null) {
            if (request.getDetalles().size() > 50) {
                throw new IllegalArgumentException("Una factura admite hasta 50 renglones");
            }
            request.getDetalles().forEach(this::validarDetalle);
        }
    }

    private void validarCreacion(FacturaRequestDTO request) {
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

    private void validarDetalle(FacturaDetalleRequestDTO detalle) {
        if (detalle == null || detalle.getListaPrecioArticuloId() == null) {
            throw new IllegalArgumentException("Cada detalle debe indicar un artículo de una lista de precios");
        }
        LimitesEntrada.identificador(detalle.getListaPrecioArticuloId());
        if (detalle.getCantidad() == null || !LimitesEntrada.decimalValido(detalle.getCantidad(), 0.01, 999)) {
            throw new IllegalArgumentException("La cantidad debe estar entre 0,01 y 999, con hasta 2 decimales");
        }
        double bonificacion = valorOZero(detalle.getPorcentajeBonificacion());
        if (!LimitesEntrada.decimalValido(bonificacion, 0, 100)) {
            throw new IllegalArgumentException("La bonificación debe estar entre 0 y 100");
        }
    }

    private void validarFiltros(Date fechaDesde, Date fechaHasta, Double montoMinimo,
                                Long numeroInterno, Long numeroFactura, Long clienteId) {
        LimitesEntrada.fecha(fechaDesde);
        LimitesEntrada.fecha(fechaHasta);
        LimitesEntrada.identificador(numeroInterno);
        LimitesEntrada.identificador(numeroFactura);
        LimitesEntrada.identificador(clienteId);
        if (fechaDesde != null && fechaHasta != null && fechaDesde.after(fechaHasta)) {
            throw new IllegalArgumentException("fechaDesde no puede ser posterior a fechaHasta");
        }
        if (montoMinimo != null && !LimitesEntrada.decimalValido(montoMinimo, 0, 999_999_999_999.99)) {
            throw new IllegalArgumentException("montoMinimo admite hasta 12 enteros y 2 decimales, desde cero");
        }
    }

    private String normalizarFiltroEstado(String estado) {
        LimitesEntrada.longitud(estado, 12, "Estado");
        if (!StringUtils.hasText(estado)) {
            return null;
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
