# Multi-stage Dockerfile to build and run GyanYatra API with Java 25
FROM maven:3.9.9-eclipse-temurin-25 AS build
WORKDIR /app

# Copy pom.xml files first for caching dependencies
COPY pom.xml .
COPY gyanyatra_core/pom.xml gyanyatra_core/
COPY gyanyatra_ai/pom.xml gyanyatra_ai/
COPY gyanyatra_api/pom.xml gyanyatra_api/

# Download dependencies (go-offline)
RUN mvn dependency:go-offline -B

# Copy the actual source files
COPY gyanyatra_core/src gyanyatra_core/src
COPY gyanyatra_ai/src gyanyatra_ai/src
COPY gyanyatra_api/src gyanyatra_api/src

# Build the project, skipping tests to speed up deployment builds
RUN mvn clean package -DskipTests

# Runtime stage using a lightweight JRE image
FROM eclipse-temurin:25-jre-alpine
WORKDIR /app

# Copy the built jar from the build stage
COPY --from=build /app/gyanyatra_api/target/gyanyatra_api-1.0.0.jar app.jar

# Expose port 8080
EXPOSE 8080

# Run the jar with recommended JVM memory options for free tier (512MB RAM)
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-XX:ActiveProcessorCount=1", "-jar", "app.jar"]
