package com.tanujmethi.fileVerification.dto;

import lombok.*;

@Builder
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class DocumentChunk {

    private int chunkNumber;

    private String content;
}