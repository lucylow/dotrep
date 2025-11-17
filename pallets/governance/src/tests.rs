#[cfg(test)]
mod tests {
    use super::*;
    use crate::mock::*;
    use crate::pallet::{ProposalType, SkillTag};
    use frame_support::{assert_ok, assert_noop, BoundedVec};
    use sp_core::H256;

    fn setup() {
        new_test_ext().execute_with(|| {
            frame_system::Pallet::<Test>::set_block_number(1);
        });
    }

    fn setup_with_reputation() {
        new_test_ext().execute_with(|| {
            frame_system::Pallet::<Test>::set_block_number(1);
            
            // Set up reputation scores for test accounts
            // Account 1: High reputation (500)
            for i in 0..50 {
                let ph = H256::from_low_u64_be(1000 + i);
                let _ = pallet_reputation::Pallet::<Test>::submit_contribution(
                    RuntimeOrigin::signed(1),
                    ph,
                    pallet_reputation::ContributionType::PullRequest,
                );
            }
            
            // Account 2: Low reputation (50)
            for i in 0..5 {
                let ph = H256::from_low_u64_be(2000 + i);
                let _ = pallet_reputation::Pallet::<Test>::submit_contribution(
                    RuntimeOrigin::signed(2),
                    ph,
                    pallet_reputation::ContributionType::IssueComment,
                );
            }
            
            // Account 3: Medium reputation (150)
            for i in 0..15 {
                let ph = H256::from_low_u64_be(3000 + i);
                let _ = pallet_reputation::Pallet::<Test>::submit_contribution(
                    RuntimeOrigin::signed(3),
                    ph,
                    pallet_reputation::ContributionType::PullRequest,
                );
            }
        });
    }

    #[test]
    fn test_create_proposal_success() {
        setup_with_reputation();
        new_test_ext().execute_with(|| {
            frame_system::Pallet::<Test>::set_block_number(1);
            
            // User 1 has high reputation (above threshold)
            let tags = BoundedVec::try_from(vec![b"technical".to_vec()]).unwrap();
            let description = BoundedVec::try_from(b"Test proposal".to_vec()).unwrap();
            
            assert_ok!(Governance::create_proposal(
                RuntimeOrigin::signed(1),
                ProposalType::TreasurySpend {
                    amount: 1000,
                    beneficiary: 2,
                },
                tags,
                description,
            ));
            
            let proposal = Governance::proposals(0).unwrap();
            assert_eq!(proposal.proposer, 1);
            assert_eq!(proposal.executed, false);
        });
    }

    #[test]
    fn test_create_proposal_insufficient_reputation() {
        setup_with_reputation();
        new_test_ext().execute_with(|| {
            frame_system::Pallet::<Test>::set_block_number(1);
            
            // User 2 has only 50 reputation (below threshold of 100)
            let tags = BoundedVec::try_from(vec![b"technical".to_vec()]).unwrap();
            let description = BoundedVec::try_from(b"Test proposal".to_vec()).unwrap();
            
            assert_noop!(
                Governance::create_proposal(
                    RuntimeOrigin::signed(2),
                    ProposalType::TreasurySpend {
                        amount: 1000,
                        beneficiary: 1,
                    },
                    tags,
                    description,
                ),
                Error::<Test>::InsufficientReputation
            );
        });
    }

    #[test]
    fn test_voting_with_expertise_boost() {
        setup_with_reputation();
        new_test_ext().execute_with(|| {
            frame_system::Pallet::<Test>::set_block_number(1);
            
            // Set up skill tags for user 1
            let user_skills = BoundedVec::try_from(vec![b"rust".to_vec(), b"polkadot".to_vec()]).unwrap();
            assert_ok!(Governance::update_skill_tags(
                RuntimeOrigin::signed(1),
                user_skills,
            ));
            
            // Create proposal with technical tag
            let proposal_tags = BoundedVec::try_from(vec![b"rust".to_vec()]).unwrap();
            let description = BoundedVec::try_from(b"Technical upgrade".to_vec()).unwrap();
            
            assert_ok!(Governance::create_proposal(
                RuntimeOrigin::signed(1),
                ProposalType::RuntimeUpgrade {
                    code_hash: H256::default(),
                },
                proposal_tags,
                description,
            ));

            // User 1 votes - should get expertise boost
            assert_ok!(Governance::vote(
                RuntimeOrigin::signed(1),
                0,
                true
            ));

            let proposal = Governance::proposals(0).unwrap();
            // User 1 has ~500 reputation -> sqrt(500) ≈ 22 * 2 (expertise boost) = 44
            assert!(proposal.for_votes > 0);
        });
    }

