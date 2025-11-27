#!/usr/bin/env python3
"""
Ingest & Publisher Service
Converts source CSV/JSON → structured JSON-LD Knowledge Assets and publishes to DKG Edge Node / Mock
"""

import json
import hashlib
import base64
import requests
import argparse
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional
import os

# Try to import canonicaljson, fallback to json.dumps with sorted keys
try:
    from canonicaljson import encode_canonical_json
    CANONICAL_JSON = True
except ImportError:
    CANONICAL_JSON = False
    print("Warning: canonicaljson not installed, using json.dumps with sorted keys")

# Try to import cryptography for signing
try:
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import ed25519
    from cryptography.hazmat.backends import default_backend
    CRYPTO_AVAILABLE = True
except ImportError:
    CRYPTO_AVAILABLE = False
    print("Warning: cryptography not installed, signatures will be simulated")


def canonicalize_json(data: Dict[str, Any]) -> bytes:
    """Canonicalize JSON for deterministic hashing"""
    if CANONICAL_JSON:
        return encode_canonical_json(data)
    else:
        # Fallback: sort keys and use compact JSON
        return json.dumps(data, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode('utf-8')


def compute_content_hash(payload: Dict[str, Any]) -> str:
    """Compute SHA-256 hash of canonicalized JSON"""
    payload_bytes = canonicalize_json(payload)
    return hashlib.sha256(payload_bytes).hexdigest()


def sign_with_ed25519(data: bytes, private_key_path: Optional[str] = None) -> str:
    """Sign data with Ed25519 private key"""
    if not CRYPTO_AVAILABLE:
        # Simulate signature for demo
        return base64.b64encode(b"SIMULATED_SIGNATURE_" + data[:16]).decode()
    
    if private_key_path and os.path.exists(private_key_path):
        with open(private_key_path, 'rb') as f:
            private_key = serialization.load_pem_private_key(
                f.read(),
                password=None,
                backend=default_backend()
            )
    else:
        # Generate a temporary key for demo
        private_key = ed25519.Ed25519PrivateKey.generate()
    
    signature = private_key.sign(data)
    return base64.b64encode(signature).decode()


def load_template(template_name: str) -> str:
    """Load JSON-LD template"""
    template_path = Path(__file__).parent.parent.parent / "templates" / f"{template_name}.jsonld"
    if not template_path.exists():
        raise FileNotFoundError(f"Template not found: {template_path}")
    return template_path.read_text()


def create_reputation_asset(
    creator_id: str,
    reputation_score: float,
    graph_score: float,
    stake_weight: float,
    sybil_penalty: float,
    alpha: float = 0.25,
    publisher_did: str = "did:key:publisher1",
    private_key_path: Optional[str] = None
) -> Dict[str, Any]:
    """Create a ReputationAsset JSON-LD document"""
    template = load_template("reputation_asset")
    
    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    published_at = datetime.utcnow().isoformat() + "Z"
    
    # Replace template variables
    asset = template.replace("{{creatorId}}", creator_id)
    asset = asset.replace("{{timestamp}}", timestamp)
    asset = asset.replace("{{publisherDid}}", publisher_did)
    asset = asset.replace("{{publishedAt}}", published_at)
    asset = asset.replace("{{reputationScore}}", str(reputation_score))
    asset = asset.replace("{{graphScore}}", str(graph_score))
    asset = asset.replace("{{stakeWeight}}", str(stake_weight))
    asset = asset.replace("{{sybilPenalty}}", str(sybil_penalty))
    asset = asset.replace("{{alpha}}", str(alpha))
    asset = asset.replace("{{computedAt}}", published_at)
    
    # Parse as JSON
    payload = json.loads(asset)
    
    # Compute content hash (before adding hash/signature)
    content_hash = compute_content_hash(payload)
    payload["contentHash"] = content_hash
    
    # Sign the asset
    payload_bytes = canonicalize_json(payload)
    signature = sign_with_ed25519(payload_bytes, private_key_path)
    payload["signature"] = signature
    
    return payload


def publish_to_edge_node(
    payload: Dict[str, Any],
    edge_url: str,
    api_key: Optional[str] = None,
    simulate: bool = False
) -> Dict[str, Any]:
    """Publish asset to DKG Edge Node or Mock"""
    if simulate:
        # Return simulated UAL
        ual = payload.get("id", f"urn:ual:dotrep:simulated:{hashlib.sha256(json.dumps(payload).encode()).hexdigest()[:16]}")
        return {
            "ual": ual,
            "simulated": True,
            "contentHash": payload.get("contentHash"),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    
    try:
        response = requests.post(
            f"{edge_url}/publish",
            json=payload,
            headers=headers,
            timeout=30
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error publishing to edge node: {e}", file=sys.stderr)
        # Fallback to simulation
        ual = payload.get("id", f"urn:ual:dotrep:simulated:{hashlib.sha256(json.dumps(payload).encode()).hexdigest()[:16]}")
        return {
            "ual": ual,
            "simulated": True,
            "error": str(e),
            "contentHash": payload.get("contentHash"),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }


def main():
    parser = argparse.ArgumentParser(description="Publish sample Knowledge Assets to DKG")
    parser.add_argument("--input", type=str, help="Input CSV/JSON file (optional, uses sample data if not provided)")
    parser.add_argument("--creator-id", type=str, default="creator123", help="Creator ID")
    parser.add_argument("--reputation-score", type=float, default=0.873, help="Reputation score")
    parser.add_argument("--graph-score", type=float, default=0.78, help="Graph score")
    parser.add_argument("--stake-weight", type=float, default=0.12, help="Stake weight")
    parser.add_argument("--sybil-penalty", type=float, default=0.05, help="Sybil penalty")
    parser.add_argument("--alpha", type=float, default=0.25, help="PageRank alpha parameter")
    parser.add_argument("--edge-url", type=str, default=os.getenv("EDGE_PUBLISH_URL", "http://mock-dkg:8080"), help="Edge Node URL")
    parser.add_argument("--api-key", type=str, default=os.getenv("EDGE_API_KEY"), help="Edge Node API key")
    parser.add_argument("--simulate", action="store_true", help="Simulate publishing (don't call real Edge Node)")
    parser.add_argument("--private-key", type=str, help="Path to Ed25519 private key file")
    parser.add_argument("--publisher-did", type=str, default="did:key:publisher1", help="Publisher DID")
    
    args = parser.parse_args()
    
    # Create reputation asset
    asset = create_reputation_asset(
        creator_id=args.creator_id,
        reputation_score=args.reputation_score,
        graph_score=args.graph_score,
        stake_weight=args.stake_weight,
        sybil_penalty=args.sybil_penalty,
        alpha=args.alpha,
        publisher_did=args.publisher_did,
        private_key_path=args.private_key
    )
    
    # Publish to edge node
    result = publish_to_edge_node(
        asset,
        edge_url=args.edge_url,
        api_key=args.api_key,
        simulate=args.simulate
    )
    
    # Output result
    print(json.dumps(result, indent=2))
    
    # Append to build log
    build_log_path = Path(__file__).parent.parent.parent / "MANUS_BUILD_LOG.md"
    if build_log_path.exists():
        with open(build_log_path, "a") as f:
            f.write(f"\n## {datetime.utcnow().isoformat()}Z\n")
            f.write(f"- **UAL**: {result.get('ual', 'N/A')}\n")
            f.write(f"- **Type**: ReputationAsset\n")
            f.write(f"- **Content Hash**: {asset.get('contentHash')}\n")
            f.write(f"- **Simulated**: {result.get('simulated', False)}\n")
    else:
        print(f"Warning: MANUS_BUILD_LOG.md not found, skipping log update", file=sys.stderr)
    
    return 0 if result.get("ual") else 1


if __name__ == "__main__":
    sys.exit(main())

