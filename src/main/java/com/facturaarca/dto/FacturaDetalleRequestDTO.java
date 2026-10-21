package com.facturaarca.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FacturaDetalleRequestDTO {

    private Long articuloId;
    private Double cantidad;
    private Double porcentajeBonificacion;
}
