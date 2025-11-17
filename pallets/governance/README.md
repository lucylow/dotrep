# Pallet Governance - DAO Governance with Reputation-Based Voting

A comprehensive Substrate pallet implementing sophisticated DAO governance features powered by reputation scores. This pallet demonstrates how reputation can be used to create more equitable and expert-driven governance systems on Polkadot.

## Overview

This pallet implements a reputation-based governance system that moves beyond traditional "one-token-one-vote" plutocracy and "one-person-one-vote" Sybil vulnerability. It integrates deeply with the DotRep reputation system to provide:

- **Reputation-Weighted Voting**: Voting power determined by reputation scores
- **Quadratic Voting**: Prevents whale dominance while respecting expertise
- **Expertise-Based Voting**: Votes weigh more on proposals related to proven skills
- **Reputation-Bounded Delegation**: Liquid democracy with safeguards against centralization
- **Reputation Council**: Rotating council of top contributors for time-sensitive decisions
- **Cross-Chain Governance**: XCM-ready for interoperable reputation across parachains

## Features

### Core Governance Mechanics

1. **Reputation-Weighted Voting**
   - A user's voting power is determined by their reputation score
   - High-reputation contributors have more influence than new users
   - Implemented as on-chain logic for transparency and immutability

2. **Quadratic Voting with Reputation**
   - Voting power = `sqrt(Reputation Score)`
   - Diminishes whale power while still respecting expertise
   - Prevents centralized control by high-reputation accounts

3. **Proposal Thresholds**
   - Minimum reputation score required to create proposals
   - Prevents spam and ensures quality proposals
   - Configurable per runtime

### Advanced Features

1. **Expertise-Based Voting (Specialized Influence)**
   - Votes weigh more on proposals related to proven skills
   - If a proposal is tagged with `#Runtime-Development`, users with high `#Rust` and `#Polkadot-SDK` skill tags get voting power boost
   - Ensures technical decisions are guided by relevant expertise

2. **Reputation-Bounded Delegation (Liquid Democracy++)**
   - Users can delegate voting power to others
   - Delegation capacity capped by delegatee's own reputation score
   - Prevents emergence of centralized "super-delegates"
   - Encourages broader participation

3. **The Reputation Council**
   - Rotating council of most reputable and active contributors
   - Empowered for time-sensitive operations
   - Actions are fully on-chain and can be vetoed by community-wide vote
   - Automatic rotation based on reputation rankings

4. **Skill Tags System**
   - Users can update their skill tags
   - Used for expertise-based voting calculations
   - Enables specialized influence on relevant proposals

## Architecture

### Storage Items

- `NextProposalId`: Counter for proposal IDs
- `Proposals`: Map of proposal ID to proposal details
- `Votes`: Double map tracking votes per proposal per account
- `Delegations`: Map of delegator to delegation details
- `CouncilMembers`: List of current council members
- `CouncilTermEnd`: Block number when current council term ends
- `SkillTags`: Map of account to their skill tags

### Dispatchable Functions

1. `create_proposal`: Create a new governance proposal
2. `vote`: Vote on a proposal (for or against) - supports vote changes
3. `delegate_vote`: Delegate voting power to another account (global or per-proposal)
4. `revoke_vote`: Revoke your vote on a proposal (before voting ends)
5. `revoke_delegation`: Revoke your delegation to another account
6. `cancel_proposal`: Cancel a proposal (proposer or council only)
7. `execute_proposal`: Execute a passed proposal (with quorum and supermajority checks)
8. `mark_proposal_ready`: Mark proposal as ready for execution after timelock
9. `rotate_council`: Rotate the reputation council
10. `update_skill_tags`: Update skill tags for expertise matching

### Voting Power Calculation

The voting power calculation combines multiple factors:

```rust
voting_power = sqrt(reputation_score) * expertise_multiplier + delegated_power
```

Where:
- `sqrt(reputation_score)`: Quadratic weighting to prevent whale dominance
- `expertise_multiplier`: 1.0x base, +0.5x per matching skill tag (capped at 3.0x)
- `delegated_power`: Sum of all delegations received (global + per-proposal)

### Proposal Execution Requirements

Proposals must meet several criteria before execution:

1. **Quorum Threshold**: Minimum percentage of total voting power must participate
2. **Supermajority**: Runtime upgrades and treasury spends require supermajority (default 66%)
3. **Simple Majority**: Other proposals require simple majority (for > against)
4. **Execution Delay (Timelock)**: Proposals have a mandatory delay period after voting ends before execution
5. **Timing**: Proposals can only be executed after the timelock period expires

### New Features

#### Vote Management
- **Vote Changes**: Users can change their vote after a minimum period (prevents manipulation)
- **Vote Revocation**: Users can revoke their vote entirely before voting ends
- **Voting Power Tracking**: Each vote's power is stored for accurate revocation/change calculations

#### Delegation Improvements
- **Per-Proposal Delegation**: Delegate voting power for specific proposals only
- **Global Delegation**: Delegate for all proposals (existing behavior)
- **Delegation Revocation**: Revoke delegations at any time
- **Capacity Limits**: Delegation still bounded by delegatee's reputation score

