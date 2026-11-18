export interface FacturaDetalleRequestDTO {
  listaPrecioArticuloId: number;
  cantidad: number;
  porcentajeBonificacion: number;
}

export interface FacturaRequestDTO {
  fechaEmision?: string;
  clienteId?: number;
  condicionIvaId?: number;
  puntoVentaId?: number;
  tipoMonedaId?: number;
  observaciones?: string;
  detalles?: FacturaDetalleRequestDTO[];
}

export interface FacturaReporteDTO {
  identificador: string;
  puntoVentaNumero: number;
  id: number;
  numeroFactura: number | null;
  fechaEmision: string;
  clienteDenominacion: string;
  condicionIva: string;
  puntoVentaDescripcion: string;
  importeTotal: number;
  cantidadItems: number;
  estado: string;
  observaciones: string | null;
  cae: string | null;
  resultadoArca: string | null;
  motivoRechazo: string | null;
}

export interface FacturaDetalleEdicionDTO extends FacturaDetalleRequestDTO {
  importeSubtotal: number;
  articuloId: number;
  articuloCodigo: string;
  articuloNombre: string;
  listaPrecioNombre: string;
  precioUnitario: number;
}

export interface FacturaEdicionDTO extends Omit<FacturaRequestDTO, "detalles"> {
  vencimientoCae: string | null;
  documentoCliente: string;
  id: number;
  numeroFactura: number | null;
  fechaEmision: string;
  clienteId: number;
  condicionIvaId: number;
  puntoVentaId: number;
  tipoMonedaId: number;
  estado: string;
  detalles: FacturaDetalleEdicionDTO[];
}

export interface FacturaFiltrosDTO {
  fechaDesde?: string;
  fechaHasta?: string;
  estado?: string;
  montoMinimo?: number;
  numeroInterno?: number;
  clienteId?: number;
  informadaArca?: boolean;
  pagina?: number;
  tamanio?: number;
}

export interface OpcionCatalogoDTO {
  id: number;
  nombre: string;
  condicionIvaId?: number | null;
}

export interface ArticuloCatalogoDTO {
  listaPrecioArticuloId: number;
  articuloId: number;
  codigo: string;
  nombre: string;
  listaPrecio: string;
  precio: number;
}

export interface PaginaDTO<T> {
  contenido: T[];
  pagina: number;
  tamanio: number;
  totalElementos: number;
  totalPaginas: number;
  primera: boolean;
  ultima: boolean;
}

export interface ArcaEstadoDTO {
  configurada: boolean;
  ambiente: "HOMOLOGACIÓN";
  mensaje: string;
}

export interface CatalogosDTO {
  clientes: OpcionCatalogoDTO[];
  condicionesIva: OpcionCatalogoDTO[];
  puntosVenta: OpcionCatalogoDTO[];
  tiposMoneda: OpcionCatalogoDTO[];
  listasPrecio: OpcionCatalogoDTO[];
}
