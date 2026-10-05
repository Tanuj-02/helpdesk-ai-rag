package com.tanujmethi.raghelpdesk.tools;

import com.tanujmethi.raghelpdesk.dto.CreateTicketRequest;
import com.tanujmethi.raghelpdesk.dto.TicketResponse;
import com.tanujmethi.raghelpdesk.dto.UpdateTicketRequest;
import com.tanujmethi.raghelpdesk.enums.TicketPriority;
import com.tanujmethi.raghelpdesk.enums.TicketStatus;
import com.tanujmethi.raghelpdesk.service.TicketService;
import org.springframework.ai.chat.model.ToolContext;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class TicketTool {

    private final TicketService ticketService;

    public TicketTool(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    @Tool(description = """
        Create a new support ticket when troubleshooting has failed
        or the employee explicitly requests one.
        Always provide aiSummary: a concise internal summary of the
        issue and troubleshooting attempted.
        """)
    public Object createTicket(
            @ToolParam(description = "Short summary/title of the issue") String subject,
            @ToolParam(description = "Internal AI summary of issue and troubleshooting steps attempted") String aiSummary,
            @ToolParam(description = "Current chat conversation ID") Long conversationId,
            @ToolParam(description = "Priority: LOW, MEDIUM, HIGH, or URGENT")
            String priority,
            @ToolParam(description = "Category such as Account, Billing, Technical, Hardware, Software, or Other")
            String category,
            ToolContext toolContext
    ){
        Long userId = (Long) toolContext.getContext().get("userId");
        Long companyId = (Long) toolContext.getContext().get("companyId");
        System.out.println("========== TICKET TOOL START ==========");
        System.out.println("subject = " + subject);
        System.out.println("conversationId = " + conversationId);
        System.out.println("priority = " + priority);
        System.out.println("category = " + category);
        try{
            CreateTicketRequest request = CreateTicketRequest.builder()
                    .ticketPriority(TicketPriority.valueOf(priority.toUpperCase()))
                    .category(category)
                    .conversationId(conversationId)
                    .aiSummary(aiSummary)
                    .subject(subject)
                    .build();
            System.out.println("Calling ticketService.createTicket()...");

            TicketResponse ticket = ticketService.createTicket(request, userId, companyId);
            System.out.println("ticket created successfully...");

            return Map.of(
                    "success", true,
                    "ticket", ticket,
                    "message", "Ticket created successfully"
            );
        } catch (Exception e){
            System.out.println("TICKET CREATION ERROR: " + e.getClass().getName());
            System.out.println("ERROR MESSAGE: " + e.getMessage());
            e.printStackTrace();
            return Map.of(
                    "success", false,
                    "message", "Failed to create ticket: " + e.getMessage()
            );
        }
    }

    @Tool(description = """
            Search the employee's support tickets using a description,
            keyword, issue, or ticket status such as OPEN, CLOSED, VPN,
            payment, login, password, etc.
            
           Use this tool first when the employee wants to find their
           open tickets before updating them.
        """)
    public List<TicketResponse> searchMyTickets(
            @ToolParam(description = "Description or keyword describing the ticket")
            String query,
            ToolContext toolContext
    ) {
        Long userId = (Long) toolContext.getContext().get("userId");
        return ticketService.searchMyTickets(query, userId);
    }

    @Tool(description = """
    Update an existing support ticket.

    Use this when the employee wants to change the ticket status,
    priority, subject, or AI summary.

    If the employee asks to close an open ticket, set status to CLOSED.
    If the employee asks to close all open tickets, first use
    searchMyTickets to find their open tickets, then call this tool
    for each ticket with status CLOSED.
    """)
    public Object updateTicket(

            @ToolParam(description = "ID of the ticket to update")
            Long ticketId,

            @ToolParam(description = "New ticket status, or null if unchanged")
            String status,

            @ToolParam(description = "New priority, or null if unchanged")
            String priority,

            @ToolParam(description = "New subject, or null if unchanged")
            String subject,

            @ToolParam(description = "Updated AI summary, or null if unchanged")
            String aiSummary,
            ToolContext toolContext
    ) {
        Long userId = (Long) toolContext.getContext().get("userId");
        Long companyId = (Long) toolContext.getContext().get("companyId");
        String role = (String) toolContext.getContext().get("role");
        try {
            UpdateTicketRequest request = new UpdateTicketRequest();

            if (status != null) {
                request.setTicketStatus(
                        TicketStatus.valueOf(status.toUpperCase())
                );
            }

            if (priority != null) {
                request.setTicketPriority(
                        TicketPriority.valueOf(priority.toUpperCase())
                );
            }

            request.setSubject(subject);
            request.setAiSummary(aiSummary);

            TicketResponse ticket =
                    ticketService.updateTicket(ticketId, request, userId, companyId, role);

            return Map.of(
                    "success", true,
                    "ticket", ticket,
                    "message", "Ticket updated successfully"
            );

        } catch (Exception e) {
            return Map.of(
                    "success", false,
                    "message", "Failed to update ticket: " + e.getMessage()
            );
        }
    }
}
