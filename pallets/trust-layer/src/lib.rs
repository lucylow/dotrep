// Trust Layer Pallet for DotRep
//
// This pallet implements the trust layer for the DotRep reputation system,
// integrating with OriginTrail's x402 micropayment protocol for premium
// reputation data access.
//
// Features:
// - x402 micropayment support for premium reputation queries
// - Token staking for reputation credibility
// - Integration with TRAC/NEURO tokens
// - Payment channels for efficient micropayments

#![cfg_attr(not(feature = "std"), no_std)]

pub use pallet::*;

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;

#[frame_support::pallet]
pub mod pallet {
    use frame_support::{
        dispatch::DispatchResult,
        pallet_prelude::*,
        traits::{Currency, ExistenceRequirement, ReservableCurrency},
    };
    use frame_system::pallet_prelude::*;
    use sp_std::vec::Vec;
    use codec::{Encode, Decode};
    use scale_info::TypeInfo;

    type BalanceOf<T> = <<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance;

    /// Claim status
    #[derive(Clone, Encode, Decode, Eq, PartialEq, Debug, TypeInfo, MaxEncodedLen)]
    pub enum ClaimStatus {
        Pending,
        Challenged,
        Resolved,
    }

    /// Claim resolution
    #[derive(Clone, Encode, Decode, Eq, PartialEq, Debug, TypeInfo, MaxEncodedLen)]
    pub enum ClaimResolution {
        Accepted,
        Rejected,
        Uncertain,
    }

    /// Claim data structure
    #[derive(Clone, Encode, Decode, Eq, PartialEq, Debug, TypeInfo, MaxEncodedLen)]
    pub struct Claim<T: Config> {
        pub id: u64,
        pub submitter: T::AccountId,
        pub claim_ual: Vec<u8>,
        pub evidence_uals: Vec<Vec<u8>>,
        pub stake: BalanceOf<T>,
        pub status: ClaimStatus,
        pub created_at: T::BlockNumber,
        pub challenge_deadline: T::BlockNumber,
        pub challenger: Option<T::AccountId>,
        pub resolution: Option<ClaimResolution>,
    }

    /// Challenge data structure
    #[derive(Clone, Encode, Decode, Eq, PartialEq, Debug, TypeInfo, MaxEncodedLen)]
    pub struct Challenge<T: Config> {
        pub claim_id: u64,
        pub challenger: T::AccountId,
        pub counter_evidence_uals: Vec<Vec<u8>>,
        pub stake: BalanceOf<T>,
        pub challenged_at: T::BlockNumber,
    }

    #[pallet::config]
    pub trait Config: frame_system::Config {
        type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;
        
        /// Currency type for payments (TRAC/NEURO tokens)
        type Currency: Currency<Self::AccountId> + ReservableCurrency<Self::AccountId>;
        
        /// Minimum stake amount for reputation credibility
        #[pallet::constant]
        type MinimumStake: Get<BalanceOf<Self>>;
        
        /// Base price for premium reputation queries
        #[pallet::constant]
        type BaseQueryPrice: Get<BalanceOf<Self>>;
    }

    #[pallet::pallet]
    pub struct Pallet<T>(_);

    /// Storage for staked amounts per developer
    #[pallet::storage]
    #[pallet::getter(fn staked_amount)]
    pub type StakedAmount<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        T::AccountId,
        BalanceOf<T>,
        ValueQuery,
    >;

    /// Storage for query access permissions
    #[pallet::storage]
    #[pallet::getter(fn query_access)]
    pub type QueryAccess<T: Config> = StorageDoubleMap<
        _,
        Blake2_128Concat,
        T::AccountId, // Querier
        Blake2_128Concat,
        Vec<u8>, // UAL
        BlockNumberFor<T>, // Expiry block
        OptionQuery,
    >;

    /// Storage for payment channels (x402 protocol)
    #[pallet::storage]
    #[pallet::getter(fn payment_channel)]
    pub type PaymentChannels<T: Config> = StorageDoubleMap<
        _,
        Blake2_128Concat,
        T::AccountId, // Payer
        Blake2_128Concat,
        T::AccountId, // Payee (treasury or data provider)
        (BalanceOf<T>, BlockNumberFor<T>), // (deposited_amount, expiry)
        OptionQuery,
    >;

