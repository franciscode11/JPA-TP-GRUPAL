package com.facturaarca.dto;

import java.util.List;

public record CatalogosDTO(
        List<OpcionCatalogoDTO> clientes,
        List<OpcionCatalogoDTO> condicionesIva,
        List<OpcionCatalogoDTO> puntosVenta,
        List<OpcionCatalogoDTO> tiposMoneda,
        List<OpcionCatalogoDTO> listasPrecio
) {
    public record OpcionCatalogoDTO(Long id, String nombre) {
    }

    public record ArticuloCatalogoDTO(
            Long listaPrecioArticuloId,
            Long articuloId,
            String codigo,
            String nombre,
            String listaPrecio,
            double precio
    ) {
    }
}
