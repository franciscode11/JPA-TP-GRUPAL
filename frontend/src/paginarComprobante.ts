// La altura disponible depende de la ventana, el zoom y el texto real de la factura.
export function paginarComprobante(modal: HTMLDialogElement): void {
  const nav = modal.querySelector<HTMLElement>(".factura-navegacion")!;
  const anterior = nav.querySelector<HTMLButtonElement>("[data-anterior]")!;
  const siguiente = nav.querySelector<HTMLButtonElement>("[data-siguiente]")!;
  const indicador = nav.querySelector<HTMLElement>("[role=status]")!;
  const nota = modal.querySelector<HTMLElement>(".factura-nota p");
  if (nota) {
    const fragmentos = (nota.textContent || "").match(/[^\n]{1,60}|\n/gu) || [];
    nota.replaceChildren();
    for (const fragmento of fragmentos) {
      const span = document.createElement("span");
      span.textContent = fragmento;
      nota.append(span);
    }
  }

  const partes = Array.from(modal.querySelectorAll<HTMLElement>(
    ".factura-datos, .factura-items tbody tr, .factura-total, .factura-nota p span, .factura-autorizacion"
  ));
  const tabla = modal.querySelector<HTMLTableElement>(".factura-items")!;
  const venta = tabla.closest("section")!;
  const total = modal.querySelector<HTMLElement>(".factura-total")!;
  const seccionNota = nota?.closest("section");
  let paginas: HTMLElement[][] = [];
  let pagina = 0;

  function mostrar(partesVisibles: HTMLElement[]): void {
    const visibles = new Set(partesVisibles);
    partes.forEach(parte => { parte.hidden = !visibles.has(parte); });
    tabla.hidden = !tabla.querySelector("tbody tr:not([hidden])");
    venta.hidden = tabla.hidden && total.hidden;
    if (seccionNota) seccionNota.hidden = !nota?.querySelector("span:not([hidden])");
  }

  function irA(indice: number): void {
    pagina = Math.max(0, Math.min(indice, paginas.length - 1));
    mostrar(paginas[pagina]);
    anterior.disabled = pagina === 0;
    siguiente.disabled = pagina === paginas.length - 1;
    indicador.textContent = (pagina + 1) + " de " + paginas.length;
  }

  function distribuir(): void {
    nav.hidden = true;
    mostrar(partes);
    paginas = [partes];
    if (modal.scrollHeight > modal.clientHeight) {
      nav.hidden = false;
      paginas = [];
      let grupo: HTMLElement[] = [];
      for (const parte of partes) {
        mostrar([...grupo, parte]);
        if (grupo.length && modal.scrollHeight > modal.clientHeight) {
          paginas.push(grupo);
          grupo = [];
        }
        grupo.push(parte);
      }
      paginas.push(grupo);
    }
    irA(pagina);
  }

  const eventos = new AbortController();
  const opciones = { signal: eventos.signal };
  anterior.addEventListener("click", () => irA(pagina - 1), opciones);
  siguiente.addEventListener("click", () => irA(pagina + 1), opciones);
  window.addEventListener("resize", distribuir, opciones);
  modal.addEventListener("close", () => eventos.abort(), { once: true });
  distribuir();
}