    /// Storage for custom query prices per UAL
    #[pallet::storage]
    #[pallet::getter(fn custom_query_price)]
    pub type CustomQueryPrice<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        Vec<u8>, // UAL
        BalanceOf<T>,
        OptionQuery,
    >;

    /// Treasury account for collecting query fees
    #[pallet::storage]
    #[pallet::getter(fn treasury_account)]
    pub type TreasuryAccount<T: Config> = StorageValue<_, T::AccountId, OptionQuery>;

    /// Claim ID counter
    #[pallet::storage]
    pub type ClaimIdCounter<T: Config> = StorageValue<_, u64, ValueQuery>;

    /// Storage for claims
    #[pallet::storage]
    #[pallet::getter(fn claim)]
    pub type Claims<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        u64,
        Claim<T>,
        OptionQuery,
    >;

    /// Storage for challenges
    #[pallet::storage]
    pub type ClaimChallenges<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        u64,
        Challenge<T>,
        OptionQuery,
    >;

    /// Storage for submitter's claims
    #[pallet::storage]
    pub type SubmitterClaims<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        T::AccountId,
        Vec<u64>,
        ValueQuery,
    >;

    #[pallet::event]
    #[pallet::generate_deposit(pub(super) fn deposit_event)]
    pub enum Event<T: Config> {
        /// Tokens staked for reputation credibility [who, amount]
        TokensStaked { who: T::AccountId, amount: BalanceOf<T> },
        
        /// Tokens unstaked [who, amount]
        TokensUnstaked { who: T::AccountId, amount: BalanceOf<T> },
        
        /// Payment made for query access [payer, ual, amount]
        QueryPaymentMade { payer: T::AccountId, ual: Vec<u8>, amount: BalanceOf<T> },
        
        /// Query access granted [querier, ual, expiry_block]
        QueryAccessGranted { querier: T::AccountId, ual: Vec<u8>, expiry: BlockNumberFor<T> },
        
        /// Payment channel opened [payer, payee, amount]
        ChannelOpened { payer: T::AccountId, payee: T::AccountId, amount: BalanceOf<T> },
        
        /// Payment channel closed [payer, payee]
        ChannelClosed { payer: T::AccountId, payee: T::AccountId },
        
        /// Custom query price set [ual, price]
        CustomPriceSet { ual: Vec<u8>, price: BalanceOf<T> },

        /// Claim posted [claim_id, submitter, stake]
        ClaimPosted { claim_id: u64, submitter: T::AccountId, stake: BalanceOf<T> },

        /// Claim challenged [claim_id, challenger, stake]
        ClaimChallenged { claim_id: u64, challenger: T::AccountId, stake: BalanceOf<T> },

        /// Claim resolved [claim_id, resolution]
        ClaimResolved { claim_id: u64, resolution: ClaimResolution },
    }

    #[pallet::error]
    pub enum Error<T> {
        /// Insufficient balance for staking
        InsufficientBalance,
        
        /// Stake amount below minimum
        BelowMinimumStake,
        
        /// No stake found for this account
        NoStakeFound,
        
        /// Query access expired
        QueryAccessExpired,
        
        /// No query access found
        NoQueryAccess,
        
        /// Payment channel not found
        ChannelNotFound,
        
        /// Payment channel already exists
        ChannelAlreadyExists,
        
        /// Insufficient channel balance
        InsufficientChannelBalance,
        
        /// Treasury account not set
        TreasuryNotSet,

        /// Claim not found
        ClaimNotFound,

        /// Challenge window has expired
        ChallengeWindowExpired,

        /// Claim is not in a challengeable state
        ClaimNotChallengeable,

        /// Cannot challenge own claim
        CannotChallengeOwnClaim,

        /// Insufficient stake for challenge
        InsufficientStake,

        /// Claim is not in a resolvable state
        ClaimNotResolvable,
    }

