import { FacturaService } from "./FacturaService.js";
const servicio = new FacturaService();
let catalogos;
let items = [];
let siguienteUid = 1;
let siguienteSelectorId = 1;
let facturaEditandoId = null;
const buscarFormulario = document.querySelector("#filtros-form");
const altaFormulario = document.querySelector("#factura-form");
const detalleCuerpo = document.querySelector("#detalle-body");
const facturasCuerpo = document.querySelector("#facturas-body");
const estadoCarga = document.querySelector("#estado-carga");
const contador = document.querySelector("#contador-resultados");
const totalVista = document.querySelector("#total-vista");
const aviso = document.querySelector("#aviso");
const seccionAlta = document.querySelector("#seccion-alta");
const mostrarFactura = document.querySelector("#mostrar-factura");
const cerrarFactura = document.querySelector("#cerrar-factura");
const tituloAlta = document.querySelector("#titulo-alta");
const modalConfirmacion = document.querySelector("#modal-confirmacion");
const modalTipo = document.querySelector("#modal-tipo");
const modalTitulo = document.querySelector("#modal-titulo");
const modalDescripcion = document.querySelector("#modal-descripcion");
const modalCancelar = document.querySelector("#modal-cancelar");
const modalConfirmar = document.querySelector("#modal-confirmar");
const modalIcono = document.querySelector("#modal-icono");
const modalIconoGrafico = document.querySelector("#modal-icono-grafico");
let resolverConfirmacion;
function elemento(id) {
    return document.querySelector(`#${id}`);
}
function valor(id) {
    return elemento(id).value;
}
function numero(texto) {
    return Number(texto.trim().replace(",", "."));
}
function dinero(importe) {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        minimumFractionDigits: 2,
    }).format(importe);
}
function escapar(texto) {
    const nodo = document.createElement("span");
    nodo.textContent = texto ?? "";
    return nodo.innerHTML;
}
function notificar(mensaje, tipo = "exito") {
    aviso.textContent = mensaje;
    aviso.className = `aviso visible ${tipo}`;
    window.setTimeout(() => aviso.classList.remove("visible"), 3800);
}
function personalizarFecha(input) {
    if (input.closest(".fecha-personalizada"))
        return;
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
        }
        catch {
            input.focus();
        }
    });
    contenedor.append(boton);
}
function personalizarFechas() {
    document.querySelectorAll('input.control[type="date"]').forEach(personalizarFecha);
}
function abrirFormularioFactura() {
    seccionAlta.hidden = false;
    mostrarFactura.setAttribute("aria-expanded", "true");
    seccionAlta.scrollIntoView({ behavior: "auto", block: "start" });
    elemento("numero-factura").focus({ preventScroll: true });
}
function ocultarFormularioFactura(devolverFoco = true) {
    seccionAlta.hidden = true;
    mostrarFactura.setAttribute("aria-expanded", "false");
    if (devolverFoco)
        mostrarFactura.focus();
}
function pedirConfirmacion(datos) {
    cerrarSelectores();
    modalTipo.textContent = datos.tipo;
    modalTitulo.textContent = datos.titulo;
    modalDescripcion.textContent = datos.descripcion;
    modalConfirmar.innerHTML = datos.accion === "eliminar"
        ? `<span class="icono-basura" aria-hidden="true"></span><span>${datos.etiquetaConfirmar}</span>`
        : `<span class="icono-anular" aria-hidden="true"></span><span>${datos.etiquetaConfirmar}</span>`;
    modalConfirmar.dataset.accion = datos.accion;
    modalIcono.dataset.accion = datos.accion;
    modalIconoGrafico.className = datos.accion === "eliminar" ? "icono-basura" : "icono-anular";
    document.body.classList.add("modal-abierto");
    modalConfirmacion.showModal();
    modalCancelar.focus();
    return new Promise((resolver) => {
        resolverConfirmacion = resolver;
    });
}
function cerrarConfirmacion(confirmada) {
    if (!modalConfirmacion.open)
        return;
    modalConfirmacion.close();
    document.body.classList.remove("modal-abierto");
    resolverConfirmacion?.(confirmada);
    resolverConfirmacion = undefined;
}
function opciones(datos) {
    return datos.map((dato) => `<option value="${dato.id}">${escapar(dato.nombre)}</option>`).join("");
}
function cerrarSelectores(excepto) {
    document.querySelectorAll(".selector-personalizado.abierto").forEach((selector) => {
        if (selector === excepto)
            return;
        selector.classList.remove("abierto");
        selector.querySelector(".selector-trigger")?.setAttribute("aria-expanded", "false");
        const menu = selector.querySelector(".selector-menu");
        if (menu)
            menu.hidden = true;
    });
}
function posicionarMenu(trigger, menu) {
    const rectangulo = trigger.getBoundingClientRect();
    const margen = 8;
    const espacioAbajo = window.innerHeight - rectangulo.bottom - margen;
    const espacioArriba = rectangulo.top - margen;
    const altoDeseado = Math.min(menu.scrollHeight, 240);
    const abreHaciaArriba = espacioAbajo < Math.min(altoDeseado, 180) && espacioArriba > espacioAbajo;
    const espacioDisponible = abreHaciaArriba ? espacioArriba : espacioAbajo;
    const altoMenu = Math.max(96, Math.min(altoDeseado, espacioDisponible - 6));
    const ancho = Math.min(rectangulo.width, window.innerWidth - margen * 2);
    const izquierda = Math.min(Math.max(margen, rectangulo.left), window.innerWidth - ancho - margen);
    menu.style.left = `${izquierda}px`;
    menu.style.width = `${ancho}px`;
    menu.style.maxHeight = `${altoMenu}px`;
    menu.style.top = abreHaciaArriba
        ? `${Math.max(margen, rectangulo.top - altoMenu - 6)}px`
        : `${rectangulo.bottom + 6}px`;
}
function actualizarSelector(select, selector) {
    const trigger = selector.querySelector(".selector-trigger");
    const texto = trigger.querySelector(".selector-valor");
    const menu = selector.querySelector(".selector-menu");
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
            if (select.isConnected)
                actualizarSelector(select, selector);
        });
        menu.append(boton);
    });
}
function personalizarSelector(select) {
    const existente = select.closest(".selector-personalizado");
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
        if (abrir)
            posicionarMenu(trigger, menu);
    });
    trigger.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape")
            cerrarSelectores();
        if ((evento.key === "ArrowDown" || evento.key === "Enter" || evento.key === " ")
            && !selector.classList.contains("abierto")) {
            evento.preventDefault();
            trigger.click();
            menu.querySelector(".selector-opcion:not(:disabled)")?.focus();
        }
    });
    select.addEventListener("change", () => {
        if (select.isConnected)
            actualizarSelector(select, selector);
    });
    select.closest("label")?.addEventListener("click", (evento) => {
        if (evento.target.closest(".selector-personalizado"))
            return;
        evento.preventDefault();
        trigger.focus();
    });
    actualizarSelector(select, selector);
}
function personalizarSelectores(raiz = document) {
    raiz.querySelectorAll("select.control").forEach(personalizarSelector);
}
function cargarSelectores() {
    elemento("cliente-id").innerHTML = opciones(catalogos.clientes);
    elemento("condicion-iva-id").innerHTML = opciones(catalogos.condicionesIva);
    elemento("punto-venta-id").innerHTML = opciones(catalogos.puntosVenta);
    elemento("tipo-moneda-id").innerHTML = opciones(catalogos.tiposMoneda);
    personalizarSelectores(altaFormulario);
}
function reiniciarFormularioFactura() {
    facturaEditandoId = null;
    tituloAlta.textContent = "Nueva factura";
    elemento("guardar-factura").textContent = "Emitir factura";
    altaFormulario.reset();
    elemento("fecha-emision").valueAsDate = new Date();
    items = [];
    agregarItem();
    personalizarSelectores(altaFormulario);
}
async function cargarFacturaParaEditar(id) {
    try {
        const factura = await servicio.obtenerFactura(id);
        if (factura.estado === "ANULADA") {
            notificar("Las facturas anuladas se conservan como registro y no pueden editarse.", "error");
            return;
        }
        facturaEditandoId = factura.id;
        tituloAlta.textContent = `Editar factura #${factura.numeroFactura}`;
        elemento("numero-factura").value = String(factura.numeroFactura);
        elemento("fecha-emision").value = factura.fechaEmision;
        elemento("cliente-id").value = String(factura.clienteId);
        elemento("condicion-iva-id").value = String(factura.condicionIvaId);
        elemento("punto-venta-id").value = String(factura.puntoVentaId);
        elemento("tipo-moneda-id").value = String(factura.tipoMonedaId);
        elemento("estado-factura").value = factura.estado;
        elemento("observaciones").value = factura.observaciones ?? "";
        items = factura.detalles.map((detalle) => ({ ...detalle, uid: siguienteUid++ }));
        renderizarDetalles();
        personalizarSelectores(altaFormulario);
        elemento("guardar-factura").textContent = "Guardar cambios";
        abrirFormularioFactura();
    }
    catch (error) {
        notificar(error.message, "error");
    }
}
function articuloPorId(id) {
    return catalogos.articulos.find((articulo) => articulo.id === id);
}
function subtotal(item) {
    const articulo = articuloPorId(item.articuloId);
    if (!articulo)
        return 0;
    const neto = item.cantidad * articulo.precio * (1 - item.porcentajeBonificacion / 100);
    return neto * 1.21;
}
function renderizarDetalles() {
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
        <td><input class="control item-cantidad" type="text" inputmode="decimal" pattern="[0-9]+([.,][0-9]+)?" value="${item.cantidad}" aria-label="Cantidad"></td>
        <td><input class="control item-bonificacion" type="text" inputmode="decimal" pattern="[0-9]+([.,][0-9]+)?" value="${item.porcentajeBonificacion}" aria-label="Bonificación"></td>
        <td class="numero">${dinero(articulo?.precio ?? 0)}</td>
        <td class="numero destacado">${dinero(subtotal(item))}</td>
        <td><button class="boton-icono eliminar-item" type="button" aria-label="Quitar artículo">×</button></td>
      </tr>`;
    }).join("");
    totalVista.textContent = dinero(items.reduce((total, item) => total + subtotal(item), 0));
    personalizarSelectores(detalleCuerpo);
}
function agregarItem() {
    const primerArticulo = catalogos.articulos[0];
    if (!primerArticulo) {
        notificar("No hay artículos con precio cargados.", "error");
        return;
    }
    items.push({ uid: siguienteUid++, articuloId: primerArticulo.id, cantidad: 1, porcentajeBonificacion: 0 });
    renderizarDetalles();
}
function sincronizarItem(evento) {
    const control = evento.target;
    const fila = control.closest("tr[data-uid]");
    if (!fila)
        return;
    const item = items.find((actual) => actual.uid === Number(fila.dataset.uid));
    if (!item)
        return;
    if (control.classList.contains("item-articulo"))
        item.articuloId = Number(control.value);
    if (control.classList.contains("item-cantidad"))
        item.cantidad = numero(control.value);
    if (control.classList.contains("item-bonificacion"))
        item.porcentajeBonificacion = numero(control.value);
    renderizarDetalles();
}
function actualizarNumerosItem(evento) {
    const control = evento.target;
    if (!control.classList.contains("item-cantidad")
        && !control.classList.contains("item-bonificacion"))
        return;
    const fila = control.closest("tr[data-uid]");
    if (!fila)
        return;
    const item = items.find((actual) => actual.uid === Number(fila.dataset.uid));
    if (!item)
        return;
    if (control.classList.contains("item-cantidad"))
        item.cantidad = numero(control.value);
    if (control.classList.contains("item-bonificacion"))
        item.porcentajeBonificacion = numero(control.value);
    const celdaSubtotal = fila.querySelector("td:nth-child(5)");
    if (celdaSubtotal)
        celdaSubtotal.textContent = dinero(subtotal(item));
    totalVista.textContent = dinero(items.reduce((total, actual) => total + subtotal(actual), 0));
}
function filtrosActuales() {
    const monto = valor("filtro-monto");
    return {
        fechaDesde: valor("filtro-desde") || undefined,
        fechaHasta: valor("filtro-hasta") || undefined,
        estado: valor("filtro-estado") || undefined,
        montoMinimo: monto ? numero(monto) : undefined,
    };
}
function renderizarFacturas(facturas) {
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
        <button class="boton-tabla editar" type="button" data-id="${factura.id}" data-numero="${factura.numeroFactura}" title="Editar los datos de la factura" ${factura.estado === "ANULADA" ? "disabled" : ""}>
          <span class="icono-editar" aria-hidden="true"></span><span>Editar</span>
        </button>
        <button class="boton-tabla anular" type="button" data-id="${factura.id}" data-numero="${factura.numeroFactura}" title="Conserva la factura y la marca como anulada" ${factura.estado === "ANULADA" ? "disabled" : ""}>Anular</button>
        <button class="boton-tabla peligro eliminar" type="button" data-id="${factura.id}" data-numero="${factura.numeroFactura}" title="Borra la factura de forma permanente">
          <span class="icono-basura" aria-hidden="true"></span><span>Eliminar</span>
        </button>
      </td>
    </tr>`).join("");
}
async function cargarFacturas() {
    estadoCarga.classList.add("visible");
    try {
        renderizarFacturas(await servicio.obtenerFacturas(filtrosActuales()));
    }
    catch (error) {
        notificar(error.message, "error");
    }
    finally {
        estadoCarga.classList.remove("visible");
    }
}
async function guardarFactura(evento) {
    evento.preventDefault();
    if (items.length === 0) {
        notificar("Agregá al menos un artículo a la factura.", "error");
        return;
    }
    const request = {
        numeroFactura: numero(valor("numero-factura")),
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
    const boton = elemento("guardar-factura");
    boton.disabled = true;
    boton.textContent = "Guardando…";
    try {
        const guardada = facturaEditandoId === null
            ? await servicio.crearFactura(request)
            : await servicio.actualizarFactura(facturaEditandoId, request);
        notificar(facturaEditandoId === null
            ? `Factura #${guardada.numeroFactura} creada correctamente.`
            : `Factura #${guardada.numeroFactura} actualizada correctamente.`);
        reiniciarFormularioFactura();
        await cargarFacturas();
        ocultarFormularioFactura(false);
        mostrarFactura.focus();
    }
    catch (error) {
        notificar(error.message, "error");
    }
    finally {
        boton.disabled = false;
        boton.textContent = facturaEditandoId === null ? "Emitir factura" : "Guardar cambios";
    }
}
async function accionFactura(evento) {
    const boton = evento.target.closest("button[data-id]");
    if (!boton)
        return;
    const id = Number(boton.dataset.id);
    const numero = boton.dataset.numero ?? "";
    try {
        if (boton.classList.contains("editar")) {
            await cargarFacturaParaEditar(id);
            return;
        }
        else if (boton.classList.contains("anular")) {
            const confirmada = await pedirConfirmacion({
                tipo: "Anular comprobante",
                titulo: `¿Anular la factura #${numero}?`,
                descripcion: "La factura seguirá guardada y visible en el historial, pero quedará marcada como ANULADA.",
                etiquetaConfirmar: "Sí, anular",
                accion: "anular",
            });
            if (!confirmada)
                return;
            await servicio.actualizarEstado(id, "ANULADA", "Anulada desde el panel web");
            notificar("La factura quedó anulada.");
        }
        else if (boton.classList.contains("eliminar")) {
            const confirmada = await pedirConfirmacion({
                tipo: "Eliminar comprobante",
                titulo: `¿Eliminar la factura #${numero}?`,
                descripcion: "La factura y todos sus renglones se borrarán de forma permanente. Esta acción no se puede deshacer.",
                etiquetaConfirmar: "Eliminar definitivamente",
                accion: "eliminar",
            });
            if (!confirmada)
                return;
            await servicio.eliminarFactura(id);
            notificar("La factura fue eliminada.");
        }
        await cargarFacturas();
    }
    catch (error) {
        notificar(error.message, "error");
    }
}
function enlazarEventos() {
    mostrarFactura.addEventListener("click", () => {
        reiniciarFormularioFactura();
        abrirFormularioFactura();
    });
    cerrarFactura.addEventListener("click", () => ocultarFormularioFactura());
    buscarFormulario.addEventListener("submit", (evento) => {
        evento.preventDefault();
        void cargarFacturas();
    });
    elemento("limpiar-filtros").addEventListener("click", () => {
        buscarFormulario.reset();
        personalizarSelectores(buscarFormulario);
        void cargarFacturas();
    });
    elemento("agregar-item").addEventListener("click", agregarItem);
    detalleCuerpo.addEventListener("input", actualizarNumerosItem);
    detalleCuerpo.addEventListener("change", sincronizarItem);
    detalleCuerpo.addEventListener("click", (evento) => {
        const boton = evento.target.closest(".eliminar-item");
        const fila = boton?.closest("tr[data-uid]");
        if (!fila)
            return;
        items = items.filter((item) => item.uid !== Number(fila.dataset.uid));
        renderizarDetalles();
    });
    altaFormulario.addEventListener("submit", (evento) => void guardarFactura(evento));
    facturasCuerpo.addEventListener("click", (evento) => void accionFactura(evento));
    modalCancelar.addEventListener("click", () => cerrarConfirmacion(false));
    modalConfirmar.addEventListener("click", () => cerrarConfirmacion(true));
    modalConfirmacion.addEventListener("cancel", (evento) => {
        evento.preventDefault();
        cerrarConfirmacion(false);
    });
    modalConfirmacion.addEventListener("click", (evento) => {
        if (evento.target === modalConfirmacion)
            cerrarConfirmacion(false);
    });
    document.addEventListener("click", (evento) => {
        if (!evento.target.closest(".selector-personalizado"))
            cerrarSelectores();
    });
    document.addEventListener("wheel", (evento) => {
        if (!evento.target.closest(".selector-menu"))
            cerrarSelectores();
    }, { passive: true });
    document.addEventListener("touchmove", (evento) => {
        if (!evento.target.closest(".selector-menu"))
            cerrarSelectores();
    }, { passive: true });
    window.addEventListener("resize", () => cerrarSelectores());
}
async function iniciar() {
    elemento("fecha-emision").valueAsDate = new Date();
    enlazarEventos();
    personalizarFechas();
    personalizarSelectores(buscarFormulario);
    try {
        catalogos = await servicio.obtenerCatalogos();
        cargarSelectores();
        agregarItem();
        await cargarFacturas();
    }
    catch (error) {
        notificar(`No se pudo iniciar la aplicación: ${error.message}`, "error");
    }
}
void iniciar();
//# sourceMappingURL=app.js.map