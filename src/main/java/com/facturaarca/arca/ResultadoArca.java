package com.facturaarca.arca;

import java.util.Date;

public record ResultadoArca(
        boolean aprobado,
        long numeroComprobante,
        String resultado,
        String cae,
        Date vencimientoCae,
        String mensaje
) {
}
