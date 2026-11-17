package com.facturaarca;

import com.facturaarca.model.Articulo;
import com.facturaarca.model.AuditoriaApp;
import com.facturaarca.model.Cliente;
import com.facturaarca.model.CondicionIva;
import com.facturaarca.model.Contacto;
import com.facturaarca.model.Domicilio;
import com.facturaarca.model.ListaPrecio;
import com.facturaarca.model.ListaPrecioArticulo;
import com.facturaarca.model.Marca;
import com.facturaarca.model.PuntoVenta;
import com.facturaarca.model.Rubro;
import com.facturaarca.model.TipoMoneda;
import com.facturaarca.model.Usuario;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import java.util.Date;

public class CargaDatosJpql {

    private static final String USUARIO_MARCADOR = "admin_jpql";

    public static void main(String[] args) {
        ConfigurableApplicationContext context = new SpringApplicationBuilder(FacturaArcaApplication.class)
                .web(WebApplicationType.NONE)
                .run(args);
        EntityManagerFactory emf = context.getBean(EntityManagerFactory.class);
        EntityManager em = emf.createEntityManager();

        try {
            if (hayDatos(em)) {
                System.out.println("Los datos de ejemplo para JPQL ya se encuentran cargados.");
                return;
            }

            em.getTransaction().begin();
            cargar(em);
            em.getTransaction().commit();

            System.out.println("Datos de ejemplo para las consultas JPQL cargados correctamente.");
        } catch (Exception e) {
            if (em.getTransaction().isActive()) {
                em.getTransaction().rollback();
            }
            e.printStackTrace();
        } finally {
            em.close();
            context.close();
        }
    }

    public static boolean hayDatos(EntityManager em) {
        Long cantidad = em.createQuery(
                        "SELECT COUNT(u) FROM Usuario u WHERE u.usuario = :usuario",
                        Long.class
                )
                .setParameter("usuario", USUARIO_MARCADOR)
                .getSingleResult();

        return cantidad > 0;
    }

    private static void cargar(EntityManager em) {
        Usuario administrador = crearUsuario(em, USUARIO_MARCADOR, "Ana", "Gómez");
        crearUsuario(em, "operador_jpql", "Bruno", "Pérez");

        crearCliente(
                em,
                administrador,
                "20-30111222-3",
                "Comercial Andina",
                "andina@ejemplo.com",
                "San Martín",
                "120"
        );
        crearCliente(
                em,
                administrador,
                "27-30222333-4",
                "Cliente General",
                "general@ejemplo.com",
                "Las Heras",
                "455"
        );

        crearTipoMoneda(em, administrador, "PES", "Peso Argentino", "$");
        crearCondicionIva(
                em, administrador, 1, "IVA Responsable Inscripto"
        );

        crearPuntoVenta(em, administrador, 1, "Casa Central JPQL");
        crearPuntoVenta(em, administrador, 2, "Sucursal Norte JPQL");

        Rubro electronica = crearRubro(em, administrador, 1, "Electrónica");
        Rubro hogar = crearRubro(em, administrador, 2, "Hogar");

        Marca logitech = crearMarca(em, administrador, 1, "Logitech");
        Marca sony = crearMarca(em, administrador, 2, "Sony");
        Marca sinVentas = crearMarca(em, administrador, 3, "Marca sin ventas");

        Articulo mouse = crearArticulo(em, administrador, electronica, logitech, "ART-J01", "Mouse Logitech");
        Articulo teclado = crearArticulo(em, administrador, electronica, logitech, "ART-J02", "Teclado Logitech");
        Articulo auriculares = crearArticulo(em, administrador, electronica, sony, "ART-J03", "Auriculares Sony");
        Articulo lampara = crearArticulo(em, administrador, hogar, null, "ART-J04", "Lámpara LED");
        Articulo articuloSinVentas = crearArticulo(em, administrador, hogar, sinVentas, "ART-J05", "Artículo sin ventas");

        ListaPrecio listaGeneral = crearListaPrecio(em, administrador, "LP-JPQL", "Mayorista");
        crearPrecio(em, administrador, listaGeneral, mouse, 30000);
        crearPrecio(em, administrador, listaGeneral, teclado, 5000);
        crearPrecio(em, administrador, listaGeneral, auriculares, 18000);
        crearPrecio(em, administrador, listaGeneral, lampara, 7000);
        crearPrecio(em, administrador, listaGeneral, articuloSinVentas, 9000);

        // Los maestros quedan disponibles para las consultas y el formulario.
        // Las facturas se crean únicamente desde el sistema para no mezclar datos ficticios.
    }

