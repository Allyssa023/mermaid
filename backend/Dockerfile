# ══════════════════════════════════════════════════════════
#  MERMAID Backend — Spring Boot 4 / Java 17
#  Multi-stage build: JDK → JRE-only runtime
# ══════════════════════════════════════════════════════════

# ── Stage 1: Build ────────────────────────────────────────
FROM eclipse-temurin:17-jdk AS build

WORKDIR /build

# Copy Maven wrapper + pom first (layer caching)
COPY mvnw mvnw.cmd pom.xml ./
COPY .mvn .mvn

# Download dependencies (cached unless pom changes)
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

# Copy source and build
COPY src src
RUN ./mvnw package -DskipTests -B

# ── Stage 2: Runtime ─────────────────────────────────────
FROM eclipse-temurin:17-jre

WORKDIR /app

# Copy only the built JAR
COPY --from=build /build/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
