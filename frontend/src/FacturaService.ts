import type {
  CatalogosDTO,
  FacturaEdicionDTO,
  FacturaFiltrosDTO,
  FacturaReporteDTO,
  FacturaRequestDTO,
} from "./models/factura.dto.js";

export class FacturaService {
  private readonly baseUrl = "/api/facturas";

  async obtenerFacturas(filtros: FacturaFiltrosDTO): Promise<FacturaReporteDTO[]> {
    const parametros = new URLSearchParams();
    Object.entries(filtros).forEach(([nombre, valor]) => {
      if (valor !== undefined && valor !== "") {
        parametros.set(nombre, String(valor));
      }
    });
    const query = parametros.size > 0 ? `?${parametros.toString()}` : "";
    return this.solicitar<FacturaReporteDTO[]>(`${this.baseUrl}${query}`);
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

  async actualizarEstado(
    id: number,
    estado: string,
    observaciones?: string,
  ): Promise<FacturaReporteDTO> {
    return this.solicitar<FacturaReporteDTO>(`${this.baseUrl}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado, observaciones }),
    });
  }

  async eliminarFactura(id: number): Promise<void> {
    await this.solicitar<void>(`${this.baseUrl}/${id}`, { method: "DELETE" });
  }

  async obtenerCatalogos(): Promise<CatalogosDTO> {
    return this.solicitar<CatalogosDTO>("/api/catalogos");
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
