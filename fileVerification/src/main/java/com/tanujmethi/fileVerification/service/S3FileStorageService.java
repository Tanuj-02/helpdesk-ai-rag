package com.tanujmethi.fileVerification.service;

import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

@Service
public class S3FileStorageService {

    private final S3Client s3Client;

    public S3FileStorageService(S3Client s3Client) {
        this.s3Client = s3Client;
    }

    public ResponseInputStream<GetObjectResponse> download(String bucket, String key) {

        GetObjectRequest request = GetObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .build();

        return s3Client.getObject(request);
    }
}