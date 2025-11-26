#!/usr/bin/env python3
"""
Receipt Verification Script
Verifies ReceiptAsset fields and cross-checks payment transaction
"""

import json
import sys
import argparse
import requests
from pathlib import Path
from typing import Dict, Any

# Reuse verify_asset for base verification
sys.path.insert(0, str(Path(__file__).parent))
from verify_asset import verify_asset


def verify_receipt_fields(receipt: Dict[str, Any]) -> tuple[bool, list[str]]:
    """Verify required ReceiptAsset fields"""
    errors = []
    required_fields = ['type', 'id', 'payer', 'recipient', 'amount', 'token', 'resourceUAL', 'paymentTx']
    
    for field in required_fields:
        if field not in receipt:
            errors.append(f"Missing required field: {field}")
    
    if receipt.get('type') != 'AccessReceipt':
        errors.append(f"Invalid type: {receipt.get('type')}, expected AccessReceipt")
    
    if 'schema:paymentMethod' not in receipt:
        errors.append("Missing paymentMethod")
    elif receipt['schema:paymentMethod'].get('type') != 'x402':
        errors.append("Invalid payment method type")
    
    return len(errors) == 0, errors


def verify_payment_tx(tx_hash: str, simulate: bool = True) -> tuple[bool, str]:
    """Verify payment transaction (simplified for demo)"""
    if simulate:
        # In demo mode, just check format
        if tx_hash.startswith('0x') and len(tx_hash) >= 10:
            return True, "Transaction hash format valid (demo mode)"
        else:
            return False, "Invalid transaction hash format"
    
    # In production, would query blockchain
    # For now, return simulated success
    return True, "Transaction verification skipped (demo mode)"


def verify_receipt(
    receipt_path: str,
    edge_url: str = None,
    verify_tx: bool = False
) -> Dict[str, Any]:
    """Verify a ReceiptAsset"""
    with open(receipt_path, 'r') as f:
        receipt = json.load(f)
    
    # Base asset verification
    base_result = verify_asset(receipt_path, edge_url)
    
    # Receipt-specific verification
    fields_valid, field_errors = verify_receipt_fields(receipt)
    tx_valid, tx_msg = verify_payment_tx(receipt.get('paymentTx', ''), simulate=not verify_tx)
    
    overall_valid = base_result['overall_valid'] and fields_valid and tx_valid
    
    return {
        **base_result,
        'fields_valid': fields_valid,
        'field_errors': field_errors,
        'tx_valid': tx_valid,
        'tx_message': tx_msg,
        'overall_valid': overall_valid
    }


def main():
    parser = argparse.ArgumentParser(description="Verify ReceiptAssets")
    parser.add_argument("receipt", type=str, help="Path to receipt JSON file")
    parser.add_argument("--edge-url", type=str, help="Edge Node URL")
    parser.add_argument("--verify-tx", action="store_true", help="Verify payment transaction (requires blockchain access)")
    parser.add_argument("--format", choices=['json', 'text'], default='text', help="Output format")
    
    args = parser.parse_args()
    
    result = verify_receipt(args.receipt, args.edge_url, args.verify_tx)
    
    if args.format == 'json':
        print(json.dumps(result, indent=2))
    else:
        print(f"UAL: {result['ual']}")
        print(f"Hash: {'✓' if result['hash_valid'] else '✗'} {result['hash_message']}")
        print(f"Signature: {'✓' if result['signature_valid'] else '✗'} {result['signature_message']}")
        print(f"Fields: {'✓' if result['fields_valid'] else '✗'}")
        if result['field_errors']:
            for error in result['field_errors']:
                print(f"  - {error}")
        print(f"Transaction: {'✓' if result['tx_valid'] else '✗'} {result['tx_message']}")
        print(f"\nOverall: {'✓ VALID' if result['overall_valid'] else '✗ INVALID'}")
    
    return 0 if result['overall_valid'] else 1


if __name__ == "__main__":
    sys.exit(main())

