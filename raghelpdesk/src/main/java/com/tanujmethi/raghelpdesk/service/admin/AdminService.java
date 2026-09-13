package com.tanujmethi.raghelpdesk.service.admin;

import com.tanujmethi.raghelpdesk.dto.CurrentUserResponse;
import com.tanujmethi.raghelpdesk.dto.UserResponse;
import com.tanujmethi.raghelpdesk.entity.User;
import com.tanujmethi.raghelpdesk.enums.Role;
import com.tanujmethi.raghelpdesk.enums.Status;
import com.tanujmethi.raghelpdesk.exception.AppException;
import com.tanujmethi.raghelpdesk.repository.CompanyRepository;
import com.tanujmethi.raghelpdesk.repository.UserRepository;
import com.tanujmethi.raghelpdesk.service.auth.AuthService;
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

    public AdminService(UserRepository userRepository, AuthService authService, CompanyRepository companyRepository) {
        this.userRepository = userRepository;
        this.authService = authService;
        this.companyRepository = companyRepository;
    }


    public Page<UserResponse> getAllUsers(Pageable pageable, Authentication authentication) {
        CurrentUserResponse currentUser = authService.getCurrentUser(authentication);

        if(currentUser.getRole() != Role.ADMIN){
            throw new AppException("Only Admin can see all users");
        }

        Long companyId = currentUser.getCompanyId();

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

    public UserResponse getByUserId(Long id, Authentication authentication) {
        CurrentUserResponse currentUser = authService.getCurrentUser(authentication);
        if(currentUser.getRole() != Role.ADMIN){
            throw new AppException("Only admin can see other users");
        }

        Long companyId= currentUser.getCompanyId();

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

    public UserResponse updateStatus(Long id, Status status, Authentication authentication){
        CurrentUserResponse currentUserResponse = authService.getCurrentUser(authentication);

        if(currentUserResponse.getRole() != Role.ADMIN){
            throw new AppException("Only admin can change status");
        }

        Long companyId = currentUserResponse.getCompanyId();

        User user = userRepository.findByIdAndCompanyIdAndRoleIn(id, companyId, List.of(Role.EMPLOYEE, Role.AGENT)).orElseThrow(
                () -> new AppException("User with id " + id + " and company id " + companyId + " not found" )
        );

        user.setStatus(status);
        userRepository.save(user);
        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .role(user.getRole())
                .email(user.getEmail())
                .status(user.getStatus())
                .build();
    }

    public UserResponse updateRole(Long id, Role role, Authentication authentication) {
        CurrentUserResponse currentUser = authService.getCurrentUser(authentication);

        if (currentUser.getRole() != Role.ADMIN) {
            throw new AppException("Only admin can change role");
        }

        Long companyId = currentUser.getCompanyId();

        User user = userRepository.findByIdAndCompanyId(id, companyId).orElseThrow(
                () -> new AppException("User not found")
        );

        user.setRole(role);
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
