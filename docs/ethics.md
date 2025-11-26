# Ethics, Sustainability & Openness Policy

**DotRep - Decentralized Reputation System**

*Last Updated: November 26, 2025*

---

## Overview

DotRep is committed to responsible, transparent, and open collaboration. This document outlines our ethical principles, transparency measures, and commitment to human-centric values.

## Core Principles

### 1. Transparency and Provenance

**Verifiable Data**
- Every artifact (dataset, claim, reputation, receipt) has a tamper-evident anchor (UAL) and cryptographic hash
- All reputation scores are computed using publicly auditable algorithms
- Content hashes (SHA-256) are computed and verified for all Knowledge Assets
- All assets are signed with publisher DID keys for clear authorship

**Clear Authorship**
- Each asset records:
  - Publisher DID (Decentralized Identifier)
  - Cryptographic signature
  - Timestamp
  - Optional role tags (author/validator)
- Creator information is immutable and verifiable

**Auditability**
- Full change history via `prov:wasRevisionOf` links
- Queryable audit trails using SPARQL queries
- All assets retrievable by agents and humans via DKG
- Blockchain anchors for cross-chain verification

### 2. Open-Source Standards and Interoperability

**Standards Compliance**
- W3C JSON-LD Knowledge Assets
- PROV-O (Provenance Ontology) for versioning
- Schema.org vocabulary for semantic markup
- OriginTrail DKG standards for decentralized storage
- Polkadot/Substrate standards for blockchain integration

**Interoperability**
- SPARQL endpoints for graph queries
- RESTful APIs for programmatic access
- Model Context Protocol (MCP) for AI agent integration
- x402 micropayment protocol for access control
- DID-based identity for cross-platform compatibility

### 3. Human-Centric Values

**Openness**
- Public scoring formula published as Knowledge Asset (UAL: `urn:ual:dotrep:formula:reputation-v1`)
- Open-source codebase (see LICENSE)
- Public documentation and schemas
- Transparent governance processes

**Inclusion**
- No discrimination based on identity, location, or background
- Accessible APIs and documentation
- Support for multiple languages and regions
- Community-driven improvements

**Trustworthiness**
- Cryptographic verification of all claims
- Sybil-resistant reputation algorithms
- Economic incentives aligned with accuracy
- Human-in-the-loop for critical decisions

## Privacy and Data Protection

### No Raw PII On-Chain

- User identifiers are hashed or redacted before publication
- Only non-sensitive metadata is published to DKG
- Personal information is stored off-chain with user consent
- GDPR-compliant data handling practices

### Opt-Out and Appeal

**Dispute Workflow**
1. User requests removal or correction
2. System publishes `DisputeAsset` to DKG
3. Human review process initiated
4. Decision recorded as `ResolutionAsset`
5. Original asset linked via provenance chain

**Appeal Process**
- Users can challenge reputation scores
- Community notes can be added to assets
- Transparent review process
- All disputes tracked on-chain

## Transparency of Scoring

### Public Scoring Formula

The reputation scoring formula is published as a Knowledge Asset:

- **UAL**: `urn:ual:dotrep:formula:reputation-v1`
- **Method**: Weighted PageRank + Stake Weight + Sybil Penalties
- **Parameters**: Publicly auditable
- **Version History**: Tracked via `prov:wasRevisionOf`

### Scoring Components

1. **Graph Score (70%)**: PageRank-based analysis of contribution network
2. **Stake Weight (20%)**: Economic signals from token staking
3. **Sybil Penalty (10%)**: Anti-gaming measures

All weights and thresholds are documented in the scoring formula asset.

## Human-in-the-Loop

### Automated Flags

Automated systems flag potential issues for human review:
- Unusual reputation changes
- Potential Sybil attacks
- Disputed contributions
- Anomalous patterns

### Review Process

- Flagged items require human verification
- Review decisions are recorded on-chain
- Reviewers are identified via DID
- Review history is publicly auditable

## Metrics and Monitoring

### Transparency Metrics

We track and publish:
- **Hash Validation Rate**: Target ≥ 99.9%
- **Signature Validation Rate**: Target ≥ 99.9%
- **Provenance Coverage**: Target ≥ 90% of assets
- **Audit Trace Latency**: Target < 2 seconds
- **On-Chain Anchor Rate**: Target ≥ 80% for critical assets

### Public Dashboard

Transparency metrics are available at:
- UI Dashboard: `/dashboard/transparency`
- API Endpoint: `/api/metrics/transparency`
- DKG Query: SPARQL endpoint for audit trails

## Governance

### Decision-Making

- Community proposals via governance pallet
- Transparent voting on-chain
- Proposal history tracked in DKG
- All decisions linked to proposer DID

### Code of Conduct

- Respectful collaboration
- Constructive feedback
- No harassment or discrimination
- Enforcement via reputation system

## Sustainability

### Environmental Impact

- Efficient blockchain operations (Polkadot parachain)
- Minimal on-chain storage (hashes only)
- Off-chain data storage via DKG
- Carbon-neutral hosting where possible

### Economic Sustainability

- x402 micropayments for sustainable access
- Token staking for Sybil resistance
- Economic incentives aligned with accuracy
- Long-term viability through sustainable tokenomics

## Compliance and Legal

### Regulatory Compliance

- GDPR compliance for EU users
- CCPA compliance for California users
- Data protection best practices
- Regular security audits

### Intellectual Property

- Open-source licenses (see LICENSE)
- Attribution requirements
- Patent non-assertion commitments
- Community-driven development

## Contact and Reporting

### Ethics Concerns

Report ethics concerns to:
- Email: ethics@dotrep.io
- GitHub Issues: [Project Issues](https://github.com/dotrep/issues)
- DKG Asset: Publish `EthicsReportAsset` with UAL

### Transparency Requests

Request additional transparency information:
- API: `/api/transparency/request`
- Email: transparency@dotrep.io
- All requests logged and responded to publicly

## Version History

- **v1.0** (2025-11-26): Initial ethics policy published
- Tracked via `prov:wasRevisionOf` in DKG

## References

- **Scoring Formula UAL**: `urn:ual:dotrep:formula:reputation-v1`
- **Provenance Schema**: `dotrep-v2/dkg-integration/schemas/enhanced-provenance-schema.json`
- **SPARQL Queries**: `dotrep-v2/dkg-integration/sparql/provenance-queries.ts`
- **Verification Tools**: `dotrep-v2/dkg-integration/verify-asset.ts`

---

**This document is a living document and will be updated as the system evolves. All changes are tracked via DKG provenance.**

