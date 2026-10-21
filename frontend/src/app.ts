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
let siguienteSelectorId = 1;

const buscarFormulario = document.querySelector<HTMLFormElement>("#filtros-form")!;
const altaFormulario = document.querySelector<HTMLFormElement>("#factura-form")!;
const detalleCuerpo = document.querySelector<HTMLTableSectionElement>("#detalle-body")!;
const facturasCuerpo = document.querySelector<HTMLTableSectionElement>("#facturas-body")!;
const estadoCarga = document.querySelector<HTMLElement>("#estado-carga")!;
const contador = document.querySelector<HTMLElement>("#contador-resultados")!;
const totalVista = document.querySelector<HTMLElement>("#total-vista")!;
const aviso = document.querySelector<HTMLElement>("#aviso")!;
const seccionAlta = document.querySelector<HTMLElement>("#seccion-alta")!;
const mostrarFactura = document.querySelector<HTMLButtonElement>("#mostrar-factura")!;
const cerrarFactura = document.querySelector<HTMLButtonElement>("#cerrar-factura")!;
const modalConfirmacion = document.querySelector<HTMLDialogElement>("#modal-confirmacion")!;
const modalTipo = document.querySelector<HTMLElement>("#modal-tipo")!;
const modalTitulo = document.querySelector<HTMLElement>("#modal-titulo")!;
const modalDescripcion = document.querySelector<HTMLElement>("#modal-descripcion")!;
const modalCancelar = document.querySelector<HTMLButtonElement>("#modal-cancelar")!;
const modalConfirmar = document.querySelector<HTMLButtonElement>("#modal-confirmar")!;
let resolverConfirmacion: ((confirmada: boolean) => void) | undefined;

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

function personalizarFecha(input: HTMLInputElement): void {
  if (input.closest(".fecha-personalizada")) return;

  const contenedor = document.createElement("div");
  contenedor.className = "fecha-personalizada";
  input.before(contenedor);
  contenedor.append(input);

  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "fecha-boton";
  boton.setAttribute("aria-label", `Abrir calendario de ${input.closest("label")?.textContent?.trim() || "fecha"}`);
  boton.innerHTML = '<span class="icono-calendario" aria-hidden="true"></span>';
  boton.addEventListener("click", () => {
    try {
      input.showPicker();
    } catch {
      input.focus();
    }
  });
  contenedor.append(boton);
}

function personalizarFechas(): void {
  document.querySelectorAll<HTMLInputElement>('input.control[type="date"]').forEach(personalizarFecha);
}

function abrirFormularioFactura(): void {
  seccionAlta.hidden = false;
  mostrarFactura.setAttribute("aria-expanded", "true");
  seccionAlta.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => elemento<HTMLInputElement>("numero-factura").focus(), 250);
}

function ocultarFormularioFactura(devolverFoco = true): void {
  seccionAlta.hidden = true;
  mostrarFactura.setAttribute("aria-expanded", "false");
  if (devolverFoco) mostrarFactura.focus();
}

type DatosConfirmacion = {
  tipo: "Anular comprobante" | "Eliminar comprobante";
  titulo: string;
  descripcion: string;
  etiquetaConfirmar: string;
  accion: "anular" | "eliminar";
};

function pedirConfirmacion(datos: DatosConfirmacion): Promise<boolean> {
  cerrarSelectores();
  modalTipo.textContent = datos.tipo;
  modalTitulo.textContent = datos.titulo;
  modalDescripcion.textContent = datos.descripcion;
  modalConfirmar.textContent = datos.etiquetaConfirmar;
  modalConfirmar.dataset.accion = datos.accion;
  document.body.classList.add("modal-abierto");
  modalConfirmacion.showModal();
  modalCancelar.focus();

  return new Promise((resolver) => {
    resolverConfirmacion = resolver;
  });
}

function cerrarConfirmacion(confirmada: boolean): void {
  if (!modalConfirmacion.open) return;
  modalConfirmacion.close();
  document.body.classList.remove("modal-abierto");
  resolverConfirmacion?.(confirmada);
  resolverConfirmacion = undefined;
}

function opciones(datos: OpcionCatalogoDTO[]): string {
  return datos.map((dato) => `<option value="${dato.id}">${escapar(dato.nombre)}</option>`).join("");
}

function cerrarSelectores(excepto?: HTMLElement): void {
  document.querySelectorAll<HTMLElement>(".selector-personalizado.abierto").forEach((selector) => {
    if (selector === excepto) return;
    selector.classList.remove("abierto");
    selector.querySelector<HTMLButtonElement>(".selector-trigger")?.setAttribute("aria-expanded", "false");
    const menu = selector.querySelector<HTMLElement>(".selector-menu");
    if (menu) menu.hidden = true;
  });
}

