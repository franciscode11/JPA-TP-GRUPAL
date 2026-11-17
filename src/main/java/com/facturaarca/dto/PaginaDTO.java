package com.facturaarca.dto;

import java.util.List;

public record PaginaDTO<T>(
        List<T> contenido,
        int pagina,
        int tamanio,
        long totalElementos,
        int totalPaginas,
        boolean primera,
        boolean ultima
) {
    public static <T> PaginaDTO<T> crear(List<T> contenido, int pagina, int tamanio, long totalElementos) {
        int totalPaginas = totalElementos == 0 ? 0 : (int) Math.ceil((double) totalElementos / tamanio);
        return new PaginaDTO<>(
                contenido,
                pagina,
                tamanio,
                totalElementos,
                totalPaginas,
                pagina == 0,
                totalPaginas == 0 || pagina >= totalPaginas - 1
        );
    }
}
