package com.tanujmethi.email_service.exception;

public class InvalidEmailRecipientException extends RuntimeException{
    public InvalidEmailRecipientException(String message) {
        super(message);
    }
}
