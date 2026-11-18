package com.facturaarca.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Date;

final class LimitesEntrada {
    private static final ZoneId ZONA = ZoneId.of("America/Argentina/Mendoza");

    private LimitesEntrada() {}

    static void identificador(Long valor) {
        if (valor != null && (valor < 1 || valor > 999_999_999L)) {
            throw new IllegalArgumentException("El identificador debe ser positivo y tener hasta 9 dígitos");
        }
    }

    static void longitud(String texto, int maximo, String campo) {
        if (texto != null && texto.length() > maximo) {
            throw new IllegalArgumentException(campo + " admite hasta " + maximo + " caracteres");
        }
    }

    static boolean decimalValido(double valor, double minimo, double maximo) {
        return Double.isFinite(valor) && valor >= minimo && valor <= maximo
                && BigDecimal.valueOf(valor).stripTrailingZeros().scale() <= 2;
    }

    static void fecha(Date valor) {
        if (valor == null) return;
        LocalDate fecha = valor instanceof java.sql.Date sql ? sql.toLocalDate()
                : valor.toInstant().atZone(ZONA).toLocalDate();
        if (fecha.getYear() < 1900 || fecha.getYear() > 2100) {
            throw new IllegalArgumentException("La fecha debe estar entre los años 1900 y 2100");
        }
    }

    static void paginacion(int pagina, int tamanio, int maximo) {
        if (pagina < 0 || pagina > 100_000 || tamanio < 1 || tamanio > maximo) {
            throw new IllegalArgumentException("Página o tamaño fuera del rango admitido");
        }
    }
}
