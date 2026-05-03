package com.mermaid.app.controller;

import com.mermaid.app.model.UploadResponse;
import com.mermaid.app.service.StorageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Set;

@RestController
public class FileUploadController {

    private static final Set<String> ALLOWED_TYPES = Set.of(
        "image/jpeg", "image/png", "image/webp"
    );
    private static final long MAX_SIZE = 5 * 1024 * 1024; // 5MB

    private final StorageService storageService;

    public FileUploadController(StorageService storageService) {
        this.storageService = storageService;
    }

    @PostMapping("/uploads")
    public ResponseEntity<UploadResponse> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "subDir", defaultValue = "general") String subDir) throws IOException {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        if (file.getSize() > MAX_SIZE) {
            return ResponseEntity.badRequest().build();
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            return ResponseEntity.badRequest().build();
        }

        // Sanitize subDir to prevent path traversal
        String safeSubDir = subDir.replaceAll("[^a-zA-Z0-9_-]", "");
        String url = storageService.store(file, safeSubDir);

        UploadResponse response = new UploadResponse(url);
        return ResponseEntity.status(201).body(response);
    }
}
