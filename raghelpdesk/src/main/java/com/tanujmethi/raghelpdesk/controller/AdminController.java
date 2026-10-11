package com.tanujmethi.raghelpdesk.controller;

import com.tanujmethi.raghelpdesk.dto.UserResponse;
import com.tanujmethi.raghelpdesk.enums.Role;
import com.tanujmethi.raghelpdesk.enums.Status;
import com.tanujmethi.raghelpdesk.service.admin.AdminService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin")
public class AdminController {
    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/users")
    public ResponseEntity<Page<UserResponse>> getAllUser(@PageableDefault(size = 10, sort = "createAt", direction = Sort.Direction.DESC) Pageable pageable){
        return ResponseEntity.ok(adminService.getAllUsers(pageable));
    }

    @GetMapping("/user/{id}")
    public ResponseEntity<UserResponse> getByUserId(@PathVariable Long id){
            return ResponseEntity.ok(adminService.getByUserId(id));
    }

    @PatchMapping("/user/{id}/status")
    public ResponseEntity<UserResponse> updateStatus(@PathVariable Long id, @RequestParam Status status){
        return ResponseEntity.ok(adminService.updateStatus(id, status));
    }

    @PatchMapping("/user/{id}/role")
    public ResponseEntity<UserResponse> updateRole(@PathVariable Long id, @RequestParam Role role){
        return ResponseEntity.ok(adminService.updateRole(id, role));
    }
}
