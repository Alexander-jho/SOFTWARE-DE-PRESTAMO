# Security Specification for Prestafácil

## 1. Data Invariants
- A status can only be `active`, `overdue`, or `paid`.
- `remainingBalance` cannot be negative.
- `totalPaid` must be the sum of all associated payments (enforced by application logic and rules).
- `principal` and `interestRate` are immutable after creation.
- A `payment` amount cannot exceed the `remainingBalance` of the associated loan plus some buffer for mora.

## 2. The Dirty Dozen Payloads (Rejection Targets)
1. Creating a loan with negative principal.
2. Updating interest rate of an existing loan.
3. Setting `status` to `paid` while `remainingBalance > 0`.
4. Creating a payment for a non-existent loan.
5. Setting its own role as `admin` (not applicable as we use a separate `admins` collection).
6. Deleting a loan that has non-zero balance (optional, but good for integrity).
7. Injecting a massive string (1MB) as `clientName`.
8. Setting `totalPaid` to a value higher than `totalToPay` + mora.
9. Modifying `createdAt` during an update.
10. Creating a payment with a date in the future.
11. Reading a loan document without being authenticated.
12. Listing all loans without authentication.

## 3. Test Runner (Conceptual)
All write operations must pass `isValidLoan` or `isValidPayment`.
All list operations must be authenticated.
Admin features (config) restricted to `isAdmin()`.
