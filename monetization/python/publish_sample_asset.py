#!/usr/bin/env python3
"""
Publish Sample Knowledge Asset to OriginTrail DKG Edge Node
"""

import json
import sys
import argparse
import requests
import os
from datetime import datetime
from typing import Dict, Optional

def load_jsonld_template(template_path: str, variables: Dict) -> Dict:
    """Load and fill JSON-LD template"""
    with open(template_path, 'r') as f:
        content = f.read()
        # Simple variable substitution
        for key, value in variables.items():
            content = content.replace(f'{{{{{key}}}}}', str(value))
        return json.loads(content)

def generate_content_hash(data: Dict) -> str:
    """Generate content hash for Knowledge Asset"""
    import hashlib
    json_str = json.dumps(data, sort_keys=True)
    hash_obj = hashlib.sha256(json_str.encode())
    return '0x' + hash_obj.hexdigest()

def publish_to_dkg(edge_node_url: str, jsonld: Dict, simulate: bool = False) -> Dict:
    """Publish Knowledge Asset to DKG Edge Node"""
    if simulate:
        # Generate simulated UAL
        asset_type = jsonld.get('@type', 'Asset').lower().replace('asset', '')
        content_hash = jsonld.get('contentHash', '0x' + '0' * 64)
        ual = f"urn:ual:dotrep:{asset_type}:{content_hash[2:18]}"
        
        print(f"[SIMULATE] Publishing to DKG: {ual}")
        return {
            'ual': ual,
            'status': 'published',
            'publishedAt': datetime.utcnow().isoformat() + 'Z',
            'simulated': True,
        }
    
    try:
        response = requests.post(
            f"{edge_node_url}/publish",
            json=jsonld,
            headers={
                'Content-Type': 'application/ld+json',
            },
            timeout=30,
        )
        
        response.raise_for_status()
        
        result = response.json()
        return {
            'ual': result.get('ual', generate_ual_from_hash(jsonld)),
            'status': result.get('status', 'published'),
            'publishedAt': datetime.utcnow().isoformat() + 'Z',
            'txHash': result.get('txHash'),
        }
    except requests.exceptions.RequestException as e:
        print(f"❌ Error publishing to DKG: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response: {e.response.text}")
        raise

def generate_ual_from_hash(jsonld: Dict) -> str:
    """Generate UAL from content hash"""
    content_hash = jsonld.get('contentHash', '')
    if content_hash.startswith('0x'):
        content_hash = content_hash[2:]
    
    asset_type = 'asset'
    if 'Receipt' in str(jsonld.get('@type', '')):
        asset_type = 'receipt'
    elif 'Reputation' in str(jsonld.get('@type', '')):
        asset_type = 'reputation'
    elif 'Note' in str(jsonld.get('@type', '')):
        asset_type = 'note'
    
    return f"urn:ual:dotrep:{asset_type}:{content_hash[:16]}"

def publish_receipt_asset(edge_node_url: str, tx_hash: str, payer: str, amount: str, 
                         token: str, recipient: str, reference: str, simulate: bool = False) -> Dict:
    """Publish a ReceiptAsset"""
    receipt_asset = {
        '@context': ['https://schema.org/'],
        '@type': 'ReceiptAsset',
        'id': f"urn:ual:dotrep:receipt:{tx_hash[2:18] if tx_hash.startswith('0x') else tx_hash[:16]}",
        'payer': payer,
        'recipient': recipient,
        'amount': amount,
        'token': token,
        'resourceUAL': reference,
        'paymentTx': tx_hash,
        'published': datetime.utcnow().isoformat() + 'Z',
        'schema:paymentMethod': {
            'type': 'x402',
            'protocol': 'HTTP/1.1 402 Payment Required',
        },
    }
    
    # Generate content hash
    receipt_asset['contentHash'] = generate_content_hash(receipt_asset)
    
    return publish_to_dkg(edge_node_url, receipt_asset, simulate)

def publish_reputation_asset(edge_node_url: str, creator_id: str, graph_score: float,
                            stake_weight: float, payment_weight: float, sybil_penalty: float,
                            final_score: float, simulate: bool = False) -> Dict:
    """Publish a ReputationAsset"""
    reputation_asset = {
        '@context': ['https://schema.org/'],
        '@type': 'ReputationAsset',
        'id': f"urn:ual:dotrep:reputation:{creator_id}",
        'creatorId': creator_id,
        'graphScore': graph_score,
        'stakeWeight': stake_weight,
        'paymentWeight': payment_weight,
        'sybilPenalty': sybil_penalty,
        'finalScore': final_score,
        'computedAt': datetime.utcnow().isoformat() + 'Z',
    }
    
    # Generate content hash
    reputation_asset['contentHash'] = generate_content_hash(reputation_asset)
    
    return publish_to_dkg(edge_node_url, reputation_asset, simulate)

def main():
    parser = argparse.ArgumentParser(description='Publish Knowledge Asset to OriginTrail DKG')
    parser.add_argument('--edge-node-url', default=os.getenv('EDGE_NODE_URL', 'http://localhost:8900'),
                       help='DKG Edge Node URL')
    parser.add_argument('--type', choices=['receipt', 'reputation'], default='receipt',
                       help='Asset type to publish')
    parser.add_argument('--simulate', action='store_true', help='Simulate publishing (no actual DKG call)')
    
    # Receipt asset args
    parser.add_argument('--tx-hash', help='Transaction hash (for receipt)')
    parser.add_argument('--payer', help='Payer address (for receipt)')
    parser.add_argument('--amount', help='Payment amount (for receipt)')
    parser.add_argument('--token', default='USDC', help='Token symbol (for receipt)')
    parser.add_argument('--recipient', help='Recipient address (for receipt)')
    parser.add_argument('--reference', help='Reference ID (for receipt)')
    
    # Reputation asset args
    parser.add_argument('--creator-id', help='Creator ID (for reputation)')
    parser.add_argument('--graph-score', type=float, help='Graph score (for reputation)')
    parser.add_argument('--stake-weight', type=float, help='Stake weight (for reputation)')
    parser.add_argument('--payment-weight', type=float, help='Payment weight (for reputation)')
    parser.add_argument('--sybil-penalty', type=float, default=0.0, help='Sybil penalty (for reputation)')
    parser.add_argument('--final-score', type=float, help='Final score (for reputation)')
    
    args = parser.parse_args()
    
    simulate = args.simulate or not args.edge_node_url or args.edge_node_url == 'http://localhost:8900'
    
    try:
        if args.type == 'receipt':
            if not all([args.tx_hash, args.payer, args.amount, args.recipient]):
                print("❌ Missing required arguments for receipt asset: --tx-hash, --payer, --amount, --recipient")
                sys.exit(1)
            
            result = publish_receipt_asset(
                args.edge_node_url,
                args.tx_hash,
                args.payer,
                args.amount,
                args.token,
                args.recipient,
                args.reference or args.tx_hash,
                simulate,
            )
        elif args.type == 'reputation':
            if not all([args.creator_id, args.graph_score, args.final_score]):
                print("❌ Missing required arguments for reputation asset: --creator-id, --graph-score, --final-score")
                sys.exit(1)
            
            result = publish_reputation_asset(
                args.edge_node_url,
                args.creator_id,
                args.graph_score,
                args.stake_weight or 0.0,
                args.payment_weight or 0.0,
                args.sybil_penalty,
                args.final_score,
                simulate,
            )
        
        print(f"\n✅ Published {args.type} asset:")
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()

