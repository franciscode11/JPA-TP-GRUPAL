package com.facturaarca.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.util.Date;
import java.util.List;

public record FacturaEdicionDTO(
        Long id,
        Long numeroFactura,
        @JsonFormat(pattern = "yyyy-MM-dd") Date fechaEmision,
        Long clienteId,
        Long condicionIvaId,
        Long puntoVentaId,
        Long tipoMonedaId,
        String estado,
        String observaciones,
        List<FacturaDetalleRequestDTO> detalles
) {
}
