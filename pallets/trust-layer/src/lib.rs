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

    type BalanceOf<T> = <<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance;

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
    }
}
