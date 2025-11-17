use crate as pallet_reputation;

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
use pallet_timestamp;

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
        Timestamp: pallet_timestamp,
        Balances: pallet_balances,
        Reputation: pallet_reputation,
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

// Timestamp pallet configuration
parameter_types! {
    pub const MinimumPeriod: u64 = 5;
}

impl pallet_timestamp::Config for Test {
    type Moment = u64;
    type OnTimestampSet = ();
    type MinimumPeriod = MinimumPeriod;
    type WeightInfo = ();
}

// Mock configuration for pallet_reputation
parameter_types! {
    pub const MaxContributionsPerAccount: u32 = 100;
    pub const MinReputation: i32 = 0;
    pub const MaxReputation: i32 = 1000;
    pub const MinReputationToVerify: i32 = 10;
    pub const MinVerifications: u32 = 1;
    pub const MaxPendingContributions: u32 = 10;
}

pub struct TestUpdateOrigin;
impl frame_support::traits::EnsureOrigin<RuntimeOrigin> for TestUpdateOrigin {
    type Success = u64;
    fn try_origin(o: RuntimeOrigin) -> Result<Self::Success, RuntimeOrigin> {
        match o {
            RuntimeOrigin::Root => Ok(0),
            RuntimeOrigin::Signed(who) => Ok(who),
            _ => Err(o),
        }
    }
}

impl pallet_reputation::Config for Test {
    type RuntimeEvent = RuntimeEvent;
    type Currency = Balances;
    type Time = Timestamp;
    type WeightInfo = ();
    type MaxContributionsPerAccount = MaxContributionsPerAccount;
    type MinReputation = MinReputation;
    type MaxReputation = MaxReputation;
    type MinReputationToVerify = MinReputationToVerify;
    type MinVerifications = MinVerifications;
    type MaxPendingContributions = MaxPendingContributions;
    type UpdateOrigin = TestUpdateOrigin;
}

// Genesis storage initialization for tests
pub fn new_test_ext() -> sp_io::TestExternalities {
    let mut t = frame_system::GenesisConfig::default()
        .build_storage::<Test>()
        .unwrap();

    // Optional: initialize balances for test accounts
    pallet_balances::GenesisConfig::<Test> {
        balances: vec![
            (1, 1_000_000),
            (2, 1_000_000),
            (3, 500_000),
        ],
    }
    .assimilate_storage(&mut t)
    .unwrap();

    t.into()
}

