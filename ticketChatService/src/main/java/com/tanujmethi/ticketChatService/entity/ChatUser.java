package com.tanujmethi.ticketChatService.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;

@Entity
@Table(name = "user")
@Getter
public class ChatUser {
    @Id
    private Long id;

    private String name;

    @Column(name = "company_id")
    private Long companyId;
}
