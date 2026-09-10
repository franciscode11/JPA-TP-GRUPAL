package com.facturaarca.model;

import javax.persistence.Entity;
import javax.persistence.Table;

@Entity
@Table(name = "domicilio")
public class Domicilio extends EntityId {

    private String nombreCalle;
    private String numeroCalle;

    public Domicilio() {
    }

    public String getNombreCalle() {
        return nombreCalle;
    }

    public void setNombreCalle(String nombreCalle) {
        this.nombreCalle = nombreCalle;
    }

    public String getNumeroCalle() {
        return numeroCalle;
    }

    public void setNumeroCalle(String numeroCalle) {
        this.numeroCalle = numeroCalle;
    }
}