package com.ankitsudegora.gyanyatra.api.controller;

import com.ankitsudegora.gyanyatra.core.model.User;
import com.ankitsudegora.gyanyatra.core.repository.UserRepository;
import com.ankitsudegora.gyanyatra.core.service.OtpService;
import com.ankitsudegora.gyanyatra.core.service.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * The Gateway for Seeker Registration and Profile management.
 */
@RestController
@RequestMapping("/api/v1/yatra/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserRepository userRepository;
    private final OtpService otpService;
    private final JwtService jwtService;

    @PostMapping
    public ResponseEntity<User> registerSeeker(@RequestBody User user) {
        user.setCreatedAt(LocalDateTime.now());
        user.setTotalKarmaPoints(0);
        if (user.getAdditionalSkills() == null) {
            user.setAdditionalSkills(new java.util.ArrayList<>());
        }
        if (user.getBio() == null || user.getBio().isEmpty()) {
            user.setBio("Passionate Seeker on the GyanYatra.");
        }
        return ResponseEntity.ok(userRepository.save(user));
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getSeekerProfile(@PathVariable String id) {
        return userRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<User> updateSeekerProfile(@PathVariable String id, @RequestBody User updatedUser) {
        return userRepository.findById(id)
                .map(user -> {
                    if (updatedUser.getName() != null) {
                        user.setName(updatedUser.getName());
                    }
                    if (updatedUser.getBio() != null) {
                        user.setBio(updatedUser.getBio());
                    }
                    if (updatedUser.getAdditionalSkills() != null) {
                        user.setAdditionalSkills(updatedUser.getAdditionalSkills());
                    }
                    if (updatedUser.getAcharyaPersona() != null) {
                        user.setAcharyaPersona(updatedUser.getAcharyaPersona());
                    }
                    user.setUpdatedAt(LocalDateTime.now());
                    return ResponseEntity.ok(userRepository.save(user));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<java.util.List<User>> getLeaderboard() {
        return ResponseEntity.ok(userRepository.findTop10ByOrderByTotalKarmaPointsDesc());
    }

    /**
     * Generate an OTP for login validation.
     */
    @PostMapping("/login/otp/generate")
    public ResponseEntity<?> generateLoginOtp(@RequestParam String email) {
        log.info("Request to generate OTP for email: {}", email);
        try {
            otpService.generateOtp(email);
            Map<String, String> response = new HashMap<>();
            response.put("message", "OTP security code successfully dispatched.");
            return ResponseEntity.ok(response);
        } catch (IllegalStateException e) {
            log.warn("Rate limit exceeded for email: {}. Message: {}", email, e.getMessage());
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(response);
        }
    }

    /**
     * Verify the OTP and log in/register the user.
     */
    @PostMapping("/login/otp/verify")
    public ResponseEntity<?> verifyLoginOtp(
            @RequestParam String email,
            @RequestParam String otp,
            @RequestParam(required = false) String name) {
        log.info("Request to verify OTP for email: {}", email);

        if (otp == null || otp.trim().isEmpty() || otp.trim().length() != 6 || !otp.trim().matches("\\d{6}")) {
            log.warn("Invalid OTP input format received for email: {}", email);
            Map<String, String> err = new HashMap<>();
            err.put("error", "Security OTP code must be a 6-digit number.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }

        String cleanedOtp = otp.trim();
        boolean isValid = otpService.validateOtp(email, cleanedOtp);
        if (!isValid) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Invalid or expired OTP. Please try again.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
        }

        // Login or Register user
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            log.info("User found. Logging in: {}", email);
            String token = jwtService.generateToken(user.getId(), user.getEmail());
            user.setToken(token);
            return ResponseEntity.ok(user);
        } else {
            log.info("User not found. Registering new user: {}", email);
            User newUser = new User();
            newUser.setEmail(email);
            newUser.setName(name != null && !name.trim().isEmpty() ? name : "Seeker");
            newUser.setCreatedAt(LocalDateTime.now());
            newUser.setTotalKarmaPoints(0);
            newUser.setAdditionalSkills(new java.util.ArrayList<>());
            newUser.setBio("Passionate Seeker on the GyanYatra.");
            
            User saved = userRepository.save(newUser);
            String token = jwtService.generateToken(saved.getId(), saved.getEmail());
            saved.setToken(token);
            return ResponseEntity.ok(saved);
        }
    }

    @GetMapping("/{id}/roadmap")
    public ResponseEntity<Map<String, Object>> getRoadmapData(@PathVariable String id) {
        return userRepository.findById(id)
                .map(user -> ResponseEntity.ok(user.getRoadmapData() != null ? user.getRoadmapData() : new HashMap<String, Object>()))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/roadmap")
    public ResponseEntity<User> updateRoadmapData(@PathVariable String id, @RequestBody Map<String, Object> roadmapData) {
        return userRepository.findById(id)
                .map(user -> {
                    user.setRoadmapData(roadmapData);
                    user.setUpdatedAt(LocalDateTime.now());
                    return ResponseEntity.ok(userRepository.save(user));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
