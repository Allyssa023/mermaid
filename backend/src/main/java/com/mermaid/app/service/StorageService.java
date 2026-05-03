package com.mermaid.app.service;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * Abstraction over file storage. Implementations handle local filesystem
 * (dev) or cloud object storage (S3/MinIO for prod).
 */
public interface StorageService {

    /**
     * Store a file and return its public-facing URL.
     *
     * @param file     the uploaded file
     * @param subDir   subdirectory under the root (e.g., "avatars", "listings")
     * @return the URL where the file can be accessed
     */
    String store(MultipartFile file, String subDir) throws IOException;

    /**
     * Delete a previously stored file by its URL.
     */
    void delete(String fileUrl) throws IOException;
}
