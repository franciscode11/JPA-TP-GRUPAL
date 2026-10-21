export interface FacturaDetalleRequestDTO {
  articuloId: number;
  cantidad: number;
  porcentajeBonificacion: number;
}

export interface FacturaRequestDTO {
  numeroFactura?: number;
  fechaEmision?: string;
  clienteId?: number;
  condicionIvaId?: number;
  puntoVentaId?: number;
  tipoMonedaId?: number;
  estado?: string;
  observaciones?: string;
  detalles?: FacturaDetalleRequestDTO[];
}

export interface FacturaReporteDTO {
  id: number;
  numeroFactura: number;
  fechaEmision: string;
  clienteDenominacion: string;
  condicionIva: string;
  puntoVentaDescripcion: string;
  importeTotal: number;
  cantidadItems: number;
  estado: string;
  observaciones: string | null;
}

export interface FacturaFiltrosDTO {
  fechaDesde?: string;
  fechaHasta?: string;
  estado?: string;
  montoMinimo?: number;
}

export interface OpcionCatalogoDTO {
  id: number;
  nombre: string;
}

export interface ArticuloCatalogoDTO {
  id: number;
  codigo: string;
  nombre: string;
  precio: number;
}

export interface CatalogosDTO {
  clientes: OpcionCatalogoDTO[];
  condicionesIva: OpcionCatalogoDTO[];
  puntosVenta: OpcionCatalogoDTO[];
  tiposMoneda: OpcionCatalogoDTO[];
  articulos: ArticuloCatalogoDTO[];
}
