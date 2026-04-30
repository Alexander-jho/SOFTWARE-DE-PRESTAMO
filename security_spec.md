# Security Specification - Prestafácil

## Data Invariants
1. A Loan must have an `ownerId` matching the creator's UID.
2. A Payment must be inside a Loan's subcollection and have an `ownerId` matching the creator's UID.
3. Access to a Loan (read/write) is strictly restricted to the `ownerId`.
4. `principal`, `interestRate`, `startDate`, `ownerId`, and `createdAt` are immutable after Loan creation.
5. `loanId`, `ownerId`, and `date` are immutable after Payment creation.
6. `totalPaid` and `remainingBalance` in Loan can only be updated if a corresponding Payment is created (enforced via `existsAfter`).

## The "Dirty Dozen" Payloads (Denial Expected)
1. **Identity Theft**: User A tries to create a loan with `ownerId: UserB_UID`.
2. **PII Leak**: User A tries to `get` User B's loan.
3. **Admin Escalation**: User A tries to update a loan's `ownerId` to themselves.
4. **Negative Lent**: User A tries to create a loan with `principal: -100`.
5. **Interest Spoofing**: User A tries to update `interestRate` after creation.
6. **Shadow Field**: User A tries to add `isVIP: true` to a loan document.
7. **Junk ID**: User A tries to create a loan with an ID that is 2KB of random characters.
8. **Unverified Writ**: User A tries to write without having a verified email (if strictly enforced).
9. **Orphaned Payment**: User A tries to create a payment for a loan they don't own.
10. **State Shortcut**: User A tries to set `status: 'paid'` without the `remainingBalance` being 0.
11. **Cost Attack**: User A tries to upload a 5MB base64 string as `clientName`.
12. **Zombie Update**: User A tries to update a loan that has already been marked as `paid` (Terminal State Locking).

## Test Runner Logic
The following tests will be implemented in `firestore.rules.test.ts` to verify these protections.
