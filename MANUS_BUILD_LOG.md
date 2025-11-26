# DOTREP Build Log

This file tracks all Knowledge Assets (UALs) produced during the build and deployment process.

## Build Information

- **Build Date**: {{BUILD_DATE}}
- **Build Version**: {{BUILD_VERSION}}
- **Environment**: {{ENVIRONMENT}}

## Published Assets

### ReputationAssets

<!-- Assets will be appended here during build -->

### ReceiptAssets

<!-- Receipts will be appended here during x402 flows -->

### CommunityNotes

<!-- Notes will be appended here when published -->

## Verification Summary

Run `make verify` or `python scripts/verify_asset.py <ual>` to verify individual assets.

## Notes

- Assets marked with `simulated: true` were created in mock mode (no real Edge Node access)
- All assets include contentHash and signature for verification
- UALs follow the format: `urn:ual:dotrep:<type>:<identifier>`

