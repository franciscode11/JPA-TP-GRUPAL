package com.facturaarca;

import com.facturaarca.model.*;

import javax.persistence.EntityManager;
import javax.persistence.EntityManagerFactory;
import javax.persistence.Persistence;

import java.util.Date;

public class CargaDatosIniciales {

    public static void main(String[] args) {

        EntityManagerFactory emf =
                Persistence.createEntityManagerFactory("FacturacionPU");

        EntityManager em = emf.createEntityManager();

        try {

            // Iniciamos la transacción
            em.getTransaction().begin();

            // ==================================================
            // 1. USUARIO
            // ==================================================

            Usuario usuario = new Usuario();

            usuario.setUsuario("admin");
            usuario.setClave("1234");
            usuario.setNombre("Francisco");
            usuario.setApellido("Administrador");

            em.persist(usuario);

            // ==================================================
            // 2. CONTACTO Y DOMICILIO DEL CLIENTE
            // ==================================================

            Contacto contacto = new Contacto();
            contacto.setEmail("cliente@ejemplo.com");
            contacto.setTelefono("2615555555");
            contacto.setCelular("2616666666");
            em.persist(contacto);

            Domicilio domicilio = new Domicilio();
            domicilio.setNombreCalle("San Martín");
            domicilio.setNumeroCalle("123");
            em.persist(domicilio);

            // ==================================================
            // 3. CLIENTE
            // ==================================================

            Cliente cliente = new Cliente();
            cliente.setCuitCuil("20-12345678-9");
            cliente.setDenominacion("Cliente de prueba");
            cliente.setContacto(contacto);
            cliente.setDomicilio(domicilio);
            completarAuditoria(cliente, usuario);
            em.persist(cliente);

            // ==================================================
            // 4. TIPO DE MONEDA
            // ==================================================

            TipoMoneda tipoMoneda = new TipoMoneda();
            tipoMoneda.setCodigoAfip("PES");
            tipoMoneda.setDenominacion("Peso Argentino");
            tipoMoneda.setSimbolo("$");
            completarAuditoria(tipoMoneda, usuario);
            em.persist(tipoMoneda);

            // ==================================================
            // 5. PUNTO DE VENTA
            // ==================================================

            PuntoVenta puntoVenta = new PuntoVenta();

            puntoVenta.setNumero(1);
            puntoVenta.setDescripcion("Casa Central");
            puntoVenta.setTipoEmision("Electronica");
            puntoVenta.setDomicilioComercial("Mendoza");

            completarAuditoria(puntoVenta, usuario);

            em.persist(puntoVenta);

            // ==================================================
            // 6. RUBRO
            // ==================================================

            Rubro rubro = new Rubro();

            rubro.setCodigo(1);
            rubro.setDenominacion("Tecnologia");

            completarAuditoria(rubro, usuario);

            em.persist(rubro);

            // ==================================================
            // 7. MARCA
            // ==================================================

            Marca marca = new Marca();

            marca.setCodigo(1);
            marca.setDenominacion("Logitech");

            completarAuditoria(marca, usuario);

            em.persist(marca);

            // ==================================================
            // 8. ARTICULO
            // ==================================================

            Articulo articulo = new Articulo();

            articulo.setCodigo("ART001");
            articulo.setDenominacion("Mouse Logitech");
            articulo.setRubro(rubro);
            articulo.setMarca(marca);

            completarAuditoria(articulo, usuario);

            em.persist(articulo);

            // ==================================================
            // 9. LISTA DE PRECIOS
            // ==================================================

            ListaPrecio listaPrecio = new ListaPrecio();

            listaPrecio.setCodigo("LP001");
            listaPrecio.setDenominacion("Lista General");

            completarAuditoria(listaPrecio, usuario);

            em.persist(listaPrecio);

            // ==================================================
            // 10. RELACIÓN LISTA - ARTICULO
            // ==================================================

            ListaPrecioArticulo listaPrecioArticulo =
                    new ListaPrecioArticulo();

            listaPrecioArticulo.setListaPrecio(listaPrecio);
            listaPrecioArticulo.setArticulo(articulo);
            listaPrecioArticulo.setPrecioVenta(15000);

            completarAuditoria(listaPrecioArticulo, usuario);

            em.persist(listaPrecioArticulo);

            // Confirmamos todo en la base
            em.getTransaction().commit();

            System.out.println("=====================================");
            System.out.println("DATOS INICIALES CARGADOS");
            System.out.println("=====================================");

            System.out.println(
                    "Usuario ID: " + usuario.getId()
            );

            System.out.println(
                    "PuntoVenta ID: " + puntoVenta.getId()
            );

            System.out.println(
                    "ListaPrecioArticulo ID: "
                            + listaPrecioArticulo.getId()
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

    private static void completarAuditoria(
            AuditoriaApp entidad,
            Usuario usuario
    ) {

        Date ahora = new Date();

        entidad.setFechaAlta(ahora);
        entidad.setFechaModificacion(ahora);

        entidad.setUsuarioCarga(usuario);
        entidad.setUsuarioModificacion(usuario);
    }
}
