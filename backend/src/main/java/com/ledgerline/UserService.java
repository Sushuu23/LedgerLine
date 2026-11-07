
package com.ledgerline;

import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public User registerUser(
            String fullName,
            String email,
            String password) {

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException(
                "Email is already registered."
            );
        }

        User user = new User();

        user.setFullName(fullName);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));

        // All public registrations receive the basic account-holder role.
        user.setRole(Role.ACCOUNT_HOLDER);

        return userRepository.save(user);
    }
}
