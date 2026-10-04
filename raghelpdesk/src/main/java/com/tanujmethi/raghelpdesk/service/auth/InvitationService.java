package com.tanujmethi.raghelpdesk.service.auth;

import com.tanujmethi.raghelpdesk.dto.EmailResponse;
import com.tanujmethi.raghelpdesk.dto.InvitationDto;
import com.tanujmethi.raghelpdesk.entity.CompanyInvitation;
import com.tanujmethi.raghelpdesk.entity.User;
import com.tanujmethi.raghelpdesk.enums.Role;
import com.tanujmethi.raghelpdesk.exception.AppException;
import com.tanujmethi.raghelpdesk.messaging.RabbitMqPublisher;
import com.tanujmethi.raghelpdesk.repository.CompanyInvitationRepository;
import com.tanujmethi.raghelpdesk.repository.UserRepository;
import com.tanujmethi.raghelpdesk.security.JwtService;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class InvitationService {

    private final JwtService jwtService;
    private final CurrentUserService currentUserService;
    private final UserRepository userRepository;
    private final CompanyInvitationRepository companyInvitationRepository;
    private final RabbitMqPublisher rabbitMqPublisher;

    public InvitationService(JwtService jwtService, CurrentUserService currentUserService, UserRepository userRepository, CompanyInvitationRepository companyInvitationRepository, RabbitMqPublisher rabbitMqPublisher) {
        this.jwtService = jwtService;
        this.currentUserService = currentUserService;
        this.userRepository = userRepository;
        this.companyInvitationRepository = companyInvitationRepository;
        this.rabbitMqPublisher = rabbitMqPublisher;
    }

    public CompanyInvitation sendInvitation(InvitationDto invitationdto) {
        String email = currentUserService.getEmail();

        User adminUser = userRepository.findByEmail(email).orElseThrow(
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

        rabbitMqPublisher.publishEmail(emailResponse);

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
