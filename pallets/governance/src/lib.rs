#![cfg_attr(not(feature = "std"), no_std)]

pub use pallet::*;

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;

#[frame_support::pallet]
pub mod pallet {
    use super::*;
    use frame_support::{
        pallet_prelude::*,
        traits::{Currency, Get, ReservableCurrency},
        transactional,
    };
    use frame_system::pallet_prelude::*;
    use sp_std::prelude::*;
    use scale_info::TypeInfo;
    use pallet_reputation::Pallet as ReputationPallet;

    // Type aliases for cleaner code
    pub type BalanceOf<T> = <<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance;
    pub type ReputationScore = u64; // Converted from i32 for voting calculations
    pub type ProposalId = u32;
    pub type SkillTag = BoundedVec<u8, ConstU32<32>>;

    #[derive(Clone, Encode, Decode, PartialEq, TypeInfo, RuntimeDebug, MaxEncodedLen)]
    #[scale_info(skip_type_params(T))]
    pub enum ProposalType {
        TreasurySpend {
            amount: BalanceOf<T>,
            beneficiary: T::AccountId,
        },
        RuntimeUpgrade {
            code_hash: T::Hash,
        },
        ParameterChange {
            parameter: Vec<u8>,
            new_value: Vec<u8>,
        },
        CouncilElection,
        Custom {
            tag: SkillTag,
            data: Vec<u8>,
        },
    }

    #[derive(Clone, Encode, Decode, PartialEq, TypeInfo, RuntimeDebug, MaxEncodedLen)]
    pub struct Proposal<T: Config> {
        pub id: ProposalId,
        pub proposer: T::AccountId,
        pub proposal_type: ProposalType,
        pub tags: BoundedVec<SkillTag, ConstU32<5>>,
        pub description: BoundedVec<u8, ConstU32<256>>,
        pub created: BlockNumberFor<T>,
        pub voting_end: BlockNumberFor<T>,
        pub execution_delay: BlockNumberFor<T>, // Timelock period after voting ends
        pub execution_ready_at: Option<BlockNumberFor<T>>, // Block when execution becomes available
        pub cancelled: bool,
        pub executed: bool,
        pub for_votes: ReputationScore,
        pub against_votes: ReputationScore,
        pub total_voting_power: ReputationScore, // For quorum calculation
    }

    #[derive(Clone, Encode, Decode, PartialEq, TypeInfo, RuntimeDebug, MaxEncodedLen)]
    pub struct Delegation<T: Config> {
        pub delegator: T::AccountId,
        pub delegatee: T::AccountId,
        pub amount: ReputationScore,
        pub proposal_id: Option<ProposalId>, // None = global delegation, Some(id) = per-proposal
    }

    #[pallet::config]
    pub trait Config: frame_system::Config {
        type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;
        
        /// The currency trait for handling deposits
        type Currency: Currency<Self::AccountId> + ReservableCurrency<Self::AccountId>;
        
        /// The Reputation pallet that provides reputation scores
        type Reputation: ReputationInterface<Self>;
        
        /// Minimum reputation required to create a proposal
        #[pallet::constant]
        type MinProposalReputation: Get<ReputationScore>;
        
        /// Minimum deposit required for proposal (to prevent spam)
        #[pallet::constant]
        type ProposalDeposit: Get<BalanceOf<Self>>;
        
        /// Voting period in blocks
        #[pallet::constant]
        type VotingPeriod: Get<BlockNumberFor<Self>>;
        
        /// Council size for reputation council
        #[pallet::constant]
        type CouncilSize: Get<u32>;
        
        /// Quorum threshold (in percentage, e.g., 10 = 10% of total reputation must vote)
        #[pallet::constant]
        type QuorumThreshold: Get<u8>;
        
        /// Supermajority threshold (in percentage, e.g., 66 = 66% required for critical proposals)
        #[pallet::constant]
        type SupermajorityThreshold: Get<u8>;
        
        /// Execution delay period in blocks (timelock)
        #[pallet::constant]
        type ExecutionDelayPeriod: Get<BlockNumberFor<Self>>;
        
        /// Minimum voting period required to change vote
        #[pallet::constant]
        type MinVoteChangePeriod: Get<BlockNumberFor<Self>>;
    }

