package com.tanujmethi.ticketChatService.dto;

public record ChatUserDetails(
        Long userId,
        Long companyId,
        String email,
        String role
) {
}
