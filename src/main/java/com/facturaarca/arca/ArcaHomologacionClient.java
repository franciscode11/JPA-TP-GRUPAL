package com.facturaarca.arca;

import com.facturaarca.model.FacturaVenta;
import org.bouncycastle.cert.jcajce.JcaCertStore;
import org.bouncycastle.cms.CMSProcessableByteArray;
import org.bouncycastle.cms.CMSSignedData;
import org.bouncycastle.cms.CMSSignedDataGenerator;
import org.bouncycastle.cms.jcajce.JcaSignerInfoGeneratorBuilder;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.openssl.PEMKeyPair;
import org.bouncycastle.openssl.PEMParser;
import org.bouncycastle.openssl.jcajce.JcaPEMKeyConverter;
import org.bouncycastle.operator.ContentSigner;
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder;
import org.bouncycastle.operator.jcajce.JcaDigestCalculatorProviderBuilder;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

import javax.xml.parsers.DocumentBuilderFactory;
import java.io.StringReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.PrivateKey;
import java.security.Security;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.Date;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

@Service
public class ArcaHomologacionClient {

    private static final String SERVICIO = "wsfe";
    private static final DateTimeFormatter FECHA_ARCA = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final String NAMESPACE_WSFE = "http://ar.gov.afip.dif.FEV1/";

    private final ArcaConfig config;
    private final HttpClient httpClient;
    private final AtomicReference<TicketAcceso> ticketCache = new AtomicReference<>();

    public ArcaHomologacionClient(ArcaConfig config) {
        this.config = config;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(15))
                .build();
        if (Security.getProvider("BC") == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
    }

    public ArcaEstadoDTO estado() {
        if (config.estaCompleta()) {
            return new ArcaEstadoDTO(true, "HOMOLOGACIÓN", "Credenciales listas para solicitar CAE de prueba");
        }
        return new ArcaEstadoDTO(
                false,
                "HOMOLOGACIÓN",
                "Configurá ARCA_CUIT, ARCA_PRIVATE_KEY_PATH y ARCA_CERTIFICATE_PATH para emitir"
        );
    }

    public ResultadoArca emitir(FacturaVenta factura) {
        exigirConfiguracion();
        try {
            TicketAcceso ticket = obtenerTicket();
            int puntoVenta = factura.getPuntoVenta().getNumero();
            int tipo = config.getComprobanteTipo();
            long numero = ultimoAutorizado(ticket, puntoVenta, tipo) + 1;
            return solicitarCae(ticket, factura, puntoVenta, tipo, numero);
        } catch (ArcaException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ArcaException("No se pudo completar la comunicación con ARCA en homologación", exception);
        }
    }

    private void exigirConfiguracion() {
        if (!config.estaCompleta()) {
            throw new IllegalStateException(estado().mensaje());
        }
        if (!config.getWsaaUrl().contains("homo") || !config.getWsfeUrl().contains("homo")) {
            throw new IllegalStateException("Este proyecto sólo permite endpoints de homologación");
        }
    }

    private TicketAcceso obtenerTicket() throws Exception {
        TicketAcceso cache = ticketCache.get();
        if (cache != null && cache.expira().isAfter(Instant.now().plusSeconds(300))) {
            return cache;
        }

        String tra = crearTra();
        String cms = firmarTra(tra);
        String respuesta = enviarSoap(config.getWsaaUrl(), "", sobreWsaa(cms));
        Document documento = parsearXml(respuesta);
        String token = texto(documento, "token");
        String sign = texto(documento, "sign");
        Instant expiracion = OffsetDateTime.parse(texto(documento, "expirationTime")).toInstant();
        TicketAcceso nuevo = new TicketAcceso(token, sign, expiracion);
        ticketCache.set(nuevo);
        return nuevo;
    }

    private String crearTra() {
        OffsetDateTime ahora = OffsetDateTime.now(ZoneOffset.UTC).withNano(0);
        return """
                <?xml version="1.0" encoding="UTF-8"?>
                <loginTicketRequest version="1.0">
                  <header>
                    <uniqueId>%d</uniqueId>
                    <generationTime>%s</generationTime>
                    <expirationTime>%s</expirationTime>
                  </header>
                  <service>%s</service>
                </loginTicketRequest>
                """.formatted(
                Instant.now().getEpochSecond(),
                ahora.minusMinutes(5),
                ahora.plusMinutes(10),
                SERVICIO
        );
    }

    private String firmarTra(String tra) throws Exception {
        PrivateKey clave = cargarClavePrivada();
        X509Certificate certificado = cargarCertificado();
        ContentSigner firmante = new JcaContentSignerBuilder("SHA256withRSA")
                .setProvider("BC")
                .build(clave);
        CMSSignedDataGenerator generador = new CMSSignedDataGenerator();
        generador.addSignerInfoGenerator(new JcaSignerInfoGeneratorBuilder(
                new JcaDigestCalculatorProviderBuilder().setProvider("BC").build()
        ).build(firmante, certificado));
        generador.addCertificates(new JcaCertStore(List.of(certificado)));
        CMSSignedData firmado = generador.generate(
                new CMSProcessableByteArray(tra.getBytes(StandardCharsets.UTF_8)),
                true
        );
        return Base64.getEncoder().encodeToString(firmado.getEncoded());
    }

