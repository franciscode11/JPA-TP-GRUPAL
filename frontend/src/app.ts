import { FacturaService } from "./FacturaService.js";
import type {
  ArticuloCatalogoDTO,
  CatalogosDTO,
  FacturaDetalleRequestDTO,
  FacturaFiltrosDTO,
  FacturaReporteDTO,
  FacturaRequestDTO,
  OpcionCatalogoDTO,
} from "./models/factura.dto.js";

type ItemFormulario = FacturaDetalleRequestDTO & { uid: number };

const servicio = new FacturaService();
let catalogos: CatalogosDTO;
let items: ItemFormulario[] = [];
let siguienteUid = 1;

const buscarFormulario = document.querySelector<HTMLFormElement>("#filtros-form")!;
const altaFormulario = document.querySelector<HTMLFormElement>("#factura-form")!;
const detalleCuerpo = document.querySelector<HTMLTableSectionElement>("#detalle-body")!;
const facturasCuerpo = document.querySelector<HTMLTableSectionElement>("#facturas-body")!;
const estadoCarga = document.querySelector<HTMLElement>("#estado-carga")!;
const contador = document.querySelector<HTMLElement>("#contador-resultados")!;
const totalVista = document.querySelector<HTMLElement>("#total-vista")!;
const aviso = document.querySelector<HTMLElement>("#aviso")!;

function elemento<T extends HTMLElement>(id: string): T {
  return document.querySelector<T>(`#${id}`)!;
}

function valor(id: string): string {
  return elemento<HTMLInputElement | HTMLSelectElement>(id).value;
}

function dinero(importe: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(importe);
}

function escapar(texto: string | null | undefined): string {
  const nodo = document.createElement("span");
  nodo.textContent = texto ?? "";
  return nodo.innerHTML;
}

function notificar(mensaje: string, tipo: "exito" | "error" = "exito"): void {
  aviso.textContent = mensaje;
  aviso.className = `aviso visible ${tipo}`;
  window.setTimeout(() => aviso.classList.remove("visible"), 3800);
}

function opciones(datos: OpcionCatalogoDTO[]): string {
  return datos.map((dato) => `<option value="${dato.id}">${escapar(dato.nombre)}</option>`).join("");
}

function cargarSelectores(): void {
  elemento<HTMLSelectElement>("cliente-id").innerHTML = opciones(catalogos.clientes);
  elemento<HTMLSelectElement>("condicion-iva-id").innerHTML = opciones(catalogos.condicionesIva);
  elemento<HTMLSelectElement>("punto-venta-id").innerHTML = opciones(catalogos.puntosVenta);
  elemento<HTMLSelectElement>("tipo-moneda-id").innerHTML = opciones(catalogos.tiposMoneda);
}

function articuloPorId(id: number): ArticuloCatalogoDTO | undefined {
  return catalogos.articulos.find((articulo) => articulo.id === id);
}

function subtotal(item: ItemFormulario): number {
  const articulo = articuloPorId(item.articuloId);
  if (!articulo) return 0;
  const neto = item.cantidad * articulo.precio * (1 - item.porcentajeBonificacion / 100);
  return neto * 1.21;
}