    #[pallet::call]
    impl<T: Config> Pallet<T> {
        /// Stake tokens to increase reputation credibility
        #[pallet::call_index(0)]
        #[pallet::weight(10_000)]
        pub fn stake_tokens(
            origin: OriginFor<T>,
            amount: BalanceOf<T>,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;

            // Ensure amount meets minimum
            ensure!(amount >= T::MinimumStake::get(), Error::<T>::BelowMinimumStake);

            // Reserve the tokens
            T::Currency::reserve(&who, amount)
                .map_err(|_| Error::<T>::InsufficientBalance)?;

            // Update staked amount
            StakedAmount::<T>::mutate(&who, |staked| {
                *staked = staked.saturating_add(amount);
            });

            Self::deposit_event(Event::TokensStaked { who, amount });

            Ok(())
        }

        /// Unstake tokens
        #[pallet::call_index(1)]
        #[pallet::weight(10_000)]
        pub fn unstake_tokens(
            origin: OriginFor<T>,
            amount: BalanceOf<T>,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;

            let staked = StakedAmount::<T>::get(&who);
            ensure!(staked >= amount, Error::<T>::InsufficientBalance);

            // Unreserve the tokens
            T::Currency::unreserve(&who, amount);

            // Update staked amount
            StakedAmount::<T>::mutate(&who, |staked| {
                *staked = staked.saturating_sub(amount);
            });

            Self::deposit_event(Event::TokensUnstaked { who, amount });

            Ok(())
        }

        /// Pay for premium reputation query access (x402 micropayment)
        #[pallet::call_index(2)]
        #[pallet::weight(10_000)]
        pub fn pay_for_query(
            origin: OriginFor<T>,
            ual: Vec<u8>,
            access_duration: BlockNumberFor<T>,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;

            // Get query price (custom or base)
            let price = CustomQueryPrice::<T>::get(&ual)
                .unwrap_or_else(|| T::BaseQueryPrice::get());

            // Get treasury account
            let treasury = TreasuryAccount::<T>::get()
                .ok_or(Error::<T>::TreasuryNotSet)?;

            // Transfer payment to treasury
            T::Currency::transfer(
                &who,
                &treasury,
                price,
                ExistenceRequirement::KeepAlive,
            )?;

            // Grant query access
            let current_block = <frame_system::Pallet<T>>::block_number();
            let expiry = current_block.saturating_add(access_duration);

            QueryAccess::<T>::insert(&who, &ual, expiry);

            Self::deposit_event(Event::QueryPaymentMade { 
                payer: who.clone(), 
                ual: ual.clone(), 
                amount: price 
            });

            Self::deposit_event(Event::QueryAccessGranted { 
                querier: who, 
                ual, 
                expiry 
            });

            Ok(())
        }

        /// Open a payment channel for efficient micropayments
        #[pallet::call_index(3)]
        #[pallet::weight(10_000)]
        pub fn open_payment_channel(
            origin: OriginFor<T>,
            payee: T::AccountId,
            deposit: BalanceOf<T>,
            duration: BlockNumberFor<T>,
        ) -> DispatchResult {
            let payer = ensure_signed(origin)?;

            // Ensure channel doesn't already exist
            ensure!(
                !PaymentChannels::<T>::contains_key(&payer, &payee),
                Error::<T>::ChannelAlreadyExists
            );

            // Reserve deposit
            T::Currency::reserve(&payer, deposit)
                .map_err(|_| Error::<T>::InsufficientBalance)?;

            // Create channel
            let current_block = <frame_system::Pallet<T>>::block_number();
            let expiry = current_block.saturating_add(duration);

            PaymentChannels::<T>::insert(&payer, &payee, (deposit, expiry));

            Self::deposit_event(Event::ChannelOpened { 
                payer, 
                payee, 
                amount: deposit 
            });

            Ok(())
        }

        /// Close a payment channel
        #[pallet::call_index(4)]
        #[pallet::weight(10_000)]
        pub fn close_payment_channel(
            origin: OriginFor<T>,
            payee: T::AccountId,
        ) -> DispatchResult {
            let payer = ensure_signed(origin)?;

            // Get channel
            let (deposit, _) = PaymentChannels::<T>::get(&payer, &payee)
                .ok_or(Error::<T>::ChannelNotFound)?;

            // Unreserve remaining deposit
            T::Currency::unreserve(&payer, deposit);

            // Remove channel
            PaymentChannels::<T>::remove(&payer, &payee);

            Self::deposit_event(Event::ChannelClosed { payer, payee });

            Ok(())
        }

