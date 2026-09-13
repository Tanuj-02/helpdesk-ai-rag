package com.tanujmethi.raghelpdesk.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompanyInvitation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;
    private String email;
    @Column(nullable = false, unique = true)
    private String token;
    @CreationTimestamp
    private LocalDateTime createAt;
    private boolean used;
    private LocalDateTime expiresAt;
    @ManyToOne
    @JoinColumn(name = "invited_by_id")
    private User invitedBy;
}
