package com.tanujmethi.raghelpdesk.service;

import com.tanujmethi.raghelpdesk.dto.ChatRequest;
import com.tanujmethi.raghelpdesk.dto.CreateTicketRequest;
import com.tanujmethi.raghelpdesk.dto.TicketResponse;
import com.tanujmethi.raghelpdesk.dto.UpdateTicketRequest;
import com.tanujmethi.raghelpdesk.dto.UrgentEmailResponse;
import com.tanujmethi.raghelpdesk.entity.Company;
import com.tanujmethi.raghelpdesk.entity.Ticket;
import com.tanujmethi.raghelpdesk.entity.User;
import com.tanujmethi.raghelpdesk.enums.Role;
import com.tanujmethi.raghelpdesk.enums.TicketPriority;
import com.tanujmethi.raghelpdesk.enums.TicketStatus;
import com.tanujmethi.raghelpdesk.exception.ForbiddenException;
import com.tanujmethi.raghelpdesk.exception.ResourceNotFoundException;
import com.tanujmethi.raghelpdesk.messaging.RabbitMqPublisher;
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
    private final RabbitMqPublisher rabbitMqPublisher;

    public TicketService(TicketRepository ticketRepository, UserRepository userRepository, CompanyRepository companyRepository, CurrentUserService currentUserService, AgentAssignmentService agentAssignmentService, RabbitMqPublisher rabbitMqPublisher) {
        this.ticketRepository = ticketRepository;
        this.userRepository = userRepository;
        this.companyRepository = companyRepository;
        this.currentUserService = currentUserService;
        this.agentAssignmentService = agentAssignmentService;
        this.rabbitMqPublisher = rabbitMqPublisher;
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
                () -> new ResourceNotFoundException("User with " + userId + " not found")
        );

        Company company = companyRepository.findById(companyId).orElseThrow(
                () -> new ResourceNotFoundException("Company with " + companyId + " not found")
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

        ChatRequest chatRequest = ChatRequest.builder()
                .ticketId(ticket.getId())
                .userId(userId)
                .agentId(agent != null ? agent.getId() : null)
                .companyId(companyId)
                .build();
        rabbitMqPublisher.publishChat(chatRequest);

        if (ticket.getTicketPriority() == TicketPriority.URGENT && agent != null) {

            UrgentEmailResponse email = UrgentEmailResponse.builder()
                    .agentEmail(agent.getEmail())
                    .subject(ticket.getSubject())
                    .conversationId(ticket.getConversationId())
                    .aiSummary(ticket.getAiSummary())
                    .ticketPriority(ticket.getTicketPriority())
                    .build();

            rabbitMqPublisher.publishUrgentEmail(email);
        }

        return convertToResponse(ticket);
    }

    public Page<TicketResponse> getMyTicket(Pageable pageable){
        Long userId = currentUserService.getUserId();

        return ticketRepository.findByUserId(userId, pageable)
                .map(this::convertToResponse);
    }

    public Page<TicketResponse> getCompanyTicket(Pageable pageable){
        Long companyId = currentUserService.getCompanyId();
        String role = currentUserService.getRole();

        if (!Role.ADMIN.name().equals(role)) {
            throw new ForbiddenException("Only admins can view company tickets");
        }


        return ticketRepository.findByCompanyId(companyId, pageable)
                .map(this :: convertToResponse);
    }

    public Page<TicketResponse> getAgentTickets(Pageable pageable){
        Long agentId = currentUserService.getUserId();
        String role = currentUserService.getRole();

        if (!Role.AGENT.name().equals(role)) {
            throw new ForbiddenException("Only agents can view company tickets");
        }


        return ticketRepository.findByAgentId(agentId, pageable)
                .map(this::convertToResponse);
    }

    public TicketResponse updateTicket(Long ticketId, UpdateTicketRequest updateTicketRequest, Long userId, Long companyId, String role) {

        Ticket ticket = ticketRepository.findByIdAndCompanyId(ticketId, companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket with " + ticketId + " not found"));

        if (Role.EMPLOYEE.name().equals(role)) {

            if (!ticket.getUser().getId().equals(userId)) {
                throw new ForbiddenException("You can only update your own tickets");
            }

        } else if (Role.AGENT.name().equals(role)) {

            if (!ticket.getAgent().getId().equals(userId)) {
                throw new ForbiddenException("You can only update tickets assigned to you");
            }

        } else if (!Role.ADMIN.name().equals(role)) {

            throw new ForbiddenException("Admins can't update ticket");
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
                .orElseThrow(() -> new ResourceNotFoundException("Ticket with " + ticketId + " not found"));

        boolean isOwner = ticket.getUser().getId().equals(userId);
        boolean isAdmin = currentUserService.getRole().equals(Role.ADMIN.toString());
        boolean isAssignedAgent = ticket.getAgent() != null
                && ticket.getAgent().getId().equals(userId);

        if (!isOwner && !isAdmin && !isAssignedAgent) {
            throw new ForbiddenException("You are not authorized to view this ticket");
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
