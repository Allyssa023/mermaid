package com.mermaid.app.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class LocalStorageServiceTest {

    @TempDir Path tempDir;
    private LocalStorageService service;

    @BeforeEach
    void setUp() {
        service = new LocalStorageService(tempDir.toString(), "http://localhost:8080/api");
    }

    @Test
    void store_savesFileAndReturnsUrl() throws IOException {
        MockMultipartFile file = new MockMultipartFile(
            "file", "photo.jpg", "image/jpeg", "test-image-data".getBytes()
        );

        String url = service.store(file, "avatars");

        assertTrue(url.startsWith("http://localhost:8080/api/uploads/avatars/"));
        assertTrue(url.endsWith(".jpg"));

        // Verify file exists on disk
        String filename = url.substring(url.lastIndexOf('/') + 1);
        Path stored = tempDir.resolve("avatars").resolve(filename);
        assertTrue(Files.exists(stored));
        assertEquals("test-image-data", Files.readString(stored));
    }

    @Test
    void store_generatesUniqueFilenames() throws IOException {
        MockMultipartFile file1 = new MockMultipartFile("file", "a.png", "image/png", "data1".getBytes());
        MockMultipartFile file2 = new MockMultipartFile("file", "a.png", "image/png", "data2".getBytes());

        String url1 = service.store(file1, "test");
        String url2 = service.store(file2, "test");

        assertNotEquals(url1, url2);
    }

    @Test
    void store_handlesFileWithoutExtension() throws IOException {
        MockMultipartFile file = new MockMultipartFile("file", "noext", "image/png", "data".getBytes());
        String url = service.store(file, "general");
        assertNotNull(url);
        assertFalse(url.contains("."));
    }

    @Test
    void store_rejectsPathTraversal() {
        MockMultipartFile file = new MockMultipartFile("file", "hack.jpg", "image/jpeg", "data".getBytes());
        assertThrows(IOException.class, () -> service.store(file, "../../../etc"));
    }

    @Test
    void delete_removesFile() throws IOException {
        MockMultipartFile file = new MockMultipartFile("file", "del.jpg", "image/jpeg", "data".getBytes());
        String url = service.store(file, "temp");

        service.delete(url);

        String filename = url.substring(url.lastIndexOf('/') + 1);
        Path stored = tempDir.resolve("temp").resolve(filename);
        assertFalse(Files.exists(stored));
    }

    @Test
    void delete_nonLocalUrl_ignored() throws IOException {
        // Should not throw
        service.delete("https://external.com/file.jpg");
    }
}
