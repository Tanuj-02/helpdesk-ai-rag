package com.tanujmethi.raghelpdesk.service.admin;

import com.tanujmethi.raghelpdesk.dto.CurrentUser;
import com.tanujmethi.raghelpdesk.dto.CurrentUserResponse;
import com.tanujmethi.raghelpdesk.dto.UserResponse;
import com.tanujmethi.raghelpdesk.entity.User;
import com.tanujmethi.raghelpdesk.enums.Role;
import com.tanujmethi.raghelpdesk.enums.Status;
import com.tanujmethi.raghelpdesk.exception.AppException;
import com.tanujmethi.raghelpdesk.repository.CompanyRepository;
import com.tanujmethi.raghelpdesk.repository.UserRepository;
import com.tanujmethi.raghelpdesk.service.auth.AuthService;
import com.tanujmethi.raghelpdesk.service.auth.CurrentUserService;
import jdk.swing.interop.SwingInterOpUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AdminService {
    private final UserRepository userRepository;
    private final AuthService authService;
    private final CompanyRepository companyRepository;
    private final CurrentUserService currentUserService;
    public AdminService(UserRepository userRepository, AuthService authService, CompanyRepository companyRepository, CurrentUserService currentUserService) {
        this.userRepository = userRepository;
        this.authService = authService;
        this.companyRepository = companyRepository;
        this.currentUserService = currentUserService;
    }


    public Page<UserResponse> getAllUsers(Pageable pageable) {

        if (!Role.ADMIN.name().equals(currentUserService.getRole())) {
            throw new AppException("Only Admin can see all users");
        }

        Long companyId = currentUserService.getCompanyId();

        return userRepository.findAllByCompanyId(companyId, pageable)
                .map( user -> new UserResponse(
                        user.getId(),
                        user.getName(),
                        user.getEmail(),
                        user.getRole(),
                        user.getStatus()
                        )
                );
    }

    public UserResponse getByUserId(Long id) {
        if (!Role.ADMIN.name().equals(currentUserService.getRole())) {
            throw new AppException("Only Admin can see all users");
        }

        Long companyId= currentUserService.getCompanyId();

        User user = userRepository.findByIdAndCompanyId(id, companyId).orElseThrow(
                () -> new AppException("User with id " + id + " and company id " + companyId + " not found" )
        );

        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .role(user.getRole())
                .email(user.getEmail())
                .status(user.getStatus())
                .build();
    }

    public UserResponse updateStatus(Long id, Status status){

        if (!Role.ADMIN.name().equals(currentUserService.getRole())) {
            throw new AppException("Only Admin can see all users");
        }

        Long companyId = currentUserService.getCompanyId();

        User user = userRepository.findByIdAndCompanyIdAndRoleIn(id, companyId, List.of(Role.EMPLOYEE, Role.AGENT)).orElseThrow(
                () -> new AppException("User with id " + id + " and company id " + companyId + " not found" )
        );

        user.setStatus(status);
        user.setTokenVersion(user.getTokenVersion()+1);
        userRepository.save(user);
        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .role(user.getRole())
                .email(user.getEmail())
                .status(user.getStatus())
                .build();
    }

    public UserResponse updateRole(Long id, Role role) {

        if (!Role.ADMIN.name().equals(currentUserService.getRole())) {
            throw new AppException("Only Admin can see all users");
        }

        Long companyId = currentUserService.getCompanyId();

        User user = userRepository.findByIdAndCompanyId(id, companyId).orElseThrow(
                () -> new AppException("User not found")
        );

        user.setRole(role);
        user.setTokenVersion(user.getTokenVersion()+1);
        userRepository.save(user);

        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .status(user.getStatus())
                .build();
    }
}
