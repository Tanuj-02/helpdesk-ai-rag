package com.tanujmethi.fileVerification.service;

import com.tanujmethi.fileVerification.dto.DocumentChunk;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class DocumentChunkingService {

    private static final int CHUNK_SIZE = 8000;
    private static final int CHUNK_OVERLAP = 500;

    public List<DocumentChunk> chunkText(String text) {

        if (text == null || text.isBlank()) {
            return List.of();
        }

        List<DocumentChunk> chunks = new ArrayList<>();

        int start = 0;
        int chunkNumber = 1;

        while (start < text.length()) {

            int end = Math.min(
                    start + CHUNK_SIZE,
                    text.length()
            );

            String content = text.substring(start, end);

            chunks.add(
                    DocumentChunk.builder()
                            .chunkNumber(chunkNumber++)
                            .content(content)
                            .build()
            );

            if (end == text.length()) {
                break;
            }

            start = end - CHUNK_OVERLAP;
        }

        return chunks;
    }
}