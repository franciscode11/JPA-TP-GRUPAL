package com.facturaarca.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Date;

@Getter
@Setter
@NoArgsConstructor
public class FacturaReporteDTO {

    private Long id;

    private Long numeroFactura;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private Date fechaEmision;

    private String clienteDenominacion;
    private String condicionIva;
    private String puntoVentaDescripcion;
    private double importeTotal;
    private long cantidadItems;
    private String estado;
    private String observaciones;

    public FacturaReporteDTO(
            Long id,
            Long numeroFactura,
            Date fechaEmision,
            String clienteDenominacion,
            String condicionIva,
            String puntoVentaDescripcion,
            double importeTotal,
            long cantidadItems,
            String estado,
            String observaciones
    ) {
        this.id = id;
        this.numeroFactura = numeroFactura;
        this.fechaEmision = fechaEmision;
        this.clienteDenominacion = clienteDenominacion;
        this.condicionIva = condicionIva;
        this.puntoVentaDescripcion = limpiarNombrePuntoVenta(puntoVentaDescripcion);
        this.importeTotal = importeTotal;
        this.cantidadItems = cantidadItems;
        this.estado = estado;
        this.observaciones = observaciones;
    }

    private static String limpiarNombrePuntoVenta(String nombre) {
        return nombre == null ? null : nombre.replaceFirst("(?i)\\s+JPQL$", "").trim();
    }
}
