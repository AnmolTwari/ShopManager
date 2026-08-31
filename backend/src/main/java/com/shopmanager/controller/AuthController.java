package com.shopmanager.controller;

import java.util.Map;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.shopmanager.dto.auth.AuthRequest;
import com.shopmanager.dto.auth.AuthResponse;
import com.shopmanager.dto.auth.LoginRequest;
import com.shopmanager.entity.User;
import com.shopmanager.entity.UserRole;
import com.shopmanager.exception.DuplicateResourceException;
import com.shopmanager.repository.UserRepository;
import com.shopmanager.security.AuthCookieService;
import com.shopmanager.security.CurrentUserService;
import com.shopmanager.security.JwtService;
import com.shopmanager.security.RateLimiterService;
import com.shopmanager.util.EmailUtil;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthCookieService authCookieService;
    private final RateLimiterService rateLimiterService;
    private final CurrentUserService currentUserService;

    @GetMapping("/csrf")
    public Map<String, String> csrf(HttpServletRequest request) {
        CsrfToken token = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
        return Map.of("token", token.getToken());
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse> me() {
        User current = currentUserService.currentUser();
        return ResponseEntity.ok(AuthResponse.builder()
                .username(current.getUsername())
                .email(current.getEmail())
                .name(current.getName())
                .role(roleOf(current))
                .build());
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest, HttpServletResponse response) {
        rateLimiterService.checkLogin(httpRequest, request.getUsername());

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            String token = jwtService.generateToken(userDetails);
            response.addHeader(HttpHeaders.SET_COOKIE, authCookieService.createTokenCookie(token).toString());
            rateLimiterService.clearLoginAttempts(request.getUsername());
            User user = (User) userDetails;
            return ResponseEntity.ok(AuthResponse.builder()
                    .username(userDetails.getUsername())
                    .email(user.getEmail())
                    .name(user.getName())
                    .role(roleOf(user))
                    .token(token)
                    .build());
        } catch (BadCredentialsException e) {
            rateLimiterService.recordFailedLogin(httpRequest, request.getUsername());
            throw e;
        }
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody AuthRequest request,
            HttpServletRequest httpRequest) {
        rateLimiterService.checkRegister(httpRequest);

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateResourceException("USERNAME_TAKEN",
                    "Username is already taken", "username");
        }

        String email = EmailUtil.normalize(request.getEmail());
        if (email != null && userRepository.existsByEmailIgnoreCase(email)) {
            throw new DuplicateResourceException("EMAIL_TAKEN",
                    "Email is already registered", "email");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(email)
                .name(normalizeName(request.getName()))
                .password(passwordEncoder.encode(request.getPassword()))
                .enabled(true)
                .build();

        userRepository.save(user);
        rateLimiterService.recordRegisterAttempt(httpRequest);
        String token = jwtService.generateToken(user);

        return ResponseEntity.ok(AuthResponse.builder()
                .username(user.getUsername())
                .email(user.getEmail())
                .name(user.getName())
                .role(roleOf(user))
                .token(token)
                .build());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, authCookieService.createLogoutCookie().toString());
        return ResponseEntity.noContent().build();
    }

    private String roleOf(User user) {
        UserRole effective = user.getRole() != null ? user.getRole() : UserRole.USER;
        return effective.name();
    }

    private String normalizeName(String name) {
        if (name == null) {
            return null;
        }
        String trimmed = name.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}