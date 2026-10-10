package com.tanujmethi.raghelpdesk.service.auth;

import com.opencsv.bean.CsvToBeanBuilder;
import com.tanujmethi.raghelpdesk.dto.BulkInvitationDto;
import com.tanujmethi.raghelpdesk.dto.CompanyInvitationResponse;
import com.tanujmethi.raghelpdesk.dto.EmailResponse;
import com.tanujmethi.raghelpdesk.dto.InvitationDto;
import com.tanujmethi.raghelpdesk.entity.CompanyInvitation;
import com.tanujmethi.raghelpdesk.entity.User;
import com.tanujmethi.raghelpdesk.enums.Role;
import com.tanujmethi.raghelpdesk.exception.DuplicateResourceException;
import com.tanujmethi.raghelpdesk.exception.ForbiddenException;
import com.tanujmethi.raghelpdesk.exception.ResourceNotFoundException;
import com.tanujmethi.raghelpdesk.messaging.RabbitMqPublisher;
import com.tanujmethi.raghelpdesk.repository.CompanyInvitationRepository;
import com.tanujmethi.raghelpdesk.repository.UserRepository;
import com.tanujmethi.raghelpdesk.security.JwtService;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.time.LocalDateTime;
import java.util.List;

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

    public CompanyInvitationResponse sendInvitation(InvitationDto invitationdto) {
        String email = currentUserService.getEmail();

        User adminUser = userRepository.findByEmail(email).orElseThrow(
                () -> {
                    System.out.println("Admin not found");
                    return new ResourceNotFoundException("Admin not found");}
        );

        if(adminUser.getRole() != Role.ADMIN){
            throw new ForbiddenException("Only Admin can send invite");
        }

        if(userRepository.existsByEmail(invitationdto.getEmail())){
            throw new DuplicateResourceException("User with" + invitationdto.getEmail() + " already Exists");
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

        companyInvitationRepository.save(companyInvitation);

        return CompanyInvitationResponse.builder()
                .id(companyInvitation.getId())
                .companyName(adminUser.getCompany().getName())
                .companyId(companyId)
                .email(invitationdto.getEmail())
                .token(token)
                .createAt(companyInvitation.getCreateAt())
                .used(companyInvitation.isUsed())
                .expiresAt(companyInvitation.getExpiresAt())
                .invitedById(adminUser.getId())
                .invitedByName(adminUser.getName())
                .build();
    }

    public void sendBulkInvitation(MultipartFile file) throws IOException {
        Long companyId = currentUserService.getCompanyId();
        Long userId = currentUserService.getUserId();
        User agent = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if(agent.getRole() != Role.ADMIN){
            throw new ForbiddenException("Only admins can invite");
        }
        try (Reader reader = new BufferedReader(new InputStreamReader(file.getInputStream()))) {

            List<BulkInvitationDto> employees = new CsvToBeanBuilder<BulkInvitationDto>(reader)
                            .withType(BulkInvitationDto.class)
                            .withIgnoreLeadingWhiteSpace(true)
                            .build()
                            .parse();

            for (BulkInvitationDto employee : employees) {

                String email = employee.getEmail().trim();

                if(userRepository.existsByEmail(email)){
                    System.out.println("Already exists: " + email);
                    continue;
                }

                if (companyInvitationRepository.existsByEmailIgnoreCaseAndCompany_Id(
                        email, companyId)) {
                    continue;
                }

                String token = jwtService.generateInvitationToken(email, companyId, employee.getRole().name());

                EmailResponse emailResponse = EmailResponse.builder()
                        .token(token)
                        .adminName(agent.getName())
                        .companyName(agent.getCompany().getName())
                        .receiverEmail(email)
                        .build();

                rabbitMqPublisher.publishEmail(emailResponse);

                CompanyInvitation companyInvitation = CompanyInvitation.builder()
                        .token(token)
                        .company(agent.getCompany())
                        .email(email)
                        .expiresAt(LocalDateTime.now().plusDays(1))
                        .used(false)
                        .invitedBy(agent)
                        .build();

                companyInvitationRepository.save(companyInvitation);
            }
        }
    }
}