    #[pallet::pallet]
    #[pallet::generate_store(pub(super) trait Store)]
    pub struct Pallet<T>(_);

    // Storage items
    #[pallet::storage]
    #[pallet::getter(fn next_proposal_id)]
    pub type NextProposalId<T> = StorageValue<_, ProposalId, ValueQuery>;

    #[pallet::storage]
    #[pallet::getter(fn proposals)]
    pub type Proposals<T: Config> = StorageMap<_, Blake2_128Concat, ProposalId, Proposal<T>>;

    #[pallet::storage]
    #[pallet::getter(fn votes)]
    pub type Votes<T: Config> = StorageDoubleMap<
        _,
        Blake2_128Concat, ProposalId,
        Blake2_128Concat, T::AccountId,
        bool, // true = for, false = against
    >;

    #[pallet::storage]
    #[pallet::getter(fn voting_power)]
    pub type VotingPower<T: Config> = StorageDoubleMap<
        _,
        Blake2_128Concat, ProposalId,
        Blake2_128Concat, T::AccountId,
        ReputationScore, // Stored voting power for vote revocation
    >;

    #[pallet::storage]
    #[pallet::getter(fn delegations)]
    pub type Delegations<T: Config> = StorageMap<_, Blake2_128Concat, T::AccountId, Delegation<T>, OptionQuery>;

    #[pallet::storage]
    #[pallet::getter(fn council_members)]
    pub type CouncilMembers<T: Config> = StorageValue<_, BoundedVec<T::AccountId, ConstU32<50>>, ValueQuery>;

    #[pallet::storage]
    #[pallet::getter(fn council_term_end)]
    pub type CouncilTermEnd<T> = StorageValue<_, BlockNumberFor<T>, ValueQuery>;

    // Storage for skill tags (extended from reputation system)
    #[pallet::storage]
    #[pallet::getter(fn skill_tags)]
    pub type SkillTags<T: Config> = StorageMap<
        _,
        Blake2_128Concat, T::AccountId,
        BoundedVec<SkillTag, ConstU32<10>>,
        ValueQuery,
    >;

    // Events
    #[pallet::event]
    #[pallet::generate_deposit(pub(super) fn deposit_event)]
    pub enum Event<T: Config> {
        ProposalCreated {
            proposal_id: ProposalId,
            proposer: T::AccountId,
            proposal_type: ProposalType,
        },
        Voted {
            proposal_id: ProposalId,
            voter: T::AccountId,
            support: bool,
            voting_power: ReputationScore,
        },
        ProposalExecuted {
            proposal_id: ProposalId,
        },
        Delegated {
            delegator: T::AccountId,
            delegatee: T::AccountId,
            amount: ReputationScore,
        },
        CouncilRotated {
            new_members: Vec<T::AccountId>,
        },
        SkillTagsUpdated {
            account: T::AccountId,
            tags: Vec<SkillTag>,
        },
        VoteChanged {
            proposal_id: ProposalId,
            voter: T::AccountId,
            old_support: bool,
            new_support: bool,
            voting_power: ReputationScore,
        },
        VoteRevoked {
            proposal_id: ProposalId,
            voter: T::AccountId,
            voting_power: ReputationScore,
        },
        ProposalCancelled {
            proposal_id: ProposalId,
            proposer: T::AccountId,
        },
        DelegationRevoked {
            delegator: T::AccountId,
            delegatee: T::AccountId,
        },
        DepositReturned {
            account: T::AccountId,
            proposal_id: ProposalId,
            amount: BalanceOf<T>,
        },
        ProposalExecutionReady {
            proposal_id: ProposalId,
            ready_at: BlockNumberFor<T>,
        },
    }

    #[pallet::error]
    pub enum Error<T> {
        InsufficientReputation,
        ProposalNotFound,
        VotingClosed,
        AlreadyVoted,
        CannotExecute,
        InvalidDelegatee,
        DelegationExceedsCapacity,
        NotCouncilMember,
        CouncilTermNotEnded,
        InvalidProposal,
        QuorumNotMet,
        SupermajorityNotMet,
        ProposalNotReadyForExecution,
        CannotCancelExecutedProposal,
        VoteChangeNotAllowed,
        NotProposer,
        NoVoteToRevoke,
        NoDelegationToRevoke,
        ProposalNotExecutable,
    }

