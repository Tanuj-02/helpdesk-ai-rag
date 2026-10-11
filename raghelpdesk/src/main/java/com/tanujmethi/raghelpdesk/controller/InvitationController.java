package com.tanujmethi.raghelpdesk.controller;

import com.tanujmethi.raghelpdesk.dto.CompanyInvitationResponse;
import com.tanujmethi.raghelpdesk.dto.InvitationDto;
import com.tanujmethi.raghelpdesk.service.auth.InvitationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/invitation")
public class InvitationController {
    private final InvitationService invitationService;

    public InvitationController(InvitationService invitationService) {
        this.invitationService = invitationService;
    }

    @PostMapping("/send")
    public ResponseEntity<CompanyInvitationResponse> sendInvitation(@RequestBody InvitationDto invitationdto){
        return ResponseEntity.status(HttpStatus.CREATED).body(invitationService.sendInvitation(invitationdto));
    }

    @PostMapping("/csv")
    public ResponseEntity<Void> sendBulkInvitation(@RequestParam MultipartFile file) throws IOException {
        invitationService.sendBulkInvitation(file);
        return ResponseEntity.ok().build();
    }
}
