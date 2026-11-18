import type {
  CatalogosDTO,
  ArcaEstadoDTO,
  ArticuloCatalogoDTO,
  FacturaEdicionDTO,
  FacturaFiltrosDTO,
  FacturaReporteDTO,
  FacturaRequestDTO,
  PaginaDTO,
} from "./models/factura.dto.js";

export class FacturaService {
  private readonly baseUrl = "/api/facturas";

  async obtenerFacturas(filtros: FacturaFiltrosDTO): Promise<PaginaDTO<FacturaReporteDTO>> {
    const parametros = new URLSearchParams();
    Object.entries(filtros).forEach(([nombre, valor]) => {
      if (valor !== undefined && valor !== "") {
        parametros.set(nombre, String(valor));
      }
    });
    const query = parametros.size > 0 ? `?${parametros.toString()}` : "";
    return this.solicitar<PaginaDTO<FacturaReporteDTO>>(`${this.baseUrl}${query}`);
  }

  async crearFactura(factura: FacturaRequestDTO): Promise<FacturaReporteDTO> {
    return this.solicitar<FacturaReporteDTO>(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(factura),
    });
  }

  async obtenerFactura(id: number): Promise<FacturaEdicionDTO> {
    return this.solicitar<FacturaEdicionDTO>(`${this.baseUrl}/${id}`);
  }

  async actualizarFactura(id: number, factura: FacturaRequestDTO): Promise<FacturaReporteDTO> {
    return this.solicitar<FacturaReporteDTO>(`${this.baseUrl}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(factura),
    });
  }

  async emitirEnArca(id: number): Promise<FacturaReporteDTO> {
    return this.solicitar<FacturaReporteDTO>(`${this.baseUrl}/${id}/emitir`, { method: "POST" });
  }

  async eliminarFactura(id: number): Promise<void> {
    await this.solicitar<void>(`${this.baseUrl}/${id}`, { method: "DELETE" });
  }

  async obtenerCatalogos(): Promise<CatalogosDTO> {
    return this.solicitar<CatalogosDTO>("/api/catalogos");
  }

  async buscarArticulos(
    listaPrecioId: number | undefined,
    texto: string,
    pagina: number,
    tamanio: number,
    excluidos: number[] = [],
  ): Promise<PaginaDTO<ArticuloCatalogoDTO>> {
    const parametros = new URLSearchParams({ q: texto, pagina: String(pagina), tamanio: String(tamanio) });
    if (listaPrecioId !== undefined) parametros.set("listaPrecioId", String(listaPrecioId));
    if (excluidos.length) parametros.set("excluidos", [...new Set(excluidos)].join(","));
    return this.solicitar<PaginaDTO<ArticuloCatalogoDTO>>(`/api/catalogos/articulos?${parametros}`);
  }

  async obtenerEstadoArca(): Promise<ArcaEstadoDTO> {
    return this.solicitar<ArcaEstadoDTO>("/api/arca/estado");
  }

  private async solicitar<T>(url: string, opciones?: RequestInit): Promise<T> {
    const respuesta = await fetch(url, opciones);
    if (!respuesta.ok) {
      let mensaje = `Error HTTP ${respuesta.status}`;
      try {
        const cuerpo = (await respuesta.json()) as { error?: string };
        mensaje = cuerpo.error ?? mensaje;
      } catch {
        // La API puede responder sin cuerpo, por ejemplo ante un error del servidor web.
      }
      throw new Error(mensaje);
    }
    if (respuesta.status === 204) {
      return undefined as T;
    }
    return respuesta.json() as Promise<T>;
  }
}
