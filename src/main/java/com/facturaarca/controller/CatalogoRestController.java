package com.facturaarca.controller;

import com.facturaarca.dto.CatalogosDTO;
import com.facturaarca.dto.PaginaDTO;
import com.facturaarca.service.CatalogoService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequestMapping("/api/catalogos")
public class CatalogoRestController {

    private final CatalogoService catalogoService;

    public CatalogoRestController(CatalogoService catalogoService) {
        this.catalogoService = catalogoService;
    }

    @GetMapping
    public CatalogosDTO obtenerCatalogos() {
        return catalogoService.obtenerCatalogos();
    }

    @GetMapping("/articulos")
    public PaginaDTO<CatalogosDTO.ArticuloCatalogoDTO> buscarArticulos(
            @RequestParam(required = false) Long listaPrecioId,
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "8") int tamanio
    ) {
        return catalogoService.buscarArticulos(listaPrecioId, q, pagina, tamanio);
    }

    @GetMapping("/clientes")
    public PaginaDTO<CatalogosDTO.OpcionCatalogoDTO> buscarClientes(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "8") int tamanio) {
        return catalogoService.buscarClientes(q, pagina, tamanio);
    }
}
