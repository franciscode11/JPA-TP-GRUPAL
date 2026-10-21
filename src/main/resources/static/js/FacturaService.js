export class FacturaService {
    constructor() {
        this.baseUrl = "/api/facturas";
    }
    async obtenerFacturas(filtros) {
        const parametros = new URLSearchParams();
        Object.entries(filtros).forEach(([nombre, valor]) => {
            if (valor !== undefined && valor !== "") {
                parametros.set(nombre, String(valor));
            }
        });
        const query = parametros.size > 0 ? `?${parametros.toString()}` : "";
        return this.solicitar(`${this.baseUrl}${query}`);
    }
    async crearFactura(factura) {
        return this.solicitar(this.baseUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(factura),
        });
    }
    async actualizarEstado(id, estado, observaciones) {
        return this.solicitar(`${this.baseUrl}/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estado, observaciones }),
        });
    }
    async eliminarFactura(id) {
        await this.solicitar(`${this.baseUrl}/${id}`, { method: "DELETE" });
    }
    async obtenerCatalogos() {
        return this.solicitar("/api/catalogos");
    }
    async solicitar(url, opciones) {
        const respuesta = await fetch(url, opciones);
        if (!respuesta.ok) {
            let mensaje = `Error HTTP ${respuesta.status}`;
            try {
                const cuerpo = (await respuesta.json());
                mensaje = cuerpo.error ?? mensaje;
            }
            catch {
                // La API puede responder sin cuerpo, por ejemplo ante un error del servidor web.
            }
            throw new Error(mensaje);
        }
        if (respuesta.status === 204) {
            return undefined;
        }
        return respuesta.json();
    }
}
//# sourceMappingURL=FacturaService.js.map