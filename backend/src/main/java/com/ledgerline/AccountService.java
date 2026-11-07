
package com.ledgerline;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
public class AccountService {

    private final AccountRepository accountRepository;
    private final UserRepository userRepository;

    public AccountService(
            AccountRepository accountRepository,
            UserRepository userRepository) {
        this.accountRepository = accountRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public Account createAccount(Long userId) {

        User owner = userRepository.findById(userId)
                .orElseThrow(() ->
                    new IllegalArgumentException("User not found")
                );

        String accountNumber;

        do {
            accountNumber = "LL" +
                    UUID.randomUUID()
                    .toString()
                    .replace("-", "")
                    .substring(0, 12)
                    .toUpperCase();
        } while (
            accountRepository.existsByAccountNumber(accountNumber)
        );

        Account account = new Account();

        account.setAccountNumber(accountNumber);
        account.setOwner(owner);
        account.setBalance(BigDecimal.ZERO);
        account.setCurrency("INR");

        return accountRepository.save(account);
    }
}

