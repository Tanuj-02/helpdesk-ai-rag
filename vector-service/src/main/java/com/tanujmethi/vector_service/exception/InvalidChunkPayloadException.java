package com.tanujmethi.vector_service.exception;

public class InvalidChunkPayloadException extends RuntimeException{
    public InvalidChunkPayloadException(String message) {
        super(message);
    }
}
