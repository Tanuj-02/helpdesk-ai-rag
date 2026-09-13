package com.tanujmethi.raghelpdesk.controller;

import com.tanujmethi.raghelpdesk.dto.*;
import com.tanujmethi.raghelpdesk.service.auth.AuthService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register-company")
    public void registerCompany(@RequestBody RegisterRequest registerRequest){
        authService.registerCompany(registerRequest);
    }

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest loginRequest){
        return authService.login(loginRequest);
    }

    @PostMapping("/register")
    public LoginResponse register(@RequestBody EmployeeRegistration employeeRegistration){
        return authService.register(employeeRegistration);
    }

    @GetMapping("/me")
    public CurrentUserResponse getCurrentUser(Authentication authentication){
        return authService.getCurrentUser(authentication);
    }
}
