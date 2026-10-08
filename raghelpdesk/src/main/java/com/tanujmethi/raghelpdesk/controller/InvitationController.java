package com.tanujmethi.raghelpdesk.controller;

import com.tanujmethi.raghelpdesk.dto.CompanyInvitationResponse;
import com.tanujmethi.raghelpdesk.dto.InvitationDto;
import com.tanujmethi.raghelpdesk.entity.CompanyInvitation;
import com.tanujmethi.raghelpdesk.service.auth.InvitationService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
