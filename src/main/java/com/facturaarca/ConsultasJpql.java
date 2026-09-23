package com.facturaarca;

import com.facturaarca.model.Articulo;
import com.facturaarca.model.Cliente;
import com.facturaarca.model.FacturaVenta;
import com.facturaarca.model.FacturaVentaDetalle;
import com.facturaarca.model.Marca;
import com.facturaarca.model.PuntoVenta;

import javax.persistence.EntityManager;
import javax.persistence.EntityManagerFactory;
import javax.persistence.Persistence;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Calendar;
import java.util.Date;
import java.util.List;

public class ConsultasJpql {

    private static final SimpleDateFormat FORMATO_FECHA = new SimpleDateFormat("dd/MM/yyyy");

    public static void main(String[] args) {
        EntityManagerFactory emf = Persistence.createEntityManagerFactory("FacturacionPU");
        EntityManager em = emf.createEntityManager();

        try {
            if (!CargaDatosJpql.hayDatos(em)) {
                System.out.println("Primero ejecutá CargaDatosJpql para disponer de datos de ejemplo.");
                return;
            }

            consulta1FacturasCompletas(em);
            consulta2ProyeccionFactura(em);
            consulta3ArticulosPorRubro(em);
            consulta4FacturasPorFechas(em);
            consulta5FacturasEmitidasNoAnuladas(em);
            consulta6ClientesPorTextoOCuit(em);
            consulta7EstadosDistintos(em);
            consulta8ResumenFacturacion(em);
            consulta9PuntosDeVentaPorNumeros(em);
            consulta10FacturasPorUsuarioCarga(em);
            consulta11DetallesPorPuntoVenta(em);
            consulta12ArticulosYMarcas(em);
            consulta13FacturasPorMarca(em);
            consulta14FacturasSobreElPromedio(em);
            consulta15ResumenPorPuntoVenta(em);
            consulta16UsuariosConMuchasFacturas(em);
            consulta17VentasPorMarca(em);
            consulta18MarcasFacturadas(em);
            consulta19ArticulosSinVentas(em);
            consulta20CategoriaDeFacturas(em);
        } finally {
            em.close();
            emf.close();
        }
    }

    private static void consulta1FacturasCompletas(EntityManager em) {
        List<FacturaVenta> facturas = em.createQuery(
                        "SELECT f FROM FacturaVenta f ORDER BY f.numero",
                        FacturaVenta.class
                )
                .getResultList();

        titulo(1, "Facturas de venta completas");
        mostrarFacturas(facturas);
    }

    private static void consulta2ProyeccionFactura(EntityManager em) {
        List<Object[]> filas = em.createQuery(
                        "SELECT f.numero, f.fechaEmision, f.importeTotal "
                                + "FROM FacturaVenta f ORDER BY f.numero",
                        Object[].class
                )
                .getResultList();

        titulo(2, "Número, fecha de emisión e importe total");
        mostrarFilas(filas);
    }

    private static void consulta3ArticulosPorRubro(EntityManager em) {
        List<Articulo> articulos = em.createQuery(
                        "SELECT a FROM Articulo a "
                                + "WHERE a.rubro.denominacion = :denominacionRubro "
                                + "ORDER BY a.denominacion",
                        Articulo.class
                )
                .setParameter("denominacionRubro", "Electrónica")
                .getResultList();

        titulo(3, "Artículos del rubro Electrónica");
        articulos.forEach(articulo -> System.out.println(articulo.getCodigo() + " - " + articulo.getDenominacion()));
    }

    private static void consulta4FacturasPorFechas(EntityManager em) {
        List<FacturaVenta> facturas = em.createQuery(
                        "SELECT f FROM FacturaVenta f "
                                + "WHERE f.fechaEmision BETWEEN :desde AND :hasta "
                                + "ORDER BY f.fechaEmision",
                        FacturaVenta.class
                )
                .setParameter("desde", fecha(2026, Calendar.JANUARY, 1))
                .setParameter("hasta", fecha(2026, Calendar.JUNE, 30))
                .getResultList();

        titulo(4, "Facturas emitidas entre enero y junio de 2026");
        mostrarFacturas(facturas);
    }

    private static void consulta5FacturasEmitidasNoAnuladas(EntityManager em) {
        List<FacturaVenta> facturas = em.createQuery(
                        "SELECT f FROM FacturaVenta f "
                                + "WHERE f.estado = :estado "
                                + "AND f.importeTotal > :importeMinimo "
                                + "AND f.fechaAnulacion IS NULL "
                                + "ORDER BY f.importeTotal DESC",
                        FacturaVenta.class
                )
                .setParameter("estado", "EMITIDA")
                .setParameter("importeMinimo", 10000d)
                .getResultList();

        titulo(5, "Facturas emitidas, mayores a $10.000 y no anuladas");
        mostrarFacturas(facturas);
    }

