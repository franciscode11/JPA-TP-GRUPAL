package com.facturaarca.service;

import com.facturaarca.dto.FacturaReporteDTO;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.util.Date;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class FacturaReporteExportServiceTest {

    private final FacturaReporteExportService service = new FacturaReporteExportService();

    @Test
    void generaUnPdfValido() {
        byte[] pdf = service.generarPdf(List.of(factura()));

        assertThat(pdf).startsWith("%PDF".getBytes());
        assertThat(pdf.length).isGreaterThan(500);
    }

    @Test
    void generaUnExcelConEncabezadosYDatos() throws Exception {
        byte[] excel = service.generarExcel(List.of(factura()));

        try (XSSFWorkbook libro = new XSSFWorkbook(new ByteArrayInputStream(excel))) {
            assertThat(libro.getSheet("Facturas").getRow(0).getCell(0).getStringCellValue())
                    .isEqualTo("Nro. factura");
            assertThat(libro.getSheet("Facturas").getRow(1).getCell(0).getStringCellValue())
                    .isEqualTo("00000-00001001");
            assertThat(libro.getSheet("Facturas").getRow(1).getCell(2).getStringCellValue())
                    .isEqualTo("Consumidor Final");
        }
    }

    @Test
    void comprobanteIndividualConservaTodosLosRenglonesYLaAutorizacionAlAnular() throws Exception {
        var reporte = factura();
        reporte.setEstado("ANULADA");
        reporte.setCae("12345678901234");
        var detalles = java.util.stream.IntStream.range(0, 50)
                .mapToObj(i -> new com.facturaarca.dto.FacturaDetalleEdicionDTO(
                        1L, 1L, "COD-" + i, "Producto " + i, "Minorista", 100, 1, 0, 100))
                .toList();
        var datos = new com.facturaarca.dto.FacturaEdicionDTO(1L, 1001L, new Date(),
                1L, 1L, 1L, 1L, "ANULADA", "Observaciones de prueba", detalles,
                new Date(), "DNI 12345678", new Date());
        var lector = new com.lowagie.text.pdf.PdfReader(service.generarComprobante(reporte, datos));
        try {
            assertThat(lector.getNumberOfPages()).isGreaterThan(1);
            var texto = new StringBuilder();
            var extractor = new com.lowagie.text.pdf.parser.PdfTextExtractor(lector);
            for (int pagina = 1; pagina <= lector.getNumberOfPages(); pagina++) {
                texto.append(extractor.getTextFromPage(pagina));
            }
            assertThat(texto.toString()).contains("Producto 0", "Producto 49", "12345678901234",
                    "ANULADA EN EL SISTEMA", "Fecha de baja", "Observaciones de prueba");
        } finally {
            lector.close();
        }
    }

    private FacturaReporteDTO factura() {
        return new FacturaReporteDTO(
                1L,
                1001L,
                new Date(),
                "Consumidor Final",
                "IVA Responsable Inscripto",
                "Sucursal Central",
                1500,
                2,
                "EMITIDA",
                null
        );
    }
}
