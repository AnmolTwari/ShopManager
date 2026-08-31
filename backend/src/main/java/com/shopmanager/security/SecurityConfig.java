package com.shopmanager.security;

import com.shopmanager.service.UserDetailsServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final UserDetailsServiceImpl userDetailsService;
    private final RestAuthenticationHandlers restAuthenticationHandlers;

    @org.springframework.beans.factory.annotation.Value("${app.cookie.secure:false}")
    private boolean secure;

    @Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

    CookieCsrfTokenRepository csrfTokenRepository =
            CookieCsrfTokenRepository.withHttpOnlyFalse();

    csrfTokenRepository.setCookieCustomizer(cookie -> cookie
            .sameSite(secure ? "None" : "Lax")
            .secure(secure));

    http
            .csrf(csrf -> csrf
                    .ignoringRequestMatchers("/api/auth/login", "/api/auth/register", "/api/auth/logout")
                    .ignoringRequestMatchers(request -> {
                        String auth = request.getHeader("Authorization");
                        return auth != null && auth.startsWith("Bearer ");
                    })
                    .csrfTokenRepository(csrfTokenRepository)
                    .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session
                    .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(exceptions -> exceptions
                    .authenticationEntryPoint(restAuthenticationHandlers)
                    .accessDeniedHandler(restAuthenticationHandlers))
            .authorizeHttpRequests(auth -> auth
                    .requestMatchers("/api/health", "/api/auth/csrf", "/api/auth/login", "/api/auth/register",
                            "/api/auth/logout").permitAll()
                    .requestMatchers("/api/admin/**").hasRole("ADMIN")
                    .anyRequest().authenticated())
            .addFilterBefore(
                    jwtAuthenticationFilter,
                    UsernamePasswordAuthenticationFilter.class);

    return http.build();
}

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        String frontendUrl = System.getenv().getOrDefault(
        "FRONTEND_URL",
        "http://localhost:5173"
);

configuration.setAllowedOrigins(List.of(frontendUrl));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return new ProviderManager(provider);
    }
}