import { FacturaService } from "./FacturaApiService.js";
import type {
  ArcaEstadoDTO,
  ArticuloCatalogoDTO,
  CatalogosDTO,
  FacturaFiltrosDTO,
  FacturaReporteDTO,
  FacturaRequestDTO,
  OpcionCatalogoDTO,
  PaginaDTO,
} from "./models/factura.dto.js";

declare global {
  interface Window {
    lucide?: { createIcons: (opciones?: Record<string, unknown>) => void };
  }
}

type ItemFormulario = {
  uid: number;
  listaPrecioArticuloId: number;
  articuloId: number;
  codigo: string;
  nombre: string;
  listaPrecio: string;
  precio: number;
  cantidad: number;
  porcentajeBonificacion: number;
};

type Confirmacion = {
  tipo: string;
  titulo: string;
  descripcion: string;
  confirmar: string;
  accion: "eliminar" | "emitir";
};

const servicio = new FacturaService();
let catalogos: CatalogosDTO;
let estadoArca: ArcaEstadoDTO;
let items: ItemFormulario[] = [];
let siguienteUid = 1;
let facturaEditandoId: number | null = null;
let paginaFacturas = 0;
let paginaArticulos = 0;
let ultimaPaginaArticulos: PaginaDTO<ArticuloCatalogoDTO> | null = null;
let resolverConfirmacion: ((confirmada: boolean) => void) | undefined;
let temporizadorBusqueda: number | undefined;
let facturasVisibles: FacturaReporteDTO[] = [];

function elemento<T extends HTMLElement>(selector: string): T {
  return document.querySelector<T>(selector)!;
}

function valor(id: string): string {
  return elemento<HTMLInputElement | HTMLSelectElement>(`#${id}`).value;
}

