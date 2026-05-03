package com.mermaid.app.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

/**
 * Local filesystem storage implementation.
 * Stores files under the configured upload directory (default: {@code uploads/}).
 * Files are served via static resource mapping at {@code /uploads/**}.
 */
@Service
public class LocalStorageService implements StorageService {

    private static final Logger log = LoggerFactory.getLogger(LocalStorageService.class);

    private final Path rootDir;
    private final String baseUrl;

    public LocalStorageService(
            @Value("${app.upload-dir:uploads}") String uploadDir,
            @Value("${app.base-url:http://localhost:8080/api}") String baseUrl) {
        this.rootDir = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.baseUrl = baseUrl;
        try {
            Files.createDirectories(rootDir);
            log.info("Upload directory initialized at: {}", rootDir);
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory: " + rootDir, e);
        }
    }

    @Override
    public String store(MultipartFile file, String subDir) throws IOException {
        Path targetDir = rootDir.resolve(subDir).normalize();
        if (!targetDir.startsWith(rootDir)) {
            throw new IOException("Invalid subdirectory: " + subDir);
        }
        Files.createDirectories(targetDir);

        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf('.'));
        }

        String storedName = UUID.randomUUID() + extension;
        Path targetPath = targetDir.resolve(storedName);

        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
        log.debug("Stored file: {}", targetPath);

        // Return relative URL path: /uploads/subDir/filename
        return baseUrl + "/uploads/" + subDir + "/" + storedName;
    }

    @Override
    public void delete(String fileUrl) throws IOException {
        // Extract relative path from full URL
        String prefix = baseUrl + "/uploads/";
        if (!fileUrl.startsWith(prefix)) {
            log.warn("Cannot delete non-local file: {}", fileUrl);
            return;
        }
        String relativePath = fileUrl.substring(prefix.length());
        Path filePath = rootDir.resolve(relativePath).normalize();

        if (!filePath.startsWith(rootDir)) {
            throw new IOException("Path traversal detected: " + relativePath);
        }

        if (Files.exists(filePath)) {
            Files.delete(filePath);
            log.debug("Deleted file: {}", filePath);
        }
    }
}
