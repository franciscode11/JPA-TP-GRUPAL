package com.facturaarca.service;

import com.facturaarca.dto.CatalogosDTO;
import com.facturaarca.repository.ClienteRepository;
import com.facturaarca.repository.CondicionIvaRepository;
import com.facturaarca.repository.ListaPrecioArticuloRepository;
import com.facturaarca.repository.PuntoVentaRepository;
import com.facturaarca.repository.TipoMonedaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.function.Function;

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
        List<CatalogosDTO.OpcionCatalogoDTO> clientes = unicos(
                clienteRepository.findAllByOrderByDenominacionAsc().stream()
                        .filter(cliente -> !normalizar(cliente.getDenominacion()).contains("prueba"))
                        .map(cliente -> new CatalogosDTO.OpcionCatalogoDTO(
                                cliente.getId(), cliente.getDenominacion().trim()
                        ))
                        .toList(),
                opcion -> normalizar(opcion.nombre())
        );

        List<CatalogosDTO.OpcionCatalogoDTO> condiciones = unicos(
                condicionIvaRepository.findAllByOrderByDenominacionAsc().stream()
                        .map(condicion -> new CatalogosDTO.OpcionCatalogoDTO(
                                condicion.getId(), condicion.getDenominacion().trim()
                        ))
                        .toList(),
                opcion -> normalizar(opcion.nombre())
        );

        List<CatalogosDTO.OpcionCatalogoDTO> puntosVenta = unicos(
                puntoVentaRepository.findAllByOrderByNumeroAsc().stream()
                        .map(punto -> new CatalogosDTO.OpcionCatalogoDTO(
                                punto.getId(),
                                punto.getNumero() + " - " + limpiarSufijoCarga(punto.getDescripcion())
                        ))
                        .toList(),
                opcion -> normalizar(opcion.nombre()).replaceFirst("\\s*-.*$", "")
        );

        List<CatalogosDTO.OpcionCatalogoDTO> monedas = unicos(
                tipoMonedaRepository.findAllByOrderByDenominacionAsc().stream()
                        .map(moneda -> new CatalogosDTO.OpcionCatalogoDTO(
                                moneda.getId(),
                                moneda.getDenominacion().trim() + " (" + moneda.getSimbolo().trim() + ")"
                        ))
                        .toList(),
                opcion -> normalizar(opcion.nombre())
        );

        List<CatalogosDTO.ArticuloCatalogoDTO> articulos = unicos(
                listaPrecioArticuloRepository.findAllByOrderByArticuloDenominacionAsc().stream()
                        .filter(precio -> !normalizar(precio.getArticulo().getDenominacion()).contains("sin ventas"))
                        .map(precio -> new CatalogosDTO.ArticuloCatalogoDTO(
                                precio.getArticulo().getId(),
                                precio.getArticulo().getCodigo().trim(),
                                precio.getArticulo().getDenominacion().trim(),
                                precio.getPrecioVenta()
                        ))
                        .toList(),
                articulo -> normalizar(articulo.codigo())
        );

        return new CatalogosDTO(clientes, condiciones, puntosVenta, monedas, articulos);
    }

    private static String limpiarSufijoCarga(String texto) {
        return texto == null ? "" : texto.replaceFirst("(?i)\\s+JPQL$", "").trim();
    }

    private static String normalizar(String texto) {
        return texto == null ? "" : texto.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    private static <T> List<T> unicos(List<T> elementos, Function<T, String> clave) {
        LinkedHashMap<String, T> unicos = new LinkedHashMap<>();
        elementos.forEach(elemento -> unicos.putIfAbsent(clave.apply(elemento), elemento));
        return List.copyOf(unicos.values());
    }
}
