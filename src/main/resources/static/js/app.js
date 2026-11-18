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
let facturasVisibles = [];
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
const MESES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DIAS = ["L", "M", "M", "J", "V", "S", "D"];
function fechaIso(fecha) {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");
    return `${anio}-${mes}-${dia}`;
}
function fechaVisible(iso, placeholder) {
    if (!iso)
        return placeholder;
    const [anio, mes, dia] = iso.split("-");
    return `${dia}/${mes}/${anio}`;
}
function actualizarFechaPersonalizada(input, contenedor) {
    const texto = contenedor.querySelector(".fecha-texto");
    if (texto)
        texto.textContent = fechaVisible(input.value, input.dataset.placeholder ?? "Elegir fecha");
    contenedor.querySelector(".fecha-control")
        ?.classList.toggle("sin-fecha", !input.value);
}
function cerrarCalendarios(excepto) {
    document.querySelectorAll(".fecha-personalizada.abierto").forEach((calendario) => {
        if (calendario === excepto)
            return;
        calendario.classList.remove("abierto");
        calendario.querySelector(".fecha-control")?.setAttribute("aria-expanded", "false");
        const panel = calendario.querySelector(".calendario-popup");
        if (panel)
            panel.hidden = true;
    });
}
function personalizarFecha(input) {
    const existente = input.closest(".fecha-personalizada");
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
    const dibujar = () => {
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
        panel.querySelector(".mes-anterior")?.addEventListener("click", () => {
            mesVisible = new Date(anio, mes - 1, 1);
            dibujar();
        });
        panel.querySelector(".mes-siguiente")?.addEventListener("click", () => {
            mesVisible = new Date(anio, mes + 1, 1);
            dibujar();
        });
        panel.querySelectorAll("[data-fecha]").forEach((dia) => {
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
        cerrarCalendarios();
        cerrarSelectores(selector);
        selector.classList.toggle("abierto", abrir);
        trigger.setAttribute("aria-expanded", String(abrir));
        menu.hidden = !abrir;
    });
    trigger.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape")
            cerrarSelectores();
    });
    select.addEventListener("change", () => actualizarSelector(select, selector));
    actualizarSelector(select, selector);
}
function personalizarControles(raiz = document) {
    raiz.querySelectorAll("input[data-calendario]").forEach(personalizarFecha);
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
    elemento("#factura-form .fecha-control").focus({ preventScroll: true });
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
    elemento("#fecha-emision").value = fechaIso(new Date());
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
        contenedor.innerHTML = '<div class="resultado-vacio"><i data-lucide="package-x"></i><span>No hay artículos para esta búsqueda.</span></div>';
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
function renderizarFacturas(pagina) {
    facturasVisibles = pagina.contenido;
    elemento("#contador-resultados").textContent = `${pagina.totalElementos} ${pagina.totalElementos === 1 ? "comprobante" : "comprobantes"}`;
    const cuerpo = elemento("#facturas-body");
    if (pagina.contenido.length === 0) {
        cuerpo.innerHTML = '<tr><td colspan="8" class="tabla-vacia">No hay comprobantes para los filtros elegidos.</td></tr>';
    }
    else {
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
    const request = {
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
        if (editando) {
            await servicio.actualizarFactura(facturaEditandoId, request);
        }
        else {
            await servicio.crearFactura(request);
        }
        notificar(editando
            ? "Borrador actualizado correctamente."
            : "Borrador guardado como pendiente. ARCA asignará el número al emitirlo.");
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
        elemento("#titulo-alta").textContent = `Editar borrador #${factura.id}`;
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
async function mostrarComprobante(reporte) {
    const factura = await servicio.obtenerFactura(reporte.id);
    const modal = elemento("#modal-comprobante");
    elemento("#comprobante-contenido").innerHTML = `
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
    if (boton.classList.contains("ver")) {
        try {
            const reporte = facturasVisibles.find((factura) => factura.id === id);
            if (reporte)
                await mostrarComprobante(reporte);
        }
        catch (error) {
            notificar(error.message, "error");
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
            if (!confirmada)
                return;
            const factura = await servicio.emitirEnArca(id);
            if (factura.estado === "EMITIDA" && factura.cae) {
                notificar(`ARCA aprobó la factura. CAE ${factura.cae}.`);
                await mostrarComprobante(factura);
            }
            else {
                notificar(factura.motivoRechazo
                    ? `ARCA rechazó el borrador #${id}: ${factura.motivoRechazo}`
                    : "ARCA no aprobó el comprobante. Revisá los datos e intentá nuevamente.", "error");
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
    elemento("#cerrar-comprobante").addEventListener("click", () => {
        elemento("#modal-comprobante").close();
    });
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
        const formulario = elemento("#filtros-form");
        formulario.reset();
        formulario.querySelectorAll("input, select")
            .forEach((control) => {
            control.value = "";
            control.dispatchEvent(new Event("change", { bubbles: true }));
        });
        personalizarControles(formulario);
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
        if (!evento.target.closest(".fecha-personalizada"))
            cerrarCalendarios();
    });
    window.addEventListener("resize", () => {
        cerrarSelectores();
        cerrarCalendarios();
    });
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