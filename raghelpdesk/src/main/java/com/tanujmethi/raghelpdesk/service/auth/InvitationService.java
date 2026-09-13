package com.tanujmethi.raghelpdesk.service.auth;

import com.tanujmethi.raghelpdesk.dto.EmailResponse;
import com.tanujmethi.raghelpdesk.dto.Invitationdto;
import com.tanujmethi.raghelpdesk.entity.CompanyInvitation;
import com.tanujmethi.raghelpdesk.entity.User;
import com.tanujmethi.raghelpdesk.enums.Role;
import com.tanujmethi.raghelpdesk.exception.AppException;
import com.tanujmethi.raghelpdesk.messaging.DocumentVerificationPublisher;
import com.tanujmethi.raghelpdesk.repository.CompanyInvitationRepository;
import com.tanujmethi.raghelpdesk.repository.UserRepository;
import com.tanujmethi.raghelpdesk.security.JwtService;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Date;

@Service
public class InvitationService {

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final CompanyInvitationRepository companyInvitationRepository;
    private final DocumentVerificationPublisher documentVerificationPublisher;

    public InvitationService(JwtService jwtService, UserRepository userRepository, CompanyInvitationRepository companyInvitationRepository, DocumentVerificationPublisher documentVerificationPublisher) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.companyInvitationRepository = companyInvitationRepository;
        this.documentVerificationPublisher = documentVerificationPublisher;
    }

    public CompanyInvitation sendInvitation(Invitationdto invitationdto, Authentication authentication) {
        UserDetails currentUser = (UserDetails) authentication.getPrincipal();

        User adminUser = userRepository.findByEmail(currentUser.getUsername()).orElseThrow(
                () -> {
                    System.out.println("Admin not found");
                    return new AppException("Admin not found");}
        );

        if(adminUser.getRole() != Role.ADMIN){
            throw new RuntimeException("Only Admin can send invite");
        }

        if(userRepository.existsByEmail(invitationdto.getEmail())){
            throw new AppException("User Already Exists");
        }

        Long companyId = adminUser.getCompany().getId();

        String token = jwtService.generateInvitationToken(invitationdto.getEmail(), companyId, invitationdto.getRole().name());

        EmailResponse emailResponse = EmailResponse.builder()
                .token(token)
                .adminName(adminUser.getName())
                .companyName(adminUser.getCompany().getName())
                .receiverEmail(invitationdto.getEmail())
                .build();

        documentVerificationPublisher.publishEmail(emailResponse);

        CompanyInvitation companyInvitation = CompanyInvitation.builder()
                .token(token)
                .company(adminUser.getCompany())
                .email(invitationdto.getEmail())
                .expiresAt(LocalDateTime.now().plusDays(1))
                .used(false)
                .invitedBy(adminUser)
                .build();

        return companyInvitationRepository.save(companyInvitation);
    }
}
