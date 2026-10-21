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
            assertThat(libro.getSheet("Facturas").getRow(1).getCell(0).getNumericCellValue())
                    .isEqualTo(1001);
            assertThat(libro.getSheet("Facturas").getRow(1).getCell(2).getStringCellValue())
                    .isEqualTo("Consumidor Final");
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