#### Proposal Lifecycle
- **Cancellation**: Proposers (or council) can cancel proposals before voting ends
- **Deposit Returns**: Proposals return deposits on successful execution or cancellation
- **Timelock Security**: Execution delay prevents rushed or malicious proposals

#### Enhanced Expertise Matching
- **Weighted Scoring**: More matching skill tags = higher multiplier (up to 3.0x)
- **Graduated Bonuses**: 1.0x base, +0.5x per match (instead of binary 1x/2x)
- **Better Representation**: Experts in multiple relevant areas get appropriate recognition

## Configuration

The pallet requires the following configuration parameters:

- `MinProposalReputation`: Minimum reputation required to create a proposal
- `ProposalDeposit`: Minimum deposit required for proposal submission
- `VotingPeriod`: Number of blocks for voting period
- `CouncilSize`: Number of members in the reputation council
- `Currency`: Currency type for deposits
- `Reputation`: Interface to the reputation pallet

## Integration with Reputation Pallet

The governance pallet interfaces with the reputation pallet through the `ReputationInterface` trait:

```rust
pub trait ReputationInterface<T: frame_system::Config> {
    fn get_reputation_score(account: &T::AccountId) -> i32;
}
```

This allows the governance pallet to query reputation scores while remaining decoupled from the specific reputation implementation.

## Proposal Types

The pallet supports multiple proposal types:

1. **TreasurySpend**: Proposals to spend from treasury
2. **RuntimeUpgrade**: Proposals to upgrade the runtime
3. **ParameterChange**: Proposals to change runtime parameters
4. **CouncilElection**: Proposals to trigger council election
5. **Custom**: Custom proposals with arbitrary data

## XCM Integration

The pallet is designed to support cross-chain governance through XCM:

- Other parachains can query reputation scores via XCM
- Voting power can be calculated based on cross-chain reputation
- Enables interoperable governance across the Polkadot ecosystem

## Testing

The pallet includes comprehensive tests covering:

- Proposal creation with reputation thresholds
- Voting with expertise boosts
- Delegation mechanics
- Proposal execution
- Council rotation
- Skill tag management
- Quadratic voting calculations
- Error cases and edge conditions

### Running Tests

```bash
cd pallets/governance
cargo test
```

## Usage Example

```rust
use pallet_governance::{self as governance};

// Create a proposal (requires sufficient reputation)
governance::Pallet::<Runtime>::create_proposal(
    Origin::signed(proposer),
    ProposalType::TreasurySpend {
        amount: 1000,
        beneficiary: recipient,
    },
    tags, // e.g., ["technical", "runtime"]
    description,
)?;

// Vote on a proposal
governance::Pallet::<Runtime>::vote(
    Origin::signed(voter),
    proposal_id,
    true, // support
)?;

// Delegate voting power
governance::Pallet::<Runtime>::delegate_vote(
    Origin::signed(delegator),
    delegatee,
    amount,
)?;

// Execute a passed proposal
governance::Pallet::<Runtime>::execute_proposal(
    Origin::signed(executor),
    proposal_id,
)?;
```

## Configuration Parameters

The pallet now includes additional configuration parameters:

- `QuorumThreshold`: Minimum percentage of voting power required (e.g., 10 = 10%)
- `SupermajorityThreshold`: Percentage required for critical proposals (e.g., 66 = 66%)
- `ExecutionDelayPeriod`: Blocks to wait after voting ends before execution allowed
- `MinVoteChangePeriod`: Minimum blocks before a vote can be changed

## Recent Improvements

The governance pallet has been significantly enhanced with:

1. ✅ **Vote Revocation & Changes**: Users can revoke or change votes
2. ✅ **Quorum Requirements**: Proposals must meet minimum participation thresholds
3. ✅ **Supermajority Support**: Critical proposals require higher thresholds
4. ✅ **Timelock Security**: Execution delays prevent rushed proposals
5. ✅ **Deposit Returns**: Deposits returned on execution or cancellation
6. ✅ **Proposal Cancellation**: Proposers can cancel proposals
7. ✅ **Per-Proposal Delegation**: Delegate for specific proposals
8. ✅ **Improved Expertise Matching**: Weighted scoring based on multiple skill matches
9. ✅ **Delegation Management**: Full revocation and update support

## Future Enhancements

Potential future improvements:

1. **Off-Chain Workers**: Automated proposal execution and council rotation
2. **Advanced Proposal Types**: More sophisticated proposal execution logic
3. **Voting Strategies**: Additional voting mechanisms (approval voting, ranked choice)
4. **Governance Analytics**: On-chain analytics for governance participation
5. **Multi-Sig Integration**: Integration with multi-signature wallets for high-value proposals
6. **Council Selection Automation**: Better on-chain or off-chain council selection
7. **Proposal Templates**: Reusable proposal templates for common actions
8. **Snapshot Voting**: Historical reputation-based voting snapshots

## Resources

- [Polkadot SDK Documentation](https://docs.substrate.io/)
- [FRAME Pallet Development](https://docs.substrate.io/tutorials/work-with-pallets/)
- [Substrate Governance](https://docs.substrate.io/fundamentals/governance/)
- [XCM Documentation](https://docs.substrate.io/build/xcm/)

## License

This pallet is part of the polkadot-deployer project and follows the same license.

