// DKG Integration Module for DotRep Reputation Pallet
//
// This module provides integration between the Substrate-based DotRep reputation system
// and the OriginTrail Decentralized Knowledge Graph (DKG).
//
// Key Features:
// - Publish reputation updates to DKG as Knowledge Assets
// - Store UAL (Uniform Asset Locator) mappings on-chain
// - Emit events for off-chain workers to process DKG publishing
// - Verify DKG proofs for cross-chain reputation queries

use frame_support::{
    dispatch::DispatchResult,
    pallet_prelude::*,
    traits::{Currency, ExistenceRequirement},
};
use frame_system::pallet_prelude::*;
use sp_std::vec::Vec;

/// DKG-related storage and types for the reputation pallet
pub trait DKGIntegration<T: frame_system::Config> {
    /// Publish reputation to DKG (triggers off-chain worker)
    fn publish_to_dkg(who: &T::AccountId, reputation_score: u32) -> DispatchResult;

    /// Store UAL mapping for a developer
    fn store_ual_mapping(who: &T::AccountId, ual: Vec<u8>) -> DispatchResult;

    /// Get UAL for a developer
    fn get_ual(who: &T::AccountId) -> Option<Vec<u8>>;

    /// Verify DKG proof
    fn verify_dkg_proof(ual: Vec<u8>, proof: Vec<u8>) -> bool;
}

/// UAL (Uniform Asset Locator) mapping storage
#[frame_support::pallet]
pub mod pallet {
    use super::*;

    #[pallet::config]
    pub trait Config: frame_system::Config {
        type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;
    }

    #[pallet::pallet]
    pub struct Pallet<T>(_);

    /// Storage for UAL mappings (AccountId -> UAL)
    #[pallet::storage]
    #[pallet::getter(fn developer_ual)]
    pub type DeveloperUAL<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        T::AccountId,
        BoundedVec<u8, ConstU32<256>>,
        OptionQuery,
    >;

    /// Storage for DKG publishing queue
    #[pallet::storage]
    #[pallet::getter(fn publishing_queue)]
    pub type PublishingQueue<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        T::AccountId,
        (u32, BlockNumberFor<T>), // (reputation_score, block_number)
        OptionQuery,
    >;

    /// Storage for DKG node endpoint (configurable)
    #[pallet::storage]
    #[pallet::getter(fn dkg_endpoint)]
    pub type DKGEndpoint<T: Config> = StorageValue<
        _,
        BoundedVec<u8, ConstU32<256>>,
        ValueQuery,
    >;

    /// Events for DKG integration
    #[pallet::event]
    #[pallet::generate_deposit(pub(super) fn deposit_event)]
    pub enum Event<T: Config> {
        /// Reputation published to DKG queue [who, reputation_score]
        ReputationQueued { who: T::AccountId, score: u32 },
        
        /// UAL mapping stored [who, ual]
        UALStored { who: T::AccountId, ual: Vec<u8> },
        
        /// DKG publishing completed [who, ual]
        DKGPublished { who: T::AccountId, ual: Vec<u8> },
        
        /// DKG endpoint updated [endpoint]
        DKGEndpointUpdated { endpoint: Vec<u8> },
    }

    #[pallet::error]
    pub enum Error<T> {
        /// UAL already exists for this developer
        UALAlreadyExists,
        
        /// UAL not found for this developer
        UALNotFound,
        
        /// Invalid UAL format
        InvalidUAL,
        
        /// DKG publishing failed
        PublishingFailed,
    }

    #[pallet::call]
    impl<T: Config> Pallet<T> {
        /// Store UAL mapping for a developer
        /// 
        /// This is typically called by an off-chain worker after successfully
        /// publishing reputation data to the DKG.
        #[pallet::call_index(0)]
        #[pallet::weight(10_000)]
        pub fn store_ual(
            origin: OriginFor<T>,
            ual: Vec<u8>,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;

            // Validate UAL format (basic check)
            ensure!(ual.len() > 0 && ual.len() <= 256, Error::<T>::InvalidUAL);

            // Convert to BoundedVec
            let bounded_ual: BoundedVec<u8, ConstU32<256>> = ual.clone()
                .try_into()
                .map_err(|_| Error::<T>::InvalidUAL)?;

            // Store UAL mapping
            DeveloperUAL::<T>::insert(&who, bounded_ual);

            // Emit event
            Self::deposit_event(Event::UALStored { who, ual });

            Ok(())
        }

