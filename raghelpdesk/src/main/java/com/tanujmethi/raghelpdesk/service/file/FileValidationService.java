package com.tanujmethi.raghelpdesk.service.file;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Set;

@Service
public class FileValidationService {

    private static final long maxFileSize = 100 * 1024 * 1024;

    private static final Set<String> allowedFileTypes = Set.of(
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain",
            "text/csv"
    );

    public void validate(MultipartFile file) {

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        if (file.getSize() > maxFileSize) {
            throw new IllegalArgumentException(
                    "File size must not exceed 100 MB"
            );
        }

        String contentType = file.getContentType();

        if (contentType == null ||
                !allowedFileTypes.contains(contentType)) {

            throw new IllegalArgumentException(
                    "Unsupported file type: " + contentType
            );
        }
    }
}