    private static Usuario crearUsuario(EntityManager em, String usuario, String nombre, String apellido) {
        Usuario entidad = new Usuario();
        entidad.setUsuario(usuario);
        entidad.setClave("1234");
        entidad.setNombre(nombre);
        entidad.setApellido(apellido);
        em.persist(entidad);
        return entidad;
    }

    private static Cliente crearCliente(EntityManager em, Usuario usuario, String cuitCuil, String denominacion,
                                        String email, String calle, String numero) {
        Contacto contacto = new Contacto();
        contacto.setEmail(email);
        contacto.setTelefono("2615550000");
        contacto.setCelular("2615550001");
        em.persist(contacto);

        Domicilio domicilio = new Domicilio();
        domicilio.setNombreCalle(calle);
        domicilio.setNumeroCalle(numero);
        em.persist(domicilio);

        Cliente cliente = new Cliente();
        cliente.setCuitCuil(cuitCuil);
        cliente.setDenominacion(denominacion);
        cliente.setContacto(contacto);
        cliente.setDomicilio(domicilio);
        completarAuditoria(cliente, usuario);
        em.persist(cliente);
        return cliente;
    }

    private static TipoMoneda crearTipoMoneda(EntityManager em, Usuario usuario, String codigo, String denominacion,
                                               String simbolo) {
        TipoMoneda moneda = new TipoMoneda();
        moneda.setCodigoAfip(codigo);
        moneda.setDenominacion(denominacion);
        moneda.setSimbolo(simbolo);
        completarAuditoria(moneda, usuario);
        em.persist(moneda);
        return moneda;
    }

    private static CondicionIva crearCondicionIva(EntityManager em, Usuario usuario, int codigo, String denominacion) {
        CondicionIva condicionIva = new CondicionIva();
        condicionIva.setCodigoAfip(codigo);
        condicionIva.setDenominacion(denominacion);
        completarAuditoria(condicionIva, usuario);
        em.persist(condicionIva);
        return condicionIva;
    }

    private static PuntoVenta crearPuntoVenta(EntityManager em, Usuario usuario, int numero, String descripcion) {
        PuntoVenta puntoVenta = new PuntoVenta();
        puntoVenta.setNumero(numero);
        puntoVenta.setDescripcion(descripcion);
        puntoVenta.setTipoEmision("Electrónica");
        puntoVenta.setDomicilioComercial("Mendoza");
        completarAuditoria(puntoVenta, usuario);
        em.persist(puntoVenta);
        return puntoVenta;
    }

    private static Rubro crearRubro(EntityManager em, Usuario usuario, int codigo, String denominacion) {
        Rubro rubro = new Rubro();
        rubro.setCodigo(codigo);
        rubro.setDenominacion(denominacion);
        completarAuditoria(rubro, usuario);
        em.persist(rubro);
        return rubro;
    }

    private static Marca crearMarca(EntityManager em, Usuario usuario, int codigo, String denominacion) {
        Marca marca = new Marca();
        marca.setCodigo(codigo);
        marca.setDenominacion(denominacion);
        completarAuditoria(marca, usuario);
        em.persist(marca);
        return marca;
    }

    private static Articulo crearArticulo(EntityManager em, Usuario usuario, Rubro rubro, Marca marca,
                                          String codigo, String denominacion) {
        Articulo articulo = new Articulo();
        articulo.setRubro(rubro);
        articulo.setMarca(marca);
        articulo.setCodigo(codigo);
        articulo.setDenominacion(denominacion);
        completarAuditoria(articulo, usuario);
        em.persist(articulo);
        return articulo;
    }

    private static ListaPrecio crearListaPrecio(EntityManager em, Usuario usuario, String codigo, String denominacion) {
        ListaPrecio listaPrecio = new ListaPrecio();
        listaPrecio.setCodigo(codigo);
        listaPrecio.setDenominacion(denominacion);
        completarAuditoria(listaPrecio, usuario);
        em.persist(listaPrecio);
        return listaPrecio;
    }

    private static ListaPrecioArticulo crearPrecio(EntityManager em, Usuario usuario, ListaPrecio listaPrecio,
                                                    Articulo articulo, double precioVenta) {
        ListaPrecioArticulo precio = new ListaPrecioArticulo();
        precio.setListaPrecio(listaPrecio);
        precio.setArticulo(articulo);
        precio.setPrecioVenta(precioVenta);
        completarAuditoria(precio, usuario);
        em.persist(precio);
        return precio;
    }

    private static void completarAuditoria(AuditoriaApp entidad, Usuario usuario) {
        Date ahora = new Date();
        entidad.setFechaAlta(ahora);
        entidad.setFechaModificacion(ahora);
        entidad.setUsuarioCarga(usuario);
        entidad.setUsuarioModificacion(usuario);
    }

}
