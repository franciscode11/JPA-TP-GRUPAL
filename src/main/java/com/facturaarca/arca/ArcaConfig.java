package com.facturaarca.arca;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;

@Component
@ConfigurationProperties(prefix = "arca")
public class ArcaConfig {

    private boolean enabled;
    private String cuit;
    private String privateKeyPath;
    private String certificatePath;
    private int comprobanteTipo = 11;
    private String wsaaUrl = "https://wsaahomo.afip.gov.ar/ws/services/LoginCms";
    private String wsfeUrl = "https://wswhomo.afip.gov.ar/wsfev1/service.asmx";

    public boolean estaCompleta() {
        return enabled
                && cuit != null
                && cuit.replaceAll("\\D", "").length() == 11
                && existe(privateKeyPath)
                && existe(certificatePath);
    }

    private boolean existe(String ruta) {
        return ruta != null && !ruta.isBlank() && Files.isRegularFile(Path.of(ruta));
    }

    public long cuitNumerica() {
        return Long.parseLong(cuit.replaceAll("\\D", ""));
    }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getCuit() { return cuit; }
    public void setCuit(String cuit) { this.cuit = cuit; }
    public String getPrivateKeyPath() { return privateKeyPath; }
    public void setPrivateKeyPath(String privateKeyPath) { this.privateKeyPath = privateKeyPath; }
    public String getCertificatePath() { return certificatePath; }
    public void setCertificatePath(String certificatePath) { this.certificatePath = certificatePath; }
    public int getComprobanteTipo() { return comprobanteTipo; }
    public void setComprobanteTipo(int comprobanteTipo) { this.comprobanteTipo = comprobanteTipo; }
    public String getWsaaUrl() { return wsaaUrl; }
    public void setWsaaUrl(String wsaaUrl) { this.wsaaUrl = wsaaUrl; }
    public String getWsfeUrl() { return wsfeUrl; }
    public void setWsfeUrl(String wsfeUrl) { this.wsfeUrl = wsfeUrl; }
}