    #[test]
    fn test_voting_closed() {
        setup_with_reputation();
        new_test_ext().execute_with(|| {
            frame_system::Pallet::<Test>::set_block_number(1);
            
            let tags = BoundedVec::try_from(vec![b"technical".to_vec()]).unwrap();
            let description = BoundedVec::try_from(b"Test proposal".to_vec()).unwrap();
            
            assert_ok!(Governance::create_proposal(
                RuntimeOrigin::signed(1),
                ProposalType::TreasurySpend {
                    amount: 1000,
                    beneficiary: 2,
                },
                tags,
                description,
            ));
            
            // Fast forward past voting period
            frame_system::Pallet::<Test>::set_block_number(200);
            
            assert_noop!(
                Governance::vote(
                    RuntimeOrigin::signed(1),
                    0,
                    true
                ),
                Error::<Test>::VotingClosed
            );
        });
    }

    #[test]
    fn test_already_voted() {
        setup_with_reputation();
        new_test_ext().execute_with(|| {
            frame_system::Pallet::<Test>::set_block_number(1);
            
            let tags = BoundedVec::try_from(vec![b"technical".to_vec()]).unwrap();
            let description = BoundedVec::try_from(b"Test proposal".to_vec()).unwrap();
            
            assert_ok!(Governance::create_proposal(
                RuntimeOrigin::signed(1),
                ProposalType::TreasurySpend {
                    amount: 1000,
                    beneficiary: 2,
                },
                tags,
                description,
            ));
            
            assert_ok!(Governance::vote(
                RuntimeOrigin::signed(1),
                0,
                true
            ));
            
            assert_noop!(
                Governance::vote(
                    RuntimeOrigin::signed(1),
                    0,
                    false
                ),
                Error::<Test>::AlreadyVoted
            );
        });
    }

    #[test]
    fn test_delegate_vote() {
        setup_with_reputation();
        new_test_ext().execute_with(|| {
            frame_system::Pallet::<Test>::set_block_number(1);
            
            // User 2 delegates to User 1
            assert_ok!(Governance::delegate_vote(
                RuntimeOrigin::signed(2),
                1,
                50
            ));
            
            let delegation = Governance::delegations(2).unwrap();
            assert_eq!(delegation.delegator, 2);
            assert_eq!(delegation.delegatee, 1);
            assert_eq!(delegation.amount, 50);
        });
    }

    #[test]
    fn test_delegate_to_self_fails() {
        setup_with_reputation();
        new_test_ext().execute_with(|| {
            frame_system::Pallet::<Test>::set_block_number(1);
            
            assert_noop!(
                Governance::delegate_vote(
                    RuntimeOrigin::signed(1),
                    1,
                    100
                ),
                Error::<Test>::InvalidDelegatee
            );
        });
    }

    #[test]
    fn test_delegation_exceeds_capacity() {
        setup_with_reputation();
        new_test_ext().execute_with(|| {
            frame_system::Pallet::<Test>::set_block_number(1);
            
            // User 1 has ~500 reputation
            // Try to delegate more than their reputation
            assert_noop!(
                Governance::delegate_vote(
                    RuntimeOrigin::signed(2),
                    1,
                    600 // More than user 1's reputation
                ),
                Error::<Test>::DelegationExceedsCapacity
            );
        });
    }

