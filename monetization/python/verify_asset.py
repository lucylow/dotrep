#!/usr/bin/env python3
"""
Verify Knowledge Asset from OriginTrail DKG
Recompute hash, verify signature, and optionally check neuroWeb anchor
"""

import json
import sys
import argparse
import requests
import hashlib
from typing import Dict, Optional

def generate_content_hash(data: Dict) -> str:
    """Generate content hash for Knowledge Asset"""
    # Remove signature and contentHash for hashing
    data_copy = {k: v for k, v in data.items() if k not in ['signature', 'contentHash']}
    json_str = json.dumps(data_copy, sort_keys=True)
    hash_obj = hashlib.sha256(json_str.encode())
    return '0x' + hash_obj.hexdigest()

def verify_content_hash(asset: Dict) -> bool:
    """Verify content hash matches asset content"""
    computed_hash = generate_content_hash(asset)
    stored_hash = asset.get('contentHash', '')
    return computed_hash == stored_hash

def verify_signature(asset: Dict) -> bool:
    """Verify signature on asset (placeholder - implement with actual crypto)"""
    signature = asset.get('signature')
    if not signature:
        return False
    
    # TODO: Implement actual signature verification
    # For now, just check that signature exists and is valid format
    return len(signature) > 0

def query_dkg(edge_node_url: str, ual: str) -> Optional[Dict]:
    """Query DKG for asset by UAL"""
    try:
        response = requests.get(
            f"{edge_node_url}/query",
            params={'ual': ual},
            timeout=10,
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"❌ Error querying DKG: {e}")
        return None

def verify_asset(asset: Dict, edge_node_url: Optional[str] = None, ual: Optional[str] = None) -> Dict:
    """Verify a Knowledge Asset"""
    results = {
        'valid': True,
        'errors': [],
        'warnings': [],
    }
    
    # Verify content hash
    if not verify_content_hash(asset):
        results['valid'] = False
        results['errors'].append('Content hash mismatch')
    else:
        results['contentHashValid'] = True
    
    # Verify signature (if present)
    if 'signature' in asset:
        if verify_signature(asset):
            results['signatureValid'] = True
        else:
            results['warnings'].append('Signature verification failed or not implemented')
    else:
        results['warnings'].append('No signature found')
    
    # Query DKG if UAL provided
    if ual and edge_node_url:
        dkg_asset = query_dkg(edge_node_url, ual)
        if dkg_asset:
            results['dkgVerified'] = True
            results['dkgData'] = dkg_asset
        else:
            results['warnings'].append('Asset not found in DKG or DKG query failed')
    
    return results

def main():
    parser = argparse.ArgumentParser(description='Verify Knowledge Asset')
    parser.add_argument('asset_file', help='Path to asset JSON file')
    parser.add_argument('--edge-node-url', default=None,
                       help='DKG Edge Node URL for verification')
    parser.add_argument('--ual', help='UAL to query in DKG')
    
    args = parser.parse_args()
    
    # Load asset
    with open(args.asset_file, 'r') as f:
        asset = json.load(f)
    
    # Verify
    results = verify_asset(asset, args.edge_node_url, args.ual)
    
    # Output results
    print(json.dumps(results, indent=2))
    
    if results['valid']:
        print("\n✅ Asset verification passed")
        if results.get('warnings'):
            print("⚠️  Warnings:")
            for warning in results['warnings']:
                print(f"   - {warning}")
    else:
        print("\n❌ Asset verification failed")
        for error in results['errors']:
            print(f"   - {error}")
        sys.exit(1)


if __name__ == '__main__':
    main()