    #[pallet::call]
    impl<T: Config> Pallet<T> {
        #[pallet::call_index(0)]
        #[pallet::weight(10_000)]
        pub fn create_proposal(
            origin: OriginFor<T>,
            proposal_type: ProposalType,
            tags: BoundedVec<SkillTag, ConstU32<5>>,
            description: BoundedVec<u8, ConstU32<256>>,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;

            // Check proposal threshold - convert i32 to u64 for comparison
            let reputation_i32 = T::Reputation::get_reputation_score(&who);
            let reputation = reputation_i32.max(0) as u64; // Ensure non-negative
            ensure!(
                reputation >= T::MinProposalReputation::get(),
                Error::<T>::InsufficientReputation
            );

            // Take deposit
            T::Currency::reserve(&who, T::ProposalDeposit::get())?;

            let proposal_id = NextProposalId::<T>::get();
            let now = frame_system::Pallet::<T>::block_number();
            let voting_end = now + T::VotingPeriod::get();
            let execution_delay = T::ExecutionDelayPeriod::get();
            let execution_ready_at = Some(voting_end + execution_delay);

            // Calculate total available voting power for quorum (simplified - in production, 
            // this should query all accounts with reputation)
            let total_voting_power = Self::estimate_total_voting_power();

            let proposal = Proposal {
                id: proposal_id,
                proposer: who.clone(),
                proposal_type,
                tags,
                description,
                created: now,
                voting_end,
                execution_delay,
                execution_ready_at,
                cancelled: false,
                executed: false,
                for_votes: 0,
                against_votes: 0,
                total_voting_power,
            };

            Proposals::<T>::insert(proposal_id, proposal);
            NextProposalId::<T>::put(proposal_id + 1);

            Self::deposit_event(Event::ProposalCreated {
                proposal_id,
                proposer: who,
                proposal_type,
            });

            Ok(())
        }

        #[pallet::call_index(1)]
        #[pallet::weight(10_000)]
        pub fn vote(
            origin: OriginFor<T>,
            proposal_id: ProposalId,
            support: bool,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;

            let mut proposal = Proposals::<T>::get(proposal_id)
                .ok_or(Error::<T>::ProposalNotFound)?;

            ensure!(
                frame_system::Pallet::<T>::block_number() < proposal.voting_end,
                Error::<T>::VotingClosed
            );

            // Check if user already voted - if so, allow vote change if within period
            let existing_vote = Votes::<T>::get(proposal_id, &who);
            let now = frame_system::Pallet::<T>::block_number();
            let can_change = existing_vote.is_some() && 
                            (now - proposal.created) >= T::MinVoteChangePeriod::get();

            if let Some(old_support) = existing_vote {
                if !can_change {
                    return Err(Error::<T>::VoteChangeNotAllowed.into());
                }
                
                // Revoke old vote
                let old_power = VotingPower::<T>::get(proposal_id, &who)
                    .unwrap_or(0);
                
                if old_support {
                    proposal.for_votes = proposal.for_votes.saturating_sub(old_power);
                } else {
                    proposal.against_votes = proposal.against_votes.saturating_sub(old_power);
                }
            }

            // Calculate voting power with expertise boost
            let voting_power = Self::calculate_voting_power(&who, &proposal)?;

            // Record vote and voting power
            Votes::<T>::insert(proposal_id, &who, support);
            VotingPower::<T>::insert(proposal_id, &who, voting_power);

            // Update proposal vote counts
            if support {
                proposal.for_votes += voting_power;
            } else {
                proposal.against_votes += voting_power;
            }
            
            // Emit event for vote change or new vote
            if let Some(old_support) = existing_vote {
                Self::deposit_event(Event::VoteChanged {
                    proposal_id,
                    voter: who.clone(),
                    old_support,
                    new_support: support,
                    voting_power,
                });
            }

            Proposals::<T>::insert(proposal_id, proposal);

            Self::deposit_event(Event::Voted {
                proposal_id,
                voter: who,
                support,
                voting_power,
            });

            Ok(())
        }

