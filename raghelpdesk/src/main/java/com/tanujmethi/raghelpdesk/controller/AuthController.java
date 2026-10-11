package com.tanujmethi.raghelpdesk.controller;

import com.tanujmethi.raghelpdesk.dto.*;
import com.tanujmethi.raghelpdesk.service.auth.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register-company")
    public ResponseEntity<Void> registerCompany(@Valid @RequestBody RegisterRequest registerRequest){
        authService.registerCompany(registerRequest);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest loginRequest){
        return ResponseEntity.ok(authService.login(loginRequest));
    }

    @PostMapping("/register")
    public ResponseEntity<LoginResponse> register(@Valid @RequestBody EmployeeRegistration employeeRegistration){
        return ResponseEntity.ok(authService.register(employeeRegistration));
    }

    @GetMapping("/me")
    public ResponseEntity<CurrentUserResponse> getCurrentUser(Authentication authentication){
        return ResponseEntity.ok(authService.getCurrentUser(authentication));
    }
}
