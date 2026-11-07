
package com.ledgerline;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class TransactionService {

    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;

    public TransactionService(
            AccountRepository accountRepository,
            TransactionRepository transactionRepository) {

        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
    }

    // DEPOSIT
    @Transactional
    public Transaction deposit(
            String accountNumber,
            BigDecimal amount,
            String userEmail) {

        validateAmount(amount);

        Account account = accountRepository
                .findByAccountNumberForUpdate(accountNumber)
                .orElseThrow(() ->
                        new IllegalArgumentException("Account not found"));

        checkOwnership(account, userEmail);

        account.setBalance(account.getBalance().add(amount));
        accountRepository.save(account);

        Transaction transaction = new Transaction();
        transaction.setAccount(account);
        transaction.setAmount(amount);
        transaction.setType(TransactionType.DEPOSIT);

        return transactionRepository.save(transaction);
    }

    // WITHDRAWAL
    @Transactional
    public Transaction withdraw(
            String accountNumber,
            BigDecimal amount,
            String userEmail) {

        validateAmount(amount);

        Account account = accountRepository
                .findByAccountNumberForUpdate(accountNumber)
                .orElseThrow(() ->
                        new IllegalArgumentException("Account not found"));

        checkOwnership(account, userEmail);

        if (account.getBalance().compareTo(amount) < 0) {
            throw new IllegalArgumentException(
                    "Insufficient balance. Withdrawal cannot be completed.");
        }

        account.setBalance(account.getBalance().subtract(amount));
        accountRepository.save(account);

        Transaction transaction = new Transaction();
        transaction.setAccount(account);
        transaction.setAmount(amount);
        transaction.setType(TransactionType.WITHDRAWAL);

        return transactionRepository.save(transaction);
    }

    // TRANSFER
    @Transactional
    public Transaction transfer(
            String fromAccountNumber,
            String toAccountNumber,
            BigDecimal amount,
            String userEmail) {

        validateAmount(amount);

        if (fromAccountNumber.equals(toAccountNumber)) {
            throw new IllegalArgumentException(
                    "Source and destination accounts must be different.");
        }

        List<String> accountNumbers = List.of(
                fromAccountNumber, toAccountNumber
        ).stream().sorted().toList();

        Account firstAccount = accountRepository
                .findByAccountNumberForUpdate(accountNumbers.get(0))
                .orElseThrow(() ->
                        new IllegalArgumentException("Account not found"));

        Account secondAccount = accountRepository
                .findByAccountNumberForUpdate(accountNumbers.get(1))
                .orElseThrow(() ->
                        new IllegalArgumentException("Account not found"));

        Account fromAccount = firstAccount.getAccountNumber()
                .equals(fromAccountNumber) ? firstAccount : secondAccount;

        Account toAccount = firstAccount.getAccountNumber()
                .equals(toAccountNumber) ? firstAccount : secondAccount;

        checkOwnership(fromAccount, userEmail);
        checkOwnership(toAccount, userEmail);

        if (fromAccount.getBalance().compareTo(amount) < 0) {
            throw new IllegalArgumentException(
                    "Insufficient balance for transfer.");
        }

        fromAccount.setBalance(fromAccount.getBalance().subtract(amount));
        toAccount.setBalance(toAccount.getBalance().add(amount));

        accountRepository.save(fromAccount);
        accountRepository.save(toAccount);

        Transaction outgoing = new Transaction();
        outgoing.setAccount(fromAccount);
        outgoing.setAmount(amount);
        outgoing.setType(TransactionType.TRANSFER);
        transactionRepository.save(outgoing);

        Transaction incoming = new Transaction();
        incoming.setAccount(toAccount);
        incoming.setAmount(amount);
        incoming.setType(TransactionType.TRANSFER);
        transactionRepository.save(incoming);

        return outgoing;
    }

    // TRANSACTION HISTORY
    @Transactional(readOnly = true)
    public List<Transaction> getTransactionHistory(String userEmail) {

        List<Account> accounts = accountRepository.findAll()
                .stream()
                .filter(account ->
                        account.getOwner().getEmail().equals(userEmail))
                .toList();

        return accounts.stream()
                .flatMap(account ->
                        transactionRepository
                                .findByAccountIdOrderByCreatedAtDesc(
                                        account.getId())
                                .stream())
                .sorted((a, b) ->
                        b.getCreatedAt().compareTo(a.getCreatedAt()))
                .toList();
    }

    // AMOUNT VALIDATION
    private void validateAmount(BigDecimal amount) {
        if (amount == null ||
                amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(
                    "Amount must be greater than zero.");
        }

        if (amount.scale() > 2) {
            throw new IllegalArgumentException(
                    "Amount can have at most 2 decimal places.");
        }
    }

    // ACCOUNT OWNERSHIP CHECK
    private void checkOwnership(Account account, String userEmail) {
        if (!account.getOwner().getEmail().equals(userEmail)) {
            throw new SecurityException(
                    "You are not authorized to access this account.");
        }
    }
}