    private static void consulta6ClientesPorTextoOCuit(EntityManager em) {
        List<Cliente> clientes = em.createQuery(
                        "SELECT c FROM Cliente c "
                                + "WHERE LOWER(c.denominacion) LIKE LOWER(CONCAT('%', :texto, '%')) "
                                + "OR c.cuitCuil LIKE :prefijoCuit "
                                + "ORDER BY c.denominacion",
                        Cliente.class
                )
                .setParameter("texto", "andina")
                .setParameter("prefijoCuit", "20-%")
                .getResultList();

        titulo(6, "Clientes por texto parcial o prefijo CUIT");
        clientes.forEach(cliente -> System.out.println(cliente.getDenominacion() + " - " + cliente.getCuitCuil()));
    }

    private static void consulta7EstadosDistintos(EntityManager em) {
        List<String> estados = em.createQuery(
                        "SELECT DISTINCT f.estado FROM FacturaVenta f ORDER BY f.estado ASC",
                        String.class
                )
                .getResultList();

        titulo(7, "Estados distintos de facturas");
        estados.forEach(System.out::println);
    }

    private static void consulta8ResumenFacturacion(EntityManager em) {
        Object[] resumen = em.createQuery(
                        "SELECT COUNT(f), SUM(f.importeTotal), AVG(f.importeTotal) FROM FacturaVenta f",
                        Object[].class
                )
                .getSingleResult();

        titulo(8, "Cantidad, suma y promedio de facturas");
        mostrarFila(resumen);
    }

    private static void consulta9PuntosDeVentaPorNumeros(EntityManager em) {
        List<PuntoVenta> puntosDeVenta = em.createQuery(
                        "SELECT p FROM PuntoVenta p WHERE p.numero IN :numeros ORDER BY p.numero",
                        PuntoVenta.class
                )
                .setParameter("numeros", Arrays.asList(1, 2, 5))
                .getResultList();

        titulo(9, "Puntos de venta 1, 2 y 5");
        puntosDeVenta.forEach(punto -> System.out.println(punto.getNumero() + " - " + punto.getDescripcion()));
    }

    private static void consulta10FacturasPorUsuarioCarga(EntityManager em) {
        List<FacturaVenta> facturas = em.createQuery(
                        "SELECT f FROM FacturaVenta f "
                                + "WHERE f.usuarioCarga.usuario = :usuario "
                                + "ORDER BY f.numero",
                        FacturaVenta.class
                )
                .setParameter("usuario", "admin_jpql")
                .getResultList();

        titulo(10, "Facturas creadas por admin_jpql");
        mostrarFacturas(facturas);
    }

    private static void consulta11DetallesPorPuntoVenta(EntityManager em) {
        List<FacturaVentaDetalle> detalles = em.createQuery(
                        "SELECT d FROM FacturaVentaDetalle d "
                                + "JOIN d.factura f "
                                + "WHERE f.puntoVenta.numero = :numeroPuntoVenta "
                                + "ORDER BY f.numero",
                        FacturaVentaDetalle.class
                )
                .setParameter("numeroPuntoVenta", 1)
                .getResultList();

        titulo(11, "Detalles de facturas del punto de venta 1");
        detalles.forEach(detalle -> System.out.println(
                "Factura " + detalle.getFactura().getNumero() + " - " + detalle.getDescripcion()
                        + " - cantidad: " + detalle.getCantidad()
        ));
    }

    private static void consulta12ArticulosYMarcas(EntityManager em) {
        List<Object[]> filas = em.createQuery(
                        "SELECT a.denominacion, m.denominacion "
                                + "FROM Articulo a LEFT JOIN a.marca m "
                                + "ORDER BY a.denominacion",
                        Object[].class
                )
                .getResultList();

        titulo(12, "Artículos y su marca, incluyendo artículos sin marca");
        mostrarFilas(filas);
    }

    private static void consulta13FacturasPorMarca(EntityManager em) {
        List<FacturaVenta> facturas = em.createQuery(
                        "SELECT DISTINCT f FROM FacturaVenta f "
                                + "JOIN f.detalles d "
                                + "JOIN d.listaPrecioArticulo lpa "
                                + "JOIN lpa.articulo a "
                                + "JOIN a.marca m "
                                + "WHERE m.denominacion = :denominacionMarca "
                                + "ORDER BY f.numero",
                        FacturaVenta.class
                )
                .setParameter("denominacionMarca", "Logitech")
                .getResultList();

        titulo(13, "Facturas con artículos de la marca Logitech");
        mostrarFacturas(facturas);
    }

    private static void consulta14FacturasSobreElPromedio(EntityManager em) {
        List<FacturaVenta> facturas = em.createQuery(
                        "SELECT f FROM FacturaVenta f "
                                + "WHERE f.importeTotal > (SELECT AVG(f2.importeTotal) FROM FacturaVenta f2) "
                                + "ORDER BY f.importeTotal DESC",
                        FacturaVenta.class
                )
                .getResultList();

        titulo(14, "Facturas con importe mayor al promedio");
        mostrarFacturas(facturas);
    }

