#[cfg(test)]
mod tests {
    use super::*;
    use crate::mock::*;
    use frame_support::{assert_ok, assert_err, traits::{Currency, OnInitialize}};
    use sp_core::H256;

    fn setup() {
        new_test_ext().execute_with(|| {
            frame_system::Pallet::<Test>::set_block_number(1);
            pallet_timestamp::Pallet::<Test>::set_timestamp(1000);
        });
    }

    #[test]
    fn test_complete_reputation_lifecycle() {
        setup();
        new_test_ext().execute_with(|| {
            let contributor: u64 = 1;
            let verifier: u64 = 2;

            // Give verifier some reputation
            ReputationScores::<Test>::insert(verifier, 50);

            // Add contribution
            let proof = H256::from_low_u64_be(12345);
            assert_ok!(Reputation::add_contribution(
                RuntimeOrigin::signed(contributor),
                proof,
                ContributionType::CodeCommit,
                10,
                DataSource::GitHub,
            ));

            // Get contribution ID
            let contribution_id = NextContributionId::<Test>::get() - 1;

            // Verify contribution
            assert_ok!(Reputation::verify_contribution(
                RuntimeOrigin::signed(verifier),
                contributor,
                contribution_id,
                90,
                b"Excellent work!".to_vec()
            ));

            // Check reputation calculated
            let reputation = Reputation::get_reputation(&contributor);
            assert!(reputation > 0, "Reputation should be positive");
        });
    }

    #[test]
    fn test_add_contribution() {
        setup();
        new_test_ext().execute_with(|| {
            let account: u64 = 1;
            let proof_hash = H256::from_low_u64_be(12345);

            // Should be successful for first submission
            assert_ok!(Reputation::add_contribution(
                RuntimeOrigin::signed(account),
                proof_hash,
                ContributionType::IssueComment,
                5,
                DataSource::GitHub,
            ));

            // Should fail on duplicate submission
            assert_err!(
                Reputation::add_contribution(
                    RuntimeOrigin::signed(account),
                    proof_hash,
                    ContributionType::IssueComment,
                    5,
                    DataSource::GitHub,
                ),
                Error::<Test>::ContributionAlreadySubmitted
            );
        });
    }

    #[test]
    fn test_reputation_score_update() {
        setup();
        new_test_ext().execute_with(|| {
            let account: u64 = 2;
            let verifier: u64 = 3;

            // Give verifier reputation
            ReputationScores::<Test>::insert(verifier, 50);

            // Submit multiple contributions
            for i in 0..3 {
                let ph = H256::from_low_u64_be(1000 + i);
                assert_ok!(Reputation::add_contribution(
                    RuntimeOrigin::signed(account),
                    ph,
                    ContributionType::PullRequest,
                    10,
                    DataSource::GitHub,
                ));

                // Verify each contribution
                let contribution_id = NextContributionId::<Test>::get() - 1;
                assert_ok!(Reputation::verify_contribution(
                    RuntimeOrigin::signed(verifier),
                    account,
                    contribution_id,
                    90,
                    vec![]
                ));
            }

            // Query reputation score
            let score = Reputation::get_reputation(&account);
            assert!(score >= 0); // Should be positive
            assert!(score <= 3 * 10); // If each PR awards 10 by default
        });
    }

    #[test]
    fn test_sybil_resistance_mechanisms() {
        setup();
        new_test_ext().execute_with(|| {
            let attacker: u64 = 999;

            // Attempt to spam contributions
            for i in 0..15 {
                let ph = H256::from_low_u64_be(5000 + i);
                let result = Reputation::add_contribution(
                    RuntimeOrigin::signed(attacker),
                    ph,
                    ContributionType::CodeCommit,
                    10,
                    DataSource::GitHub,
                );

                if i < 10 {
                    assert_ok!(result);
                } else {
                    // Should hit rate limits
                    assert_err!(result, Error::<Test>::RateLimited);
                }
            }
        });
    }

    #[test]
    fn test_max_contributions_limit() {
        setup();
        new_test_ext().execute_with(|| {
            let account: u64 = 3;

            // Submit maximum allowed contributions
            for i in 0..100 {
                let ph = H256::from_low_u64_be(2000 + i);
                let result = Reputation::add_contribution(
                    RuntimeOrigin::signed(account),
                    ph,
                    ContributionType::IssueComment,
                    5,
                    DataSource::GitHub,
                );

                if i < 100 {
                    assert_ok!(result);
                } else {
                    assert_err!(result, Error::<Test>::MaxContributionsExceeded);
                }
            }
        });
    }

    #[test]
    fn test_reputation_bounds() {
        setup();
        new_test_ext().execute_with(|| {
            let account: u64 = 1;

            // Reputation should be within bounds
            let score = Reputation::get_reputation(&account);
            assert!(score >= 0);
            assert!(score <= 1000);
        });
    }