        #[pallet::call_index(2)]
        #[pallet::weight(10_000)]
        pub fn delegate_vote(
            origin: OriginFor<T>,
            delegatee: T::AccountId,
            amount: ReputationScore,
            proposal_id: Option<ProposalId>,
        ) -> DispatchResult {
            let delegator = ensure_signed(origin)?;

            // Cannot delegate to self
            ensure!(delegator != delegatee, Error::<T>::InvalidDelegatee);

            // If per-proposal delegation, validate proposal exists
            if let Some(pid) = proposal_id {
                let proposal = Proposals::<T>::get(pid)
                    .ok_or(Error::<T>::ProposalNotFound)?;
                ensure!(
                    frame_system::Pallet::<T>::block_number() < proposal.voting_end,
                    Error::<T>::VotingClosed
                );
            }

            let delegatee_reputation_i32 = T::Reputation::get_reputation_score(&delegatee);
            let delegatee_reputation = delegatee_reputation_i32.max(0) as u64;
            
            // Check delegation capacity - delegatee can only receive up to their reputation score
            let current_delegations = Self::get_total_delegations_to(&delegatee, proposal_id);
            ensure!(
                current_delegations + amount <= delegatee_reputation,
                Error::<T>::DelegationExceedsCapacity
            );

            let delegation = Delegation {
                delegator: delegator.clone(),
                delegatee: delegatee.clone(),
                amount,
                proposal_id,
            };

            Delegations::<T>::insert(&delegator, delegation);

            Self::deposit_event(Event::Delegated {
                delegator,
                delegatee,
                amount,
            });

            Ok(())
        }

        #[pallet::call_index(6)]
        #[pallet::weight(10_000)]
        pub fn revoke_vote(
            origin: OriginFor<T>,
            proposal_id: ProposalId,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;

            let mut proposal = Proposals::<T>::get(proposal_id)
                .ok_or(Error::<T>::ProposalNotFound)?;

            ensure!(
                frame_system::Pallet::<T>::block_number() < proposal.voting_end,
                Error::<T>::VotingClosed
            );

            let existing_vote = Votes::<T>::get(proposal_id, &who)
                .ok_or(Error::<T>::NoVoteToRevoke)?;

            let voting_power = VotingPower::<T>::get(proposal_id, &who)
                .ok_or(Error::<T>::NoVoteToRevoke)?;

            // Remove vote from counts
            if existing_vote {
                proposal.for_votes = proposal.for_votes.saturating_sub(voting_power);
            } else {
                proposal.against_votes = proposal.against_votes.saturating_sub(voting_power);
            }

            // Remove vote and voting power records
            Votes::<T>::remove(proposal_id, &who);
            VotingPower::<T>::remove(proposal_id, &who);

            Proposals::<T>::insert(proposal_id, proposal);

            Self::deposit_event(Event::VoteRevoked {
                proposal_id,
                voter: who,
                voting_power,
            });

            Ok(())
        }

        #[pallet::call_index(7)]
        #[pallet::weight(10_000)]
        pub fn revoke_delegation(
            origin: OriginFor<T>,
        ) -> DispatchResult {
            let delegator = ensure_signed(origin)?;

            let delegation = Delegations::<T>::get(&delegator)
                .ok_or(Error::<T>::NoDelegationToRevoke)?;

            let delegatee = delegation.delegatee.clone();
            Delegations::<T>::remove(&delegator);

            Self::deposit_event(Event::DelegationRevoked {
                delegator,
                delegatee,
            });

            Ok(())
        }

        #[pallet::call_index(8)]
        #[pallet::weight(10_000)]
        pub fn cancel_proposal(
            origin: OriginFor<T>,
            proposal_id: ProposalId,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;

            let mut proposal = Proposals::<T>::get(proposal_id)
                .ok_or(Error::<T>::ProposalNotFound)?;

            ensure!(
                who == proposal.proposer || CouncilMembers::<T>::get().contains(&who),
                Error::<T>::NotProposer
            );

            ensure!(!proposal.executed, Error::<T>::CannotCancelExecutedProposal);
            ensure!(!proposal.cancelled, Error::<T>::ProposalNotExecutable);

            ensure!(
                frame_system::Pallet::<T>::block_number() < proposal.voting_end,
                Error::<T>::VotingClosed
            );

            let proposer = proposal.proposer.clone();
            proposal.cancelled = true;
            Proposals::<T>::insert(proposal_id, proposal);

            // Return deposit to proposer
            T::Currency::unreserve(&proposer, T::ProposalDeposit::get());

            Self::deposit_event(Event::ProposalCancelled {
                proposal_id,
                proposer: proposer.clone(),
            });

            Self::deposit_event(Event::DepositReturned {
                account: proposer,
                proposal_id,
                amount: T::ProposalDeposit::get(),
            });

            Ok(())
        }