function posicionarMenu(trigger: HTMLButtonElement, menu: HTMLElement): void {
  const rectangulo = trigger.getBoundingClientRect();
  const margen = 8;
  const altoMenu = Math.min(menu.scrollHeight, 280);
  const abreHaciaArriba = window.innerHeight - rectangulo.bottom < altoMenu + margen
    && rectangulo.top > altoMenu;

  menu.style.left = `${Math.max(margen, rectangulo.left)}px`;
  menu.style.width = `${rectangulo.width}px`;
  menu.style.top = abreHaciaArriba
    ? `${Math.max(margen, rectangulo.top - altoMenu - 6)}px`
    : `${rectangulo.bottom + 6}px`;
}

function actualizarSelector(select: HTMLSelectElement, selector: HTMLElement): void {
  const trigger = selector.querySelector<HTMLButtonElement>(".selector-trigger")!;
  const texto = trigger.querySelector<HTMLElement>(".selector-valor")!;
  const menu = selector.querySelector<HTMLElement>(".selector-menu")!;
  const seleccionada = select.selectedOptions[0];

  texto.textContent = seleccionada?.textContent?.trim() || "Seleccionar";
  trigger.disabled = select.disabled;
  menu.innerHTML = "";

  Array.from(select.options).forEach((opcion) => {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "selector-opcion";
    boton.setAttribute("role", "option");
    boton.textContent = opcion.textContent?.trim() || "";
    boton.dataset.value = opcion.value;
    boton.setAttribute("aria-selected", String(opcion.selected));
    boton.disabled = opcion.disabled;
    boton.addEventListener("click", () => {
      select.value = opcion.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      cerrarSelectores();
      if (select.isConnected) actualizarSelector(select, selector);
    });
    menu.append(boton);
  });
}

function personalizarSelector(select: HTMLSelectElement): void {
  const existente = select.closest<HTMLElement>(".selector-personalizado");
  if (existente) {
    actualizarSelector(select, existente);
    return;
  }

  const selector = document.createElement("div");
  selector.className = "selector-personalizado";
  select.before(selector);
  selector.append(select);
  select.classList.add("select-nativo");
  select.hidden = true;
  select.tabIndex = -1;

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "selector-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  const etiqueta = select.closest("label")?.childNodes[0]?.textContent?.trim();
  trigger.setAttribute("aria-label", select.getAttribute("aria-label") || etiqueta || "Seleccionar opción");
  const texto = document.createElement("span");
  texto.className = "selector-valor";
  trigger.append(texto);

  const menu = document.createElement("div");
  menu.className = "selector-menu";
  menu.id = `selector-menu-${siguienteSelectorId++}`;
  menu.setAttribute("role", "listbox");
  menu.hidden = true;
  trigger.setAttribute("aria-controls", menu.id);
  selector.append(trigger, menu);

  trigger.addEventListener("click", () => {
    const abrir = !selector.classList.contains("abierto");
    cerrarSelectores(selector);
    selector.classList.toggle("abierto", abrir);
    trigger.setAttribute("aria-expanded", String(abrir));
    menu.hidden = !abrir;
    if (abrir) posicionarMenu(trigger, menu);
  });
  trigger.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") cerrarSelectores();
    if ((evento.key === "ArrowDown" || evento.key === "Enter" || evento.key === " ")
        && !selector.classList.contains("abierto")) {
      evento.preventDefault();
      trigger.click();
      menu.querySelector<HTMLButtonElement>(".selector-opcion:not(:disabled)")?.focus();
    }
  });
  select.addEventListener("change", () => {
    if (select.isConnected) actualizarSelector(select, selector);
  });
  select.closest("label")?.addEventListener("click", (evento) => {
    if ((evento.target as HTMLElement).closest(".selector-personalizado")) return;
    evento.preventDefault();
    trigger.focus();
  });
  actualizarSelector(select, selector);
}

function personalizarSelectores(raiz: ParentNode = document): void {
  raiz.querySelectorAll<HTMLSelectElement>("select.control").forEach(personalizarSelector);
}

