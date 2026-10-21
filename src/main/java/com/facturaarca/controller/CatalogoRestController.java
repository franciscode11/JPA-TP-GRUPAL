package com.facturaarca.controller;

import com.facturaarca.dto.CatalogosDTO;
import com.facturaarca.service.CatalogoService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