function renderizarDetalles(): void {
  if (items.length === 0) {
    detalleCuerpo.innerHTML = '<tr><td colspan="6" class="tabla-vacia">Agregá al menos un artículo.</td></tr>';
    totalVista.textContent = dinero(0);
    return;
  }

  detalleCuerpo.innerHTML = items.map((item) => {
    const opcionesArticulos = catalogos.articulos.map((articulo) => `
      <option value="${articulo.id}" ${articulo.id === item.articuloId ? "selected" : ""}>
        ${escapar(articulo.codigo)} · ${escapar(articulo.nombre)}
      </option>`).join("");
    const articulo = articuloPorId(item.articuloId);
    return `
      <tr data-uid="${item.uid}">
        <td><select class="control item-articulo" aria-label="Artículo">${opcionesArticulos}</select></td>
        <td><input class="control item-cantidad" type="number" min="0.01" step="0.01" value="${item.cantidad}" aria-label="Cantidad"></td>
        <td><input class="control item-bonificacion" type="number" min="0" max="100" step="0.01" value="${item.porcentajeBonificacion}" aria-label="Bonificación"></td>
        <td class="numero">${dinero(articulo?.precio ?? 0)}</td>
        <td class="numero destacado">${dinero(subtotal(item))}</td>
        <td><button class="boton-icono eliminar-item" type="button" aria-label="Quitar artículo">×</button></td>
      </tr>`;
  }).join("");

  totalVista.textContent = dinero(items.reduce((total, item) => total + subtotal(item), 0));
}

function agregarItem(): void {
  const primerArticulo = catalogos.articulos[0];
  if (!primerArticulo) {
    notificar("No hay artículos con precio cargados.", "error");
    return;
  }
  items.push({ uid: siguienteUid++, articuloId: primerArticulo.id, cantidad: 1, porcentajeBonificacion: 0 });
  renderizarDetalles();
}

function sincronizarItem(evento: Event): void {
  const control = evento.target as HTMLInputElement | HTMLSelectElement;
  const fila = control.closest<HTMLTableRowElement>("tr[data-uid]");
  if (!fila) return;
  const item = items.find((actual) => actual.uid === Number(fila.dataset.uid));
  if (!item) return;

  if (control.classList.contains("item-articulo")) item.articuloId = Number(control.value);
  if (control.classList.contains("item-cantidad")) item.cantidad = Number(control.value);
  if (control.classList.contains("item-bonificacion")) item.porcentajeBonificacion = Number(control.value);
  renderizarDetalles();
}

function filtrosActuales(): FacturaFiltrosDTO {
  const monto = valor("filtro-monto");
  return {
    fechaDesde: valor("filtro-desde") || undefined,
    fechaHasta: valor("filtro-hasta") || undefined,
    estado: valor("filtro-estado") || undefined,
    montoMinimo: monto ? Number(monto) : undefined,
  };
}

function renderizarFacturas(facturas: FacturaReporteDTO[]): void {
  contador.textContent = `${facturas.length} ${facturas.length === 1 ? "comprobante" : "comprobantes"}`;
  if (facturas.length === 0) {
    facturasCuerpo.innerHTML = '<tr><td colspan="8" class="tabla-vacia">No hay comprobantes para los filtros elegidos.</td></tr>';
    return;
  }

  facturasCuerpo.innerHTML = facturas.map((factura) => `
    <tr>
      <td><strong>#${String(factura.numeroFactura).padStart(8, "0")}</strong><small>${escapar(factura.condicionIva)}</small></td>
      <td>${new Date(`${factura.fechaEmision}T12:00:00`).toLocaleDateString("es-AR")}</td>
      <td>${escapar(factura.clienteDenominacion)}</td>
      <td>${escapar(factura.puntoVentaDescripcion)}</td>
      <td class="numero">${factura.cantidadItems}</td>
      <td class="numero destacado">${dinero(factura.importeTotal)}</td>
      <td><span class="estado estado-${factura.estado.toLowerCase()}">${escapar(factura.estado)}</span></td>
      <td class="acciones">
        <button class="boton-tabla anular" type="button" data-id="${factura.id}" ${factura.estado === "ANULADA" ? "disabled" : ""}>Anular</button>
        <button class="boton-tabla peligro eliminar" type="button" data-id="${factura.id}" data-numero="${factura.numeroFactura}">Eliminar</button>
      </td>
    </tr>`).join("");
}

async function cargarFacturas(): Promise<void> {
  estadoCarga.classList.add("visible");
  try {
    renderizarFacturas(await servicio.obtenerFacturas(filtrosActuales()));
  } catch (error) {
    notificar((error as Error).message, "error");
  } finally {
    estadoCarga.classList.remove("visible");
  }
}