        /// Set custom query price for a UAL (data provider only)
        #[pallet::call_index(5)]
        #[pallet::weight(10_000)]
        pub fn set_custom_query_price(
            origin: OriginFor<T>,
            ual: Vec<u8>,
            price: BalanceOf<T>,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;

            // TODO: Verify that the caller owns/controls this UAL
            // This would require integration with the reputation pallet

            CustomQueryPrice::<T>::insert(&ual, price);

            Self::deposit_event(Event::CustomPriceSet { ual, price });

            Ok(())
        }

    /// Set treasury account (governance only)
    #[pallet::call_index(6)]
    #[pallet::weight(10_000)]
    pub fn set_treasury(
        origin: OriginFor<T>,
        treasury: T::AccountId,
    ) -> DispatchResult {
        ensure_root(origin)?;

        TreasuryAccount::<T>::put(treasury);

        Ok(())
    }

    /// Post a verifiable claim anchored to Knowledge Assets (Claim Verification)
    /// Uses optimistic posting with challenge window
    #[pallet::call_index(7)]
    #[pallet::weight(20_000)]
    pub fn post_claim(
        origin: OriginFor<T>,
        claim_ual: Vec<u8>,
        evidence_uals: Vec<Vec<u8>>,
        stake: BalanceOf<T>,
    ) -> DispatchResult {
        let who = ensure_signed(origin)?;

        // Require minimum stake
        ensure!(stake >= T::MinimumStake::get(), Error::<T>::BelowMinimumStake);

        // Reserve stake
        T::Currency::reserve(&who, stake)
            .map_err(|_| Error::<T>::InsufficientBalance)?;

        let claim_id = Self::get_next_claim_id();
        let current_block = <frame_system::Pallet<T>>::block_number();
        let challenge_window = BlockNumberFor::<T>::from(1000u32); // 1000 blocks
        let expiry = current_block.saturating_add(challenge_window);

        // Store claim
        Claims::<T>::insert(
            claim_id,
            Claim {
                id: claim_id,
                submitter: who.clone(),
                claim_ual,
                evidence_uals: evidence_uals.clone(),
                stake,
                status: ClaimStatus::Pending,
                created_at: current_block,
                challenge_deadline: expiry,
                challenger: None,
                resolution: None,
            },
        );

        // Store submitter's claim IDs
        SubmitterClaims::<T>::mutate(&who, |claims| {
            claims.push(claim_id);
        });

        Self::deposit_event(Event::ClaimPosted {
            claim_id,
            submitter: who,
            stake,
        });

        Ok(())
    }

    /// Challenge a claim with counter-evidence
    #[pallet::call_index(8)]
    #[pallet::weight(20_000)]
    pub fn challenge_claim(
        origin: OriginFor<T>,
        claim_id: u64,
        counter_evidence_uals: Vec<Vec<u8>>,
        stake: BalanceOf<T>,
    ) -> DispatchResult {
        let challenger = ensure_signed(origin)?;

        let mut claim = Claims::<T>::get(claim_id)
            .ok_or(Error::<T>::ClaimNotFound)?;

        // Check challenge window hasn't expired
        let current_block = <frame_system::Pallet<T>>::block_number();
        ensure!(
            current_block <= claim.challenge_deadline,
            Error::<T>::ChallengeWindowExpired
        );

        // Check claim is still pending
        ensure!(
            claim.status == ClaimStatus::Pending,
            Error::<T>::ClaimNotChallengeable
        );

        // Cannot challenge own claim
        ensure!(challenger != claim.submitter, Error::<T>::CannotChallengeOwnClaim);

        // Require stake (at least matching original stake)
        ensure!(stake >= claim.stake, Error::<T>::InsufficientStake);

        // Reserve challenger's stake
        T::Currency::reserve(&challenger, stake)
            .map_err(|_| Error::<T>::InsufficientBalance)?;

        // Update claim
        claim.status = ClaimStatus::Challenged;
        claim.challenger = Some(challenger.clone());
        
        // Store counter-evidence
        ClaimChallenges::<T>::insert(
            claim_id,
            Challenge {
                claim_id,
                challenger: challenger.clone(),
                counter_evidence_uals,
                stake,
                challenged_at: current_block,
            },
        );

        Claims::<T>::insert(claim_id, claim);

        Self::deposit_event(Event::ClaimChallenged {
            claim_id,
            challenger,
            stake,
        });

        Ok(())
    }

