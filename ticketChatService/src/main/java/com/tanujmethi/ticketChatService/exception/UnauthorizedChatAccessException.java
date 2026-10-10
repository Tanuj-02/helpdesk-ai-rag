package com.tanujmethi.ticketChatService.exception;

public class UnauthorizedChatAccessException extends RuntimeException{
    public UnauthorizedChatAccessException(String message) {
        super(message);
    }
}
