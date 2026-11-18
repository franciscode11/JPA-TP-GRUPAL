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
    async obtenerFactura(id) {
        return this.solicitar(`${this.baseUrl}/${id}`);
    }
    async actualizarFactura(id, factura) {
        return this.solicitar(`${this.baseUrl}/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(factura),
        });
    }
    async emitirEnArca(id) {
        return this.solicitar(`${this.baseUrl}/${id}/emitir`, { method: "POST" });
    }
    async eliminarFactura(id) {
        await this.solicitar(`${this.baseUrl}/${id}`, { method: "DELETE" });
    }
    async obtenerCatalogos() {
        return this.solicitar("/api/catalogos");
    }
    async buscarArticulos(listaPrecioId, texto, pagina, tamanio) {
        const parametros = new URLSearchParams({ q: texto, pagina: String(pagina), tamanio: String(tamanio) });
        if (listaPrecioId !== undefined)
            parametros.set("listaPrecioId", String(listaPrecioId));
        return this.solicitar(`/api/catalogos/articulos?${parametros}`);
    }
    async obtenerEstadoArca() {
        return this.solicitar("/api/arca/estado");
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
//# sourceMappingURL=FacturaApiService.js.map