    private PrivateKey cargarClavePrivada() throws Exception {
        try (PEMParser parser = new PEMParser(Files.newBufferedReader(Path.of(config.getPrivateKeyPath())))) {
            Object objeto = parser.readObject();
            JcaPEMKeyConverter conversor = new JcaPEMKeyConverter().setProvider("BC");
            if (objeto instanceof PEMKeyPair par) {
                return conversor.getKeyPair(par).getPrivate();
            }
            if (objeto instanceof org.bouncycastle.asn1.pkcs.PrivateKeyInfo info) {
                return conversor.getPrivateKey(info);
            }
            throw new ArcaException("La clave privada no tiene un formato PEM compatible");
        }
    }

    private X509Certificate cargarCertificado() throws Exception {
        try (var entrada = Files.newInputStream(Path.of(config.getCertificatePath()))) {
            return (X509Certificate) CertificateFactory.getInstance("X.509").generateCertificate(entrada);
        }
    }

    private long ultimoAutorizado(TicketAcceso ticket, int puntoVenta, int tipo) throws Exception {
        String cuerpo = """
                <ar:FECompUltimoAutorizado>
                  %s
                  <ar:PtoVta>%d</ar:PtoVta>
                  <ar:CbteTipo>%d</ar:CbteTipo>
                </ar:FECompUltimoAutorizado>
                """.formatted(auth(ticket), puntoVenta, tipo);
        String respuesta = enviarSoap(
                config.getWsfeUrl(),
                NAMESPACE_WSFE + "FECompUltimoAutorizado",
                sobreWsfe(cuerpo)
        );
        return Long.parseLong(texto(parsearXml(respuesta), "CbteNro"));
    }

    private ResultadoArca solicitarCae(
            TicketAcceso ticket,
            FacturaVenta factura,
            int puntoVenta,
            int tipo,
            long numero
    ) throws Exception {
        Importes importes = Importes.desde(factura.getImporteTotal(), tipo);
        String fecha = factura.getFechaEmision().toInstant()
                .atZone(java.time.ZoneId.systemDefault()).toLocalDate().format(FECHA_ARCA);
        String iva = importes.iva() == 0 ? "" : """
                <ar:Iva><ar:AlicIva><ar:Id>5</ar:Id><ar:BaseImp>%.2f</ar:BaseImp><ar:Importe>%.2f</ar:Importe></ar:AlicIva></ar:Iva>
                """.formatted(importes.neto(), importes.iva());
        String cuerpo = """
                <ar:FECAESolicitar>
                  %s
                  <ar:FeCAEReq>
                    <ar:FeCabReq><ar:CantReg>1</ar:CantReg><ar:PtoVta>%d</ar:PtoVta><ar:CbteTipo>%d</ar:CbteTipo></ar:FeCabReq>
                    <ar:FeDetReq><ar:FECAEDetRequest>
                      <ar:Concepto>1</ar:Concepto><ar:DocTipo>%d</ar:DocTipo><ar:DocNro>%d</ar:DocNro>
                      <ar:CbteDesde>%d</ar:CbteDesde><ar:CbteHasta>%d</ar:CbteHasta><ar:CbteFch>%s</ar:CbteFch>
                      <ar:ImpTotal>%.2f</ar:ImpTotal><ar:ImpTotConc>0.00</ar:ImpTotConc><ar:ImpNeto>%.2f</ar:ImpNeto>
                      <ar:ImpOpEx>0.00</ar:ImpOpEx><ar:ImpTrib>0.00</ar:ImpTrib><ar:ImpIVA>%.2f</ar:ImpIVA>
                      <ar:MonId>PES</ar:MonId><ar:MonCotiz>1.00</ar:MonCotiz>%s
                      <ar:CondicionIVAReceptorId>%d</ar:CondicionIVAReceptorId>
                    </ar:FECAEDetRequest></ar:FeDetReq>
                  </ar:FeCAEReq>
                </ar:FECAESolicitar>
                """.formatted(
                auth(ticket), puntoVenta, tipo,
                tipoDocumento(factura), numeroDocumento(factura),
                numero, numero, fecha,
                importes.total(), importes.neto(), importes.iva(), iva,
                factura.getCondicionIva().getCodigoAfip()
        );
        String respuesta = enviarSoap(
                config.getWsfeUrl(),
                NAMESPACE_WSFE + "FECAESolicitar",
                sobreWsfe(cuerpo)
        );
        return interpretarCae(parsearXml(respuesta), numero);
    }

