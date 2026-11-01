package com.tanujmethi.ticketChatService.config;

import com.tanujmethi.ticketChatService.dto.ChatUserDetails;
import com.tanujmethi.ticketChatService.exception.ChatNotFoundException;
import com.tanujmethi.ticketChatService.exception.InvalidWebSocketTokenException;
import com.tanujmethi.ticketChatService.exception.UnauthorizedChatAccessException;
import com.tanujmethi.ticketChatService.security.JwtService;
import com.tanujmethi.ticketChatService.service.ChatService;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private static final Pattern TICKET_TOPIC = Pattern.compile("^/topic/ticket/([1-9][0-9]*)$");
    private static final String CHAT_SEND_DESTINATION = "/app/ticket/chat";

    private final JwtService jwtService;
    private final ChatService chatService;

    public WebSocketAuthInterceptor(JwtService jwtService, ChatService chatService) {
        this.jwtService = jwtService;
        this.chatService = chatService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            throw new AccessDeniedException("Invalid WebSocket message");
        }

        StompCommand command = accessor.getCommand();
        if (StompCommand.CONNECT.equals(command)) {
            authenticateConnect(accessor);
            return message;
        }

        if (StompCommand.SUBSCRIBE.equals(command)) {
            ChatUserDetails user = authenticatedUser(accessor);
            Matcher matcher = TICKET_TOPIC.matcher(accessor.getDestination() == null ? "" : accessor.getDestination());
            if (!matcher.matches()) {
                throw new AccessDeniedException("Subscription destination is not allowed");
            }

            Long ticketId;
            try {
                ticketId = Long.valueOf(matcher.group(1));
            } catch (NumberFormatException ex) {
                throw new AccessDeniedException("Invalid ticket destination", ex);
            }

            try {
                chatService.requireAccess(ticketId, user);
            } catch (ChatNotFoundException | UnauthorizedChatAccessException ex) {
                throw new AccessDeniedException("Not authorized to subscribe to this ticket", ex);
            }
            return message;
        }

        if (StompCommand.SEND.equals(command)) {
            authenticatedUser(accessor);
            if (!CHAT_SEND_DESTINATION.equals(accessor.getDestination())) {
                throw new AccessDeniedException("Send destination is not allowed");
            }
            return message;
        }

        if (StompCommand.UNSUBSCRIBE.equals(command) || StompCommand.DISCONNECT.equals(command)) {
            return message;
        }

        throw new AccessDeniedException("WebSocket command is not allowed");
    }

    private void authenticateConnect(StompHeaderAccessor accessor) {
        String authHeader = accessor.getFirstNativeHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new InvalidWebSocketTokenException("Missing Authorization header");
        }

        String token = authHeader.substring(7);
        if (!jwtService.isTokenValid(token)) {
            throw new InvalidWebSocketTokenException("Invalid JWT token");
        }

        Long userId = jwtService.extractUserId(token);
        Long companyId = jwtService.extractCompanyId(token);
        String email = jwtService.extractEmail(token);
        String role = jwtService.extractRole(token);
        if (userId == null || companyId == null || email == null || role == null) {
            throw new InvalidWebSocketTokenException("Missing required JWT claims");
        }

        ChatUserDetails user = new ChatUserDetails(userId, companyId, email, role);
        accessor.setUser(new UsernamePasswordAuthenticationToken(
                user, null, List.of(new SimpleGrantedAuthority("ROLE_" + role))));
    }

    private ChatUserDetails authenticatedUser(StompHeaderAccessor accessor) {
        if (!(accessor.getUser() instanceof Authentication authentication) || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("WebSocket authentication is required");
        }
        if (!(authentication.getPrincipal() instanceof ChatUserDetails user)) {
            throw new AccessDeniedException("Invalid WebSocket principal");
        }
        return user;
    }
}
