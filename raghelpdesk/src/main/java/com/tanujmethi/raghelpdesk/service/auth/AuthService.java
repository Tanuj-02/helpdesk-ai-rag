package com.tanujmethi.raghelpdesk.service.auth;

import com.tanujmethi.raghelpdesk.dto.*;
import com.tanujmethi.raghelpdesk.entity.Company;
import com.tanujmethi.raghelpdesk.entity.CompanyInvitation;
import com.tanujmethi.raghelpdesk.entity.User;
import com.tanujmethi.raghelpdesk.enums.Role;
import com.tanujmethi.raghelpdesk.enums.Status;
import com.tanujmethi.raghelpdesk.exception.AppException;
import com.tanujmethi.raghelpdesk.repository.CompanyInvitationRepository;
import com.tanujmethi.raghelpdesk.repository.CompanyRepository;
import com.tanujmethi.raghelpdesk.repository.UserRepository;
import com.tanujmethi.raghelpdesk.security.JwtService;
import jakarta.transaction.Transactional;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final CompanyInvitationRepository companyInvitationRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, CompanyRepository companyRepository, CompanyInvitationRepository companyInvitationRepository, PasswordEncoder passwordEncoder, AuthenticationManager authenticationManager, JwtService jwtService) {
        this.userRepository = userRepository;
        this.companyRepository = companyRepository;
        this.companyInvitationRepository = companyInvitationRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }


    @Transactional
    public void registerCompany(RegisterRequest registerRequest) {
        if(companyRepository.existsByEmail(registerRequest.getCompanyEmail())){
            throw new AppException("Company Already Existss");
        }

        if(userRepository.existsByEmail(registerRequest.getAdminEmail())){
            throw new AppException("Admin user already exists");
        }

        Company company = Company.builder()
                .name(registerRequest.getCompanyName())
                .email(registerRequest.getCompanyEmail())
                .status(Status.ACTIVE)
                .build();

        User user = User.builder()
                .name(registerRequest.getAdminName())
                .email(registerRequest.getAdminEmail())
                .status(Status.ACTIVE)
                .role(Role.ADMIN)
                .company(company)
                .password(passwordEncoder.encode(registerRequest.getPassword()))
                .build();

        companyRepository.save(company);
        userRepository.save(user);
    }

    public LoginResponse login(LoginRequest loginRequest) {
        authenticationManager.authenticate(
          new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword())
        );
        User user = userRepository.findByEmail(loginRequest.getEmail()).orElseThrow(()-> new AppException("User Not found"));

        if(user.getStatus() != Status.ACTIVE){
            throw new AppException("Your account is " + user.getStatus().name() + ", Please contact your admin ");
        }

        String token = jwtService.generateToken(user);

        return  LoginResponse.builder()
                .token(token)
                .role(user.getRole())
                .userId(user.getId())
                .companyId(user.getCompany().getId())
                .name(user.getName())
                .email(user.getEmail())
                .build();
    }

    @Transactional
    public LoginResponse register(EmployeeRegistration employeeRegistration) {
        String token = employeeRegistration.getToken();

        CompanyInvitation invitation = companyInvitationRepository.findByToken(token).orElseThrow(
                () -> new AppException("Invitation not found")
        );

        if(invitation.isUsed()){
            throw new AppException("Invitation has already been used");
        }

        if(!jwtService.isInvitationToken(token)){
            throw new AppException("Invalid or expired invitation");
        }

        String email = jwtService.extractEmail(token);
        if(userRepository.existsByEmail(email)){
            throw new AppException("User already exists");
        }

        Long companyId = jwtService.extractCompanyId(token);
        Company company = companyRepository.findById(companyId).orElseThrow(
                () -> new AppException("Company not found")
        );

        User user = User.builder()
                .company(company)
                .role(Role.valueOf(jwtService.extractRole(token)))
                .name(employeeRegistration.getName())
                .password(passwordEncoder.encode(employeeRegistration.getPassword()))
                .email(email)
                .status(Status.ACTIVE)
                .build();

        userRepository.save(user);

        invitation.setUsed(true);
        companyInvitationRepository.save(invitation);

        return  LoginResponse.builder()
                .token(jwtService.generateToken(user))
                .role(user.getRole())
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .companyId(user.getCompany().getId())
                .build();
    }

    public CurrentUserResponse getCurrentUser(Authentication authentication){
        UserDetails currentUser = (UserDetails) authentication.getPrincipal();

        User user = userRepository.findByEmail(currentUser.getUsername()).orElseThrow(
                () -> new AppException("User not found")
        );

        return CurrentUserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .companyId(user.getCompany().getId())
                .companyName(user.getCompany().getName())
                .role(user.getRole())
                .email(user.getEmail())
                .build();
    }
}