async function crearFactura(evento: SubmitEvent): Promise<void> {
  evento.preventDefault();
  if (items.length === 0) {
    notificar("Agregá al menos un artículo a la factura.", "error");
    return;
  }

  const request: FacturaRequestDTO = {
    numeroFactura: Number(valor("numero-factura")),
    fechaEmision: valor("fecha-emision"),
    clienteId: Number(valor("cliente-id")),
    condicionIvaId: Number(valor("condicion-iva-id")),
    puntoVentaId: Number(valor("punto-venta-id")),
    tipoMonedaId: Number(valor("tipo-moneda-id")),
    estado: valor("estado-factura"),
    observaciones: valor("observaciones"),
    detalles: items.map(({ articuloId, cantidad, porcentajeBonificacion }) => ({
      articuloId, cantidad, porcentajeBonificacion,
    })),
  };

  const boton = elemento<HTMLButtonElement>("guardar-factura");
  boton.disabled = true;
  boton.textContent = "Guardando…";
  try {
    const creada = await servicio.crearFactura(request);
    notificar(`Factura #${creada.numeroFactura} creada correctamente.`);
    altaFormulario.reset();
    elemento<HTMLInputElement>("fecha-emision").valueAsDate = new Date();
    items = [];
    agregarItem();
    await cargarFacturas();
  } catch (error) {
    notificar((error as Error).message, "error");
  } finally {
    boton.disabled = false;
    boton.textContent = "Emitir factura";
  }
}

async function accionFactura(evento: MouseEvent): Promise<void> {
  const boton = (evento.target as HTMLElement).closest<HTMLButtonElement>("button[data-id]");
  if (!boton) return;
  const id = Number(boton.dataset.id);

  try {
    if (boton.classList.contains("anular")) {
      if (!window.confirm("¿Querés anular esta factura?")) return;
      await servicio.actualizarEstado(id, "ANULADA", "Anulada desde el panel web");
      notificar("La factura quedó anulada.");
    } else if (boton.classList.contains("eliminar")) {
      if (!window.confirm(`¿Eliminar definitivamente la factura #${boton.dataset.numero}?`)) return;
      await servicio.eliminarFactura(id);
      notificar("La factura fue eliminada.");
    }
    await cargarFacturas();
  } catch (error) {
    notificar((error as Error).message, "error");
  }
}

function enlazarEventos(): void {
  buscarFormulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    void cargarFacturas();
  });
  elemento<HTMLButtonElement>("limpiar-filtros").addEventListener("click", () => {
    buscarFormulario.reset();
    void cargarFacturas();
  });
  elemento<HTMLButtonElement>("agregar-item").addEventListener("click", agregarItem);
  detalleCuerpo.addEventListener("change", sincronizarItem);
  detalleCuerpo.addEventListener("click", (evento) => {
    const boton = (evento.target as HTMLElement).closest<HTMLButtonElement>(".eliminar-item");
    const fila = boton?.closest<HTMLTableRowElement>("tr[data-uid]");
    if (!fila) return;
    items = items.filter((item) => item.uid !== Number(fila.dataset.uid));
    renderizarDetalles();
  });
  altaFormulario.addEventListener("submit", (evento) => void crearFactura(evento));
  facturasCuerpo.addEventListener("click", (evento) => void accionFactura(evento));
}

async function iniciar(): Promise<void> {
  elemento<HTMLInputElement>("fecha-emision").valueAsDate = new Date();
  enlazarEventos();
  try {
    catalogos = await servicio.obtenerCatalogos();
    cargarSelectores();
    agregarItem();
    await cargarFacturas();
  } catch (error) {
    notificar(`No se pudo iniciar la aplicación: ${(error as Error).message}`, "error");
  }
}

void iniciar();
