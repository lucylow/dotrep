#!/bin/bash
# Generate Ed25519 DID key pair for signing Knowledge Assets

OUTPUT_DIR="${1:-./keys}"
mkdir -p "$OUTPUT_DIR"

# Generate private key
openssl genpkey -algorithm ED25519 -out "$OUTPUT_DIR/private_key.pem"

# Extract public key
openssl pkey -in "$OUTPUT_DIR/private_key.pem" -pubout -out "$OUTPUT_DIR/public_key.pem"

# Generate DID
DID_KEY="did:key:$(openssl pkey -in "$OUTPUT_DIR/private_key.pem" -pubout -outform DER 2>/dev/null | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')"

echo "Generated DID key pair:"
echo "Private key: $OUTPUT_DIR/private_key.pem"
echo "Public key: $OUTPUT_DIR/public_key.pem"
echo "DID: $DID_KEY"
echo ""
echo "Add to .env:"
echo "PUBLISHER_DID=$DID_KEY"
echo "PRIVATE_KEY_PATH=$OUTPUT_DIR/private_key.pem"

