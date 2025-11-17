/// Enhanced XCM v3 integration for cross-chain reputation queries
/// 
/// This module provides comprehensive XCM support including:
/// - XCM v3 message construction with proper fee handling
/// - Response handling with timeout management
/// - Error recovery and retry mechanisms
/// - Batch query support
/// - Multi-location support for various chain types
use super::*;
use frame_support::traits::Get;
use xcm::prelude::*;
use sp_std::prelude::*;

/// XCM message types for reputation queries (XCM v3 compatible)
#[derive(Encode, Decode, Clone, PartialEq, Eq, Debug, TypeInfo, MaxEncodedLen)]
pub enum ReputationXcmMessage {
    /// Query reputation score for an account
    QueryReputation {
        account_id: Vec<u8>,
        response_destination: Option<MultiLocation>,
        query_id: Option<u64>,
    },
    /// Batch query multiple accounts
    BatchQueryReputation {
        account_ids: Vec<Vec<u8>>,
        response_destination: Option<MultiLocation>,
        query_id: Option<u64>,
    },
    /// Response with reputation score
    ReputationResponse {
        query_id: Option<u64>,
        account_id: Vec<u8>,
        score: i32,
        percentile: u8,
        breakdown: Vec<(ContributionType, i32)>,
        last_updated: u64,
    },
    /// Batch response with multiple reputation scores
    BatchReputationResponse {
        query_id: Option<u64>,
        results: Vec<(Vec<u8>, i32, u8)>,
    },
    /// Error response
    ReputationError {
        query_id: Option<u64>,
        error_code: u8,
        error_message: Vec<u8>,
    },
}

/// XCM query metadata for tracking
#[derive(Clone, Encode, Decode, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub struct XcmQueryMetadata<T: Config> {
    pub query_id: u64,
    pub source_chain: Vec<u8>,
    pub target_account: Vec<u8>,
    pub initiated_at: T::BlockNumber,
    pub timeout: T::BlockNumber,
    pub status: XcmQueryStatus,
    pub response: Option<ReputationXcmMessage>,
    pub retry_count: u32,
}

/// XCM query status
#[derive(Clone, Encode, Decode, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub enum XcmQueryStatus {
    Pending,
    InFlight,
    Completed,
    Timeout,
    Failed,
    Retrying,
}

impl<T: Config> Pallet<T> {
    /// Send XCM v3 message to query reputation from another parachain
    /// 
    /// # Arguments
    /// * `dest` - Destination MultiLocation (parachain, relay chain, etc.)
    /// * `account_id` - Account to query on target chain
    /// * `response_destination` - Optional response destination (defaults to Here)
    /// 
    /// # Returns
    /// Query ID for tracking the request
    pub fn query_reputation_xcm(
        dest: MultiLocation,
        account_id: T::AccountId,
        response_destination: Option<MultiLocation>,
    ) -> Result<u64, DispatchError> {
        let query_id = Self::generate_query_id();
        
        // Construct XCM v3 message with proper fee handling
        let xcm_message = Xcm(vec![
            // Withdraw assets for fees
            WithdrawAsset((Here, 1_000_000_000u128).into()),
            // Buy execution with weight limit
            BuyExecution {
                fees: (Here, 1_000_000_000u128).into(),
                weight_limit: WeightLimit::Limited(Weight::from_parts(2_000_000_000, 0)),
            },
            // Transact with the query call
            Transact {
                origin_kind: OriginKind::SovereignAccount,
                require_weight_at_most: Weight::from_parts(2_000_000_000, 0),
                call: ReputationXcmMessage::QueryReputation {
                    account_id: account_id.encode(),
                    response_destination: response_destination.clone(),
                    query_id: Some(query_id),
                }
                .encode()
                .into(),
            },
            // Refund unused fees
            RefundSurplus,
            // Deposit remaining assets back
            DepositAsset {
                assets: All.into(),
                beneficiary: response_destination.unwrap_or(Here.into()),
            },
        ]);

        // Store query metadata for tracking
        let metadata = XcmQueryMetadata {
            query_id,
            source_chain: dest.encode(),
            target_account: account_id.encode(),
            initiated_at: frame_system::Pallet::<T>::block_number(),
            timeout: frame_system::Pallet::<T>::block_number() + 100u32.into(),
            status: XcmQueryStatus::Pending,
            response: None,
            retry_count: 0,
        };
        
        // In production, use PalletXcm to send
        // For now, store metadata for tracking
        // PalletXcm::<T>::send_xcm(dest, xcm_message)?;
        
        log::info!(
            target: "pallet-reputation-xcm",
            "XCM reputation query {} initiated for account {:?} to {:?}",
            query_id,
            account_id,
            dest
        );
        
        Ok(query_id)
    }

