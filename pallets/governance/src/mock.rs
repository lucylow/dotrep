use crate as pallet_governance;
use crate::pallet::ReputationInterface;
use pallet_reputation as pallet_rep;

use frame_support::{
    parameter_types,
    traits::{OnFinalize, OnInitialize},
};
use sp_core::H256;
use sp_runtime::{
    traits::{BlakeTwo256, IdentityLookup},
    testing::Header,
    BuildStorage,
};

// Set up mock types for simplicity
type UncheckedExtrinsic = frame_system::mocking::MockUncheckedExtrinsic<Test>;
type Block = frame_system::mocking::MockBlock<Test>;

// Configure a mock runtime for testing
frame_support::construct_runtime!(
    pub enum Test where
        Block = Block,
        NodeBlock = Block,
        UncheckedExtrinsic = UncheckedExtrinsic,
    {
        System: frame_system,
        Balances: pallet_balances,
        Reputation: pallet_rep,
        Governance: pallet_governance,
    }
);

// Constants for testing
parameter_types! {
    pub const BlockHashCount: u64 = 250;
    pub const ExistentialDeposit: u64 = 1;
}

// System pallet configuration
impl frame_system::Config for Test {
    type BaseCallFilter = frame_support::traits::Everything;
    type BlockWeights = ();
    type BlockLength = ();
    type DbWeight = ();
    type RuntimeOrigin = RuntimeOrigin;
    type RuntimeCall = RuntimeCall;
    type Index = u64;
    type BlockNumber = u64;
    type Hash = H256;
    type Hashing = BlakeTwo256;
    type AccountId = u64;
    type Lookup = IdentityLookup<u64>;
    type Header = Header;
    type RuntimeEvent = RuntimeEvent;
    type BlockHashCount = BlockHashCount;
    type Version = ();
    type PalletInfo = PalletInfo;
    type AccountData = pallet_balances::AccountData<u64>;
    type OnNewAccount = ();
    type OnKilledAccount = ();
    type SystemWeightInfo = ();
    type SS58Prefix = ();
    type OnSetCode = ();
    type MaxConsumers = frame_support::traits::ConstU32<16>;
}

// Balances pallet configuration
impl pallet_balances::Config for Test {
    type MaxLocks = ();
    type MaxReserves = ();
    type ReserveIdentifier = [u8; 8];
    type Balance = u64;
    type RuntimeEvent = RuntimeEvent;
    type DustRemoval = ();
    type ExistentialDeposit = ExistentialDeposit;
    type AccountStore = System;
    type WeightInfo = ();
}

// Mock configuration for pallet_reputation
parameter_types! {
    pub const MaxContributionsPerAccount: u32 = 5;
    pub const MinReputation: i32 = 0;
    pub const MaxReputation: i32 = 1000;
}

impl pallet_rep::Config for Test {
    type RuntimeEvent = RuntimeEvent;
    type MaxContributionsPerAccount = MaxContributionsPerAccount;
    type MinReputation = MinReputation;
    type MaxReputation = MaxReputation;
}

// Mock ReputationInterface implementation
impl ReputationInterface<Test> for pallet_rep::Pallet<Test> {
    fn get_reputation_score(account: &u64) -> i32 {
        pallet_rep::Pallet::<Test>::get_reputation(account)
    }
}

// Governance pallet configuration
parameter_types! {
    pub const MinProposalReputation: u64 = 100;
    pub const ProposalDeposit: u64 = 1_000_000;
    pub const VotingPeriod: u64 = 100;
    pub const CouncilSize: u32 = 7;
}

impl pallet_governance::Config for Test {
    type RuntimeEvent = RuntimeEvent;
    type Currency = Balances;
    type Reputation = pallet_rep::Pallet<Test>;
    type MinProposalReputation = MinProposalReputation;
    type ProposalDeposit = ProposalDeposit;
    type VotingPeriod = VotingPeriod;
    type CouncilSize = CouncilSize;
}

// Genesis storage initialization for tests
pub fn new_test_ext() -> sp_io::TestExternalities {
    let mut t = frame_system::GenesisConfig::default()
        .build_storage::<Test>()
        .unwrap();

    // Initialize balances for test accounts
    pallet_balances::GenesisConfig::<Test> {
        balances: vec![
            (1, 10_000_000), // High reputation user with funds
            (2, 10_000_000), // Low reputation user with funds
            (3, 10_000_000), // Average user with funds
            (4, 10_000_000), // Another test user
        ],
    }
    .assimilate_storage(&mut t)
    .unwrap();

    t.into()
}

