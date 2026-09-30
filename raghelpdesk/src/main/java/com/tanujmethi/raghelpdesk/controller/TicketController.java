package com.tanujmethi.raghelpdesk.controller;

import com.tanujmethi.raghelpdesk.dto.CreateTicketRequest;
import com.tanujmethi.raghelpdesk.dto.CurrentUserResponse;
import com.tanujmethi.raghelpdesk.dto.TicketResponse;
import com.tanujmethi.raghelpdesk.dto.UpdateTicketRequest;
import com.tanujmethi.raghelpdesk.service.TicketService;
import com.tanujmethi.raghelpdesk.service.auth.CurrentUserService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/ticket")
public class TicketController {
    private final TicketService ticketService;
    private final CurrentUserService currentUserService;

    public TicketController(TicketService ticketService, CurrentUserService currentUserService) {
        this.ticketService = ticketService;
        this.currentUserService = currentUserService;
    }

    @PostMapping("/create")
    public ResponseEntity<String> createTicket(@RequestBody CreateTicketRequest createTicketRequest) {
        Long userId = currentUserService.getUserId();
        Long companyId = currentUserService.getCompanyId();
        ticketService.createTicket(createTicketRequest, userId, companyId);
        return ResponseEntity.status(HttpStatus.CREATED).body("Ticket created successfully");
    }

    @GetMapping("/my-tickets")
    public ResponseEntity<Page<TicketResponse>> getMyTickets(Pageable pageable) {
        Page<TicketResponse> tickets = ticketService.getMyTicket(pageable);
        return ResponseEntity.ok(tickets);
    }

    @GetMapping("/company-tickets")
    public ResponseEntity<Page<TicketResponse>> getCompanyTickets(Pageable pageable) {
        Page<TicketResponse> tickets = ticketService.getCompanyTicket(pageable);
        return ResponseEntity.ok(tickets);
    }

    @GetMapping("/agent-tickets")
    public ResponseEntity<Page<TicketResponse>> getAgentTickets(Pageable pageable) {
        Page<TicketResponse> tickets = ticketService.getAgentTickets(pageable);
        return ResponseEntity.ok(tickets);
    }

    @PutMapping("/{ticketId}")
    public ResponseEntity<TicketResponse> updateTicket(
            @PathVariable Long ticketId,
            @RequestBody UpdateTicketRequest updateTicketRequest) {
        Long userId = currentUserService.getUserId();
        Long companyId = currentUserService.getCompanyId();
        String role = currentUserService.getRole();
        TicketResponse updatedTicket = ticketService.updateTicket(ticketId, updateTicketRequest, userId, companyId, role);
        return ResponseEntity.ok(updatedTicket);
    }
}