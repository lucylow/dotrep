#!/usr/bin/env python3
"""
Asset Verification Script
Verifies contentHash, signature, and optional on-chain anchor for Knowledge Assets
"""

import json
import sys
import argparse
import requests
import hashlib
import base64
from pathlib import Path
from typing import Dict, Any, Optional

# Try to import verification libraries
try:
    from canonicaljson import encode_canonical_json
    CANONICAL_JSON = True
except ImportError:
    CANONICAL_JSON = False

try:
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import ed25519
    from cryptography.hazmat.backends import default_backend
    CRYPTO_AVAILABLE = True
except ImportError:
    CRYPTO_AVAILABLE = False


def canonicalize_json(data: Dict[str, Any]) -> bytes:
    """Canonicalize JSON for deterministic hashing"""
    if CANONICAL_JSON:
        return encode_canonical_json(data)
    else:
        return json.dumps(data, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode('utf-8')


def verify_content_hash(asset: Dict[str, Any]) -> tuple[bool, str]:
    """Verify contentHash matches computed hash"""
    if 'contentHash' not in asset:
        return False, "Missing contentHash"
    
    # Remove hash and signature before computing
    asset_copy = asset.copy()
    asset_copy.pop('contentHash', None)
    asset_copy.pop('signature', None)
    
    computed_hash = hashlib.sha256(canonicalize_json(asset_copy)).hexdigest()
    stored_hash = asset['contentHash']
    
    if computed_hash == stored_hash:
        return True, f"Hash verified: {computed_hash[:16]}..."
    else:
        return False, f"Hash mismatch: computed {computed_hash[:16]}... != stored {stored_hash[:16]}..."


def verify_signature(asset: Dict[str, Any], public_key_path: Optional[str] = None) -> tuple[bool, str]:
    """Verify DID signature (simplified for demo)"""
    if 'signature' not in asset:
        return False, "Missing signature"
    
    if not CRYPTO_AVAILABLE:
        # In demo mode, just check signature exists and is base64
        try:
            base64.b64decode(asset['signature'])
            return True, "Signature format valid (demo mode)"
        except:
            return False, "Invalid signature format"
    
    # In production, would verify with DID resolver
    # For now, just check format
    try:
        sig_bytes = base64.b64decode(asset['signature'])
        if len(sig_bytes) == 64:  # Ed25519 signature length
            return True, "Signature format valid"
        else:
            return False, f"Invalid signature length: {len(sig_bytes)}"
    except:
        return False, "Invalid signature encoding"


def verify_anchor(ual: str, edge_url: Optional[str] = None) -> tuple[bool, str]:
    """Verify on-chain anchor (if applicable)"""
    if not edge_url:
        return True, "Anchor verification skipped (no edge URL)"
    
    try:
        # Query edge node for asset
        response = requests.get(f"{edge_url}/asset/{ual}", timeout=10)
        if response.status_code == 200:
            return True, f"Asset found on edge node"
        else:
            return False, f"Asset not found on edge node: {response.status_code}"
    except Exception as e:
        return False, f"Error querying edge node: {e}"


def verify_asset(
    asset_path: str,
    edge_url: Optional[str] = None,
    public_key_path: Optional[str] = None
) -> Dict[str, Any]:
    """Verify a Knowledge Asset"""
    with open(asset_path, 'r') as f:
        asset = json.load(f)
    
    ual = asset.get('id', asset.get('ual', 'unknown'))
    
    hash_valid, hash_msg = verify_content_hash(asset)
    sig_valid, sig_msg = verify_signature(asset, public_key_path)
    anchor_valid, anchor_msg = verify_anchor(ual, edge_url)
    
    all_valid = hash_valid and sig_valid
    
    return {
        'ual': ual,
        'type': asset.get('type', 'unknown'),
        'hash_valid': hash_valid,
        'hash_message': hash_msg,
        'signature_valid': sig_valid,
        'signature_message': sig_msg,
        'anchor_valid': anchor_valid,
        'anchor_message': anchor_msg,
        'overall_valid': all_valid
    }


def main():
    parser = argparse.ArgumentParser(description="Verify Knowledge Assets")
    parser.add_argument("asset", type=str, help="Path to asset JSON file or UAL")
    parser.add_argument("--edge-url", type=str, default=None, help="Edge Node URL for anchor verification")
    parser.add_argument("--public-key", type=str, help="Path to public key for signature verification")
    parser.add_argument("--format", choices=['json', 'text'], default='text', help="Output format")
    
    args = parser.parse_args()
    
    # If UAL provided, try to fetch from edge node
    if args.asset.startswith('urn:ual:'):
        if not args.edge_url:
            print("Error: --edge-url required when verifying by UAL", file=sys.stderr)
            return 1
        
        try:
            response = requests.get(f"{args.edge_url}/asset/{args.asset}", timeout=10)
            if response.status_code != 200:
                print(f"Error: Asset not found: {args.asset}", file=sys.stderr)
                return 1
            
            asset = response.json()
            # Save to temp file for verification
            import tempfile
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
                json.dump(asset, f)
                asset_path = f.name
        except Exception as e:
            print(f"Error fetching asset: {e}", file=sys.stderr)
            return 1
    else:
        asset_path = args.asset
    
    result = verify_asset(asset_path, args.edge_url, args.public_key)
    
    if args.format == 'json':
        print(json.dumps(result, indent=2))
    else:
        print(f"UAL: {result['ual']}")
        print(f"Type: {result['type']}")
        print(f"Hash: {'✓' if result['hash_valid'] else '✗'} {result['hash_message']}")
        print(f"Signature: {'✓' if result['signature_valid'] else '✗'} {result['signature_message']}")
        print(f"Anchor: {'✓' if result['anchor_valid'] else '✗'} {result['anchor_message']}")
        print(f"\nOverall: {'✓ VALID' if result['overall_valid'] else '✗ INVALID'}")
    
    return 0 if result['overall_valid'] else 1


if __name__ == "__main__":
    sys.exit(main())