        #[pallet::call_index(3)]
        #[pallet::weight(10_000)]
        pub fn execute_proposal(
            origin: OriginFor<T>,
            proposal_id: ProposalId,
        ) -> DispatchResult {
            let _who = ensure_signed(origin)?;

            let mut proposal = Proposals::<T>::get(proposal_id)
                .ok_or(Error::<T>::ProposalNotFound)?;

            ensure!(!proposal.executed, Error::<T>::CannotExecute);
            ensure!(!proposal.cancelled, Error::<T>::ProposalNotExecutable);
            ensure!(
                frame_system::Pallet::<T>::block_number() >= proposal.voting_end,
                Error::<T>::VotingClosed
            );

            // Check execution delay (timelock)
            let now = frame_system::Pallet::<T>::block_number();
            let ready_at = proposal.execution_ready_at
                .ok_or(Error::<T>::ProposalNotReadyForExecution)?;
            ensure!(
                now >= ready_at,
                Error::<T>::ProposalNotReadyForExecution
            );

            // Check quorum threshold
            let total_votes = proposal.for_votes + proposal.against_votes;
            let quorum_percentage = if proposal.total_voting_power > 0 {
                (total_votes * 100) / proposal.total_voting_power
            } else {
                0
            };
            ensure!(
                quorum_percentage >= T::QuorumThreshold::get() as u64,
                Error::<T>::QuorumNotMet
            );

            // Determine if proposal requires supermajority (runtime upgrades, treasury spends)
            let requires_supermajority = matches!(
                proposal.proposal_type,
                ProposalType::RuntimeUpgrade { .. } | ProposalType::TreasurySpend { .. }
            );

            if requires_supermajority {
                // Check supermajority threshold
                let for_percentage = if total_votes > 0 {
                    (proposal.for_votes * 100) / total_votes
                } else {
                    0
                };
                ensure!(
                    for_percentage >= T::SupermajorityThreshold::get() as u64,
                    Error::<T>::SupermajorityNotMet
                );
            } else {
                // Simple majority for other proposals
                ensure!(
                    proposal.for_votes > proposal.against_votes,
                    Error::<T>::CannotExecute
                );
            }

            // Execute proposal based on type
            Self::execute_proposal_internal(&proposal)?;

            let proposer = proposal.proposer.clone();
            proposal.executed = true;
            Proposals::<T>::insert(proposal_id, proposal);

            // Return deposit to proposer
            T::Currency::unreserve(&proposer, T::ProposalDeposit::get());

            Self::deposit_event(Event::ProposalExecuted { proposal_id });

            Self::deposit_event(Event::DepositReturned {
                account: proposer,
                proposal_id,
                amount: T::ProposalDeposit::get(),
            });

            Ok(())
        }
        
        /// Helper function to mark proposal as ready for execution when delay period ends
        #[pallet::call_index(9)]
        #[pallet::weight(5_000)]
        pub fn mark_proposal_ready(
            origin: OriginFor<T>,
            proposal_id: ProposalId,
        ) -> DispatchResult {
            let _who = ensure_signed(origin)?;

            let mut proposal = Proposals::<T>::get(proposal_id)
                .ok_or(Error::<T>::ProposalNotFound)?;

            ensure!(
                frame_system::Pallet::<T>::block_number() >= proposal.voting_end,
                Error::<T>::VotingClosed
            );

            let now = frame_system::Pallet::<T>::block_number();
            if let Some(ready_at) = proposal.execution_ready_at {
                if now >= ready_at {
                    // Already ready, no-op
                    return Ok(());
                }
            }

            Ok(())
        }

