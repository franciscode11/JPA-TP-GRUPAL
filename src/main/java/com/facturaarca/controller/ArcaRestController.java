package com.facturaarca.controller;

import com.facturaarca.arca.ArcaEstadoDTO;
import com.facturaarca.arca.ArcaHomologacionClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/arca")
public class ArcaRestController {

    private final ArcaHomologacionClient arcaClient;

    public ArcaRestController(ArcaHomologacionClient arcaClient) {
        this.arcaClient = arcaClient;
    }

    @GetMapping("/estado")
    public ArcaEstadoDTO estado() {
        return arcaClient.estado();
    }
}