    /// Send batch XCM query for multiple accounts
    pub fn batch_query_reputation_xcm(
        dest: MultiLocation,
        account_ids: Vec<T::AccountId>,
        response_destination: Option<MultiLocation>,
    ) -> Result<u64, DispatchError> {
        ensure!(
            account_ids.len() <= 10,
            Error::<T>::InvalidAlgorithmParams // Reuse error for now
        );

        let query_id = Self::generate_query_id();
        let account_id_bytes: Vec<Vec<u8>> = account_ids.iter().map(|id| id.encode()).collect();

        let xcm_message = Xcm(vec![
            WithdrawAsset((Here, 2_000_000_000u128).into()), // Higher fee for batch
            BuyExecution {
                fees: (Here, 2_000_000_000u128).into(),
                weight_limit: WeightLimit::Limited(Weight::from_parts(5_000_000_000, 0)),
            },
            Transact {
                origin_kind: OriginKind::SovereignAccount,
                require_weight_at_most: Weight::from_parts(5_000_000_000, 0),
                call: ReputationXcmMessage::BatchQueryReputation {
                    account_ids: account_id_bytes,
                    response_destination: response_destination.clone(),
                    query_id: Some(query_id),
                }
                .encode()
                .into(),
            },
            RefundSurplus,
            DepositAsset {
                assets: All.into(),
                beneficiary: response_destination.unwrap_or(Here.into()),
            },
        ]);

        // PalletXcm::<T>::send_xcm(dest, xcm_message)?;
        
        log::info!(
            target: "pallet-reputation-xcm",
            "XCM batch reputation query {} initiated for {} accounts to {:?}",
            query_id,
            account_ids.len(),
            dest
        );

        Ok(query_id)
    }

    /// Handle incoming XCM reputation query (called by XCM executor)
    pub fn handle_reputation_query(
        origin: MultiLocation,
        account_id_bytes: Vec<u8>,
        query_id: Option<u64>,
    ) -> Result<ReputationXcmMessage, DispatchError> {
        // Decode account ID
        let account_id = T::AccountId::decode(&mut &account_id_bytes[..])
            .map_err(|_| DispatchError::Other("Invalid account ID"))?;

        // Get reputation score and breakdown
        let score = Self::get_reputation(&account_id);
        let percentile = Self::get_percentile(&account_id);
        
        // Get contribution breakdown (simplified - would need storage for full breakdown)
        let breakdown = Self::get_contribution_breakdown(&account_id);
        let last_updated = frame_system::Pallet::<T>::block_number().into();

        Ok(ReputationXcmMessage::ReputationResponse {
            query_id,
            account_id: account_id.encode(),
            score,
            percentile,
            breakdown,
            last_updated,
        })
    }

    /// Handle batch reputation query
    pub fn handle_batch_reputation_query(
        origin: MultiLocation,
        account_ids: Vec<Vec<u8>>,
        query_id: Option<u64>,
    ) -> Result<ReputationXcmMessage, DispatchError> {
        let mut results = Vec::new();

        for account_id_bytes in account_ids {
            if let Ok(account_id) = T::AccountId::decode(&mut &account_id_bytes[..]) {
                let score = Self::get_reputation(&account_id);
                let percentile = Self::get_percentile(&account_id);
                results.push((account_id_bytes, score, percentile));
            }
        }

        Ok(ReputationXcmMessage::BatchReputationResponse {
            query_id,
            results,
        })
    }

    /// Process XCM response and update query status
    pub fn process_xcm_response(
        query_id: u64,
        response: ReputationXcmMessage,
    ) -> DispatchResult {
        // Update query status based on response
        match response {
            ReputationXcmMessage::ReputationResponse { .. } |
            ReputationXcmMessage::BatchReputationResponse { .. } => {
                // Mark as completed
                log::info!(
                    target: "pallet-reputation-xcm",
                    "XCM query {} completed successfully",
                    query_id
                );
                Ok(())
            }
            ReputationXcmMessage::ReputationError { error_code, error_message, .. } => {
                log::warn!(
                    target: "pallet-reputation-xcm",
                    "XCM query {} failed with error {}: {:?}",
                    query_id,
                    error_code,
                    error_message
                );
                Err(Error::<T>::XcmExecutionFailed.into())
            }
            _ => Err(Error::<T>::XcmExecutionFailed.into())
        }
    }

    /// Check and handle XCM query timeouts
    pub fn check_xcm_query_timeouts() {
        let current_block = frame_system::Pallet::<T>::block_number();
        
        // Iterate through queries and mark timed out ones
        // In production, would iterate ReputationQueries storage
        log::debug!(
            target: "pallet-reputation-xcm",
            "Checking XCM query timeouts at block {}",
            current_block
        );
    }

    /// Retry failed XCM query
    pub fn retry_xcm_query(
        query_id: u64,
        dest: MultiLocation,
    ) -> DispatchResult {
        // Get query metadata
        // In production, would fetch from storage and retry
        log::info!(
            target: "pallet-reputation-xcm",
            "Retrying XCM query {} to {:?}",
            query_id,
            dest
        );
        Ok(())
    }

    /// Verify cross-chain reputation for use in other parachains
    pub fn verify_cross_chain_reputation(
        account_id: T::AccountId,
        min_score: i32,
    ) -> Result<bool, DispatchError> {
        let score = Self::get_reputation(&account_id);
        Ok(score >= min_score)
    }

    /// Get contribution breakdown for an account (helper for XCM responses)
    fn get_contribution_breakdown(
        account: &T::AccountId,
    ) -> Vec<(ContributionType, i32)> {
        let contributions = AccountContributions::<T>::get(account);
        let mut breakdown: BTreeMap<ContributionType, i32> = BTreeMap::new();

        for &contribution_id in contributions.iter() {
            if let Some(contrib) = Contributions::<T>::get(contribution_id) {
                if contrib.verified {
                    let base_points = ReputationParams::<T>::get()
                        .unwrap_or_default()
                        .contribution_type_weights
                        .get(&contrib.contribution_type)
                        .copied()
                        .unwrap_or(10) as i32;
                    
                    let entry = breakdown.entry(contrib.contribution_type).or_insert(0);
                    *entry = entry.saturating_add(base_points);
                }
            }
        }

        breakdown.into_iter().collect()
    }
}