        #[pallet::call_index(4)]
        #[pallet::weight(10_000)]
        pub fn rotate_council(origin: OriginFor<T>) -> DispatchResult {
            let who = ensure_signed(origin)?;
            
            // Only allow council rotation by existing council members or after term end
            let current_council = CouncilMembers::<T>::get();
            let term_end = CouncilTermEnd::<T>::get();
            let now = frame_system::Pallet::<T>::block_number();

            if now < term_end {
                ensure!(
                    current_council.contains(&who),
                    Error::<T>::NotCouncilMember
                );
            }

            let new_council = Self::select_new_council()?;
            CouncilMembers::<T>::put(&new_council);
            CouncilTermEnd::<T>::put(now + T::VotingPeriod::get() * 4); // 4 voting periods

            Self::deposit_event(Event::CouncilRotated {
                new_members: new_council.into_inner(),
            });

            Ok(())
        }

        #[pallet::call_index(5)]
        #[pallet::weight(10_000)]
        pub fn update_skill_tags(
            origin: OriginFor<T>,
            tags: BoundedVec<SkillTag, ConstU32<10>>,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;

            SkillTags::<T>::insert(&who, tags.clone());

            Self::deposit_event(Event::SkillTagsUpdated {
                account: who,
                tags: tags.into_inner(),
            });

            Ok(())
        }
    }

    impl<T: Config> Pallet<T> {
        /// Calculate voting power with quadratic weighting and expertise boost
        fn calculate_voting_power(
            voter: &T::AccountId,
            proposal: &Proposal<T>,
        ) -> Result<ReputationScore, DispatchError> {
            // 1. Get base reputation (convert from i32 to u64)
            let base_reputation_i32 = T::Reputation::get_reputation_score(voter);
            let base_reputation = base_reputation_i32.max(0) as u64;

            // 2. Apply quadratic weighting: sqrt(reputation)
            // Use fixed-point arithmetic for sqrt calculation
            let quadratic_power = Self::sqrt_u64(base_reputation);

            // 3. Calculate expertise multiplier
            let voter_skills = SkillTags::<T>::get(voter);
            let expertise_multiplier = Self::calculate_expertise_boost(&proposal.tags, &voter_skills);

            // 4. Include delegated voting power (both global and per-proposal)
            let delegated_power = Self::get_delegated_power(voter, Some(proposal.id));

            // 5. Final voting power
            let final_power = quadratic_power.saturating_mul(expertise_multiplier).saturating_add(delegated_power);

            Ok(final_power)
        }

        /// Calculate expertise boost based on proposal tags and user skills
        /// Returns a multiplier based on how many matching skills are found (weighted scoring)
        fn calculate_expertise_boost(
            proposal_tags: &BoundedVec<SkillTag, ConstU32<5>>,
            user_skills: &BoundedVec<SkillTag, ConstU32<10>>,
        ) -> ReputationScore {
            if proposal_tags.is_empty() || user_skills.is_empty() {
                return 1;
            }

            let mut matches = 0;
            for proposal_tag in proposal_tags.iter() {
                if user_skills.contains(proposal_tag) {
                    matches += 1;
                }
            }

            // Weighted multiplier: 1.0x base, +0.5x per match, capped at 3.0x
            // More matches = higher multiplier (expertise bonus)
            let base_multiplier = 100; // 1.0x in fixed point
            let match_bonus = matches * 50; // 0.5x per match
            let multiplier = base_multiplier.saturating_add(match_bonus).min(300); // Cap at 3.0x

            multiplier / 100 // Convert back to integer multiplier (1, 2, or 3)
        }

        /// Get total voting power delegated to an account
        /// If proposal_id is Some, includes both global delegations and per-proposal delegations
        fn get_delegated_power(delegatee: &T::AccountId, proposal_id: Option<ProposalId>) -> ReputationScore {
            Delegations::<T>::iter()
                .filter(|(_, delegation)| {
                    &delegation.delegatee == delegatee &&
                    (delegation.proposal_id.is_none() || delegation.proposal_id == proposal_id)
                })
                .map(|(_, delegation)| delegation.amount)
                .sum()
        }

        /// Get total delegations received by an account
        /// If proposal_id is Some, only counts delegations for that proposal (global + per-proposal)
        fn get_total_delegations_to(delegatee: &T::AccountId, proposal_id: Option<ProposalId>) -> ReputationScore {
            Delegations::<T>::iter()
                .filter(|(_, delegation)| {
                    &delegation.delegatee == delegatee &&
                    (delegation.proposal_id.is_none() || delegation.proposal_id == proposal_id)
                })
                .map(|(_, delegation)| delegation.amount)
                .sum()
        }
        
