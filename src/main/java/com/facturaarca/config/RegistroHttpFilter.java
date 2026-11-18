package com.facturaarca.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

@Component
public class RegistroHttpFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RegistroHttpFilter.class);

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith(request.getContextPath() + "/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        long inicio = System.nanoTime();
        int estadoError = 0;
        try {
            chain.doFilter(request, response);
        } catch (IOException | ServletException | RuntimeException exception) {
            estadoError = HttpServletResponse.SC_INTERNAL_SERVER_ERROR;
            throw exception;
        } finally {
            long duracion = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - inicio);
            log.info("HTTP {} {} -> {} ({} ms)", request.getMethod(), request.getRequestURI(),
                    estadoError == 0 ? response.getStatus() : estadoError, duracion);
        }
    }
}
