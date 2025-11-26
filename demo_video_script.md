# Demo Video Script (≤5 minutes)

## Introduction (0:00 - 0:30)

"Hi, I'm [Name], and I'm presenting DOTREP, a Decentralized AI Application that combines reputation scoring, Knowledge Assets, and micropayments to create verifiable AI-ready data.

DOTREP solves the problem of trust in AI systems by:
1. Publishing reputation data as verifiable Knowledge Assets on the OriginTrail DKG
2. Providing AI agents with MCP tools to query and verify reputation
3. Enabling micropayments via x402 for premium, high-confidence data access

Let me show you how it works."

## Part 1: Architecture Overview (0:30 - 1:00)

[Screen: Architecture diagram]

"DOTREP consists of five core services:
- An ingest service that publishes JSON-LD Knowledge Assets
- A reputation engine that computes weighted PageRank with Sybil detection
- A mock DKG Edge Node for offline demos
- An MCP server that exposes tools for AI agents
- An x402 gateway that implements HTTP 402 Payment Required flows

All services run in Docker Compose for easy deployment."

## Part 2: Publishing Knowledge Assets (1:00 - 2:00)

[Terminal: docker-compose up]

"Let me start the services... [wait for startup]

Now I'll publish a sample ReputationAsset. [Run ingest command]

You can see the asset was published with a UAL, contentHash, and DID signature. Let me verify it... [Run verify script]

The verification confirms the contentHash matches and the signature is valid."

## Part 3: Reputation Computation (2:00 - 2:45)

[Terminal: Run reputation computation]

"Now let's compute reputation scores for a sample graph. The engine uses weighted PageRank with Sybil detection... [Show output]

You can see it detected several Sybil clusters and applied penalties. The results are published as ReputationAssets to the DKG."

## Part 4: MCP Server & AI Agents (2:45 - 3:30)

[Terminal: Show MCP server logs]

"The MCP server exposes tools for AI agents. Let me demonstrate a query... [Show tool call]

Agents can query reputation, verify contributions, and search developers. All responses include UALs for verifiable provenance."

## Part 5: x402 Micropayment Flow (3:30 - 4:15)

[Browser: Show UI]

"Now let's see the x402 payment flow. When I try to access a premium resource... [Show 402 response]

The server responds with HTTP 402 Payment Required. After providing a payment proof... [Show payment]

A ReceiptAsset is published to the DKG, proving the payment occurred."

## Part 6: Verification & Closing (4:15 - 5:00)

[Terminal: Verify ReceiptAsset]

"Let me verify the ReceiptAsset... [Run verification]

All assets are verifiable - you can check the contentHash, signature, and on-chain anchor.

DOTREP provides:
- ✅ Verifiable Knowledge Assets with DID signatures
- ✅ AI-ready MCP tools for agents
- ✅ x402 micropayments with ReceiptAssets
- ✅ Sybil-resistant reputation scoring
- ✅ Complete Docker Compose deployment

Thank you for watching. Check out our GitHub repo for the full implementation."

## Tips for Recording

1. **Prepare terminal windows**: Have all commands ready in separate terminal tabs
2. **Use screen recording**: Record full screen to show multiple windows
3. **Add captions**: Overlay text explaining what's happening
4. **Keep it concise**: Focus on key features, skip setup details
5. **Show results**: Always show the output/result of each action
6. **Practice**: Run through the demo once before recording

## Backup Scenarios

- If services fail to start: Show the docker-compose.yml and explain the architecture
- If publishing fails: Show the JSON-LD asset structure and explain the process
- If verification fails: Show the verification code and explain what it checks