function cargarSelectores(): void {
  elemento<HTMLSelectElement>("cliente-id").innerHTML = opciones(catalogos.clientes);
  elemento<HTMLSelectElement>("condicion-iva-id").innerHTML = opciones(catalogos.condicionesIva);
  elemento<HTMLSelectElement>("punto-venta-id").innerHTML = opciones(catalogos.puntosVenta);
  elemento<HTMLSelectElement>("tipo-moneda-id").innerHTML = opciones(catalogos.tiposMoneda);
  personalizarSelectores(altaFormulario);
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
  personalizarSelectores(detalleCuerpo);
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

function actualizarNumerosItem(evento: Event): void {
  const control = evento.target as HTMLInputElement;
  if (!control.classList.contains("item-cantidad")
      && !control.classList.contains("item-bonificacion")) return;
  const fila = control.closest<HTMLTableRowElement>("tr[data-uid]");
  if (!fila) return;
  const item = items.find((actual) => actual.uid === Number(fila.dataset.uid));
  if (!item) return;

  if (control.classList.contains("item-cantidad")) item.cantidad = Number(control.value);
  if (control.classList.contains("item-bonificacion")) item.porcentajeBonificacion = Number(control.value);
  const celdaSubtotal = fila.querySelector<HTMLElement>("td:nth-child(5)");
  if (celdaSubtotal) celdaSubtotal.textContent = dinero(subtotal(item));
  totalVista.textContent = dinero(items.reduce((total, actual) => total + subtotal(actual), 0));
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
        <button class="boton-tabla anular" type="button" data-id="${factura.id}" data-numero="${factura.numeroFactura}" title="Conserva la factura y la marca como anulada" ${factura.estado === "ANULADA" ? "disabled" : ""}>Anular</button>
        <button class="boton-tabla peligro eliminar" type="button" data-id="${factura.id}" data-numero="${factura.numeroFactura}" title="Borra la factura de forma permanente">
          <span class="icono-basura" aria-hidden="true"></span><span>Eliminar</span>
        </button>
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
    personalizarSelectores(altaFormulario);
    await cargarFacturas();
    ocultarFormularioFactura(false);
    mostrarFactura.focus();
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
  const numero = boton.dataset.numero ?? "";

  try {
    if (boton.classList.contains("anular")) {
      const confirmada = await pedirConfirmacion({
        tipo: "Anular comprobante",
        titulo: `¿Anular la factura #${numero}?`,
        descripcion: "La factura seguirá guardada y visible en el historial, pero quedará marcada como ANULADA.",
        etiquetaConfirmar: "Sí, anular",
        accion: "anular",
      });
      if (!confirmada) return;
      await servicio.actualizarEstado(id, "ANULADA", "Anulada desde el panel web");
      notificar("La factura quedó anulada.");
    } else if (boton.classList.contains("eliminar")) {
      const confirmada = await pedirConfirmacion({
        tipo: "Eliminar comprobante",
        titulo: `¿Eliminar la factura #${numero}?`,
        descripcion: "La factura y todos sus renglones se borrarán de forma permanente. Esta acción no se puede deshacer.",
        etiquetaConfirmar: "Eliminar definitivamente",
        accion: "eliminar",
      });
      if (!confirmada) return;
      await servicio.eliminarFactura(id);
      notificar("La factura fue eliminada.");
    }
    await cargarFacturas();
  } catch (error) {
    notificar((error as Error).message, "error");
  }
}

function enlazarEventos(): void {
  mostrarFactura.addEventListener("click", abrirFormularioFactura);
  cerrarFactura.addEventListener("click", () => ocultarFormularioFactura());
  buscarFormulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    void cargarFacturas();
  });
  elemento<HTMLButtonElement>("limpiar-filtros").addEventListener("click", () => {
    buscarFormulario.reset();
    personalizarSelectores(buscarFormulario);
    void cargarFacturas();
  });
  elemento<HTMLButtonElement>("agregar-item").addEventListener("click", agregarItem);
  detalleCuerpo.addEventListener("input", actualizarNumerosItem);
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
  modalCancelar.addEventListener("click", () => cerrarConfirmacion(false));
  modalConfirmar.addEventListener("click", () => cerrarConfirmacion(true));
  modalConfirmacion.addEventListener("cancel", (evento) => {
    evento.preventDefault();
    cerrarConfirmacion(false);
  });
  modalConfirmacion.addEventListener("click", (evento) => {
    if (evento.target === modalConfirmacion) cerrarConfirmacion(false);
  });
  document.addEventListener("click", (evento) => {
    if (!(evento.target as HTMLElement).closest(".selector-personalizado")) cerrarSelectores();
  });
  window.addEventListener("resize", () => cerrarSelectores());
}

async function iniciar(): Promise<void> {
  elemento<HTMLInputElement>("fecha-emision").valueAsDate = new Date();
  enlazarEventos();
  personalizarFechas();
  personalizarSelectores(buscarFormulario);
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
