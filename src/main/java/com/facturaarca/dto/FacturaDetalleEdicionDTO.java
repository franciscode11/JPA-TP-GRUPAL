package com.facturaarca.dto;

public record FacturaDetalleEdicionDTO(
        Long listaPrecioArticuloId,
        Long articuloId,
        String articuloCodigo,
        String articuloNombre,
        String listaPrecioNombre,
        double precioUnitario,
        double cantidad,
        double porcentajeBonificacion,
        double importeSubtotal
) {
}
