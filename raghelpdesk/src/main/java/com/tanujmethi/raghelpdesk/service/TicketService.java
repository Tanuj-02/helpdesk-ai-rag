package com.tanujmethi.raghelpdesk.service;

import com.tanujmethi.raghelpdesk.dto.CreateTicketRequest;
import com.tanujmethi.raghelpdesk.dto.TicketResponse;
import com.tanujmethi.raghelpdesk.dto.UpdateTicketRequest;
import com.tanujmethi.raghelpdesk.entity.Company;
import com.tanujmethi.raghelpdesk.entity.Ticket;
import com.tanujmethi.raghelpdesk.entity.User;
import com.tanujmethi.raghelpdesk.enums.Role;
import com.tanujmethi.raghelpdesk.enums.TicketStatus;
import com.tanujmethi.raghelpdesk.exception.AppException;
import com.tanujmethi.raghelpdesk.repository.CompanyRepository;
import com.tanujmethi.raghelpdesk.repository.TicketRepository;
import com.tanujmethi.raghelpdesk.repository.UserRepository;
import com.tanujmethi.raghelpdesk.service.auth.CurrentUserService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TicketService {
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final CurrentUserService currentUserService;
    private final AgentAssignmentService agentAssignmentService;

    public TicketService(TicketRepository ticketRepository, UserRepository userRepository, CompanyRepository companyRepository, CurrentUserService currentUserService, AgentAssignmentService agentAssignmentService) {
        this.ticketRepository = ticketRepository;
        this.userRepository = userRepository;
        this.companyRepository = companyRepository;
        this.currentUserService = currentUserService;
        this.agentAssignmentService = agentAssignmentService;
    }

//    public TicketResponse createTicket(CreateTicketRequest createTicketRequest){
//        Long userId = currentUserService.getUserId();
//        User user = userRepository.findById(userId).orElseThrow(
//                () -> new AppException("User not found")
//        );
//        Long companyId = currentUserService.getCompanyId();
//        Company company = companyRepository.findById(companyId).orElseThrow(
//                () -> new AppException("Company not found")
//        );
//
//        User agent = agentAssignmentService.leastBusyAgent(companyId);
//
//        Ticket ticket = Ticket.builder()
//                .user(user)
//                .company(company)
//                .agent(agent)
//                .ticketStatus(TicketStatus.OPEN)
//                .ticketPriority(createTicketRequest.getTicketPriority())
//                .subject(createTicketRequest.getSubject())
//                .aiSummary(createTicketRequest.getAiSummary())
//                .category(createTicketRequest.getCategory())
//                .build();
//
//        ticketRepository.save(ticket);
//        return convertToResponse(ticket);
//    }

    public TicketResponse createTicket(CreateTicketRequest createTicketRequest, Long userId, Long companyId) {

        User user = userRepository.findById(userId).orElseThrow(
                () -> new AppException("User not found")
        );

        Company company = companyRepository.findById(companyId).orElseThrow(
                () -> new AppException("Company not found")
        );

        User agent = agentAssignmentService.leastBusyAgent(companyId);

        Ticket ticket = Ticket.builder()
                .user(user)
                .company(company)
                .agent(agent)
                .ticketStatus(TicketStatus.OPEN)
                .ticketPriority(createTicketRequest.getTicketPriority())
                .subject(createTicketRequest.getSubject())
                .aiSummary(createTicketRequest.getAiSummary())
                .category(createTicketRequest.getCategory())
                .description(createTicketRequest.getDescription())
                .conversationId(createTicketRequest.getConversationId())
                .build();

        ticketRepository.save(ticket);

        TicketResponse response = convertToResponse(ticket);

        return response;
    }

    public Page<TicketResponse> getMyTicket(Pageable pageable){
        Long userId = currentUserService.getUserId();

        return ticketRepository.findByUserId(userId, pageable)
                .map(this::convertToResponse);
    }

    public Page<TicketResponse> getCompanyTicket(Pageable pageable){
        Long companyId = currentUserService.getCompanyId();
        String role = currentUserService.getRole();

        if(!role.equals(Role.ADMIN.toString())){
            throw new AppException("Only admins can view all company tickets");
        }

        return ticketRepository.findByCompanyId(companyId, pageable)
                .map(this :: convertToResponse);
    }

    public Page<TicketResponse> getAgentTickets(Pageable pageable){
        Long agentId = currentUserService.getUserId();
        String role = currentUserService.getRole();

        if (!role.equals(Role.AGENT.toString())) {
            throw new AppException("Only agents can view assigned tickets");
        }

        return ticketRepository.findByAgentId(agentId, pageable)
                .map(this::convertToResponse);
    }

    public TicketResponse updateTicket(Long ticketId, UpdateTicketRequest updateTicketRequest, Long userId, Long companyId, String role) {

        Ticket ticket = ticketRepository.findByIdAndCompanyId(ticketId, companyId)
                .orElseThrow(() -> new AppException("Ticket not found"));

        if (role.equals(Role.EMPLOYEE.toString())) {

            if (!ticket.getUser().getId().equals(userId)) {
                throw new AppException("You can only update your own tickets");
            }

        } else if (role.equals(Role.AGENT.toString())) {

            if (!ticket.getAgent().getId().equals(userId)) {
                throw new AppException("You can only update tickets assigned to you");
            }

        } else if (!role.equals(Role.ADMIN.toString())) {

            throw new AppException("Invalid role");
        }

        if (updateTicketRequest.getTicketStatus() != null) {
            ticket.setTicketStatus(updateTicketRequest.getTicketStatus());
        }
        if (updateTicketRequest.getTicketPriority() != null) {
            ticket.setTicketPriority(updateTicketRequest.getTicketPriority());
        }
        if (updateTicketRequest.getSubject() != null) {
            ticket.setSubject(updateTicketRequest.getSubject());
        }
        if (updateTicketRequest.getAiSummary() != null) {
            ticket.setAiSummary(updateTicketRequest.getAiSummary());
        }

        Ticket updatedTicket = ticketRepository.save(ticket);
        return convertToResponse(updatedTicket);
    }

    public TicketResponse getTicket(Long ticketId) {

        Long userId = currentUserService.getUserId();
        Long companyId = currentUserService.getCompanyId();

        Ticket ticket = ticketRepository
                .findByIdAndCompanyId(ticketId, companyId)
                .orElseThrow(() -> new AppException("Ticket not found"));

        if (!ticket.getUser().getId().equals(userId)) {
            throw new AppException("You can only view your own tickets");
        }

        return convertToResponse(ticket);
    }

    public List<TicketResponse> searchMyTickets(String query, Long userId) {

        return ticketRepository
                .findByUserIdAndSubjectContainingIgnoreCase(userId, query)
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    private TicketResponse convertToResponse(Ticket ticket) {
        return TicketResponse.builder()
                .id(ticket.getId())
                .userId(ticket.getUser().getId())
                .agentId(ticket.getAgent() != null ? ticket.getAgent().getId() : null)
                .companyId(ticket.getCompany().getId())
                .ticketStatus(ticket.getTicketStatus())
                .ticketPriority(ticket.getTicketPriority())
                .subject(ticket.getSubject())
                .aiSummary(ticket.getAiSummary())
                .createdAt(ticket.getCreatedAt())
                .category(ticket.getCategory())
                .conversationId(ticket.getConversationId())
                .description(ticket.getDescription())
                .build();
    }
}