    private static void consulta15ResumenPorPuntoVenta(EntityManager em) {
        List<Object[]> filas = em.createQuery(
                        "SELECT p.descripcion, COUNT(f), SUM(f.importeTotal) "
                                + "FROM FacturaVenta f JOIN f.puntoVenta p "
                                + "GROUP BY p.id, p.descripcion "
                                + "ORDER BY p.descripcion",
                        Object[].class
                )
                .getResultList();

        titulo(15, "Cantidad de facturas e importe total por punto de venta");
        mostrarFilas(filas);
    }

    private static void consulta16UsuariosConMuchasFacturas(EntityManager em) {
        List<String> usuarios = em.createQuery(
                        "SELECT u.nombre FROM FacturaVenta f JOIN f.usuarioCarga u "
                                + "GROUP BY u.id, u.nombre "
                                + "HAVING COUNT(f) > :minimoFacturas "
                                + "ORDER BY u.nombre",
                        String.class
                )
                .setParameter("minimoFacturas", 5L)
                .getResultList();

        titulo(16, "Usuarios que registraron más de cinco facturas");
        usuarios.forEach(System.out::println);
    }

    private static void consulta17VentasPorMarca(EntityManager em) {
        List<Object[]> filas = em.createQuery(
                        "SELECT m.denominacion, SUM(d.cantidad), SUM(d.importeSubtotal) "
                                + "FROM FacturaVentaDetalle d "
                                + "JOIN d.listaPrecioArticulo lpa "
                                + "JOIN lpa.articulo a "
                                + "JOIN a.marca m "
                                + "GROUP BY m.id, m.denominacion "
                                + "ORDER BY m.denominacion",
                        Object[].class
                )
                .getResultList();

        titulo(17, "Unidades vendidas y subtotal acumulado por marca");
        mostrarFilas(filas);
    }

    private static void consulta18MarcasFacturadas(EntityManager em) {
        List<Marca> marcas = em.createQuery(
                        "SELECT m FROM Marca m "
                                + "WHERE EXISTS ("
                                + "SELECT d FROM FacturaVentaDetalle d "
                                + "WHERE d.listaPrecioArticulo.articulo.marca = m"
                                + ") "
                                + "ORDER BY m.denominacion",
                        Marca.class
                )
                .getResultList();

        titulo(18, "Marcas con al menos un artículo facturado");
        marcas.forEach(marca -> System.out.println(marca.getDenominacion()));
    }

    private static void consulta19ArticulosSinVentas(EntityManager em) {
        List<Articulo> articulos = em.createQuery(
                        "SELECT a FROM Articulo a "
                                + "WHERE NOT EXISTS ("
                                + "SELECT d FROM FacturaVentaDetalle d "
                                + "WHERE d.listaPrecioArticulo.articulo = a"
                                + ") "
                                + "ORDER BY a.denominacion",
                        Articulo.class
                )
                .getResultList();

        titulo(19, "Artículos que nunca se facturaron");
        articulos.forEach(articulo -> System.out.println(articulo.getCodigo() + " - " + articulo.getDenominacion()));
    }

    private static void consulta20CategoriaDeFacturas(EntityManager em) {
        List<Object[]> filas = em.createQuery(
                        "SELECT f.numero, f.importeTotal, "
                                + "CASE "
                                + "WHEN f.importeTotal > :limiteAlto THEN 'ALTO VALOR' "
                                + "WHEN f.importeTotal >= :limiteMedio THEN 'MEDIO VALOR' "
                                + "ELSE 'BAJO VALOR' "
                                + "END "
                                + "FROM FacturaVenta f "
                                + "ORDER BY f.importeTotal DESC",
                        Object[].class
                )
                .setParameter("limiteAlto", 50000d)
                .setParameter("limiteMedio", 10000d)
                .getResultList();

        titulo(20, "Categoría calculada de cada factura");
        mostrarFilas(filas);
    }

    private static void mostrarFacturas(List<FacturaVenta> facturas) {
        facturas.forEach(factura -> System.out.println(
                "Factura " + factura.getNumero()
                        + " | " + FORMATO_FECHA.format(factura.getFechaEmision())
                        + " | $" + factura.getImporteTotal()
                        + " | " + factura.getEstado()
        ));
    }

    private static void mostrarFilas(List<Object[]> filas) {
        filas.forEach(ConsultasJpql::mostrarFila);
    }

    private static void mostrarFila(Object[] fila) {
        System.out.println(Arrays.toString(fila));
    }

    private static void titulo(int numero, String descripcion) {
        System.out.println();
        System.out.println("CONSULTA " + numero + ": " + descripcion);
    }

    private static Date fecha(int anio, int mes, int dia) {
        Calendar calendario = Calendar.getInstance();
        calendario.clear();
        calendario.set(anio, mes, dia, 0, 0, 0);
        return calendario.getTime();
    }
}
