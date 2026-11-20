package com.facturaarca.service;

import com.facturaarca.dto.CatalogosDTO;
import com.facturaarca.dto.PaginaDTO;
import com.facturaarca.model.ListaPrecio;
import com.facturaarca.repository.ClienteRepository;
import com.facturaarca.repository.CondicionIvaRepository;
import com.facturaarca.repository.ListaPrecioArticuloRepository;
import com.facturaarca.repository.ListaPrecioRepository;
import com.facturaarca.repository.PuntoVentaRepository;
import com.facturaarca.repository.TipoMonedaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;

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
    private final ListaPrecioRepository listaPrecioRepository;

    public CatalogoService(
            ClienteRepository clienteRepository,
            CondicionIvaRepository condicionIvaRepository,
            PuntoVentaRepository puntoVentaRepository,
            TipoMonedaRepository tipoMonedaRepository,
            ListaPrecioArticuloRepository listaPrecioArticuloRepository,
            ListaPrecioRepository listaPrecioRepository
    ) {
        this.clienteRepository = clienteRepository;
        this.condicionIvaRepository = condicionIvaRepository;
        this.puntoVentaRepository = puntoVentaRepository;
        this.tipoMonedaRepository = tipoMonedaRepository;
        this.listaPrecioArticuloRepository = listaPrecioArticuloRepository;
        this.listaPrecioRepository = listaPrecioRepository;
    }

    @Transactional(readOnly = true)
    public CatalogosDTO obtenerCatalogos() {
        List<CatalogosDTO.OpcionCatalogoDTO> clientes = List.of();

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

        List<CatalogosDTO.OpcionCatalogoDTO> listasPrecio = unicos(
                listaPrecioRepository.findAllByOrderByDenominacionAsc().stream()
                        .map(lista -> new CatalogosDTO.OpcionCatalogoDTO(
                                lista.getId(), nombreListaPrecio(lista)
                        ))
                        .toList(),
                opcion -> normalizar(opcion.nombre())
        );

        return new CatalogosDTO(clientes, condiciones, puntosVenta, monedas, listasPrecio);
    }

    @Transactional(readOnly = true)
    public PaginaDTO<CatalogosDTO.OpcionCatalogoDTO> buscarClientes(String texto, int pagina, int tamanio) {
        LimitesEntrada.paginacion(pagina, tamanio, 50);
        LimitesEntrada.longitud(texto, 80, "La búsqueda");
        String busqueda = texto == null ? "" : texto.trim();
        if (busqueda.isBlank()) {
            return PaginaDTO.crear(List.of(), pagina, tamanio, 0);
        }
        var resultado = clienteRepository.buscarParaExplorador(
                busqueda, org.springframework.data.domain.PageRequest.of(pagina, tamanio,
                        org.springframework.data.domain.Sort.by("denominacion").and(org.springframework.data.domain.Sort.by("id"))));
        return PaginaDTO.crear(resultado.getContent().stream().map(cliente ->
                new CatalogosDTO.OpcionCatalogoDTO(cliente.getId(), cliente.getDenominacion() + " · "
                        + (cliente.getNumeroDocumento() == null ? cliente.getCuitCuil() : cliente.getNumeroDocumento()),
                        cliente.getCondicionIva() == null ? null : cliente.getCondicionIva().getId())).toList(),
                pagina, tamanio, resultado.getTotalElements());
    }

    @Transactional(readOnly = true)
    public PaginaDTO<CatalogosDTO.ArticuloCatalogoDTO> buscarArticulos(
            Long listaPrecioId,
            String texto,
            int pagina,
            int tamanio,
            List<Long> excluidos
    ) {
        if (excluidos.size() > 50 || excluidos.contains(null)) {
            throw new IllegalArgumentException("Se admiten hasta 50 artículos excluidos válidos");
        }
        excluidos.forEach(LimitesEntrada::identificador);
        LimitesEntrada.identificador(listaPrecioId);
        LimitesEntrada.paginacion(pagina, tamanio, 50);
        LimitesEntrada.longitud(texto, 80, "La búsqueda");
        String busqueda = texto == null ? "" : texto.trim();
        var resultado = listaPrecioArticuloRepository.buscarParaExplorador(
                listaPrecioId,
                busqueda,
                excluidos.isEmpty() ? List.of(-1L) : excluidos,
                PageRequest.of(pagina, tamanio)
        );
        List<CatalogosDTO.ArticuloCatalogoDTO> contenido = resultado.getContent().stream()
                .map(precio -> new CatalogosDTO.ArticuloCatalogoDTO(
                        precio.getId(),
                        precio.getArticulo().getId(),
                        precio.getArticulo().getCodigo().trim(),
                        precio.getArticulo().getDenominacion().trim(),
                        nombreListaPrecio(precio.getListaPrecio()),
                        precio.getPrecioVenta()
                ))
                .toList();
        return PaginaDTO.crear(contenido, pagina, tamanio, resultado.getTotalElements());
    }

    private static String limpiarSufijoCarga(String texto) {
        return texto == null ? "" : texto.replaceFirst("(?i)\\s+JPQL$", "").trim();
    }

    private static String nombreListaPrecio(ListaPrecio lista) {
        String codigo = normalizar(lista.getCodigo());
        if (codigo.equals("lp001") || codigo.contains("minorista")) {
            return "Minorista";
        }
        if (codigo.equals("lp-jpql") || codigo.contains("mayorista")) {
            return "Mayorista";
        }
        return limpiarSufijoCarga(lista.getDenominacion());
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