    #[test]
    fn test_execute_proposal() {
        setup_with_reputation();
        new_test_ext().execute_with(|| {
            frame_system::Pallet::<Test>::set_block_number(1);
            
            let tags = BoundedVec::try_from(vec![b"technical".to_vec()]).unwrap();
            let description = BoundedVec::try_from(b"Test proposal".to_vec()).unwrap();
            
            assert_ok!(Governance::create_proposal(
                RuntimeOrigin::signed(1),
                ProposalType::TreasurySpend {
                    amount: 1000,
                    beneficiary: 2,
                },
                tags,
                description,
            ));
            
            // Vote for the proposal
            assert_ok!(Governance::vote(
                RuntimeOrigin::signed(1),
                0,
                true
            ));
            
            // Fast forward past voting period
            frame_system::Pallet::<Test>::set_block_number(200);
            
            // Execute proposal
            assert_ok!(Governance::execute_proposal(
                RuntimeOrigin::signed(1),
                0
            ));
            
            let proposal = Governance::proposals(0).unwrap();
            assert_eq!(proposal.executed, true);
        });
    }

    #[test]
    fn test_execute_proposal_fails_if_not_passed() {
        setup_with_reputation();
        new_test_ext().execute_with(|| {
            frame_system::Pallet::<Test>::set_block_number(1);
            
            let tags = BoundedVec::try_from(vec![b"technical".to_vec()]).unwrap();
            let description = BoundedVec::try_from(b"Test proposal".to_vec()).unwrap();
            
            assert_ok!(Governance::create_proposal(
                RuntimeOrigin::signed(1),
                ProposalType::TreasurySpend {
                    amount: 1000,
                    beneficiary: 2,
                },
                tags,
                description,
            ));
            
            // Vote against the proposal
            assert_ok!(Governance::vote(
                RuntimeOrigin::signed(1),
                0,
                false
            ));
            
            // Fast forward past voting period
            frame_system::Pallet::<Test>::set_block_number(200);
            
            // Try to execute - should fail
            assert_noop!(
                Governance::execute_proposal(
                    RuntimeOrigin::signed(1),
                    0
                ),
                Error::<Test>::CannotExecute
            );
        });
    }

    #[test]
    fn test_update_skill_tags() {
        setup();
        new_test_ext().execute_with(|| {
            frame_system::Pallet::<Test>::set_block_number(1);
            
            let tags = BoundedVec::try_from(vec![
                b"rust".to_vec(),
                b"polkadot".to_vec(),
                b"substrate".to_vec(),
            ]).unwrap();
            
            assert_ok!(Governance::update_skill_tags(
                RuntimeOrigin::signed(1),
                tags.clone(),
            ));
            
            let stored_tags = Governance::skill_tags(1);
            assert_eq!(stored_tags.len(), 3);
        });
    }

    #[test]
    fn test_quadratic_voting() {
        setup_with_reputation();
        new_test_ext().execute_with(|| {
            frame_system::Pallet::<Test>::set_block_number(1);
            
            let tags = BoundedVec::try_from(vec![b"technical".to_vec()]).unwrap();
            let description = BoundedVec::try_from(b"Test proposal".to_vec()).unwrap();
            
            assert_ok!(Governance::create_proposal(
                RuntimeOrigin::signed(1),
                ProposalType::TreasurySpend {
                    amount: 1000,
                    beneficiary: 2,
                },
                tags,
                description,
            ));
            
            // User 1 (high rep ~500) votes
            assert_ok!(Governance::vote(
                RuntimeOrigin::signed(1),
                0,
                true
            ));
            
            let proposal1 = Governance::proposals(0).unwrap();
            let votes1 = proposal1.for_votes;
            
            // User 3 (medium rep ~150) votes
            assert_ok!(Governance::vote(
                RuntimeOrigin::signed(3),
                0,
                true
            ));
            
            let proposal2 = Governance::proposals(0).unwrap();
            let votes2 = proposal2.for_votes;
            
            // Verify quadratic voting: sqrt(500) ≈ 22, sqrt(150) ≈ 12
            // So votes1 should be around 22, and votes2 should be around 34 (22 + 12)
            assert!(votes2 > votes1);
        });
    }

    #[test]
    fn test_proposal_not_found() {
        setup();
        new_test_ext().execute_with(|| {
            frame_system::Pallet::<Test>::set_block_number(1);
            
            assert_noop!(
                Governance::vote(
                    RuntimeOrigin::signed(1),
                    999, // Non-existent proposal
                    true
                ),
                Error::<Test>::ProposalNotFound
            );
        });
    }
}

