package com.facturaarca.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Date;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FacturaRequestDTO {

    private Long numeroFactura;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private Date fechaEmision;

    private Long clienteId;
    private Long condicionIvaId;
    private Long puntoVentaId;
    private Long tipoMonedaId;
    private String estado;
    private String observaciones;
    private List<FacturaDetalleRequestDTO> detalles;
}
