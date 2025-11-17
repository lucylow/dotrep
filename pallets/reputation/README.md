# Pallet Reputation

A Substrate pallet for managing reputation scores based on contributions.

## Overview

This pallet implements a reputation system that tracks contributions and calculates reputation scores. It supports multiple contribution types with weighted scoring and implements safeguards against duplicate submissions and contribution limits.

## Features

- **Contribution Tracking**: Track various types of contributions (PRs, reviews, comments, etc.)
- **Reputation Scoring**: Calculate reputation scores based on contribution types
- **Duplicate Prevention**: Prevent duplicate contribution submissions using proof hashes
- **Contribution Limits**: Enforce maximum contributions per account
- **Reputation Bounds**: Ensure reputation scores stay within configured min/max bounds

## Testing

This pallet includes comprehensive mock runtime and test suite following Polkadot SDK best practices.

### Running Tests

```bash
cargo test
```

### Test Structure

- **mock.rs**: Mock runtime configuration for testing
- **tests.rs**: Comprehensive test cases covering:
  - Contribution submission
  - Duplicate prevention
  - Reputation score updates
  - Contribution limits
  - Reputation bounds
  - Different contribution types
  - Authorization checks

## Mock Runtime

The mock runtime (`mock.rs`) sets up a complete test environment with:
- System pallet
- Balances pallet
- Reputation pallet
- Pre-configured test accounts with balances
- Genesis storage initialization

## Usage Example

```rust
use pallet_reputation::{self as reputation};

// Submit a contribution
reputation::Pallet::<Test>::submit_contribution(
    Origin::signed(account),
    proof_hash,
    ContributionType::PullRequest,
)?;

// Get reputation score
let score = reputation::Pallet::<Test>::get_reputation(&account);
```

## Configuration

The pallet requires the following configuration parameters:

- `MaxContributionsPerAccount`: Maximum number of contributions per account
- `MinReputation`: Minimum reputation score
- `MaxReputation`: Maximum reputation score

## Resources

- [Polkadot SDK Documentation](https://docs.substrate.io/)
- [FRAME Pallet Development](https://docs.substrate.io/tutorials/work-with-pallets/)
- [Substrate Testing Guide](https://docs.substrate.io/tutorials/polkadot-sdk/parachains/zero-to-hero/pallet-unit-testing/)


