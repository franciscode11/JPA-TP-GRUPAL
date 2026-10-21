package com.facturaarca.controller;

import com.facturaarca.dto.FacturaReporteDTO;
import com.facturaarca.dto.FacturaEdicionDTO;
import com.facturaarca.dto.FacturaRequestDTO;
import com.facturaarca.service.FacturaReporteExportService;
import com.facturaarca.service.FacturaService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;
import java.net.URI;

@RestController
@RequestMapping("/api/facturas")
public class FacturaRestController {

    private static final MediaType PDF = MediaType.APPLICATION_PDF;
    private static final MediaType XLSX = MediaType.parseMediaType(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    private final FacturaService facturaService;
    private final FacturaReporteExportService exportService;

    public FacturaRestController(FacturaService facturaService, FacturaReporteExportService exportService) {
        this.facturaService = facturaService;
        this.exportService = exportService;
    }

    @GetMapping
    public List<FacturaReporteDTO> buscarFacturas(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) Date fechaDesde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) Date fechaHasta,
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) Double montoMinimo
    ) {
        return facturaService.buscarFacturasFiltradas(fechaDesde, fechaHasta, estado, montoMinimo);
    }

    @PostMapping
    public ResponseEntity<FacturaReporteDTO> crearFactura(@RequestBody FacturaRequestDTO request) {
        FacturaReporteDTO creada = facturaService.crear(request);
        return ResponseEntity.created(URI.create("/api/facturas/" + creada.getId())).body(creada);
    }

    @GetMapping("/{id}")
    public ResponseEntity<FacturaEdicionDTO> obtenerFactura(@PathVariable Long id) {
        return ResponseEntity.ok(facturaService.obtenerParaEdicion(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FacturaReporteDTO> actualizarFactura(
            @PathVariable Long id,
            @RequestBody FacturaRequestDTO request
    ) {
        return ResponseEntity.ok(facturaService.actualizar(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarFactura(@PathVariable Long id) {
        facturaService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping(value = "/reporte.pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> descargarPdf(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) Date fechaDesde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) Date fechaHasta,
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) Double montoMinimo
    ) {
        List<FacturaReporteDTO> facturas = facturaService.buscarFacturasFiltradas(
                fechaDesde, fechaHasta, estado, montoMinimo
        );
        return archivo(exportService.generarPdf(facturas), PDF, "reporte-facturas.pdf");
    }

    @GetMapping(value = "/reporte.xlsx", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public ResponseEntity<byte[]> descargarExcel(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) Date fechaDesde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) Date fechaHasta,
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) Double montoMinimo
    ) {
        List<FacturaReporteDTO> facturas = facturaService.buscarFacturasFiltradas(
                fechaDesde, fechaHasta, estado, montoMinimo
        );
        return archivo(exportService.generarExcel(facturas), XLSX, "reporte-facturas.xlsx");
    }

    private ResponseEntity<byte[]> archivo(byte[] contenido, MediaType tipo, String nombre) {
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(nombre, StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(tipo)
                .contentLength(contenido.length)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(contenido);
    }
}