function numero(texto: string): number {
  return Number(texto.trim().replace(",", "."));
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

function renderizarIconos(): void {
  window.lucide?.createIcons({ attrs: { "stroke-width": 1.8, "aria-hidden": "true" } });
}

function notificar(mensaje: string, tipo: "exito" | "error" = "exito"): void {
  const aviso = elemento<HTMLElement>("#aviso");
  aviso.textContent = mensaje;
  aviso.className = `aviso visible ${tipo}`;
  window.setTimeout(() => aviso.classList.remove("visible"), 4200);
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DIAS = ["L", "M", "M", "J", "V", "S", "D"];

function fechaIso(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function fechaVisible(iso: string, placeholder: string): string {
  if (!iso) return placeholder;
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
}

function actualizarFechaPersonalizada(input: HTMLInputElement, contenedor: HTMLElement): void {
  const texto = contenedor.querySelector<HTMLElement>(".fecha-texto");
  if (texto) texto.textContent = fechaVisible(input.value, input.dataset.placeholder ?? "Elegir fecha");
  contenedor.querySelector<HTMLButtonElement>(".fecha-control")
    ?.classList.toggle("sin-fecha", !input.value);
}

function cerrarCalendarios(excepto?: HTMLElement): void {
  document.querySelectorAll<HTMLElement>(".fecha-personalizada.abierto").forEach((calendario) => {
    if (calendario === excepto) return;
    calendario.classList.remove("abierto");
    calendario.querySelector<HTMLButtonElement>(".fecha-control")?.setAttribute("aria-expanded", "false");
    const panel = calendario.querySelector<HTMLElement>(".calendario-popup");
    if (panel) panel.hidden = true;
  });
}

function personalizarFecha(input: HTMLInputElement): void {
  const existente = input.closest<HTMLElement>(".fecha-personalizada");
  if (existente) {
    actualizarFechaPersonalizada(input, existente);
    return;
  }
  const contenedor = document.createElement("div");
  contenedor.className = "fecha-personalizada";
  input.before(contenedor);
  contenedor.append(input);

  const control = document.createElement("button");
  control.type = "button";
  control.className = "fecha-control";
  control.setAttribute("aria-haspopup", "dialog");
  control.setAttribute("aria-expanded", "false");
  control.innerHTML = '<span class="fecha-texto"></span><i data-lucide="calendar-days"></i>';

  const panel = document.createElement("div");
  panel.className = "calendario-popup";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Elegir fecha");
  panel.hidden = true;
  contenedor.append(control, panel);

  let mesVisible = input.value ? new Date(`${input.value}T12:00:00`) : new Date();
  const dibujar = (): void => {
    const anio = mesVisible.getFullYear();
    const mes = mesVisible.getMonth();
    const primerDia = (new Date(anio, mes, 1).getDay() + 6) % 7;
    const totalDias = new Date(anio, mes + 1, 0).getDate();
    const seleccionado = input.value;
    const hoy = fechaIso(new Date());
    const dias = Array.from({ length: primerDia }, () => '<span class="calendario-hueco"></span>');
    for (let dia = 1; dia <= totalDias; dia++) {
      const iso = fechaIso(new Date(anio, mes, dia));
      dias.push(`<button type="button" class="calendario-dia${iso === seleccionado ? " seleccionado" : ""}${iso === hoy ? " hoy" : ""}" data-fecha="${iso}" aria-label="${dia} de ${MESES[mes]} de ${anio}">${dia}</button>`);
    }
    panel.innerHTML = `
      <div class="calendario-cabecera">
        <button type="button" class="calendario-nav mes-anterior" aria-label="Mes anterior"><i data-lucide="chevron-left"></i></button>
        <strong>${MESES[mes]} ${anio}</strong>
        <button type="button" class="calendario-nav mes-siguiente" aria-label="Mes siguiente"><i data-lucide="chevron-right"></i></button>
      </div>
      <div class="calendario-semana">${DIAS.map((dia) => `<span>${dia}</span>`).join("")}</div>
      <div class="calendario-dias">${dias.join("")}</div>`;
    panel.querySelector<HTMLButtonElement>(".mes-anterior")?.addEventListener("click", () => {
      mesVisible = new Date(anio, mes - 1, 1);
      dibujar();
    });
    panel.querySelector<HTMLButtonElement>(".mes-siguiente")?.addEventListener("click", () => {
      mesVisible = new Date(anio, mes + 1, 1);
      dibujar();
    });
    panel.querySelectorAll<HTMLButtonElement>("[data-fecha]").forEach((dia) => {
      dia.addEventListener("click", () => {
        input.value = dia.dataset.fecha ?? "";
        input.dispatchEvent(new Event("change", { bubbles: true }));
        actualizarFechaPersonalizada(input, contenedor);
        cerrarCalendarios();
      });
    });
    renderizarIconos();
  };

  control.addEventListener("click", () => {
    const abrir = !contenedor.classList.contains("abierto");
    cerrarSelectores();
    cerrarCalendarios(contenedor);
    contenedor.classList.toggle("abierto", abrir);
    control.setAttribute("aria-expanded", String(abrir));
    panel.hidden = !abrir;
    if (abrir) {
      mesVisible = input.value ? new Date(`${input.value}T12:00:00`) : new Date();
      dibujar();
    }
  });
  actualizarFechaPersonalizada(input, contenedor);
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

function actualizarSelector(select: HTMLSelectElement, selector: HTMLElement): void {
  const trigger = selector.querySelector<HTMLButtonElement>(".selector-trigger")!;
  const texto = trigger.querySelector<HTMLElement>(".selector-valor")!;
  const menu = selector.querySelector<HTMLElement>(".selector-menu")!;
  texto.textContent = select.selectedOptions[0]?.textContent?.trim() || "Seleccionar";
  trigger.disabled = select.disabled;
  menu.innerHTML = "";

  Array.from(select.options).forEach((opcion) => {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "selector-opcion";
    boton.setAttribute("role", "option");
    boton.setAttribute("aria-selected", String(opcion.selected));
    boton.textContent = opcion.textContent?.trim() || "";
    boton.disabled = opcion.disabled;
    boton.addEventListener("click", () => {
      select.value = opcion.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      actualizarSelector(select, selector);
      cerrarSelectores();
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
  select.tabIndex = -1;

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "selector-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  trigger.innerHTML = '<span class="selector-valor"></span><i data-lucide="chevron-down"></i>';

  const menu = document.createElement("div");
  menu.className = "selector-menu";
  menu.setAttribute("role", "listbox");
  menu.hidden = true;
  selector.append(trigger, menu);

  trigger.addEventListener("click", () => {
    const abrir = !selector.classList.contains("abierto");
    cerrarCalendarios();
    cerrarSelectores(selector);
    selector.classList.toggle("abierto", abrir);
    trigger.setAttribute("aria-expanded", String(abrir));
    menu.hidden = !abrir;
  });
  trigger.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") cerrarSelectores();
  });
  select.addEventListener("change", () => actualizarSelector(select, selector));
  actualizarSelector(select, selector);
}

function personalizarControles(raiz: ParentNode = document): void {
  raiz.querySelectorAll<HTMLInputElement>("input[data-calendario]").forEach(personalizarFecha);
  raiz.querySelectorAll<HTMLSelectElement>("select.control").forEach(personalizarSelector);
  renderizarIconos();
}

function opciones(datos: OpcionCatalogoDTO[], inicial?: string): string {
  const primera = inicial === undefined ? "" : `<option value="">${escapar(inicial)}</option>`;
  return primera + datos.map((dato) => `<option value="${dato.id}">${escapar(dato.nombre)}</option>`).join("");
}

function cargarCatalogos(): void {
  elemento<HTMLSelectElement>("#cliente-id").innerHTML = opciones(catalogos.clientes);
  elemento<HTMLSelectElement>("#condicion-iva-id").innerHTML = opciones(catalogos.condicionesIva);
  elemento<HTMLSelectElement>("#punto-venta-id").innerHTML = opciones(catalogos.puntosVenta);
  elemento<HTMLSelectElement>("#tipo-moneda-id").innerHTML = opciones(catalogos.tiposMoneda);
  elemento<HTMLSelectElement>("#filtro-cliente").innerHTML = opciones(catalogos.clientes, "Todos");
  elemento<HTMLSelectElement>("#lista-precio-id").innerHTML = opciones(catalogos.listasPrecio, "Todas las listas");
  personalizarControles(document);
}

function abrirFormulario(): void {
  const seccion = elemento<HTMLElement>("#seccion-alta");
  seccion.hidden = false;
  requestAnimationFrame(() => seccion.classList.add("visible"));
  elemento<HTMLButtonElement>("#mostrar-factura").setAttribute("aria-expanded", "true");
  seccion.scrollIntoView({ behavior: "smooth", block: "start" });
  elemento<HTMLButtonElement>("#factura-form .fecha-control").focus({ preventScroll: true });
}

function ocultarFormulario(): void {
  const seccion = elemento<HTMLElement>("#seccion-alta");
  seccion.classList.remove("visible");
  window.setTimeout(() => { seccion.hidden = true; }, 180);
  elemento<HTMLButtonElement>("#mostrar-factura").setAttribute("aria-expanded", "false");
}

function reiniciarFormulario(): void {
  facturaEditandoId = null;
  elemento<HTMLElement>("#titulo-alta").textContent = "Nueva factura";
  elemento<HTMLFormElement>("#factura-form").reset();
  elemento<HTMLInputElement>("#fecha-emision").value = fechaIso(new Date());
  items = [];
  renderizarDetalles();
  actualizarBotonGuardar("Guardar pendiente", "save");
  personalizarControles(elemento("#factura-form"));
}

function actualizarBotonGuardar(texto: string, icono: string): void {
  const boton = elemento<HTMLButtonElement>("#guardar-factura");
  boton.innerHTML = `<i data-lucide="${icono}"></i><span>${texto}</span>`;
  renderizarIconos();
}

function subtotal(item: ItemFormulario): number {
  const neto = item.cantidad * item.precio * (1 - item.porcentajeBonificacion / 100);
  return neto * 1.21;
}

function renderizarDetalles(): void {
  const cuerpo = elemento<HTMLTableSectionElement>("#detalle-body");
  if (items.length === 0) {
    cuerpo.innerHTML = '<tr><td colspan="7" class="tabla-vacia">Todavía no agregaste artículos.</td></tr>';
    elemento<HTMLElement>("#total-vista").textContent = dinero(0);
    return;
  }

  cuerpo.innerHTML = items.map((item) => `
    <tr data-uid="${item.uid}">
      <td><strong>${escapar(item.codigo)}</strong><small>${escapar(item.nombre)}</small></td>
      <td>${escapar(item.listaPrecio)}</td>
      <td><input class="control item-cantidad" type="text" inputmode="decimal" pattern="[0-9]+([.,][0-9]+)?" value="${item.cantidad}" aria-label="Cantidad"></td>
      <td><input class="control item-bonificacion" type="text" inputmode="decimal" pattern="[0-9]+([.,][0-9]+)?" value="${item.porcentajeBonificacion}" aria-label="Bonificación"></td>
      <td class="numero">${dinero(item.precio)}</td>
      <td class="numero destacado">${dinero(subtotal(item))}</td>
      <td><button class="boton-icono eliminar-item" type="button" aria-label="Quitar artículo"><i data-lucide="trash-2"></i></button></td>
    </tr>`).join("");
  elemento<HTMLElement>("#total-vista").textContent = dinero(
    items.reduce((total, item) => total + subtotal(item), 0),
  );
  renderizarIconos();
}

function actualizarDetalle(evento: Event): void {
  const control = evento.target as HTMLInputElement;
  const fila = control.closest<HTMLTableRowElement>("tr[data-uid]");
  const item = items.find((actual) => actual.uid === Number(fila?.dataset.uid));
  if (!item) return;
  if (control.classList.contains("item-cantidad")) item.cantidad = numero(control.value);
  if (control.classList.contains("item-bonificacion")) item.porcentajeBonificacion = numero(control.value);
  const celda = fila?.querySelector<HTMLElement>("td:nth-child(6)");
  if (celda) celda.textContent = dinero(subtotal(item));
  elemento<HTMLElement>("#total-vista").textContent = dinero(items.reduce((total, actual) => total + subtotal(actual), 0));
}

async function abrirExplorador(): Promise<void> {
  const modal = elemento<HTMLDialogElement>("#modal-articulos");
  paginaArticulos = 0;
  document.body.classList.add("modal-abierto");
  modal.showModal();
  requestAnimationFrame(() => modal.classList.add("visible"));
  await cargarArticulos();
  elemento<HTMLInputElement>("#buscar-articulo").focus();
}

function cerrarExplorador(): void {
  const modal = elemento<HTMLDialogElement>("#modal-articulos");
  modal.classList.remove("visible");
  window.setTimeout(() => modal.close(), 160);
  document.body.classList.remove("modal-abierto");
}

async function cargarArticulos(): Promise<void> {
  const contenedor = elemento<HTMLElement>("#articulos-resultados");
  contenedor.innerHTML = '<div class="resultado-vacio">Buscando artículos...</div>';
  try {
    const lista = valor("lista-precio-id");
    ultimaPaginaArticulos = await servicio.buscarArticulos(
      lista ? Number(lista) : undefined,
      valor("buscar-articulo"),
      paginaArticulos,
    );
    renderizarArticulos(ultimaPaginaArticulos);
  } catch (error) {
    contenedor.innerHTML = `<div class="resultado-vacio error">${escapar((error as Error).message)}</div>`;
  }
}

function renderizarArticulos(pagina: PaginaDTO<ArticuloCatalogoDTO>): void {
  const contenedor = elemento<HTMLElement>("#articulos-resultados");
  if (pagina.contenido.length === 0) {
    contenedor.innerHTML = '<div class="resultado-vacio"><i data-lucide="package-x"></i><span>No hay artículos para esta búsqueda.</span></div>';
  } else {
    contenedor.innerHTML = pagina.contenido.map((articulo) => `
      <button class="articulo-resultado" type="button" data-precio-id="${articulo.listaPrecioArticuloId}">
        <span><strong>${escapar(articulo.codigo)} · ${escapar(articulo.nombre)}</strong><small>${escapar(articulo.listaPrecio)}</small></span>
        <span class="precio-articulo">${dinero(articulo.precio)}<i data-lucide="plus"></i></span>
      </button>`).join("");
  }
  elemento<HTMLElement>("#articulos-pagina").textContent = pagina.totalPaginas === 0
    ? "Sin resultados"
    : `Página ${pagina.pagina + 1} de ${pagina.totalPaginas}`;
  elemento<HTMLButtonElement>("#articulos-anterior").disabled = pagina.primera;
  elemento<HTMLButtonElement>("#articulos-siguiente").disabled = pagina.ultima;
  renderizarIconos();
}

function seleccionarArticulo(id: number): void {
  const articulo = ultimaPaginaArticulos?.contenido.find((actual) => actual.listaPrecioArticuloId === id);
  if (!articulo) return;
  items.push({
    uid: siguienteUid++,
    listaPrecioArticuloId: articulo.listaPrecioArticuloId,
    articuloId: articulo.articuloId,
    codigo: articulo.codigo,
    nombre: articulo.nombre,
    listaPrecio: articulo.listaPrecio,
    precio: articulo.precio,
    cantidad: 1,
    porcentajeBonificacion: 0,
  });
  renderizarDetalles();
  cerrarExplorador();
}

function filtrosActuales(incluirPagina = true): FacturaFiltrosDTO {
  const informada = valor("filtro-informada");
  const filtros: FacturaFiltrosDTO = {
    numeroFactura: valor("filtro-numero") ? numero(valor("filtro-numero")) : undefined,
    fechaDesde: valor("filtro-desde") || undefined,
    fechaHasta: valor("filtro-hasta") || undefined,
    clienteId: valor("filtro-cliente") ? Number(valor("filtro-cliente")) : undefined,
    estado: valor("filtro-estado") || undefined,
    informadaArca: informada === "" ? undefined : informada === "true",
    montoMinimo: valor("filtro-monto") ? numero(valor("filtro-monto")) : undefined,
  };
  if (incluirPagina) {
    filtros.pagina = paginaFacturas;
    filtros.tamanio = 10;
  }
  return filtros;
}

function queryFiltros(filtros: FacturaFiltrosDTO): string {
  const parametros = new URLSearchParams();
  Object.entries(filtros).forEach(([nombre, dato]) => {
    if (dato !== undefined && dato !== "") parametros.set(nombre, String(dato));
  });
  return parametros.size ? `?${parametros}` : "";
}

function actualizarDescargas(): void {
  const query = queryFiltros(filtrosActuales(false));
  elemento<HTMLAnchorElement>("#descargar-pdf").href = `/api/facturas/reporte.pdf${query}`;
  elemento<HTMLAnchorElement>("#descargar-excel").href = `/api/facturas/reporte.xlsx${query}`;
}

function accionesFactura(factura: FacturaReporteDTO): string {
  if (factura.estado !== "PENDIENTE") {
    const detalle = factura.cae ? `CAE ${escapar(factura.cae)}` : "Comprobante bloqueado";
    return `<button class="boton-tabla ver" type="button" data-id="${factura.id}"><i data-lucide="file-text"></i><span>Ver factura</span></button><span class="accion-bloqueada"><i data-lucide="lock-keyhole"></i>${detalle}</span>`;
  }
  const emitirDeshabilitado = !estadoArca?.configurada ? "disabled" : "";
  const tituloEmitir = estadoArca?.configurada ? "Solicitar CAE en homologación" : escapar(estadoArca?.mensaje);
  const etiqueta = factura.numeroFactura == null ? `borrador #${factura.id}` : `factura #${factura.numeroFactura}`;
  return `
    <button class="boton-tabla emitir" type="button" data-id="${factura.id}" data-etiqueta="${etiqueta}" title="${tituloEmitir}" ${emitirDeshabilitado}>
      <i data-lucide="send"></i><span>Emitir ARCA</span>
    </button>
    <button class="boton-tabla editar" type="button" data-id="${factura.id}"><i data-lucide="pencil"></i><span>Editar</span></button>
    <button class="boton-tabla peligro eliminar" type="button" data-id="${factura.id}" data-etiqueta="${etiqueta}"><i data-lucide="trash-2"></i><span>Eliminar</span></button>`;
}

function renderizarFacturas(pagina: PaginaDTO<FacturaReporteDTO>): void {
  facturasVisibles = pagina.contenido;
  elemento<HTMLElement>("#contador-resultados").textContent = `${pagina.totalElementos} ${pagina.totalElementos === 1 ? "comprobante" : "comprobantes"}`;
  const cuerpo = elemento<HTMLTableSectionElement>("#facturas-body");
  if (pagina.contenido.length === 0) {
    cuerpo.innerHTML = '<tr><td colspan="8" class="tabla-vacia">No hay comprobantes para los filtros elegidos.</td></tr>';
  } else {
    cuerpo.innerHTML = pagina.contenido.map((factura) => `
      <tr>
        <td><strong>${factura.numeroFactura == null ? `Borrador #${factura.id}` : `#${String(factura.numeroFactura).padStart(8, "0")}`}</strong><small>${escapar(factura.condicionIva)}</small></td>
        <td>${new Date(`${factura.fechaEmision}T12:00:00`).toLocaleDateString("es-AR")}</td>
        <td>${escapar(factura.clienteDenominacion)}</td>
        <td>${escapar(factura.puntoVentaDescripcion)}</td>
        <td class="numero">${factura.cantidadItems}</td>
        <td class="numero destacado">${dinero(factura.importeTotal)}</td>
        <td><span class="estado estado-${factura.estado.toLowerCase()}">${escapar(factura.estado)}</span></td>
        <td class="acciones">${accionesFactura(factura)}</td>
      </tr>`).join("");
  }
  elemento<HTMLElement>("#pagina-estado").textContent = pagina.totalPaginas === 0
    ? "Sin resultados"
    : `Página ${pagina.pagina + 1} de ${pagina.totalPaginas}`;
  elemento<HTMLButtonElement>("#pagina-anterior").disabled = pagina.primera;
  elemento<HTMLButtonElement>("#pagina-siguiente").disabled = pagina.ultima;
  renderizarIconos();
}

async function cargarFacturas(): Promise<void> {
  const carga = elemento<HTMLElement>("#estado-carga");
  carga.classList.add("visible");
  try {
    const pagina = await servicio.obtenerFacturas(filtrosActuales());
    renderizarFacturas(pagina);
    actualizarDescargas();
  } catch (error) {
    notificar((error as Error).message, "error");
  } finally {
    carga.classList.remove("visible");
  }
}

async function guardarFactura(evento: SubmitEvent): Promise<void> {
  evento.preventDefault();
  if (!valor("fecha-emision")) {
    notificar("Elegí la fecha de emisión.", "error");
    return;
  }
  if (items.length === 0) {
    notificar("Agregá al menos un artículo desde el maestro.", "error");
    return;
  }
  if (items.some((item) => item.cantidad <= 0 || item.porcentajeBonificacion < 0 || item.porcentajeBonificacion > 100)) {
    notificar("Revisá las cantidades y bonificaciones del detalle.", "error");
    return;
  }

  const request: FacturaRequestDTO = {
    fechaEmision: valor("fecha-emision"),
    clienteId: Number(valor("cliente-id")),
    condicionIvaId: Number(valor("condicion-iva-id")),
    puntoVentaId: Number(valor("punto-venta-id")),
    tipoMonedaId: Number(valor("tipo-moneda-id")),
    observaciones: valor("observaciones"),
    detalles: items.map(({ listaPrecioArticuloId, cantidad, porcentajeBonificacion }) => ({
      listaPrecioArticuloId, cantidad, porcentajeBonificacion,
    })),
  };

  const boton = elemento<HTMLButtonElement>("#guardar-factura");
  boton.disabled = true;
  actualizarBotonGuardar("Guardando...", "loader-circle");
  try {
    const editando = facturaEditandoId !== null;
    if (editando) {
      await servicio.actualizarFactura(facturaEditandoId!, request);
    } else {
      await servicio.crearFactura(request);
    }
    notificar(editando
      ? "Borrador actualizado correctamente."
      : "Borrador guardado como pendiente. ARCA asignará el número al emitirlo.");
    ocultarFormulario();
    paginaFacturas = 0;
    await cargarFacturas();
  } catch (error) {
    notificar((error as Error).message, "error");
  } finally {
    boton.disabled = false;
    actualizarBotonGuardar(facturaEditandoId === null ? "Guardar pendiente" : "Guardar cambios", "save");
  }
}

async function cargarFacturaParaEditar(id: number): Promise<void> {
  try {
    const factura = await servicio.obtenerFactura(id);
    if (factura.estado !== "PENDIENTE") {
      notificar("Sólo las facturas pendientes pueden editarse.", "error");
      return;
    }
    facturaEditandoId = factura.id;
    elemento<HTMLElement>("#titulo-alta").textContent = `Editar borrador #${factura.id}`;
    elemento<HTMLInputElement>("#fecha-emision").value = factura.fechaEmision;
    elemento<HTMLSelectElement>("#cliente-id").value = String(factura.clienteId);
    elemento<HTMLSelectElement>("#condicion-iva-id").value = String(factura.condicionIvaId);
    elemento<HTMLSelectElement>("#punto-venta-id").value = String(factura.puntoVentaId);
    elemento<HTMLSelectElement>("#tipo-moneda-id").value = String(factura.tipoMonedaId);
    elemento<HTMLTextAreaElement>("#observaciones").value = factura.observaciones ?? "";
    items = factura.detalles.map((detalle) => ({
      uid: siguienteUid++,
      listaPrecioArticuloId: detalle.listaPrecioArticuloId,
      articuloId: detalle.articuloId,
      codigo: detalle.articuloCodigo,
      nombre: detalle.articuloNombre,
      listaPrecio: detalle.listaPrecioNombre,
      precio: detalle.precioUnitario,
      cantidad: detalle.cantidad,
      porcentajeBonificacion: detalle.porcentajeBonificacion,
    }));
    renderizarDetalles();
    personalizarControles(elemento("#factura-form"));
    actualizarBotonGuardar("Guardar cambios", "save");
    abrirFormulario();
  } catch (error) {
    notificar((error as Error).message, "error");
  }
}

async function mostrarComprobante(reporte: FacturaReporteDTO): Promise<void> {
  const factura = await servicio.obtenerFactura(reporte.id);
  const modal = elemento<HTMLDialogElement>("#modal-comprobante");
  elemento<HTMLElement>("#comprobante-contenido").innerHTML = `
    <p class="modal-tipo">Homologación · Sin validez fiscal</p>
    <h2 id="comprobante-titulo">Factura #${String(reporte.numeroFactura).padStart(8, "0")}</h2>
    <p>${escapar(reporte.fechaEmision)} · ${escapar(reporte.puntoVentaDescripcion)}</p>
    <p><strong>${escapar(reporte.clienteDenominacion)}</strong><br>${escapar(reporte.condicionIva)}</p>
    <p class="comprobante-cae"><strong>EMITIDA · CAE ${escapar(reporte.cae)}</strong></p>
    <div class="tabla-contenedor"><table class="tabla"><thead><tr><th>Artículo</th><th>Cantidad</th><th>Precio</th><th>Bonif.</th><th>Total</th></tr></thead><tbody>
    ${factura.detalles.map((detalle) => `<tr><td>${escapar(detalle.articuloCodigo)} · ${escapar(detalle.articuloNombre)}</td><td>${detalle.cantidad}</td><td>${dinero(detalle.precioUnitario)}</td><td>${detalle.porcentajeBonificacion}%</td><td>${dinero(detalle.precioUnitario * detalle.cantidad * (1 - detalle.porcentajeBonificacion / 100) * 1.21)}</td></tr>`).join("")}
    </tbody></table></div>
    <p class="comprobante-total">Total ${dinero(reporte.importeTotal)}</p>
    ${factura.observaciones ? `<p>${escapar(factura.observaciones)}</p>` : ""}`;
  modal.showModal();
  modal.classList.add("visible");
}

function pedirConfirmacion(datos: Confirmacion): Promise<boolean> {
  const modal = elemento<HTMLDialogElement>("#modal-confirmacion");
  elemento<HTMLElement>(".modal-confirmacion .modal-tipo").textContent = datos.tipo;
  elemento<HTMLElement>("#modal-titulo").textContent = datos.titulo;
  elemento<HTMLElement>("#modal-descripcion").textContent = datos.descripcion;
  const confirmar = elemento<HTMLButtonElement>("#modal-confirmar");
  confirmar.className = `boton ${datos.accion === "eliminar" ? "peligro" : "primario"}`;
  confirmar.innerHTML = `<i data-lucide="${datos.accion === "eliminar" ? "trash-2" : "send"}"></i><span>${datos.confirmar}</span>`;
  elemento<HTMLElement>("#modal-icono").innerHTML = `<i data-lucide="${datos.accion === "eliminar" ? "trash-2" : "send"}"></i>`;
  elemento<HTMLElement>("#modal-icono").dataset.accion = datos.accion;
  document.body.classList.add("modal-abierto");
  modal.showModal();
  requestAnimationFrame(() => modal.classList.add("visible"));
  renderizarIconos();
  return new Promise((resolver) => { resolverConfirmacion = resolver; });
}

function cerrarConfirmacion(confirmada: boolean): void {
  const modal = elemento<HTMLDialogElement>("#modal-confirmacion");
  if (!modal.open) return;
  modal.classList.remove("visible");
  window.setTimeout(() => modal.close(), 160);
  document.body.classList.remove("modal-abierto");
  resolverConfirmacion?.(confirmada);
  resolverConfirmacion = undefined;
}

async function accionFactura(evento: MouseEvent): Promise<void> {
  const boton = (evento.target as HTMLElement).closest<HTMLButtonElement>("button[data-id]");
  if (!boton) return;
  const id = Number(boton.dataset.id);
  if (boton.classList.contains("ver")) {
    try {
      const reporte = facturasVisibles.find((factura) => factura.id === id);
      if (reporte) await mostrarComprobante(reporte);
    } catch (error) {
      notificar((error as Error).message, "error");
    }
    return;
  }
  if (boton.classList.contains("editar")) {
    await cargarFacturaParaEditar(id);
    return;
  }

  try {
    if (boton.classList.contains("emitir")) {
      const confirmada = await pedirConfirmacion({
        tipo: "Emitir en homologación",
        titulo: `¿Solicitar CAE para ${boton.dataset.etiqueta}?`,
        descripcion: "Se enviará a ARCA en el entorno de pruebas. Si ARCA la aprueba, quedará bloqueada y pasará a EMITIDA.",
        confirmar: "Solicitar CAE",
        accion: "emitir",
      });
      if (!confirmada) return;
      const factura = await servicio.emitirEnArca(id);
      if (factura.estado === "EMITIDA" && factura.cae) {
        notificar(`ARCA aprobó la factura. CAE ${factura.cae}.`);
        await mostrarComprobante(factura);
      } else {
        notificar(
          factura.motivoRechazo
            ? `ARCA rechazó el borrador #${id}: ${factura.motivoRechazo}`
            : "ARCA no aprobó el comprobante. Revisá los datos e intentá nuevamente.",
          "error",
        );
      }
    }
    if (boton.classList.contains("eliminar")) {
      const confirmada = await pedirConfirmacion({
        tipo: "Eliminar borrador",
        titulo: `¿Eliminar ${boton.dataset.etiqueta}?`,
        descripcion: "Se borrará el comprobante pendiente y todos sus renglones. Esta acción no se puede deshacer.",
        confirmar: "Eliminar",
        accion: "eliminar",
      });
      if (!confirmada) return;
      await servicio.eliminarFactura(id);
      notificar("La factura pendiente fue eliminada.");
    }
    await cargarFacturas();
  } catch (error) {
    notificar((error as Error).message, "error");
  }
}

async function cargarEstadoArca(): Promise<void> {
  estadoArca = await servicio.obtenerEstadoArca();
  const panel = elemento<HTMLElement>("#estado-arca");
  panel.classList.toggle("configurada", estadoArca.configurada);
  elemento<HTMLElement>("#estado-arca-mensaje").textContent = estadoArca.mensaje;
}

function enlazarEventos(): void {
  elemento<HTMLButtonElement>("#cerrar-comprobante").addEventListener("click", () => {
    elemento<HTMLDialogElement>("#modal-comprobante").close();
  });
  elemento<HTMLButtonElement>("#mostrar-factura").addEventListener("click", () => {
    reiniciarFormulario();
    abrirFormulario();
  });
  elemento<HTMLButtonElement>("#cerrar-factura").addEventListener("click", ocultarFormulario);
  elemento<HTMLFormElement>("#filtros-form").addEventListener("submit", (evento) => {
    evento.preventDefault();
    paginaFacturas = 0;
    void cargarFacturas();
  });
  elemento<HTMLButtonElement>("#limpiar-filtros").addEventListener("click", () => {
    const formulario = elemento<HTMLFormElement>("#filtros-form");
    formulario.reset();
    formulario.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select")
      .forEach((control) => {
        control.value = "";
        control.dispatchEvent(new Event("change", { bubbles: true }));
      });
    personalizarControles(formulario);
    paginaFacturas = 0;
    void cargarFacturas();
  });
  elemento<HTMLButtonElement>("#pagina-anterior").addEventListener("click", () => {
    paginaFacturas--;
    void cargarFacturas();
  });
  elemento<HTMLButtonElement>("#pagina-siguiente").addEventListener("click", () => {
    paginaFacturas++;
    void cargarFacturas();
  });
  elemento<HTMLButtonElement>("#agregar-item").addEventListener("click", () => void abrirExplorador());
  elemento<HTMLButtonElement>("#cerrar-articulos").addEventListener("click", cerrarExplorador);
  elemento<HTMLSelectElement>("#lista-precio-id").addEventListener("change", () => {
    paginaArticulos = 0;
    void cargarArticulos();
  });
  elemento<HTMLInputElement>("#buscar-articulo").addEventListener("input", () => {
    window.clearTimeout(temporizadorBusqueda);
    temporizadorBusqueda = window.setTimeout(() => {
      paginaArticulos = 0;
      void cargarArticulos();
    }, 220);
  });
  elemento<HTMLButtonElement>("#articulos-anterior").addEventListener("click", () => {
    paginaArticulos--;
    void cargarArticulos();
  });
  elemento<HTMLButtonElement>("#articulos-siguiente").addEventListener("click", () => {
    paginaArticulos++;
    void cargarArticulos();
  });
  elemento<HTMLElement>("#articulos-resultados").addEventListener("click", (evento) => {
    const boton = (evento.target as HTMLElement).closest<HTMLButtonElement>("[data-precio-id]");
    if (boton) seleccionarArticulo(Number(boton.dataset.precioId));
  });
  elemento<HTMLTableSectionElement>("#detalle-body").addEventListener("input", actualizarDetalle);
  elemento<HTMLTableSectionElement>("#detalle-body").addEventListener("click", (evento) => {
    const boton = (evento.target as HTMLElement).closest<HTMLButtonElement>(".eliminar-item");
    const fila = boton?.closest<HTMLTableRowElement>("tr[data-uid]");
    if (!fila) return;
    items = items.filter((item) => item.uid !== Number(fila.dataset.uid));
    renderizarDetalles();
  });
  elemento<HTMLFormElement>("#factura-form").addEventListener("submit", (evento) => void guardarFactura(evento));
  elemento<HTMLTableSectionElement>("#facturas-body").addEventListener("click", (evento) => void accionFactura(evento));
  elemento<HTMLButtonElement>("#modal-cancelar").addEventListener("click", () => cerrarConfirmacion(false));
  elemento<HTMLButtonElement>("#modal-confirmar").addEventListener("click", () => cerrarConfirmacion(true));
  elemento<HTMLDialogElement>("#modal-confirmacion").addEventListener("cancel", (evento) => {
    evento.preventDefault();
    cerrarConfirmacion(false);
  });
  elemento<HTMLDialogElement>("#modal-articulos").addEventListener("cancel", (evento) => {
    evento.preventDefault();
    cerrarExplorador();
  });
  document.addEventListener("click", (evento) => {
    if (!(evento.target as HTMLElement).closest(".selector-personalizado")) cerrarSelectores();
    if (!(evento.target as HTMLElement).closest(".fecha-personalizada")) cerrarCalendarios();
  });
  window.addEventListener("resize", () => {
    cerrarSelectores();
    cerrarCalendarios();
  });
}

async function iniciar(): Promise<void> {
  enlazarEventos();
  personalizarControles(document);
  try {
    [catalogos, estadoArca] = await Promise.all([
      servicio.obtenerCatalogos(),
      servicio.obtenerEstadoArca(),
    ]);
    cargarCatalogos();
    await cargarEstadoArca();
    reiniciarFormulario();
    await cargarFacturas();
  } catch (error) {
    notificar(`No se pudo iniciar la aplicación: ${(error as Error).message}`, "error");
  }
}

void iniciar();
