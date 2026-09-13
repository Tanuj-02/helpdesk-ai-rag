package com.tanujmethi.raghelpdesk.entity;

import com.tanujmethi.raghelpdesk.enums.DocumentCategory;
import com.tanujmethi.raghelpdesk.enums.DocumentStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.springframework.cglib.core.Local;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompanyDocument {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String title;
    private String fileName;
    private String s3Key;
    private String contentType;
    private Long fileSize;
    @Enumerated(EnumType.STRING)
    private DocumentCategory category;
    @Enumerated(EnumType.STRING)
    private DocumentStatus status;
    private boolean aiRelevant;
    private Double aiConfidence;
    @Column(length = 1000)
    private String rejectionReason;
    private String contentHash;
    private LocalDateTime processedAt;
    @CreationTimestamp
    private LocalDateTime createdAt;
    @ManyToOne
    @JoinColumn(name = "company_id")
    private Company company;
}
