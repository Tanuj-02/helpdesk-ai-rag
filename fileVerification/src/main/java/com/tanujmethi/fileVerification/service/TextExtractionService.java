package com.tanujmethi.fileVerification.service;

import org.apache.tika.Tika;
import org.apache.tika.exception.TikaException;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;

@Service
public class TextExtractionService {

    private final Tika tika = new Tika();

    public String extractText(
            InputStream inputStream,
            String fileName
    ) throws IOException {

        try {
            return tika.parseToString(inputStream);
        } catch (TikaException e) {
            throw new IOException(
                    "Failed to extract text from file: " + fileName,
                    e
            );
        }
    }
}