    /// Resolve a challenged claim (oracle/governance)
    #[pallet::call_index(9)]
    #[pallet::weight(30_000)]
    pub fn resolve_claim(
        origin: OriginFor<T>,
        claim_id: u64,
        resolution: ClaimResolution,
    ) -> DispatchResult {
        // Only root or oracle account can resolve
        ensure_root(origin)?;

        let mut claim = Claims::<T>::get(claim_id)
            .ok_or(Error::<T>::ClaimNotFound)?;

        ensure!(
            claim.status == ClaimStatus::Challenged,
            Error::<T>::ClaimNotResolvable
        );

        claim.status = ClaimStatus::Resolved;
        claim.resolution = Some(resolution.clone());

        // Distribute stakes based on resolution
        match resolution {
            ClaimResolution::Accepted => {
                // Return stake to submitter, slash challenger
                T::Currency::unreserve(&claim.submitter, claim.stake);
                if let Some(ref challenger) = claim.challenger {
                    let challenge = ClaimChallenges::<T>::get(claim_id).unwrap();
                    T::Currency::slash_reserved(challenger, challenge.stake);
                    // Transfer slashed amount to treasury
                    if let Some(treasury) = TreasuryAccount::<T>::get() {
                        T::Currency::transfer(
                            challenger,
                            &treasury,
                            challenge.stake,
                            ExistenceRequirement::KeepAlive,
                        )?;
                    }
                }
            }
            ClaimResolution::Rejected => {
                // Slash submitter, return stake to challenger
                T::Currency::slash_reserved(&claim.submitter, claim.stake);
                if let Some(ref treasury) = TreasuryAccount::<T>::get() {
                    T::Currency::transfer(
                        &claim.submitter,
                        treasury,
                        claim.stake,
                        ExistenceRequirement::KeepAlive,
                    )?;
                }
                if let Some(ref challenger) = claim.challenger {
                    let challenge = ClaimChallenges::<T>::get(claim_id).unwrap();
                    T::Currency::unreserve(challenger, challenge.stake);
                }
            }
            ClaimResolution::Uncertain => {
                // Return stakes to both parties
                T::Currency::unreserve(&claim.submitter, claim.stake);
                if let Some(ref challenger) = claim.challenger {
                    let challenge = ClaimChallenges::<T>::get(claim_id).unwrap();
                    T::Currency::unreserve(challenger, challenge.stake);
                }
            }
        }

        Claims::<T>::insert(claim_id, claim);

        Self::deposit_event(Event::ClaimResolved {
            claim_id,
            resolution,
        });

        Ok(())
    }
    }

    impl<T: Config> Pallet<T> {
        /// Check if an account has valid query access
        pub fn has_query_access(who: &T::AccountId, ual: &Vec<u8>) -> bool {
            if let Some(expiry) = QueryAccess::<T>::get(who, ual) {
                let current_block = <frame_system::Pallet<T>>::block_number();
                current_block <= expiry
            } else {
                false
            }
        }

        /// Calculate reputation credibility boost from staking
        pub fn credibility_boost(who: &T::AccountId) -> u32 {
            let staked = StakedAmount::<T>::get(who);
            let min_stake = T::MinimumStake::get();

            if staked >= min_stake {
                // Calculate boost percentage (e.g., 1% per minimum stake unit)
                let boost = (staked / min_stake).saturated_into::<u32>();
                boost.min(50) // Cap at 50% boost
            } else {
                0
            }
        }

        /// Get next claim ID
        fn get_next_claim_id() -> u64 {
            ClaimIdCounter::<T>::mutate(|counter| {
                *counter = counter.saturating_add(1);
                *counter
            })
        }
    }
}
