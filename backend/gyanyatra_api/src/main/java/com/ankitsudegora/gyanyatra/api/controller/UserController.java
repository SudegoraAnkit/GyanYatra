package com.ankitsudegora.gyanyatra.api.controller;

import com.ankitsudegora.gyanyatra.core.model.User;
import com.ankitsudegora.gyanyatra.core.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

/**
 * The Gateway for Seeker Registration and Profile management.
 */
@RestController
@RequestMapping("/api/v1/yatra/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    @PostMapping
    public ResponseEntity<User> registerSeeker(@RequestBody User user) {
        user.setCreatedAt(LocalDateTime.now());
        user.setTotalKarmaPoints(0);
        return ResponseEntity.ok(userRepository.save(user));
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getSeekerProfile(@PathVariable String id) {
        return userRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