    private ResultadoArca interpretarCae(Document documento, long numero) {
        String resultado = textoOpcional(documento, "Resultado");
        String cae = textoOpcional(documento, "CAE");
        String vencimiento = textoOpcional(documento, "CAEFchVto");
        String mensaje = mensajes(documento);
        boolean aprobado = "A".equalsIgnoreCase(resultado) && !cae.isBlank();
        Date fechaVencimiento = vencimiento.isBlank()
                ? null
                : java.sql.Date.valueOf(LocalDate.parse(vencimiento, FECHA_ARCA));
        return new ResultadoArca(aprobado, numero, resultado, cae, fechaVencimiento, mensaje);
    }

    private int tipoDocumento(FacturaVenta factura) {
        return numeroDocumento(factura) == 0 ? 99 : 80;
    }

    private long numeroDocumento(FacturaVenta factura) {
        String documento = factura.getCliente() == null ? "" : factura.getCliente().getCuitCuil();
        String digitos = documento == null ? "" : documento.replaceAll("\\D", "");
        return digitos.length() == 11 ? Long.parseLong(digitos) : 0;
    }

    private String auth(TicketAcceso ticket) {
        return """
                <ar:Auth><ar:Token>%s</ar:Token><ar:Sign>%s</ar:Sign><ar:Cuit>%d</ar:Cuit></ar:Auth>
                """.formatted(escaparXml(ticket.token()), escaparXml(ticket.sign()), config.cuitNumerica());
    }

    private String sobreWsaa(String cms) {
        return """
                <?xml version="1.0" encoding="UTF-8"?>
                <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">
                  <soapenv:Header/><soapenv:Body><wsaa:loginCms><wsaa:in0>%s</wsaa:in0></wsaa:loginCms></soapenv:Body>
                </soapenv:Envelope>
                """.formatted(cms);
    }

    private String sobreWsfe(String cuerpo) {
        return """
                <?xml version="1.0" encoding="UTF-8"?>
                <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
                  <soapenv:Header/><soapenv:Body>%s</soapenv:Body>
                </soapenv:Envelope>
                """.formatted(cuerpo);
    }

    private String enviarSoap(String url, String accion, String xml) throws Exception {
        HttpRequest.Builder solicitud = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(45))
                .header("Content-Type", "text/xml; charset=UTF-8")
                .POST(HttpRequest.BodyPublishers.ofString(xml, StandardCharsets.UTF_8));
        if (!accion.isBlank()) {
            solicitud.header("SOAPAction", '"' + accion + '"');
        }
        HttpResponse<String> respuesta = httpClient.send(
                solicitud.build(),
                HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
        );
        if (respuesta.statusCode() >= 400) {
            throw new ArcaException("ARCA respondió HTTP " + respuesta.statusCode());
        }
        return respuesta.body();
    }

    private Document parsearXml(String xml) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        factory.setXIncludeAware(false);
        factory.setExpandEntityReferences(false);
        return factory.newDocumentBuilder().parse(new InputSource(new StringReader(xml)));
    }

    private String texto(Document documento, String etiqueta) {
        String valor = textoOpcional(documento, etiqueta);
        if (valor.isBlank()) {
            throw new ArcaException("ARCA no devolvió el dato esperado: " + etiqueta + ". " + mensajes(documento));
        }
        return valor;
    }

    private String textoOpcional(Document documento, String etiqueta) {
        NodeList nodos = documento.getElementsByTagNameNS("*", etiqueta);
        return nodos.getLength() == 0 ? "" : nodos.item(0).getTextContent().trim();
    }

    private String mensajes(Document documento) {
        StringBuilder mensajes = new StringBuilder();
        for (String etiqueta : List.of("Err", "Obs")) {
            NodeList nodos = documento.getElementsByTagNameNS("*", etiqueta);
            for (int i = 0; i < nodos.getLength(); i++) {
                Node nodo = nodos.item(i);
                String codigo = hijo(nodo, "Code");
                String mensaje = hijo(nodo, "Msg");
                if (!mensaje.isBlank()) {
                    if (!mensajes.isEmpty()) mensajes.append(" | ");
                    mensajes.append(codigo.isBlank() ? mensaje : "[" + codigo + "] " + mensaje);
                }
            }
        }
        return mensajes.toString();
    }

    private String hijo(Node nodo, String nombre) {
        NodeList hijos = nodo.getChildNodes();
        for (int i = 0; i < hijos.getLength(); i++) {
            Node hijo = hijos.item(i);
            if (nombre.equals(hijo.getLocalName()) || nombre.equals(hijo.getNodeName())) {
                return hijo.getTextContent().trim();
            }
        }
        return "";
    }

    private String escaparXml(String texto) {
        return texto.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private record TicketAcceso(String token, String sign, Instant expira) {
    }

    private record Importes(double total, double neto, double iva) {
        private static Importes desde(double total, int tipoComprobante) {
            if (tipoComprobante == 11) {
                return new Importes(redondear(total), redondear(total), 0);
            }
            double neto = redondear(total / 1.21);
            return new Importes(redondear(total), neto, redondear(total - neto));
        }

        private static double redondear(double valor) {
            return Math.round(valor * 100d) / 100d;
        }
    }
}
