# Quick Start Guide

Get DotRep Monetization running in 5 minutes.

## 1. Install Dependencies

```bash
# Node.js
npm install

# Python
cd python
pip install -r requirements.txt
cd ..
```

## 2. Configure Environment

```bash
cp .env.example .env
# Edit .env if needed (defaults work for simulate mode)
```

## 3. Start Server

```bash
npm run dev
```

Server runs on http://localhost:3000

## 4. Test Payment Flow

```bash
# Request feed (will get 402)
curl http://localhost:3000/api/marketplace/trusted-feed/creator123

# Submit payment
curl -X POST http://localhost:3000/api/payments/submit \
  -H "Content-Type: application/json" \
  -d '{"paymentRequest": {"amount":"0.01","token":"USDC","recipient":"0x...","nonce":"...","reference":"..."}}'

# Retry with payment proof (see README for full example)
```

## 5. Run UI Demo

```bash
cd ui
npm install
npm run dev
```

Open http://localhost:5173

## 6. Compute Reputation

```bash
cd python

# Create sample graph
echo '{"edges":[{"from":"A","to":"B","weight":1.0,"amount":10.0,"timestamp":1000000000}]}' > test.json

# Compute
python compute_reputation.py test.json
```

## That's It!

See README.md for full documentation.

