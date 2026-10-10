package com.tanujmethi.ticketChatService.exception;

public class InvalidWebSocketTokenException extends RuntimeException{
    public InvalidWebSocketTokenException(String message) {
        super(message);
    }
}
