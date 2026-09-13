package com.tanujmethi.raghelpdesk.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;

@Service
public class S3StorageService {
    private final S3Client s3Client;

    @Value("${aws.s3.bucket-name}")
    private String buketName;

    public S3StorageService(S3Client s3Client) {
        this.s3Client = s3Client;
    }

    public String upload(MultipartFile file, Long companyId, Long documentId) throws IOException{
        String key = "companies/" + companyId + "/documents/" + documentId + "/" + file.getOriginalFilename();

        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(buketName)
                .key(key)
                .contentType(file.getContentType())
                .build();

        s3Client.putObject(request, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

        return key;
    }

    public void delete(String key){
        DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
                .bucket(buketName)
                .key(key)
                .build();

        s3Client.deleteObject(deleteObjectRequest);
    }
}
