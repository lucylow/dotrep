# Testing Guide for Pallet Reputation

This guide explains how to use the mock runtime and test suite for the reputation pallet.

## Overview

The pallet includes a comprehensive testing setup following Polkadot SDK best practices:

- **Mock Runtime** (`src/mock.rs`): Complete test environment setup
- **Test Suite** (`src/tests.rs`): Comprehensive test cases
- **Pallet Implementation** (`src/lib.rs`): Full pallet with storage, events, and errors

## Running Tests

```bash
cd pallets/reputation
cargo test
```

To run with output:

```bash
cargo test -- --nocapture
```

To run a specific test:

```bash
cargo test test_submit_contribution_mock
```

## Test Structure

### Mock Runtime Setup

The mock runtime (`mock.rs`) provides:

1. **Test Runtime**: Complete runtime with System, Balances, and Reputation pallets
2. **Test Accounts**: Pre-configured accounts with balances
3. **Genesis Configuration**: Initial state setup for testing
4. **Parameter Types**: Configurable constants for testing

### Test Cases

The test suite (`tests.rs`) includes:

1. **test_submit_contribution_mock**: Tests basic contribution submission and duplicate prevention
2. **test_reputation_score_update_mock**: Tests reputation score calculation with multiple contributions
3. **test_max_contributions_limit**: Tests enforcement of maximum contributions per account
4. **test_reputation_bounds**: Tests that reputation scores stay within configured bounds
5. **test_different_contribution_types**: Tests different contribution types and their scoring
6. **test_unauthorized_submission**: Tests authorization checks

## Key Concepts

### Test Externalities

The `new_test_ext()` function creates a test environment:

```rust
new_test_ext().execute_with(|| {
    // Your test code here
});
```

### Assertions

- `assert_ok!()`: Asserts that a dispatchable call succeeds
- `assert_noop!()`: Asserts that a dispatchable call fails with a specific error

### Origins

- `RuntimeOrigin::signed(account)`: Signed transaction from an account
- `RuntimeOrigin::none()`: Unsigned transaction (should fail for most calls)

## Example Test Pattern

```rust
#[test]
fn my_test() {
    new_test_ext().execute_with(|| {
        let account: u64 = 1;
        let proof_hash = H256::from_low_u64_be(12345);

        // Test successful call
        assert_ok!(Reputation::submit_contribution(
            RuntimeOrigin::signed(account),
            proof_hash,
            ContributionType::PullRequest,
        ));

        // Test error case
        assert_noop!(
            Reputation::submit_contribution(
                RuntimeOrigin::signed(account),
                proof_hash, // Same hash - should fail
                ContributionType::PullRequest,
            ),
            Error::<Test>::ContributionAlreadySubmitted
        );
    });
}
```

## Best Practices

1. **Isolate Tests**: Each test should be independent and not rely on state from other tests
2. **Use Descriptive Names**: Test names should clearly describe what they test
3. **Test Both Success and Failure**: Test both happy paths and error conditions
4. **Use Realistic Data**: Use realistic account IDs, hashes, and values
5. **Test Edge Cases**: Test boundary conditions (max values, empty states, etc.)

## Debugging Tests

If a test fails, you can:

1. Run with `--nocapture` to see print statements:
   ```bash
   cargo test -- --nocapture
   ```

2. Run a specific test:
   ```bash
   cargo test test_name -- --nocapture
   ```

3. Use `println!` in tests for debugging:
   ```rust
   println!("Debug: score = {}", score);
   ```

## Resources

- [Polkadot SDK Testing Documentation](https://docs.substrate.io/tutorials/polkadot-sdk/parachains/zero-to-hero/pallet-unit-testing/)
- [FRAME Testing Guide](https://docs.substrate.io/reference/how-to-guides/testing/)
- [Substrate Testing Best Practices](https://docs.substrate.io/develop/runtime-testing/)


