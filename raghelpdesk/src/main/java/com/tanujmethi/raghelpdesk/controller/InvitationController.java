package com.tanujmethi.raghelpdesk.controller;

import com.tanujmethi.raghelpdesk.dto.CompanyInvitationResponse;
import com.tanujmethi.raghelpdesk.dto.InvitationDto;
import com.tanujmethi.raghelpdesk.service.auth.InvitationService;
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
    public CompanyInvitationResponse sendInvitation(@RequestBody InvitationDto invitationdto){
        return invitationService.sendInvitation(invitationdto);
    }

    @PostMapping("/csv")
    public void sendBulkInvitation(@RequestParam MultipartFile file) throws IOException {
        invitationService.sendBulkInvitation(file);
    }
}
