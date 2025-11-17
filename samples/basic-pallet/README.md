# Basic Pallet Example

This sample demonstrates the fundamentals of creating a custom Substrate pallet for Polkadot.

## What This Sample Shows

- Creating a custom pallet with storage items
- Implementing dispatchable functions
- Adding events and errors
- Basic runtime integration

## Structure

```
basic-pallet/
├── pallets/
│   └── basic-pallet/
│       ├── Cargo.toml
│       └── src/
│           └── lib.rs
└── runtime/
    └── src/
        └── lib.rs
```

## Quick Start

1. **Start the development stack:**
   ```bash
   docker-compose up -d
   ```

2. **Access Polkadot-JS Apps:**
   Open http://localhost:3000 in your browser

3. **Connect to Local Node:**
   - Go to Settings → Networks
   - Add custom endpoint: `ws://localhost:9944`
   - Select "Local Node"

4. **Follow the Tutorial:**
   - Navigate to Developer → Extrinsics
   - Select your pallet and call functions
   - Check storage in Developer → Chain State

## Key Concepts

### Storage Items
```rust
#[pallet::storage]
pub type Value<T: Config> = StorageValue<_, u32, ValueQuery>;
```

### Dispatchable Functions
```rust
#[pallet::call]
impl<T: Config> Pallet<T> {
    #[pallet::weight(10_000)]
    pub fn set_value(origin: OriginFor<T>, value: u32) -> DispatchResult {
        let who = ensure_signed(origin)?;
        Value::<T>::put(value);
        Self::deposit_event(Event::ValueSet(who, value));
        Ok(())
    }
}
```

## Next Steps

- Add more complex storage (maps, double maps)
- Implement custom types
- Add benchmarking
- Create unit tests

## Resources

- [Substrate Documentation](https://docs.substrate.io/)
- [Polkadot Wiki](https://wiki.polkadot.network/)
- [Substrate Recipes](https://substrate.dev/recipes/)


