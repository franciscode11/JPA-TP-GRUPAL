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
            "N.º interno", "N.º fiscal", "Fecha", "Cliente", "Condición IVA",
            "Punto de venta", "Importe total", "Ítems", "Estado"
    };

    public byte[] generarComprobante(FacturaReporteDTO reporte,
                                    com.facturaarca.dto.FacturaEdicionDTO factura) {
        ByteArrayOutputStream salida = new ByteArrayOutputStream();
        Document documento = new Document(PageSize.A4, 42, 42, 42, 48);
        Color tinta = new Color(25, 25, 25);
        Color gris = new Color(110, 110, 110);
        Color suave = new Color(246, 246, 244);
        Color estado = switch (reporte.getEstado()) {
            case "ANULADA" -> new Color(157, 53, 53);
            case "EMITIDA" -> new Color(36, 90, 66);
            default -> new Color(128, 93, 19);
        };
        var moneda = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("es-AR"));
        var decimales = NumberFormat.getNumberInstance(Locale.forLanguageTag("es-AR"));
        var fecha = new SimpleDateFormat("dd/MM/yyyy");
        var fechaHora = new SimpleDateFormat("dd/MM/yyyy HH:mm:ss");
        fechaHora.setTimeZone(java.util.TimeZone.getTimeZone("America/Argentina/Mendoza"));
        try {
            PdfWriter writer = PdfWriter.getInstance(documento, salida);
            writer.setPageEvent(new com.lowagie.text.pdf.PdfPageEventHelper() {
                @Override
                public void onEndPage(PdfWriter escritor, Document doc) {
                    com.lowagie.text.pdf.ColumnText.showTextAligned(escritor.getDirectContent(),
                            Element.ALIGN_LEFT, new Phrase("Homologación · Sin validez fiscal",
                                    FontFactory.getFont(FontFactory.HELVETICA, 8, gris)),
                            doc.left(), 24, 0);
                    com.lowagie.text.pdf.ColumnText.showTextAligned(escritor.getDirectContent(),
                            Element.ALIGN_RIGHT, new Phrase("Página " + escritor.getPageNumber(),
                                    FontFactory.getFont(FontFactory.HELVETICA, 8, gris)),
                            doc.right(), 24, 0);
                }
            });
            documento.addTitle("Comprobante #" + reporte.getId());
            documento.open();
            documento.add(new Paragraph("SISTEMA DE FACTURACIÓN",
                    FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, gris)));
            Paragraph titulo = new Paragraph(reporte.getNumeroFactura() == null
                    ? "Comprobante #" + reporte.getId() : "Factura C",
                    FontFactory.getFont(FontFactory.HELVETICA_BOLD, 30, tinta));
            titulo.setSpacingBefore(14);
            documento.add(titulo);
            Paragraph numero = new Paragraph(reporte.getIdentificador(),
                    FontFactory.getFont(FontFactory.HELVETICA, 14, gris));
            numero.setSpacingAfter(18);
            documento.add(numero);

            PdfPTable cabecera = new PdfPTable(new float[]{1, 1});
            cabecera.setWidthPercentage(100);
            celdaComprobante(cabecera, "ESTADO\n" + reporte.getEstado(), 10, estado, suave, false);
            celdaComprobante(cabecera, "FECHA DE EMISIÓN\n" + fecha.format(reporte.getFechaEmision()),
                    10, tinta, suave, false);
            celdaComprobante(cabecera, "CLIENTE\n" + reporte.getClienteDenominacion() + "\n"
                    + factura.documentoCliente() + "\n" + reporte.getCondicionIva(),
                    11, tinta, Color.WHITE, false);
            celdaComprobante(cabecera, "PUNTO DE VENTA\n" + reporte.getPuntoVentaNumero() + " · "
                    + reporte.getPuntoVentaDescripcion() + "\n\nN.º interno #" + reporte.getId(),
                    10, gris, Color.WHITE, false);
            cabecera.setSpacingAfter(20);
            documento.add(cabecera);

            PdfPTable detalles = new PdfPTable(new float[]{3.6f, .8f, 1.6f, .8f, 1.8f});
            detalles.setWidthPercentage(100);
            detalles.setHeaderRows(1);
            detalles.setSplitLate(false);
            for (String texto : List.of("ARTÍCULO", "CANT.", "PRECIO UNIT.", "DTO.", "IMPORTE")) {
                celdaComprobante(detalles, texto, 8, Color.WHITE, tinta, false);
            }
            for (var detalle : factura.detalles()) {
                celdaComprobante(detalles, detalle.articuloNombre() + "\n" + detalle.articuloCodigo()
                        + " · " + detalle.listaPrecioNombre(), 9, tinta, Color.WHITE, false);
                celdaComprobante(detalles, decimales.format(detalle.cantidad()), 9, tinta, Color.WHITE, true);
                celdaComprobante(detalles, moneda.format(detalle.precioUnitario()), 9, tinta, Color.WHITE, true);
                celdaComprobante(detalles, decimales.format(detalle.porcentajeBonificacion()) + "%",
                        9, gris, Color.WHITE, true);
                celdaComprobante(detalles, moneda.format(detalle.importeSubtotal()), 9, tinta, Color.WHITE, true);
            }
            documento.add(detalles);
            PdfPTable total = new PdfPTable(new float[]{1, 1});
            total.setWidthPercentage(100);
            total.setKeepTogether(true);
            celdaComprobante(total, "TOTAL · PESOS ARGENTINOS", 10, tinta, suave, false);
            celdaComprobante(total, moneda.format(reporte.getImporteTotal()), 19, tinta, suave, true);
            total.setSpacingAfter(22);
            documento.add(total);

            if (reporte.getCae() != null && !reporte.getCae().isBlank()) {
                Paragraph autorizacion = new Paragraph("AUTORIZACIÓN DE HOMOLOGACIÓN\nCAE "
                        + reporte.getCae() + "\nVencimiento "
                        + (factura.vencimientoCae() == null ? "Sin fecha" : fecha.format(factura.vencimientoCae())),
                        FontFactory.getFont(FontFactory.HELVETICA, 10, tinta));
                autorizacion.setLeading(16);
                autorizacion.setKeepTogether(true);
                autorizacion.setSpacingAfter(16);
                documento.add(autorizacion);
            }
            if (factura.fechaBaja() != null) {
                Paragraph baja = new Paragraph("ANULADA EN EL SISTEMA\nFecha de baja "
                        + fechaHora.format(factura.fechaBaja()),
                        FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, estado));
                baja.setKeepTogether(true);
                baja.setSpacingAfter(16);
                documento.add(baja);
            }
            if (factura.observaciones() != null && !factura.observaciones().isBlank()) {
                Paragraph observaciones = new Paragraph("OBSERVACIONES\n" + factura.observaciones(),
                        FontFactory.getFont(FontFactory.HELVETICA, 10, gris));
                observaciones.setLeading(15);
                observaciones.setKeepTogether(true);
                documento.add(observaciones);
            }
        } catch (DocumentException exception) {
            throw new IllegalStateException("No se pudo generar el PDF del comprobante", exception);
        } finally {
            documento.close();
        }
        return salida.toByteArray();
    }

    private void celdaComprobante(PdfPTable tabla, String texto, float tamanio, Color color,
                                  Color fondo, boolean derecha) {
        PdfPCell celda = new PdfPCell(new Phrase(texto,
                FontFactory.getFont(FontFactory.HELVETICA, tamanio, color)));
        celda.setBorder(com.lowagie.text.Rectangle.BOTTOM);
        celda.setBorderColor(new Color(228, 228, 228));
        celda.setBackgroundColor(fondo);
        celda.setPadding(11);
        celda.setLeading(0, 1.4f);
        celda.setHorizontalAlignment(derecha ? Element.ALIGN_RIGHT : Element.ALIGN_LEFT);
        tabla.addCell(celda);
    }

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

            PdfPTable tabla = new PdfPTable(new float[]{.9f, 1.7f, 1.2f, 2.1f, 1.7f, 1.5f, 1.7f, .6f, 1.1f});
            tabla.setWidthPercentage(100);
            agregarEncabezadosPdf(tabla);
            tabla.setHeaderRows(1);

            SimpleDateFormat formatoFecha = new SimpleDateFormat("dd/MM/yyyy");
            NumberFormat formatoImporte = NumberFormat.getCurrencyInstance(new Locale("es", "AR"));

            for (FacturaReporteDTO factura : facturas) {
                agregarCelda(tabla, "#" + factura.getId(), Element.ALIGN_RIGHT);
                agregarCelda(tabla, numeroVisible(factura), Element.ALIGN_LEFT);
                agregarCelda(tabla, formatoFecha.format(factura.getFechaEmision()), Element.ALIGN_CENTER);
                agregarCelda(tabla, factura.getClienteDenominacion(), Element.ALIGN_LEFT);
                agregarCelda(tabla, factura.getCondicionIva(), Element.ALIGN_LEFT);
                agregarCelda(tabla, factura.getPuntoVentaDescripcion(), Element.ALIGN_LEFT);
                agregarCelda(tabla, formatoImporte.format(factura.getImporteTotal()), Element.ALIGN_RIGHT);
                agregarCelda(tabla, String.valueOf(factura.getCantidadItems()), Element.ALIGN_RIGHT);
                agregarCelda(tabla, factura.getEstado(), Element.ALIGN_CENTER);
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
                row.createCell(0).setCellValue("#" + factura.getId());
                row.createCell(1).setCellValue(numeroVisible(factura));
                Cell fecha = row.createCell(2);
                fecha.setCellValue(factura.getFechaEmision());
                fecha.setCellStyle(estiloFecha);
                row.createCell(3).setCellValue(factura.getClienteDenominacion());
                row.createCell(4).setCellValue(factura.getCondicionIva());
                row.createCell(5).setCellValue(factura.getPuntoVentaDescripcion());
                Cell importe = row.createCell(6);
                importe.setCellValue(factura.getImporteTotal());
                importe.setCellStyle(estiloImporte);
                row.createCell(7).setCellValue(factura.getCantidadItems());
                row.createCell(8).setCellValue(factura.getEstado());
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

    private String numeroVisible(FacturaReporteDTO factura) {
        return factura.getNumeroFactura() == null ? "Sin emitir" : factura.getIdentificador();
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