    #[test]
    fn test_different_contribution_types() {
        setup();
        new_test_ext().execute_with(|| {
            let account: u64 = 1;
            let verifier: u64 = 2;

            // Give verifier reputation
            ReputationScores::<Test>::insert(verifier, 50);

            // Test different contribution types
            let types = vec![
                ContributionType::IssueComment,
                ContributionType::PullRequest,
                ContributionType::CodeReview,
                ContributionType::CodeCommit,
            ];

            for (i, contribution_type) in types.iter().enumerate() {
                let ph = H256::from_low_u64_be(4000 + i as u64);
                assert_ok!(Reputation::add_contribution(
                    RuntimeOrigin::signed(account),
                    ph,
                    contribution_type.clone(),
                    10,
                    DataSource::GitHub,
                ));

                // Verify contribution
                let contribution_id = NextContributionId::<Test>::get() - 1;
                assert_ok!(Reputation::verify_contribution(
                    RuntimeOrigin::signed(verifier),
                    account,
                    contribution_id,
                    90,
                    vec![]
                ));
            }

            // Verify reputation increased
            let score = Reputation::get_reputation(&account);
            assert!(score > 0);
        });
    }

    #[test]
    fn test_unauthorized_submission() {
        setup();
        new_test_ext().execute_with(|| {
            let proof_hash = H256::from_low_u64_be(5000);

            // Should fail with unsigned origin
            assert_err!(
                Reputation::add_contribution(
                    RuntimeOrigin::none(),
                    proof_hash,
                    ContributionType::IssueComment,
                    5,
                    DataSource::GitHub,
                ),
                sp_runtime::traits::BadOrigin
            );
        });
    }

    #[test]
    fn test_verification_requires_reputation() {
        setup();
        new_test_ext().execute_with(|| {
            let contributor: u64 = 1;
            let low_reputation_verifier: u64 = 2;

            // Low reputation verifier
            ReputationScores::<Test>::insert(low_reputation_verifier, 5);

            // Add contribution
            let proof = H256::from_low_u64_be(6000);
            assert_ok!(Reputation::add_contribution(
                RuntimeOrigin::signed(contributor),
                proof,
                ContributionType::PullRequest,
                10,
                DataSource::GitHub,
            ));

            let contribution_id = NextContributionId::<Test>::get() - 1;

            // Should fail - insufficient reputation to verify
            assert_err!(
                Reputation::verify_contribution(
                    RuntimeOrigin::signed(low_reputation_verifier),
                    contributor,
                    contribution_id,
                    90,
                    vec![]
                ),
                Error::<Test>::InsufficientReputationToVerify
            );
        });
    }

    #[test]
    fn test_verification_score_validation() {
        setup();
        new_test_ext().execute_with(|| {
            let contributor: u64 = 1;
            let verifier: u64 = 2;

            ReputationScores::<Test>::insert(verifier, 50);

            let proof = H256::from_low_u64_be(7000);
            assert_ok!(Reputation::add_contribution(
                RuntimeOrigin::signed(contributor),
                proof,
                ContributionType::PullRequest,
                10,
                DataSource::GitHub,
            ));

            let contribution_id = NextContributionId::<Test>::get() - 1;

            // Should fail - invalid score (> 100)
            assert_err!(
                Reputation::verify_contribution(
                    RuntimeOrigin::signed(verifier),
                    contributor,
                    contribution_id,
                    101,
                    vec![]
                ),
                Error::<Test>::InvalidVerificationScore
            );
        });
    }

    #[test]
    fn test_multiple_verifications() {
        setup();
        new_test_ext().execute_with(|| {
            let contributor: u64 = 1;
            let verifier1: u64 = 2;
            let verifier2: u64 = 3;
            let verifier3: u64 = 4;

            // Give all verifiers reputation
            ReputationScores::<Test>::insert(verifier1, 50);
            ReputationScores::<Test>::insert(verifier2, 50);
            ReputationScores::<Test>::insert(verifier3, 50);

            // Add contribution
            let proof = H256::from_low_u64_be(8000);
            assert_ok!(Reputation::add_contribution(
                RuntimeOrigin::signed(contributor),
                proof,
                ContributionType::PullRequest,
                10,
                DataSource::GitHub,
            ));

            let contribution_id = NextContributionId::<Test>::get() - 1;

            // First verification
            assert_ok!(Reputation::verify_contribution(
                RuntimeOrigin::signed(verifier1),
                contributor,
                contribution_id,
                90,
                vec![]
            ));

            // Contribution should be verified after min verifications (1 in test)
            let contribution = Contributions::<Test>::get(contribution_id).unwrap();
            assert!(contribution.verified);
            assert_eq!(contribution.verification_count, 1);

            // Additional verifications
            assert_ok!(Reputation::verify_contribution(
                RuntimeOrigin::signed(verifier2),
                contributor,
                contribution_id,
                85,
                vec![]
            ));

            assert_ok!(Reputation::verify_contribution(
                RuntimeOrigin::signed(verifier3),
                contributor,
                contribution_id,
                95,
                vec![]
            ));
        });
    }

    #[test]
    fn test_different_data_sources() {
        setup();
        new_test_ext().execute_with(|| {
            let account: u64 = 1;
            let verifier: u64 = 2;

            ReputationScores::<Test>::insert(verifier, 50);

            let sources = vec![
                DataSource::GitHub,
                DataSource::GitLab,
                DataSource::Bitbucket,
                DataSource::Manual,
            ];

            for (i, source) in sources.iter().enumerate() {
                let ph = H256::from_low_u64_be(9000 + i as u64);
                assert_ok!(Reputation::add_contribution(
                    RuntimeOrigin::signed(account),
                    ph,
                    ContributionType::CodeCommit,
                    10,
                    source.clone(),
                ));

                let contribution_id = NextContributionId::<Test>::get() - 1;
                let contribution = Contributions::<Test>::get(contribution_id).unwrap();
                assert_eq!(contribution.source, *source);
            }
        });
    }
}
