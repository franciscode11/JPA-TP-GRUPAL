import { FacturaService } from "./FacturaApiService.js";
const servicio = new FacturaService();
let catalogos;
let estadoArca;
let items = [];
let siguienteUid = 1;
let facturaEditandoId = null;
let paginaFacturas = 0;
let paginaArticulos = 0;
let ultimaPaginaArticulos = null;
let resolverConfirmacion;
let temporizadorBusqueda;
function elemento(selector) {
    return document.querySelector(selector);
}
function valor(id) {
    return elemento(`#${id}`).value;
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
function renderizarIconos() {
    window.lucide?.createIcons({ attrs: { "stroke-width": 1.8, "aria-hidden": "true" } });
}
function notificar(mensaje, tipo = "exito") {
    const aviso = elemento("#aviso");
    aviso.textContent = mensaje;
    aviso.className = `aviso visible ${tipo}`;
    window.setTimeout(() => aviso.classList.remove("visible"), 4200);
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
    boton.setAttribute("aria-label", "Abrir calendario");
    boton.innerHTML = '<i data-lucide="calendar-days"></i>';
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
    const rect = trigger.getBoundingClientRect();
    const margen = 10;
    const espacioAbajo = window.innerHeight - rect.bottom - margen;
    const espacioArriba = rect.top - margen;
    const abreArriba = espacioAbajo < 190 && espacioArriba > espacioAbajo;
    const maximo = Math.max(120, Math.min(260, (abreArriba ? espacioArriba : espacioAbajo) - 8));
    menu.style.left = `${Math.max(margen, Math.min(rect.left, window.innerWidth - rect.width - margen))}px`;
    menu.style.top = abreArriba ? "auto" : `${rect.bottom + 7}px`;
    menu.style.bottom = abreArriba ? `${window.innerHeight - rect.top + 7}px` : "auto";
    menu.style.width = `${Math.min(rect.width, window.innerWidth - margen * 2)}px`;
    menu.style.maxHeight = `${maximo}px`;
}
function actualizarSelector(select, selector) {
    const trigger = selector.querySelector(".selector-trigger");
    const texto = trigger.querySelector(".selector-valor");
    const menu = selector.querySelector(".selector-menu");
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
    });
    select.addEventListener("change", () => actualizarSelector(select, selector));
    actualizarSelector(select, selector);
}
function personalizarControles(raiz = document) {
    raiz.querySelectorAll('input.control[type="date"]').forEach(personalizarFecha);
    raiz.querySelectorAll("select.control").forEach(personalizarSelector);
    renderizarIconos();
}
function opciones(datos, inicial) {
    const primera = inicial === undefined ? "" : `<option value="">${escapar(inicial)}</option>`;
    return primera + datos.map((dato) => `<option value="${dato.id}">${escapar(dato.nombre)}</option>`).join("");
}
function cargarCatalogos() {
    elemento("#cliente-id").innerHTML = opciones(catalogos.clientes);
    elemento("#condicion-iva-id").innerHTML = opciones(catalogos.condicionesIva);
    elemento("#punto-venta-id").innerHTML = opciones(catalogos.puntosVenta);
    elemento("#tipo-moneda-id").innerHTML = opciones(catalogos.tiposMoneda);
    elemento("#filtro-cliente").innerHTML = opciones(catalogos.clientes, "Todos");
    elemento("#lista-precio-id").innerHTML = opciones(catalogos.listasPrecio, "Todas las listas");
    personalizarControles(document);
}
function abrirFormulario() {
    const seccion = elemento("#seccion-alta");
    seccion.hidden = false;
    requestAnimationFrame(() => seccion.classList.add("visible"));
    elemento("#mostrar-factura").setAttribute("aria-expanded", "true");
    seccion.scrollIntoView({ behavior: "smooth", block: "start" });
    elemento("#numero-factura").focus({ preventScroll: true });
}
function ocultarFormulario() {
    const seccion = elemento("#seccion-alta");
    seccion.classList.remove("visible");
    window.setTimeout(() => { seccion.hidden = true; }, 180);
    elemento("#mostrar-factura").setAttribute("aria-expanded", "false");
}
function reiniciarFormulario() {
    facturaEditandoId = null;
    elemento("#titulo-alta").textContent = "Nueva factura";
    elemento("#factura-form").reset();
    elemento("#fecha-emision").valueAsDate = new Date();
    items = [];
    renderizarDetalles();
    actualizarBotonGuardar("Guardar pendiente", "save");
    personalizarControles(elemento("#factura-form"));
}
function actualizarBotonGuardar(texto, icono) {
    const boton = elemento("#guardar-factura");
    boton.innerHTML = `<i data-lucide="${icono}"></i><span>${texto}</span>`;
    renderizarIconos();
}
function subtotal(item) {
    const neto = item.cantidad * item.precio * (1 - item.porcentajeBonificacion / 100);
    return neto * 1.21;
}
function renderizarDetalles() {
    const cuerpo = elemento("#detalle-body");
    if (items.length === 0) {
        cuerpo.innerHTML = '<tr><td colspan="7" class="tabla-vacia">Todavía no agregaste artículos.</td></tr>';
        elemento("#total-vista").textContent = dinero(0);
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
    elemento("#total-vista").textContent = dinero(items.reduce((total, item) => total + subtotal(item), 0));
    renderizarIconos();
}
function actualizarDetalle(evento) {
    const control = evento.target;
    const fila = control.closest("tr[data-uid]");
    const item = items.find((actual) => actual.uid === Number(fila?.dataset.uid));
    if (!item)
        return;
    if (control.classList.contains("item-cantidad"))
        item.cantidad = numero(control.value);
    if (control.classList.contains("item-bonificacion"))
        item.porcentajeBonificacion = numero(control.value);
    const celda = fila?.querySelector("td:nth-child(6)");
    if (celda)
        celda.textContent = dinero(subtotal(item));
    elemento("#total-vista").textContent = dinero(items.reduce((total, actual) => total + subtotal(actual), 0));
}
async function abrirExplorador() {
    const modal = elemento("#modal-articulos");
    paginaArticulos = 0;
    document.body.classList.add("modal-abierto");
    modal.showModal();
    requestAnimationFrame(() => modal.classList.add("visible"));
    await cargarArticulos();
    elemento("#buscar-articulo").focus();
}
function cerrarExplorador() {
    const modal = elemento("#modal-articulos");
    modal.classList.remove("visible");
    window.setTimeout(() => modal.close(), 160);
    document.body.classList.remove("modal-abierto");
}
async function cargarArticulos() {
    const contenedor = elemento("#articulos-resultados");
    contenedor.innerHTML = '<div class="resultado-vacio">Buscando artículos...</div>';
    try {
        const lista = valor("lista-precio-id");
        ultimaPaginaArticulos = await servicio.buscarArticulos(lista ? Number(lista) : undefined, valor("buscar-articulo"), paginaArticulos);
        renderizarArticulos(ultimaPaginaArticulos);
    }
    catch (error) {
        contenedor.innerHTML = `<div class="resultado-vacio error">${escapar(error.message)}</div>`;
    }
}
function renderizarArticulos(pagina) {
    const contenedor = elemento("#articulos-resultados");
    if (pagina.contenido.length === 0) {
        contenedor.innerHTML = '<div class="resultado-vacio">No hay artículos para esta búsqueda.</div>';
    }
    else {
        contenedor.innerHTML = pagina.contenido.map((articulo) => `
      <button class="articulo-resultado" type="button" data-precio-id="${articulo.listaPrecioArticuloId}">
        <span><strong>${escapar(articulo.codigo)} · ${escapar(articulo.nombre)}</strong><small>${escapar(articulo.listaPrecio)}</small></span>
        <span class="precio-articulo">${dinero(articulo.precio)}<i data-lucide="plus"></i></span>
      </button>`).join("");
    }
    elemento("#articulos-pagina").textContent = pagina.totalPaginas === 0
        ? "Sin resultados"
        : `Página ${pagina.pagina + 1} de ${pagina.totalPaginas}`;
    elemento("#articulos-anterior").disabled = pagina.primera;
    elemento("#articulos-siguiente").disabled = pagina.ultima;
    renderizarIconos();
}
function seleccionarArticulo(id) {
    const articulo = ultimaPaginaArticulos?.contenido.find((actual) => actual.listaPrecioArticuloId === id);
    if (!articulo)
        return;
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
function filtrosActuales(incluirPagina = true) {
    const informada = valor("filtro-informada");
    const filtros = {
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
function queryFiltros(filtros) {
    const parametros = new URLSearchParams();
    Object.entries(filtros).forEach(([nombre, dato]) => {
        if (dato !== undefined && dato !== "")
            parametros.set(nombre, String(dato));
    });
    return parametros.size ? `?${parametros}` : "";
}
function actualizarDescargas() {
    const query = queryFiltros(filtrosActuales(false));
    elemento("#descargar-pdf").href = `/api/facturas/reporte.pdf${query}`;
    elemento("#descargar-excel").href = `/api/facturas/reporte.xlsx${query}`;
}
function accionesFactura(factura) {
    if (factura.estado !== "PENDIENTE") {
        const detalle = factura.cae ? `CAE ${escapar(factura.cae)}` : "Comprobante bloqueado";
        return `<span class="accion-bloqueada"><i data-lucide="lock-keyhole"></i>${detalle}</span>`;
    }
    const emitirDeshabilitado = !estadoArca?.configurada ? "disabled" : "";
    const tituloEmitir = estadoArca?.configurada ? "Solicitar CAE en homologación" : escapar(estadoArca?.mensaje);
    return `
    <button class="boton-tabla emitir" type="button" data-id="${factura.id}" data-numero="${factura.numeroFactura}" title="${tituloEmitir}" ${emitirDeshabilitado}>
      <i data-lucide="send"></i><span>Emitir ARCA</span>
    </button>
    <button class="boton-tabla editar" type="button" data-id="${factura.id}"><i data-lucide="pencil"></i><span>Editar</span></button>
    <button class="boton-tabla peligro eliminar" type="button" data-id="${factura.id}" data-numero="${factura.numeroFactura}"><i data-lucide="trash-2"></i><span>Eliminar</span></button>`;
}
function renderizarFacturas(pagina) {
    elemento("#contador-resultados").textContent = `${pagina.totalElementos} ${pagina.totalElementos === 1 ? "comprobante" : "comprobantes"}`;
    const cuerpo = elemento("#facturas-body");
    if (pagina.contenido.length === 0) {
        cuerpo.innerHTML = '<tr><td colspan="8" class="tabla-vacia">No hay comprobantes para los filtros elegidos.</td></tr>';
    }
    else {
        cuerpo.innerHTML = pagina.contenido.map((factura) => `
      <tr>
        <td><strong>#${String(factura.numeroFactura).padStart(8, "0")}</strong><small>${escapar(factura.condicionIva)}</small></td>
        <td>${new Date(`${factura.fechaEmision}T12:00:00`).toLocaleDateString("es-AR")}</td>
        <td>${escapar(factura.clienteDenominacion)}</td>
        <td>${escapar(factura.puntoVentaDescripcion)}</td>
        <td class="numero">${factura.cantidadItems}</td>
        <td class="numero destacado">${dinero(factura.importeTotal)}</td>
        <td><span class="estado estado-${factura.estado.toLowerCase()}">${escapar(factura.estado)}</span></td>
        <td class="acciones">${accionesFactura(factura)}</td>
      </tr>`).join("");
    }
    elemento("#pagina-estado").textContent = pagina.totalPaginas === 0
        ? "Sin resultados"
        : `Página ${pagina.pagina + 1} de ${pagina.totalPaginas}`;
    elemento("#pagina-anterior").disabled = pagina.primera;
    elemento("#pagina-siguiente").disabled = pagina.ultima;
    renderizarIconos();
}
async function cargarFacturas() {
    const carga = elemento("#estado-carga");
    carga.classList.add("visible");
    try {
        const pagina = await servicio.obtenerFacturas(filtrosActuales());
        renderizarFacturas(pagina);
        actualizarDescargas();
    }
    catch (error) {
        notificar(error.message, "error");
    }
    finally {
        carga.classList.remove("visible");
    }
}
async function guardarFactura(evento) {
    evento.preventDefault();
    if (items.length === 0) {
        notificar("Agregá al menos un artículo desde el maestro.", "error");
        return;
    }
    if (items.some((item) => item.cantidad <= 0 || item.porcentajeBonificacion < 0 || item.porcentajeBonificacion > 100)) {
        notificar("Revisá las cantidades y bonificaciones del detalle.", "error");
        return;
    }
    const request = {
        numeroFactura: numero(valor("numero-factura")),
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
    const boton = elemento("#guardar-factura");
    boton.disabled = true;
    actualizarBotonGuardar("Guardando...", "loader-circle");
    try {
        const editando = facturaEditandoId !== null;
        const guardada = editando
            ? await servicio.actualizarFactura(facturaEditandoId, request)
            : await servicio.crearFactura(request);
        notificar(editando
            ? `Factura #${guardada.numeroFactura} actualizada.`
            : `Factura #${guardada.numeroFactura} guardada como pendiente.`);
        ocultarFormulario();
        paginaFacturas = 0;
        await cargarFacturas();
    }
    catch (error) {
        notificar(error.message, "error");
    }
    finally {
        boton.disabled = false;
        actualizarBotonGuardar(facturaEditandoId === null ? "Guardar pendiente" : "Guardar cambios", "save");
    }
}
async function cargarFacturaParaEditar(id) {
    try {
        const factura = await servicio.obtenerFactura(id);
        if (factura.estado !== "PENDIENTE") {
            notificar("Sólo las facturas pendientes pueden editarse.", "error");
            return;
        }
        facturaEditandoId = factura.id;
        elemento("#titulo-alta").textContent = `Editar factura #${factura.numeroFactura}`;
        elemento("#numero-factura").value = String(factura.numeroFactura);
        elemento("#fecha-emision").value = factura.fechaEmision;
        elemento("#cliente-id").value = String(factura.clienteId);
        elemento("#condicion-iva-id").value = String(factura.condicionIvaId);
        elemento("#punto-venta-id").value = String(factura.puntoVentaId);
        elemento("#tipo-moneda-id").value = String(factura.tipoMonedaId);
        elemento("#observaciones").value = factura.observaciones ?? "";
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
    }
    catch (error) {
        notificar(error.message, "error");
    }
}
function pedirConfirmacion(datos) {
    const modal = elemento("#modal-confirmacion");
    elemento(".modal-confirmacion .modal-tipo").textContent = datos.tipo;
    elemento("#modal-titulo").textContent = datos.titulo;
    elemento("#modal-descripcion").textContent = datos.descripcion;
    const confirmar = elemento("#modal-confirmar");
    confirmar.className = `boton ${datos.accion === "eliminar" ? "peligro" : "primario"}`;
    confirmar.innerHTML = `<i data-lucide="${datos.accion === "eliminar" ? "trash-2" : "send"}"></i><span>${datos.confirmar}</span>`;
    elemento("#modal-icono").innerHTML = `<i data-lucide="${datos.accion === "eliminar" ? "trash-2" : "send"}"></i>`;
    elemento("#modal-icono").dataset.accion = datos.accion;
    document.body.classList.add("modal-abierto");
    modal.showModal();
    requestAnimationFrame(() => modal.classList.add("visible"));
    renderizarIconos();
    return new Promise((resolver) => { resolverConfirmacion = resolver; });
}
function cerrarConfirmacion(confirmada) {
    const modal = elemento("#modal-confirmacion");
    if (!modal.open)
        return;
    modal.classList.remove("visible");
    window.setTimeout(() => modal.close(), 160);
    document.body.classList.remove("modal-abierto");
    resolverConfirmacion?.(confirmada);
    resolverConfirmacion = undefined;
}
async function accionFactura(evento) {
    const boton = evento.target.closest("button[data-id]");
    if (!boton)
        return;
    const id = Number(boton.dataset.id);
    if (boton.classList.contains("editar")) {
        await cargarFacturaParaEditar(id);
        return;
    }
    try {
        if (boton.classList.contains("emitir")) {
            const confirmada = await pedirConfirmacion({
                tipo: "Emitir en homologación",
                titulo: `¿Solicitar CAE para la factura #${boton.dataset.numero}?`,
                descripcion: "Se enviará a ARCA en el entorno de pruebas. Si ARCA la aprueba, quedará bloqueada y pasará a EMITIDA.",
                confirmar: "Solicitar CAE",
                accion: "emitir",
            });
            if (!confirmada)
                return;
            const factura = await servicio.emitirEnArca(id);
            notificar(`ARCA aprobó la factura. CAE ${factura.cae}.`);
        }
        if (boton.classList.contains("eliminar")) {
            const confirmada = await pedirConfirmacion({
                tipo: "Eliminar borrador",
                titulo: `¿Eliminar la factura #${boton.dataset.numero}?`,
                descripcion: "Se borrará el comprobante pendiente y todos sus renglones. Esta acción no se puede deshacer.",
                confirmar: "Eliminar",
                accion: "eliminar",
            });
            if (!confirmada)
                return;
            await servicio.eliminarFactura(id);
            notificar("La factura pendiente fue eliminada.");
        }
        await cargarFacturas();
    }
    catch (error) {
        notificar(error.message, "error");
    }
}
async function cargarEstadoArca() {
    estadoArca = await servicio.obtenerEstadoArca();
    const panel = elemento("#estado-arca");
    panel.classList.toggle("configurada", estadoArca.configurada);
    elemento("#estado-arca-mensaje").textContent = estadoArca.mensaje;
}
function enlazarEventos() {
    elemento("#mostrar-factura").addEventListener("click", () => {
        reiniciarFormulario();
        abrirFormulario();
    });
    elemento("#cerrar-factura").addEventListener("click", ocultarFormulario);
    elemento("#filtros-form").addEventListener("submit", (evento) => {
        evento.preventDefault();
        paginaFacturas = 0;
        void cargarFacturas();
    });
    elemento("#limpiar-filtros").addEventListener("click", () => {
        elemento("#filtros-form").reset();
        personalizarControles(elemento("#filtros-form"));
        paginaFacturas = 0;
        void cargarFacturas();
    });
    elemento("#pagina-anterior").addEventListener("click", () => {
        paginaFacturas--;
        void cargarFacturas();
    });
    elemento("#pagina-siguiente").addEventListener("click", () => {
        paginaFacturas++;
        void cargarFacturas();
    });
    elemento("#agregar-item").addEventListener("click", () => void abrirExplorador());
    elemento("#cerrar-articulos").addEventListener("click", cerrarExplorador);
    elemento("#lista-precio-id").addEventListener("change", () => {
        paginaArticulos = 0;
        void cargarArticulos();
    });
    elemento("#buscar-articulo").addEventListener("input", () => {
        window.clearTimeout(temporizadorBusqueda);
        temporizadorBusqueda = window.setTimeout(() => {
            paginaArticulos = 0;
            void cargarArticulos();
        }, 220);
    });
    elemento("#articulos-anterior").addEventListener("click", () => {
        paginaArticulos--;
        void cargarArticulos();
    });
    elemento("#articulos-siguiente").addEventListener("click", () => {
        paginaArticulos++;
        void cargarArticulos();
    });
    elemento("#articulos-resultados").addEventListener("click", (evento) => {
        const boton = evento.target.closest("[data-precio-id]");
        if (boton)
            seleccionarArticulo(Number(boton.dataset.precioId));
    });
    elemento("#detalle-body").addEventListener("input", actualizarDetalle);
    elemento("#detalle-body").addEventListener("click", (evento) => {
        const boton = evento.target.closest(".eliminar-item");
        const fila = boton?.closest("tr[data-uid]");
        if (!fila)
            return;
        items = items.filter((item) => item.uid !== Number(fila.dataset.uid));
        renderizarDetalles();
    });
    elemento("#factura-form").addEventListener("submit", (evento) => void guardarFactura(evento));
    elemento("#facturas-body").addEventListener("click", (evento) => void accionFactura(evento));
    elemento("#modal-cancelar").addEventListener("click", () => cerrarConfirmacion(false));
    elemento("#modal-confirmar").addEventListener("click", () => cerrarConfirmacion(true));
    elemento("#modal-confirmacion").addEventListener("cancel", (evento) => {
        evento.preventDefault();
        cerrarConfirmacion(false);
    });
    elemento("#modal-articulos").addEventListener("cancel", (evento) => {
        evento.preventDefault();
        cerrarExplorador();
    });
    document.addEventListener("click", (evento) => {
        if (!evento.target.closest(".selector-personalizado"))
            cerrarSelectores();
    });
    window.addEventListener("resize", () => cerrarSelectores());
}
async function iniciar() {
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
    }
    catch (error) {
        notificar(`No se pudo iniciar la aplicación: ${error.message}`, "error");
    }
}
void iniciar();
//# sourceMappingURL=app.js.map