        /// Queue reputation for DKG publishing
        /// 
        /// This adds the developer's reputation to a queue that will be processed
        /// by an off-chain worker to publish to the DKG.
        #[pallet::call_index(1)]
        #[pallet::weight(10_000)]
        pub fn queue_for_publishing(
            origin: OriginFor<T>,
            reputation_score: u32,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;

            let current_block = <frame_system::Pallet<T>>::block_number();

            // Add to publishing queue
            PublishingQueue::<T>::insert(&who, (reputation_score, current_block));

            // Emit event for off-chain worker
            Self::deposit_event(Event::ReputationQueued { 
                who, 
                score: reputation_score 
            });

            Ok(())
        }

        /// Update DKG endpoint configuration
        /// 
        /// Only callable by root/governance
        #[pallet::call_index(2)]
        #[pallet::weight(10_000)]
        pub fn set_dkg_endpoint(
            origin: OriginFor<T>,
            endpoint: Vec<u8>,
        ) -> DispatchResult {
            ensure_root(origin)?;

            let bounded_endpoint: BoundedVec<u8, ConstU32<256>> = endpoint.clone()
                .try_into()
                .map_err(|_| Error::<T>::InvalidUAL)?;

            DKGEndpoint::<T>::put(bounded_endpoint);

            Self::deposit_event(Event::DKGEndpointUpdated { endpoint });

            Ok(())
        }
    }

    impl<T: Config> Pallet<T> {
        /// Get UAL for a developer (helper function)
        pub fn get_developer_ual(who: &T::AccountId) -> Option<Vec<u8>> {
            DeveloperUAL::<T>::get(who).map(|bounded| bounded.to_vec())
        }

        /// Check if developer has a UAL
        pub fn has_ual(who: &T::AccountId) -> bool {
            DeveloperUAL::<T>::contains_key(who)
        }

        /// Get pending publishing queue items
        pub fn get_queue_item(who: &T::AccountId) -> Option<(u32, BlockNumberFor<T>)> {
            PublishingQueue::<T>::get(who)
        }

        /// Remove from publishing queue (called after successful publishing)
        pub fn remove_from_queue(who: &T::AccountId) {
            PublishingQueue::<T>::remove(who);
        }
    }
}

/// Implementation of DKGIntegration trait for the reputation pallet
impl<T: Config> DKGIntegration<T> for Pallet<T> {
    fn publish_to_dkg(who: &T::AccountId, reputation_score: u32) -> DispatchResult {
        // Queue for publishing by off-chain worker
        let current_block = <frame_system::Pallet<T>>::block_number();
        PublishingQueue::<T>::insert(who, (reputation_score, current_block));

        Self::deposit_event(Event::ReputationQueued { 
            who: who.clone(), 
            score: reputation_score 
        });

        Ok(())
    }

    fn store_ual_mapping(who: &T::AccountId, ual: Vec<u8>) -> DispatchResult {
        let bounded_ual: BoundedVec<u8, ConstU32<256>> = ual.clone()
            .try_into()
            .map_err(|_| Error::<T>::InvalidUAL)?;

        DeveloperUAL::<T>::insert(who, bounded_ual);

        Self::deposit_event(Event::UALStored { 
            who: who.clone(), 
            ual 
        });

        Ok(())
    }

    fn get_ual(who: &T::AccountId) -> Option<Vec<u8>> {
        Self::get_developer_ual(who)
    }

    fn verify_dkg_proof(ual: Vec<u8>, proof: Vec<u8>) -> bool {
        // TODO: Implement cryptographic verification of DKG proofs
        // This would typically involve:
        // 1. Parsing the proof structure
        // 2. Verifying signatures against known DKG node public keys
        // 3. Checking Merkle proofs for data integrity
        // 4. Validating blockchain anchors on NeuroWeb
        
        // For now, basic validation
        !ual.is_empty() && !proof.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::mock::*;
    use frame_support::assert_ok;

    #[test]
    fn test_store_ual() {
        new_test_ext().execute_with(|| {
            let developer = 1;
            let ual = b"did:dkg:otp/2043/0x1234...".to_vec();

            assert_ok!(DKGPallet::store_ual(
                RuntimeOrigin::signed(developer),
                ual.clone()
            ));

            assert_eq!(
                DKGPallet::get_developer_ual(&developer),
                Some(ual)
            );
        });
    }

    #[test]
    fn test_queue_for_publishing() {
        new_test_ext().execute_with(|| {
            let developer = 1;
            let score = 850;

            assert_ok!(DKGPallet::queue_for_publishing(
                RuntimeOrigin::signed(developer),
                score
            ));

            assert!(DKGPallet::get_queue_item(&developer).is_some());
        });
    }
}
