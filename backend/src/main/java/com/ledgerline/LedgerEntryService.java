package com.ledgerline;

import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.List;

@Service
public class LedgerEntryService {

    private final LedgerEntryRepository ledgerEntryRepository;

    public LedgerEntryService(LedgerEntryRepository ledgerEntryRepository) {
        this.ledgerEntryRepository = ledgerEntryRepository;
    }

    // Deposit: Debit system account, Credit customer account
    public void recordDeposit(
            Transaction transaction,
            Account customerAccount,
            BigDecimal amount) {

        saveBalancedEntries(
                transaction,
                null,
                "SYSTEM:CASH",
                customerAccount,
                "CUSTOMER:" + customerAccount.getAccountNumber(),
                amount
        );
    }

    // Withdrawal: Debit customer account, Credit system account
    public void recordWithdrawal(
            Transaction transaction,
            Account customerAccount,
            BigDecimal amount) {

        saveBalancedEntries(
                transaction,
                customerAccount,
                "CUSTOMER:" + customerAccount.getAccountNumber(),
                null,
                "SYSTEM:CASH",
                amount
        );
    }

    // Transfer: Debit sender, Credit receiver
    public void recordTransfer(
            Transaction transaction,
            Account sourceAccount,
            Account destinationAccount,
            BigDecimal amount) {

        if (sourceAccount.getId().equals(destinationAccount.getId())) {
            throw new IllegalArgumentException(
                    "Source and destination accounts must be different."
            );
        }

        saveBalancedEntries(
                transaction,
                sourceAccount,
                "CUSTOMER:" + sourceAccount.getAccountNumber(),
                destinationAccount,
                "CUSTOMER:" + destinationAccount.getAccountNumber(),
                amount
        );
    }

    private void saveBalancedEntries(
            Transaction transaction,
            Account debitAccount,
            String debitCode,
            Account creditAccount,
            String creditCode,
            BigDecimal amount) {

        if (transaction == null || amount == null ||
                amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(
                    "Transaction and a positive amount are required."
            );
        }

        LedgerEntry debitEntry = new LedgerEntry();
        debitEntry.setTransaction(transaction);
        debitEntry.setAccount(debitAccount);
        debitEntry.setLedgerAccountCode(debitCode);
        debitEntry.setAmount(amount);
        debitEntry.setEntryType(EntryType.DEBIT);

        LedgerEntry creditEntry = new LedgerEntry();
        creditEntry.setTransaction(transaction);
        creditEntry.setAccount(creditAccount);
        creditEntry.setLedgerAccountCode(creditCode);
        creditEntry.setAmount(amount);
        creditEntry.setEntryType(EntryType.CREDIT);

        // Verify that total debits equal total credits.
        BigDecimal totalDebits = debitEntry.getAmount();
        BigDecimal totalCredits = creditEntry.getAmount();

        if (totalDebits.compareTo(totalCredits) != 0) {
            throw new IllegalStateException(
                    "Ledger entries are not balanced."
            );
        }

        ledgerEntryRepository.saveAll(
                List.of(debitEntry, creditEntry)
        );
    }
}