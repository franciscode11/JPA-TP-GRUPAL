package com.facturaarca;

import com.fasterxml.jackson.core.StreamReadConstraints;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class FacturaArcaApplication {

    @Bean
    Jackson2ObjectMapperBuilderCustomizer limitesJson() {
        var limites = StreamReadConstraints.builder()
                .maxDocumentLength(65_536)
                .maxStringLength(1_024)
                .maxNumberLength(32)
                .maxNestingDepth(12)
                .build();
        return builder -> builder.postConfigurer(mapper -> mapper.getFactory().setStreamReadConstraints(limites));
    }

    public static void main(String[] args) {
        SpringApplication.run(FacturaArcaApplication.class, args);
    }
}
