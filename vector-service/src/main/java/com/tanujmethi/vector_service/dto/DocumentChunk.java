package com.tanujmethi.vector_service.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentChunk {
    private int chunkNumber;
    private String content;
}
