package com.facturaarca;

import com.facturaarca.model.*;

import javax.persistence.EntityManager;
import javax.persistence.EntityManagerFactory;
import javax.persistence.Persistence;

import java.util.Date;

public class Main {

    public static void main(String[] args) {

        // ==================================================
        // 1. INICIAR JPA
        // ==================================================

        EntityManagerFactory emf =
                Persistence.createEntityManagerFactory(
                        "FacturacionPU"
                );

        EntityManager em =
                emf.createEntityManager();

        try {

            // ==================================================
            // 2. INICIAR TRANSACCIÓN
            // ==================================================

            em.getTransaction().begin();

            // ==================================================
            // 3. BUSCAR ENTIDADES QUE YA EXISTEN
            // ==================================================

            Usuario usuario =
                    em.find(
                            Usuario.class,
                            1L
                    );

            PuntoVenta puntoVenta =
                    em.find(
                            PuntoVenta.class,
                            1L
                    );

            ListaPrecioArticulo listaPrecioArticulo =
                    em.find(
                            ListaPrecioArticulo.class,
                            1L
                    );

            Cliente cliente =
                    em.find(
                            Cliente.class,
                            1L
                    );

            TipoMoneda tipoMoneda =
                    em.find(
                            TipoMoneda.class,
                            1L
                    );

            // Comprobamos que realmente existan

            if (usuario == null
                    || puntoVenta == null
                    || listaPrecioArticulo == null
                    || cliente == null
                    || tipoMoneda == null) {

                throw new RuntimeException(
                        "No existen los datos iniciales necesarios"
                );
            }

            // ==================================================
            // 4. CREAR FACTURA
            // ==================================================

            FacturaVenta facturaVenta =
                    new FacturaVenta();

            facturaVenta.setNumero(1L);

            facturaVenta.setFechaEmision(
                    new Date()
            );

            facturaVenta.setPuntoVenta(
                    puntoVenta
            );

            facturaVenta.setCliente(
                    cliente
            );

            facturaVenta.setTipoMoneda(
                    tipoMoneda
            );

            facturaVenta.setImporteCobrado(
                    30000
            );

            facturaVenta.setImporteSaldo(
                    0
            );

            facturaVenta.setImporteTotal(
                    30000
            );

            facturaVenta.setEstado(
                    "EMITIDA"
            );

            facturaVenta.setObservaciones(
                    "Factura de prueba JPA Hibernate"
            );

            // ==================================================
            // 5. AUDITORÍA DE LA FACTURA
            // ==================================================

            facturaVenta.setFechaAlta(
                    new Date()
            );

            facturaVenta.setFechaModificacion(
                    new Date()
            );

            facturaVenta.setUsuarioCarga(
                    usuario
            );

            facturaVenta.setUsuarioModificacion(
                    usuario
            );

            // ==================================================
            // 6. CREAR DETALLE 1
            // ==================================================

            FacturaVentaDetalle detalle1 =
                    new FacturaVentaDetalle();

            detalle1.setListaPrecioArticulo(
                    listaPrecioArticulo
            );

            detalle1.setDescripcion(
                    "Mouse Logitech"
            );

            detalle1.setCantidad(
                    1
            );

            detalle1.setPrecioUnitario(
                    15000
            );

            detalle1.setPorcentajeBonificacion(
                    0
            );

            detalle1.setImporteNeto(
                    15000
            );

            detalle1.setImporteIva(
                    0
            );

            detalle1.setImporteSubtotal(
                    15000
            );

            // ==================================================
            // 7. CREAR DETALLE 2
            // ==================================================

            FacturaVentaDetalle detalle2 =
                    new FacturaVentaDetalle();

            detalle2.setListaPrecioArticulo(
                    listaPrecioArticulo
            );

            detalle2.setDescripcion(
                    "Mouse Logitech"
            );

            detalle2.setCantidad(
                    1
            );

            detalle2.setPrecioUnitario(
                    15000
            );

            detalle2.setPorcentajeBonificacion(
                    0
            );

            detalle2.setImporteNeto(
                    15000
            );

            detalle2.setImporteIva(
                    0
            );

            detalle2.setImporteSubtotal(
                    15000
            );

            // ==================================================
            // 8. ASOCIACIÓN BIDIRECCIONAL
            // ==================================================

            facturaVenta.agregarDetalle(
                    detalle1
            );

            facturaVenta.agregarDetalle(
                    detalle2
            );

            // ==================================================
            // 9. PERSISTIR SOLO LA FACTURA
            // ==================================================

            em.persist(
                    facturaVenta
            );

            // ==================================================
            // 10. COMMIT
            // ==================================================

            em.getTransaction().commit();

            // ==================================================
            // 11. MOSTRAR RESULTADO
            // ==================================================

            System.out.println(
                    "====================================="
            );

            System.out.println(
                    "FACTURA GUARDADA CORRECTAMENTE"
            );

            System.out.println(
                    "Factura ID: "
                            + facturaVenta.getId()
            );

            System.out.println(
                    "Cantidad de detalles: "
                            + facturaVenta
                            .getDetalles()
                            .size()
            );

            System.out.println(
                    "====================================="
            );

        } catch (Exception e) {

            if (em.getTransaction().isActive()) {

                em.getTransaction().rollback();
            }

            e.printStackTrace();

        } finally {

            em.close();
            emf.close();
        }
    }
}