        /// Estimate total voting power in the system (for quorum calculation)
        /// In production, this should query all accounts with reputation
        /// This is a simplified implementation that uses a reasonable estimate
        fn estimate_total_voting_power() -> ReputationScore {
            // Simplified: assume average reputation and multiply by estimated active accounts
            // In production, this would iterate through reputation scores
            // For now, return a large number to allow quorum checks
            1_000_000u64
        }

        /// Select new council based on highest reputation scores
        /// This implementation would need access to iterate through all accounts with reputation
        /// For now, it uses a simplified approach - in production, use off-chain workers or 
        /// a more sophisticated on-chain iteration mechanism
        fn select_new_council() -> Result<BoundedVec<T::AccountId, ConstU32<50>>, DispatchError> {
            let council_size = T::CouncilSize::get();
            
            // Note: In a real implementation, you would:
            // 1. Iterate through all accounts in the reputation pallet
            // 2. Get their reputation scores
            // 3. Calculate their voting power (sqrt(reputation))
            // 4. Sort by voting power and select top N
            // 
            // However, Substrate doesn't provide efficient iteration over all accounts
            // Options:
            // - Use off-chain workers to maintain a council candidate list
            // - Use a separate storage map tracking top accounts
            // - Use on-chain iteration (expensive but possible)
            //
            // For now, this returns an empty council which allows the system to function
            // while signaling that council selection needs to be implemented properly
            
            // Simplified: maintain existing council if it exists, otherwise create empty
            let existing_council = CouncilMembers::<T>::get();
            if existing_council.len() > 0 {
                Ok(existing_council)
            } else {
                // Return empty bounded vec
                let mut council = BoundedVec::new();
                // In production, fill council with top reputation holders
                Ok(council)
            }
        }

        /// Internal function to execute different proposal types
        fn execute_proposal_internal(proposal: &Proposal<T>) -> DispatchResult {
            match &proposal.proposal_type {
                ProposalType::TreasurySpend { amount: _, beneficiary: _ } => {
                    // Treasury spending logic would go here
                    // In a real implementation, this would interact with treasury pallet
                    Ok(())
                },
                ProposalType::RuntimeUpgrade { code_hash: _ } => {
                    // Runtime upgrade logic would go here
                    // In a real implementation, this would use set_code
                    Ok(())
                },
                ProposalType::ParameterChange { parameter: _, new_value: _ } => {
                    // Parameter change logic would go here
                    Ok(())
                },
                ProposalType::CouncilElection => {
                    // Trigger council election
                    let _ = Self::rotate_council(RawOrigin::Root.into());
                    Ok(())
                },
                ProposalType::Custom { tag: _, data: _ } => {
                    // Custom proposal execution logic
                    Ok(())
                },
            }
        }

        /// Integer square root using binary search (for quadratic voting)
        fn sqrt_u64(n: u64) -> u64 {
            if n == 0 {
                return 0;
            }
            if n < 4 {
                return 1;
            }
            
            let mut x = n;
            let mut y = (x + 1) / 2;
            while y < x {
                x = y;
                y = (x + n / x) / 2;
            }
            x
        }
    }

    // Council origin for fast-tracked proposals
    pub struct CouncilOrigin<T>(sp_std::marker::PhantomData<T>);
    
    impl<T: Config> EnsureOrigin<T::RuntimeOrigin> for CouncilOrigin<T> {
        type Success = ();
        
        fn try_origin(origin: T::RuntimeOrigin) -> Result<Self::Success, T::RuntimeOrigin> {
            let who = frame_system::EnsureSigned::try_origin(origin.clone())
                .map_err(|_| origin)?;
            
            let council = CouncilMembers::<T>::get();
            if council.contains(&who) {
                Ok(())
            } else {
                Err(origin)
            }
        }
        
        #[cfg(feature = "runtime-benchmarks")]
        fn successful_origin() -> T::RuntimeOrigin {
            unimplemented!()
        }
    }
}

/// Interface for the Reputation pallet
pub trait ReputationInterface<T: frame_system::Config> {
    fn get_reputation_score(account: &T::AccountId) -> i32;
}

