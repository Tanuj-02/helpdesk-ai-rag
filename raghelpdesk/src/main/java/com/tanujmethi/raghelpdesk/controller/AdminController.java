package com.tanujmethi.raghelpdesk.controller;

import com.tanujmethi.raghelpdesk.dto.UserResponse;
import com.tanujmethi.raghelpdesk.enums.Role;
import com.tanujmethi.raghelpdesk.enums.Status;
import com.tanujmethi.raghelpdesk.service.admin.AdminService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin")
public class AdminController {
    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/users")
    public Page<UserResponse> getAllUser(@PageableDefault(size = 10, sort = "createAt", direction = Sort.Direction.DESC) Pageable pageable){
        return adminService.getAllUsers(pageable);
    }

    @GetMapping("/user/{id}")
    public UserResponse getByUserId(@PathVariable Long id){
        return adminService.getByUserId(id);
    }

    @PatchMapping("/user/{id}/status")
    public UserResponse updateStatus(@PathVariable Long id, @RequestParam Status status){
        return adminService.updateStatus(id,status);
    }

    @PatchMapping("/user/{id}/role")
    public UserResponse updateRole(@PathVariable Long id, @RequestParam Role role){
        return adminService.updateRole(id,role);
    }
}
