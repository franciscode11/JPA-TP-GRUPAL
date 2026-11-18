import { FacturaService } from "./FacturaApiService.js";
const servicio = new FacturaService();
let catalogos;
let estadoArca;
let items = [];
let siguienteUid = 1;
let facturaEditandoId = null;
let paginaFacturas = 0;
let paginaArticulos = 0;
let tamanioArticulos = 4;
let solicitudArticulos = 0;
let ultimaPaginaArticulos = null;
let resolverConfirmacion;
let temporizadorBusqueda;
let temporizadorAviso;
let facturasVisibles = [];
const ultimasFechasAutorizadas = new Map();
let destinoCliente = "cliente-id";
let paginaClientes = 0;
let busquedaClientes = 0;
let solicitudFacturas = 0;
async function cargarClientes() {
    const solicitud = ++busquedaClientes;
    try {
        const query = new URLSearchParams({ q: valor("buscar-cliente"), pagina: String(paginaClientes), tamanio: "8" });
        const respuesta = await fetch(`/api/catalogos/clientes?${query}`);
        if (!respuesta.ok)
            throw new Error("No se pudieron cargar los clientes.");
        const pagina = await respuesta.json();
        if (solicitud !== busquedaClientes)
            return;
        elemento("#clientes-resultados").innerHTML = pagina.contenido.length
            ? pagina.contenido.map(cliente => `<button type="button" class="articulo-resultado" data-cliente="${cliente.id}" data-condicion="${cliente.condicionIvaId ?? ""}" data-nombre="${escapar(cliente.nombre)}"><span>${escapar(cliente.nombre)}</span><i data-lucide="plus"></i></button>`).join("")
            : '<div class="resultado-vacio"><i data-lucide="user-search"></i>No hay clientes para esta búsqueda.</div>';
        elemento("#clientes-anterior").disabled = pagina.primera;
        elemento("#clientes-siguiente").disabled = pagina.ultima;
        elemento("#clientes-pagina").textContent = `Página ${pagina.pagina + 1} de ${Math.max(1, pagina.totalPaginas)}`;
        renderizarIconos();
    }
    catch (error) {
        notificar(error.message, "error");
    }
}
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
    aviso.innerHTML = `<i data-lucide="${tipo === "error" ? "circle-alert" : "circle-check"}"></i><div><strong>${tipo === "error" ? "No se pudo completar" : "Listo"}</strong>${mensaje.length > 160 ? `<details><summary>Ver detalle del resultado</summary><p>${escapar(mensaje)}</p></details>` : `<p>${escapar(mensaje)}</p>`}</div><button type="button" aria-label="Cerrar aviso"><i data-lucide="x"></i></button>`;
    aviso.className = `aviso visible ${tipo}`;
    aviso.querySelector("button")?.addEventListener("click", () => aviso.classList.remove("visible"));
    renderizarIconos();
    window.clearTimeout(temporizadorAviso);
    temporizadorAviso = window.setTimeout(() => aviso.classList.remove("visible"), 5000);
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
            const fueraDeRango = (input.id === "filtro-hasta" && valor("filtro-desde") && iso < valor("filtro-desde"))
                || (input.id === "filtro-desde" && valor("filtro-hasta") && iso > valor("filtro-hasta"));
            dias.push(`<button type="button" class="calendario-dia${iso === seleccionado ? " seleccionado" : ""}${iso === hoy ? " hoy" : ""}" data-fecha="${iso}" aria-label="${dia} de ${MESES[mes]} de ${anio}" ${fueraDeRango ? "disabled" : ""}>${dia}</button>`);
        }
        panel.innerHTML = `
      <div class="calendario-cabecera">
        <button type="button" class="calendario-nav mes-anterior" aria-label="Mes anterior" ${anio === 1900 && mes === 0 ? "disabled" : ""}><i data-lucide="chevron-left"></i></button>
        <strong>${MESES[mes]} ${anio}</strong>
        <button type="button" class="calendario-nav mes-siguiente" aria-label="Mes siguiente" ${anio === 2100 && mes === 11 ? "disabled" : ""}><i data-lucide="chevron-right"></i></button>
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
    raiz.querySelectorAll("select.control:not([data-explorador])").forEach(personalizarSelector);
    document.querySelectorAll("select[data-explorador]").forEach(select => {
        const boton = document.querySelector(`[data-buscar-cliente="${select.id}"]`);
        if (boton)
            boton.innerHTML = `<span>${escapar(select.selectedOptions[0]?.textContent || "Elegir cliente")}</span><i data-lucide="search"></i>`;
    });
    renderizarIconos();
}
function opciones(datos, inicial) {
    const primera = inicial === undefined ? "" : `<option value="">${escapar(inicial)}</option>`;
    return primera + datos.map((dato) => `<option value="${dato.id}">${escapar(dato.nombre)}</option>`).join("");
}
function cargarCatalogos() {
    elemento("#cliente-id").innerHTML = opciones(catalogos.clientes, "Elegir cliente");
    elemento("#condicion-iva-id").innerHTML = opciones(catalogos.condicionesIva, "Se completa al elegir cliente");
    elemento("#punto-venta-id").innerHTML = opciones(catalogos.puntosVenta);
    elemento("#tipo-moneda-id").innerHTML = opciones(catalogos.tiposMoneda);
    elemento("#filtro-cliente").innerHTML = opciones(catalogos.clientes, "Todos");
    elemento("#lista-precio-id").innerHTML = opciones(catalogos.listasPrecio, "Todas las listas");
    personalizarControles(document);
}
function abrirFormulario() {
    const seccion = elemento("#seccion-alta");
    seccion.hidden = false;
    seccion.classList.add("visible");
    elemento("#mostrar-factura").setAttribute("aria-expanded", "true");
    seccion.scrollIntoView({ behavior: "auto", block: "start" });
    elemento("#factura-form .fecha-control").focus({ preventScroll: true });
}
function ocultarFormulario() {
    const seccion = elemento("#seccion-alta");
    seccion.classList.remove("visible");
    seccion.hidden = true;
    elemento("#mostrar-factura").focus({ preventScroll: true });
    elemento("#mostrar-factura").setAttribute("aria-expanded", "false");
}
function reiniciarFormulario() {
    facturaEditandoId = null;
    elemento("#titulo-alta").textContent = "Nueva factura";
    elemento("#factura-form").reset();
    elemento("#cliente-id").value = "";
    elemento("#condicion-iva-id").value = "";
    elemento("#condicion-iva-id").disabled = true;
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
    return neto;
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
      <td><input class="control item-cantidad" type="text" inputmode="decimal" maxlength="6" required pattern="[0-9]{1,3}([.,][0-9]{1,2})?" value="${item.cantidad}" aria-label="Cantidad"></td>
      <td><input class="control item-bonificacion" type="text" inputmode="decimal" maxlength="6" required pattern="[0-9]{1,3}([.,][0-9]{1,2})?" value="${item.porcentajeBonificacion}" aria-label="Bonificación"></td>
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
    const cantidad = control.classList.contains("item-cantidad");
    const valor = numero(control.value);
    const valido = control.value !== "" && !control.validity.patternMismatch && Number.isFinite(valor)
        && (cantidad ? valor >= 0.01 && valor <= 999 : valor >= 0 && valor <= 100);
    control.setCustomValidity(valido ? "" : cantidad
        ? "Ingresá una cantidad entre 0,01 y 999, con hasta 2 decimales."
        : "Ingresá una bonificación entre 0 y 100, con hasta 2 decimales.");
    control.setAttribute("aria-invalid", String(!valido));
    if (valido) {
        if (cantidad)
            item.cantidad = valor;
        else
            item.porcentajeBonificacion = valor;
    }
    const celda = fila?.querySelector("td:nth-child(6)");
    if (celda)
        celda.textContent = fila?.querySelector("input:invalid") ? "—" : dinero(subtotal(item));
    elemento("#total-vista").textContent = document.querySelector("#detalle-body input:invalid")
        ? "—" : dinero(items.reduce((total, actual) => total + subtotal(actual), 0));
}
async function abrirExplorador() {
    const modal = elemento("#modal-articulos");
    paginaArticulos = 0;
    document.body.classList.add("modal-abierto");
    modal.showModal();
    requestAnimationFrame(() => modal.classList.add("visible"));
    tamanioArticulos = filasDelMaestro();
    elemento("#buscar-articulo").focus({ preventScroll: true });
    await cargarArticulos();
}
function cerrarExplorador() {
    const modal = elemento("#modal-articulos");
    modal.classList.remove("visible");
    modal.close();
    ++solicitudArticulos;
    window.clearTimeout(temporizadorBusqueda);
    document.body.classList.remove("modal-abierto");
}
function filasDelMaestro() {
    return Number(getComputedStyle(elemento("#modal-articulos")).getPropertyValue("--filas"));
}
async function cargarArticulos() {
    const solicitud = ++solicitudArticulos;
    const cuerpo = elemento("#articulos-resultados");
    cuerpo.setAttribute("aria-busy", "true");
    cuerpo.inert = true;
    elemento("#articulos-anterior").disabled = true;
    elemento("#articulos-siguiente").disabled = true;
    try {
        const lista = valor("lista-precio-id");
        const pagina = await servicio.buscarArticulos(lista ? Number(lista) : undefined, valor("buscar-articulo"), paginaArticulos, tamanioArticulos);
        if (solicitud !== solicitudArticulos)
            return;
        ultimaPaginaArticulos = pagina;
        renderizarArticulos(pagina);
    }
    catch (error) {
        if (solicitud !== solicitudArticulos)
            return;
        ultimaPaginaArticulos = null;
        cuerpo.innerHTML = `<div class="resultado-vacio error">${escapar(error.message)}</div>`;
        elemento("#articulos-pagina").textContent = "Sin datos";
    }
    finally {
        if (solicitud === solicitudArticulos) {
            cuerpo.inert = false;
            cuerpo.setAttribute("aria-busy", "false");
        }
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
        <span><strong title="${escapar(articulo.nombre)}">${escapar(articulo.nombre)}</strong><small>${escapar(articulo.codigo)} · ${escapar(articulo.listaPrecio)}</small></span>
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
    if (items.length >= 50) {
        cerrarExplorador();
        notificar("Una factura admite hasta 50 renglones.", "error");
        return;
    }
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
        numeroInterno: valor("filtro-numero") ? numero(valor("filtro-numero")) : undefined,
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
        return `<button class="boton-tabla ver" type="button" data-id="${factura.id}"><i data-lucide="file-text"></i><span>Ver factura</span></button>`;
    }
    const ultimaFecha = ultimasFechasAutorizadas.get(factura.puntoVentaNumero);
    const fechaAnterior = ultimaFecha && factura.fechaEmision < ultimaFecha;
    const emitirDeshabilitado = !estadoArca?.configurada || fechaAnterior ? "disabled" : "";
    const tituloEmitir = fechaAnterior ? "Editá la fecha: es anterior al último comprobante autorizado."
        : estadoArca?.configurada ? "Solicitar CAE en homologación" : escapar(estadoArca?.mensaje);
    const etiqueta = factura.numeroFactura == null ? `borrador #${factura.id}` : `factura #${factura.numeroFactura}`;
    return `
    <button class="boton-tabla emitir" type="button" data-id="${factura.id}" data-etiqueta="${etiqueta}" title="${tituloEmitir}" ${emitirDeshabilitado}>
      <i data-lucide="send"></i><span>Emitir ARCA</span>
    </button>
    <button class="boton-tabla editar" type="button" aria-label="Editar borrador #${factura.id}" title="Editar borrador" data-id="${factura.id}"><i data-lucide="pencil"></i><span>Editar</span></button>
    <button class="boton-tabla peligro eliminar" type="button" aria-label="Eliminar borrador #${factura.id}" title="Eliminar borrador" data-id="${factura.id}" data-etiqueta="${etiqueta}"><i data-lucide="trash-2"></i><span>Eliminar</span></button>
    ${fechaAnterior ? '<small class="ayuda-fecha">Editá la fecha antes de emitir.</small>' : ""}`;
}
function renderizarFacturas(pagina) {
    facturasVisibles = pagina.contenido;
    pagina.contenido.filter(factura => factura.estado === "EMITIDA").forEach(factura => {
        const ultima = ultimasFechasAutorizadas.get(factura.puntoVentaNumero) || "";
        if (factura.fechaEmision > ultima)
            ultimasFechasAutorizadas.set(factura.puntoVentaNumero, factura.fechaEmision);
    });
    elemento("#contador-resultados").textContent = `${pagina.totalElementos} ${pagina.totalElementos === 1 ? "encontrado" : "encontrados"}`;
    const cuerpo = elemento("#facturas-body");
    if (pagina.contenido.length === 0) {
        cuerpo.innerHTML = '<tr><td colspan="8"><div class="vacio-comprobantes"><i data-lucide="file-search"></i><strong>No se encontraron comprobantes</strong><span>Probá con otro número o cambiá los filtros.</span></div></td></tr>';
    }
    else {
        cuerpo.innerHTML = pagina.contenido.map((factura) => `
      <tr>
        <td><strong class="referencia">#${factura.id}</strong></td>
        <td>${new Date(`${factura.fechaEmision}T12:00:00`).toLocaleDateString("es-AR")}</td>
        <td>${escapar(factura.clienteDenominacion)}<small>${escapar(factura.condicionIva)}</small></td>
        <td>${escapar(factura.puntoVentaDescripcion)}</td>
        <td class="numero">${factura.cantidadItems}</td>
        <td class="numero destacado">${dinero(factura.importeTotal)}</td>
        <td><span class="estado estado-${factura.estado.toLowerCase()}">${escapar(factura.estado)}</span></td>
        <td><div class="acciones">${accionesFactura(factura)}</div></td>
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
    const desde = valor("filtro-desde");
    const hasta = valor("filtro-hasta");
    const errorFechas = elemento("#error-fechas");
    errorFechas.hidden = !(desde && hasta && hasta < desde);
    if (!errorFechas.hidden)
        return;
    const solicitud = ++solicitudFacturas;
    const carga = elemento("#facturas-body");
    carga.setAttribute("aria-busy", "true");
    try {
        const pagina = await servicio.obtenerFacturas(filtrosActuales());
        if (solicitud !== solicitudFacturas)
            return;
        renderizarFacturas(pagina);
        actualizarDescargas();
    }
    catch (error) {
        if (solicitud !== solicitudFacturas)
            return;
        facturasVisibles = [];
        elemento("#contador-resultados").textContent = "Búsqueda no disponible";
        elemento("#facturas-body").innerHTML = '<tr><td colspan="8"><div class="vacio-comprobantes"><i data-lucide="wifi-off"></i><strong>No pudimos cargar los comprobantes</strong><span>Revisá la conexión con el servidor y volvé a buscar.</span></div></td></tr>';
        elemento("#pagina-estado").textContent = "Sin resultados disponibles";
        elemento("#pagina-anterior").disabled = true;
        elemento("#pagina-siguiente").disabled = true;
        renderizarIconos();
    }
    finally {
        if (solicitud === solicitudFacturas)
            carga.setAttribute("aria-busy", "false");
    }
}
async function guardarFactura(evento) {
    evento.preventDefault();
    if (!valor("cliente-id")) {
        notificar("Elegí un cliente desde el buscador.", "error");
        return;
    }
    if (!valor("condicion-iva-id")) {
        notificar("El cliente no tiene una condición de IVA registrada. Elegí un cliente con datos completos.", "error");
        return;
    }
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
        const clienteSelect = elemento("#cliente-id");
        if (!Array.from(clienteSelect.options).some(opcion => opcion.value === String(factura.clienteId))) {
            const reporte = facturasVisibles.find(actual => actual.id === id);
            clienteSelect.add(new Option(reporte?.clienteDenominacion ?? `Cliente #${factura.clienteId}`, String(factura.clienteId)));
        }
        clienteSelect.value = String(factura.clienteId);
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
    <div class="factura-encabezado"><div><p class="modal-tipo">Comprobante #${reporte.id}</p><h2 id="comprobante-titulo">Factura C <span>${escapar(reporte.identificador)}</span></h2><p>${escapar(reporte.puntoVentaDescripcion)}</p></div><span class="estado estado-emitida">Emitida</span></div>
    <div class="factura-datos"><div><span>Cliente</span><strong>${escapar(reporte.clienteDenominacion)}</strong><small>${escapar(factura.documentoCliente)}</small><small>${escapar(reporte.condicionIva)}</small></div><div><span>Fecha de emisión</span><strong>${fechaVisible(reporte.fechaEmision, "")}</strong></div></div>
    <div class="tabla-contenedor"><table class="tabla"><thead><tr><th>Artículo</th><th>Cantidad</th><th>Precio</th><th>Bonif.</th><th>Total</th></tr></thead><tbody>
    ${factura.detalles.map((detalle) => `<tr><td>${escapar(detalle.articuloCodigo)} · ${escapar(detalle.articuloNombre)}</td><td>${detalle.cantidad}</td><td>${dinero(detalle.precioUnitario)}</td><td>${detalle.porcentajeBonificacion}%</td><td>${dinero(detalle.importeSubtotal)}</td></tr>`).join("")}
    </tbody></table></div>
    <div class="factura-resumen"><div><span>Autorización ARCA</span><strong>CAE ${escapar(reporte.cae)}</strong><small>Vence el ${fechaVisible(factura.vencimientoCae || "", "Sin fecha")}</small></div><div class="factura-total"><span>Total</span><strong>${dinero(reporte.importeTotal)}</strong></div></div>
    ${factura.observaciones ? `<div class="factura-nota"><span>Observaciones</span><p>${escapar(factura.observaciones)}</p></div>` : ""}
    <p class="factura-testing"><i data-lucide="shield-check"></i>Homologación · Sin validez fiscal</p>`;
    renderizarIconos();
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
    modal.close();
    ++solicitudArticulos;
    window.clearTimeout(temporizadorBusqueda);
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
function enlazarEventos() {
    document.querySelectorAll("[data-buscar-cliente]").forEach(boton => boton.addEventListener("click", () => {
        destinoCliente = boton.dataset.buscarCliente;
        paginaClientes = 0;
        elemento("#buscar-cliente").value = "";
        const modal = elemento("#modal-clientes");
        modal.showModal();
        modal.classList.add("visible");
        void cargarClientes();
    }));
    elemento("#cerrar-clientes").addEventListener("click", () => elemento("#modal-clientes").close());
    elemento("#buscar-cliente").addEventListener("input", () => { paginaClientes = 0; void cargarClientes(); });
    elemento("#clientes-anterior").addEventListener("click", () => { paginaClientes--; void cargarClientes(); });
    elemento("#clientes-siguiente").addEventListener("click", () => { paginaClientes++; void cargarClientes(); });
    elemento("#clientes-resultados").addEventListener("click", evento => {
        const boton = evento.target.closest("[data-cliente]");
        if (!boton)
            return;
        const select = elemento(`#${destinoCliente}`);
        if (!Array.from(select.options).some(opcion => opcion.value === boton.dataset.cliente)) {
            select.add(new Option(boton.dataset.nombre, boton.dataset.cliente));
        }
        select.value = boton.dataset.cliente;
        if (destinoCliente === "cliente-id" && boton.dataset.condicion) {
            elemento("#condicion-iva-id").value = boton.dataset.condicion;
            personalizarControles(elemento("#factura-form"));
        }
        if (destinoCliente === "cliente-id") {
            if (!boton.dataset.condicion)
                elemento("#condicion-iva-id").value = "";
            elemento("#condicion-iva-id").disabled = true;
            personalizarControles(elemento("#factura-form"));
        }
        personalizarControles(select.parentElement);
        elemento("#modal-clientes").close();
    });
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
        if (elemento("#modal-articulos").open && filasDelMaestro() !== tamanioArticulos) {
            tamanioArticulos = filasDelMaestro();
            paginaArticulos = 0;
            void cargarArticulos();
        }
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
        reiniciarFormulario();
        await cargarFacturas();
    }
    catch (error) {
        notificar(`No se pudo iniciar la aplicación: ${error.message}`, "error");
    }
}
void iniciar();
//# sourceMappingURL=app.js.map