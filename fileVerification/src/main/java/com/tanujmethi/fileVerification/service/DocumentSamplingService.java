package com.tanujmethi.fileVerification.service;

import com.tanujmethi.fileVerification.dto.DocumentChunk;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class DocumentSamplingService {
    public List<DocumentChunk> sampleChunks(
            List<DocumentChunk> chunks,
            int sampleCount
    ) {

        if (chunks == null || chunks.isEmpty()) {
            return List.of();
        }

        if (chunks.size() <= sampleCount) {
            return chunks;
        }

        List<DocumentChunk> samples = new ArrayList<>();

        for (int i = 0; i < sampleCount; i++) {

            int index = (int) Math.round(
                    i * (chunks.size() - 1.0) / (sampleCount - 1)
            );

            samples.add(chunks.get(index));
        }

        return samples;
    }
}
