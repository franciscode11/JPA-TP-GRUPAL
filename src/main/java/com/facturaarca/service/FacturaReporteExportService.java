package com.facturaarca.service;

import com.facturaarca.dto.FacturaReporteDTO;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.DataFormat;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.text.NumberFormat;
import java.text.SimpleDateFormat;
import java.util.List;
import java.util.Locale;

@Service
public class FacturaReporteExportService {

    private static final String[] ENCABEZADOS = {
            "Nro. factura", "Fecha", "Cliente", "Condición IVA",
            "Punto de venta", "Importe total", "Ítems"
    };

    public byte[] generarPdf(List<FacturaReporteDTO> facturas) {
        ByteArrayOutputStream salida = new ByteArrayOutputStream();
        Document documento = new Document(PageSize.A4.rotate(), 28, 28, 30, 30);

        try {
            PdfWriter.getInstance(documento, salida);
            documento.open();

            Font titulo = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, new Color(31, 55, 77));
            Paragraph encabezado = new Paragraph("Reporte ejecutivo de facturas", titulo);
            encabezado.setSpacingAfter(14);
            documento.add(encabezado);

            PdfPTable tabla = new PdfPTable(new float[]{1.1f, 1.2f, 2.2f, 1.8f, 1.8f, 1.4f, 0.7f});
            tabla.setWidthPercentage(100);
            agregarEncabezadosPdf(tabla);

            SimpleDateFormat formatoFecha = new SimpleDateFormat("dd/MM/yyyy");
            NumberFormat formatoImporte = NumberFormat.getCurrencyInstance(new Locale("es", "AR"));

            for (FacturaReporteDTO factura : facturas) {
                agregarCelda(tabla, String.valueOf(factura.getNumeroFactura()), Element.ALIGN_RIGHT);
                agregarCelda(tabla, formatoFecha.format(factura.getFechaEmision()), Element.ALIGN_CENTER);
                agregarCelda(tabla, factura.getClienteDenominacion(), Element.ALIGN_LEFT);
                agregarCelda(tabla, factura.getCondicionIva(), Element.ALIGN_LEFT);
                agregarCelda(tabla, factura.getPuntoVentaDescripcion(), Element.ALIGN_LEFT);
                agregarCelda(tabla, formatoImporte.format(factura.getImporteTotal()), Element.ALIGN_RIGHT);
                agregarCelda(tabla, String.valueOf(factura.getCantidadItems()), Element.ALIGN_RIGHT);
            }

            documento.add(tabla);
            Paragraph total = new Paragraph("Facturas incluidas: " + facturas.size());
            total.setAlignment(Element.ALIGN_RIGHT);
            total.setSpacingBefore(10);
            documento.add(total);
        } catch (DocumentException e) {
            throw new IllegalStateException("No se pudo generar el reporte PDF", e);
        } finally {
            documento.close();
        }

        return salida.toByteArray();
    }

    public byte[] generarExcel(List<FacturaReporteDTO> facturas) {
        try (Workbook libro = new XSSFWorkbook(); ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            Sheet hoja = libro.createSheet("Facturas");
            CellStyle estiloEncabezado = crearEstiloEncabezado(libro);
            CellStyle estiloFecha = crearEstiloFecha(libro);
            CellStyle estiloImporte = crearEstiloImporte(libro);

            Row encabezado = hoja.createRow(0);
            for (int columna = 0; columna < ENCABEZADOS.length; columna++) {
                Cell celda = encabezado.createCell(columna);
                celda.setCellValue(ENCABEZADOS[columna]);
                celda.setCellStyle(estiloEncabezado);
            }

            int fila = 1;
            for (FacturaReporteDTO factura : facturas) {
                Row row = hoja.createRow(fila++);
                row.createCell(0).setCellValue(factura.getNumeroFactura());

                Cell fecha = row.createCell(1);
                fecha.setCellValue(factura.getFechaEmision());
                fecha.setCellStyle(estiloFecha);

                row.createCell(2).setCellValue(factura.getClienteDenominacion());
                row.createCell(3).setCellValue(factura.getCondicionIva());
                row.createCell(4).setCellValue(factura.getPuntoVentaDescripcion());

                Cell importe = row.createCell(5);
                importe.setCellValue(factura.getImporteTotal());
                importe.setCellStyle(estiloImporte);

                row.createCell(6).setCellValue(factura.getCantidadItems());
            }

            hoja.createFreezePane(0, 1);
            hoja.setAutoFilter(new org.apache.poi.ss.util.CellRangeAddress(0, Math.max(0, fila - 1), 0, ENCABEZADOS.length - 1));
            for (int columna = 0; columna < ENCABEZADOS.length; columna++) {
                hoja.autoSizeColumn(columna);
                hoja.setColumnWidth(columna, Math.min(hoja.getColumnWidth(columna) + 700, 15000));
            }

            libro.write(salida);
            return salida.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo generar el reporte Excel", e);
        }
    }

    private void agregarEncabezadosPdf(PdfPTable tabla) {
        Font fuente = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.WHITE);
        for (String texto : ENCABEZADOS) {
            PdfPCell celda = new PdfPCell(new Phrase(texto, fuente));
            celda.setBackgroundColor(new Color(31, 78, 121));
            celda.setHorizontalAlignment(Element.ALIGN_CENTER);
            celda.setPadding(6);
            tabla.addCell(celda);
        }
    }

    private void agregarCelda(PdfPTable tabla, String texto, int alineacion) {
        PdfPCell celda = new PdfPCell(new Phrase(texto, FontFactory.getFont(FontFactory.HELVETICA, 8)));
        celda.setHorizontalAlignment(alineacion);
        celda.setPadding(5);
        tabla.addCell(celda);
    }

    private CellStyle crearEstiloEncabezado(Workbook libro) {
        CellStyle estilo = libro.createCellStyle();
        estilo.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        estilo.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        estilo.setAlignment(HorizontalAlignment.CENTER);
        org.apache.poi.ss.usermodel.Font fuente = libro.createFont();
        fuente.setColor(IndexedColors.WHITE.getIndex());
        fuente.setBold(true);
        estilo.setFont(fuente);
        return estilo;
    }

    private CellStyle crearEstiloFecha(Workbook libro) {
        CellStyle estilo = libro.createCellStyle();
        DataFormat formato = libro.createDataFormat();
        estilo.setDataFormat(formato.getFormat("dd/mm/yyyy"));
        return estilo;
    }

    private CellStyle crearEstiloImporte(Workbook libro) {
        CellStyle estilo = libro.createCellStyle();
        DataFormat formato = libro.createDataFormat();
        estilo.setDataFormat(formato.getFormat("$ #,##0.00"));
        return estilo;
    }
}
