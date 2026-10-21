package com.facturaarca.dto;

import java.util.List;

public record CatalogosDTO(
        List<OpcionCatalogoDTO> clientes,
        List<OpcionCatalogoDTO> condicionesIva,
        List<OpcionCatalogoDTO> puntosVenta,
        List<OpcionCatalogoDTO> tiposMoneda,
        List<ArticuloCatalogoDTO> articulos
) {
    public record OpcionCatalogoDTO(Long id, String nombre) {
    }

    public record ArticuloCatalogoDTO(Long id, String codigo, String nombre, double precio) {
    }
}
