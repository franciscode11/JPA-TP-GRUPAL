package com.facturaarca.controller;

import com.facturaarca.dto.FacturaDetalleRequestDTO;
import com.facturaarca.dto.FacturaEdicionDTO;
import com.facturaarca.dto.FacturaReporteDTO;
import com.facturaarca.service.FacturaReporteExportService;
import com.facturaarca.service.FacturaService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Date;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.hamcrest.Matchers.containsString;

@WebMvcTest(FacturaRestController.class)
class FacturaRestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FacturaService facturaService;

    @MockitoBean
    private FacturaReporteExportService exportService;

    @Test
    void devuelveElReporteJsonConFiltrosOpcionales() throws Exception {
        FacturaReporteDTO dto = new FacturaReporteDTO(
                7L, 1001L, fecha(2026, 3, 15), "Consumidor Final",
                "IVA Responsable Inscripto", "Sucursal Central", 1500, 2,
                "EMITIDA", null
        );
        when(facturaService.buscarFacturasFiltradas(any(), any(), eq("EMITIDA"), eq(1000d)))
                .thenReturn(List.of(dto));

        mockMvc.perform(get("/api/facturas")
                        .param("fechaDesde", "2026-03-01")
                        .param("fechaHasta", "2026-03-31")
                        .param("estado", "EMITIDA")
                        .param("montoMinimo", "1000"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(jsonPath("$[0].numeroFactura").value(1001))
                .andExpect(jsonPath("$[0].fechaEmision").value("2026-03-15"))
                .andExpect(jsonPath("$[0].cantidadItems").value(2));
    }

    @Test
    void creaUnaFacturaYDevuelve201() throws Exception {
        FacturaReporteDTO creada = new FacturaReporteDTO(
                7L, 1001L, fecha(2026, 3, 15), "Cliente de prueba",
                "Consumidor Final", "Casa Central", 1210, 1, "EMITIDA", null
        );
        when(facturaService.crear(any())).thenReturn(creada);

        mockMvc.perform(post("/api/facturas")
                        .contentType("application/json")
                        .content("""
                                {
                                  "numeroFactura": 1001,
                                  "fechaEmision": "2026-03-15",
                                  "clienteId": 1,
                                  "condicionIvaId": 1,
                                  "puntoVentaId": 1,
                                  "tipoMonedaId": 1,
                                  "detalles": [{"articuloId": 1, "cantidad": 1, "porcentajeBonificacion": 0}]
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/facturas/7"))
                .andExpect(jsonPath("$.estado").value("EMITIDA"));
    }

    @Test
    void devuelveTodosLosDatosNecesariosParaEditar() throws Exception {
        FacturaEdicionDTO factura = new FacturaEdicionDTO(
                7L, 1001L, fecha(2026, 3, 15), 2L, 5L, 1L, 1L,
                "EMITIDA", "Entrega acordada", List.of(new FacturaDetalleRequestDTO(9L, 2d, 10d))
        );
        when(facturaService.obtenerParaEdicion(7L)).thenReturn(factura);

        mockMvc.perform(get("/api/facturas/7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.numeroFactura").value(1001))
                .andExpect(jsonPath("$.clienteId").value(2))
                .andExpect(jsonPath("$.detalles[0].articuloId").value(9));
    }

    @Test
    void actualizaUnaFacturaYDevuelve200() throws Exception {
        FacturaReporteDTO anulada = new FacturaReporteDTO(
                7L, 1001L, fecha(2026, 3, 15), "Cliente de prueba",
                "Consumidor Final", "Casa Central", 1210, 1, "ANULADA", "Error de carga"
        );
        when(facturaService.actualizar(eq(7L), any())).thenReturn(anulada);

        mockMvc.perform(put("/api/facturas/7")
                        .contentType("application/json")
                        .content("{\"estado\":\"ANULADA\",\"observaciones\":\"Error de carga\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("ANULADA"));
    }

    @Test
    void eliminaUnaFacturaYDevuelve204() throws Exception {
        mockMvc.perform(delete("/api/facturas/7"))
                .andExpect(status().isNoContent());
    }

    @Test
    void descargaElPdfConNombreDeArchivo() throws Exception {
        when(facturaService.buscarFacturasFiltradas(null, null, null, null)).thenReturn(List.of());
        when(exportService.generarPdf(List.of())).thenReturn("%PDF".getBytes());

        mockMvc.perform(get("/api/facturas/reporte.pdf"))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/pdf"))
                .andExpect(header().string("Content-Disposition", containsString("reporte-facturas.pdf")));
    }

    private Date fecha(int anio, int mes, int dia) {
        return Date.from(LocalDate.of(anio, mes, dia)
                .atStartOfDay(ZoneId.systemDefault())
                .toInstant());
    }
}
