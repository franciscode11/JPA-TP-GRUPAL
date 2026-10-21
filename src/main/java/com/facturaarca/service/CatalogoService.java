package com.facturaarca.service;

import com.facturaarca.dto.CatalogosDTO;
import com.facturaarca.repository.ClienteRepository;
import com.facturaarca.repository.CondicionIvaRepository;
import com.facturaarca.repository.ListaPrecioArticuloRepository;
import com.facturaarca.repository.PuntoVentaRepository;
import com.facturaarca.repository.TipoMonedaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CatalogoService {

    private final ClienteRepository clienteRepository;
    private final CondicionIvaRepository condicionIvaRepository;
    private final PuntoVentaRepository puntoVentaRepository;
    private final TipoMonedaRepository tipoMonedaRepository;
    private final ListaPrecioArticuloRepository listaPrecioArticuloRepository;

    public CatalogoService(
            ClienteRepository clienteRepository,
            CondicionIvaRepository condicionIvaRepository,
            PuntoVentaRepository puntoVentaRepository,
            TipoMonedaRepository tipoMonedaRepository,
            ListaPrecioArticuloRepository listaPrecioArticuloRepository
    ) {
        this.clienteRepository = clienteRepository;
        this.condicionIvaRepository = condicionIvaRepository;
        this.puntoVentaRepository = puntoVentaRepository;
        this.tipoMonedaRepository = tipoMonedaRepository;
        this.listaPrecioArticuloRepository = listaPrecioArticuloRepository;
    }

    @Transactional(readOnly = true)
    public CatalogosDTO obtenerCatalogos() {
        return new CatalogosDTO(
                clienteRepository.findAllByOrderByDenominacionAsc().stream()
                        .map(cliente -> new CatalogosDTO.OpcionCatalogoDTO(
                                cliente.getId(), cliente.getDenominacion()
                        ))
                        .toList(),
                condicionIvaRepository.findAllByOrderByDenominacionAsc().stream()
                        .map(condicion -> new CatalogosDTO.OpcionCatalogoDTO(
                                condicion.getId(), condicion.getDenominacion()
                        ))
                        .toList(),
                puntoVentaRepository.findAllByOrderByNumeroAsc().stream()
                        .map(punto -> new CatalogosDTO.OpcionCatalogoDTO(
                                punto.getId(), punto.getNumero() + " - " + punto.getDescripcion()
                        ))
                        .toList(),
                tipoMonedaRepository.findAllByOrderByDenominacionAsc().stream()
                        .map(moneda -> new CatalogosDTO.OpcionCatalogoDTO(
                                moneda.getId(), moneda.getDenominacion() + " (" + moneda.getSimbolo() + ")"
                        ))
                        .toList(),
                listaPrecioArticuloRepository.findAllByOrderByArticuloDenominacionAsc().stream()
                        .map(precio -> new CatalogosDTO.ArticuloCatalogoDTO(
                                precio.getArticulo().getId(),
                                precio.getArticulo().getCodigo(),
                                precio.getArticulo().getDenominacion(),
                                precio.getPrecioVenta()
                        ))
                        .toList()
        );
    }
}
