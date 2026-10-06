package com.tanujmethi.raghelpdesk.entity;


import com.fasterxml.jackson.annotation.JsonIgnore;
import com.tanujmethi.raghelpdesk.enums.Status;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Company {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    @Column(unique = true)
    private String email;
    @Enumerated(EnumType.STRING)
    private Status status;
    @CreationTimestamp
    private LocalDateTime createAt;
    @JsonIgnore
    private String apiKey;
    private LocalDateTime apiUpdatedAt;
}
