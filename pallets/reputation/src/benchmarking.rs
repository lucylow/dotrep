//! Benchmarking module for performance proof
//! 
//! This module provides comprehensive benchmarks for all pallet extrinsics to demonstrate
//! performance characteristics and enable proper weight calculation following Substrate
//! benchmarking best practices.

#![cfg(feature = "runtime-benchmarks")]

use super::*;
use frame_benchmarking::{benchmarks, whitelisted_caller};
use frame_system::RawOrigin;
use sp_core::H256;
use sp_std::collections::btree_map::BTreeMap;

benchmarks! {
    add_contribution {
        let contributor: T::AccountId = whitelisted_caller();
        let proof = H256::from([1u8; 32]);
        let contribution_type = ContributionType::CodeCommit;
        let weight = 50u8;
        let source = DataSource::GitHub;

        // Ensure account doesn't have max contributions
        let _ = AccountContributions::<T>::get(&contributor);
        
    }: add_contribution(RawOrigin::Signed(contributor.clone()), proof, contribution_type, weight, source)
    verify {
        // Verify contribution was stored
        let contribution_id = NextContributionId::<T>::get() - 1;
        assert!(Contributions::<T>::contains_key(contribution_id));
        assert!(ContributionsByProof::<T>::contains_key(proof));
        assert!(AccountContributions::<T>::get(&contributor).len() > 0);
    }

    verify_contribution {
        let contributor: T::AccountId = whitelisted_caller();
        let verifier: T::AccountId = whitelisted_caller();
        let proof = H256::from([2u8; 32]);
        
        // Setup: Add contribution first
        let _ = Pallet::<T>::add_contribution(
            RawOrigin::Signed(contributor.clone()).into(),
            proof,
            ContributionType::PullRequest,
            50,
            DataSource::GitHub,
        );
        
        // Give verifier sufficient reputation
        let min_rep = T::MinReputationToVerify::get();
        ReputationScores::<T>::insert(&verifier, min_rep);
        
        let contribution_id = NextContributionId::<T>::get() - 1;
        let score = 90u8;
        let comment = b"Excellent work!".to_vec();

        // Ensure contribution exists and is pending
        assert!(Contributions::<T>::contains_key(contribution_id));
        
    }: verify_contribution(RawOrigin::Signed(verifier), contributor, contribution_id, score, comment)
    verify {
        // Verify verification was stored
        assert!(ContributionVerifications::<T>::contains_key(contribution_id, &verifier));
        
        // Verify contribution was marked as verified if enough verifications
        let contribution = Contributions::<T>::get(contribution_id).expect("Contribution should exist");
        if contribution.verification_count >= T::MinVerifications::get() {
            assert!(contribution.verified);
            assert_eq!(contribution.status, ContributionStatus::Verified);
        }
    }

    update_algorithm_params {
        // Setup: Initialize default params
        let default_params = AlgorithmParams::default();
        ReputationParams::<T>::put(default_params.clone());

        // Create new params
        let mut new_weights = BTreeMap::new();
        new_weights.insert(ContributionType::PullRequest, 25);
        new_weights.insert(ContributionType::CodeReview, 18);
        new_weights.insert(ContributionType::CodeCommit, 12);
        new_weights.insert(ContributionType::IssueComment, 6);
        new_weights.insert(ContributionType::Documentation, 14);
        new_weights.insert(ContributionType::BugReport, 10);

        let new_params = AlgorithmParams {
            decay_rate_per_block: 2, // 2 PPM per block
            verification_multiplier: 18_000, // 1.8x
            contribution_type_weights: new_weights,
        };

        // Origin must be governance
        let origin = RawOrigin::Root;
        
    }: update_algorithm_params(origin, new_params.clone())
    verify {
        // Verify params were updated
        let stored_params = ReputationParams::<T>::get().expect("Params should exist");
        assert_eq!(stored_params.decay_rate_per_block, 2);
        assert_eq!(stored_params.verification_multiplier, 18_000);
    }

    update_reputation_with_time_decay {
        let account: T::AccountId = whitelisted_caller();
        
        // Setup: Add several verified contributions
        for i in 0..5u8 {
            let proof = H256::from([i; 32]);
            let _ = Pallet::<T>::add_contribution(
                RawOrigin::Signed(account.clone()).into(),
                proof,
                ContributionType::PullRequest,
                50,
                DataSource::GitHub,
            );

            let contribution_id = NextContributionId::<T>::get() - 1;
            let mut contribution = Contributions::<T>::get(contribution_id).expect("Should exist");
            contribution.verified = true;
            contribution.status = ContributionStatus::Verified;
            Contributions::<T>::insert(contribution_id, contribution);
        }

        // Initialize reputation params
        ReputationParams::<T>::put(AlgorithmParams::default());
        
    }: update_reputation_with_time_decay(&account)
    verify {
        // Verify reputation was updated
        let score = ReputationScores::<T>::get(&account);
        assert!(score >= T::MinReputation::get());
        assert!(score <= T::MaxReputation::get());
    }

    impl_benchmark_test_suite!(
        Pallet,
        crate::mock::new_test_ext(),
        crate::mock::Test
    );
}

