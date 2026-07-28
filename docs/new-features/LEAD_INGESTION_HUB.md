# Lead Ingestion Hub

## Status

Product discovery only. This document records a preliminary direction for discussion; it is not an approved implementation specification or roadmap commitment.

## Opportunity

ReachFlow currently gives agencies a place to manage prospects after they have been entered into the CRM. Prospects can be added manually or imported through CSV, then assigned, tagged, moved through the pipeline, enrolled in outreach sequences, and tracked through activity history.

The opportunity is to capture leads automatically from multiple external sources and route them into that existing workflow. The core product outcome would be:

> All incoming leads enter one actionable pipeline with consistent identity, attribution, ownership, and follow-up.

This captures an important part of the value offered by omnichannel products such as respond.io without immediately requiring ReachFlow to become a complete messaging platform.

## Product Boundaries

There are three materially different versions of this opportunity.

### 1. Lead ingestion hub

Capture lead records from forms, advertising platforms, automation tools, and webhooks. Normalize and deduplicate the data, then create or enrich prospects in ReachFlow.

This version does not provide live conversations or send replies through the source platform. Its responsibility ends once the lead is safely represented in the CRM and routed into the existing pipeline.

**Indicative effort:** 4–8 weeks for a focused first release.

### 2. Connected messaging channels

Connect selected provider accounts and receive inbound contacts and messages from channels such as WhatsApp, Instagram, Facebook Messenger, or email.

This adds provider authorization, webhook verification, token refresh, channel identities, message/event storage, media handling, delivery states, and platform-specific compliance. It could initially retain messages without offering a complete agent inbox.

**Indicative effort:** 3–6 months, depending on the first channels and the level of reliability required.

### 3. Unified inbox platform

Provide a respond.io-style workspace for two-way conversations across multiple channels, including assignment, replies, contact merging, media, delivery receipts, agent presence, automation, reporting, and operational controls.

This is a new product platform rather than an extension of prospect capture. It requires sustained integration maintenance because each provider has different authentication, messaging windows, permissions, rate limits, review processes, and failure modes.

**Indicative effort:** 9–18+ months for a credible multi-channel product, followed by ongoing channel maintenance.

## Preliminary Recommendation

Begin with a source-agnostic lead ingestion hub.

This direction fits ReachFlow’s current architecture because the pipeline, prospect management, team assignment, tags, sequences, notifications, and activity log already provide the downstream workflow. The initial investment can therefore focus on reliable intake and identity resolution instead of simultaneously building a conversation system.

The first release should establish a reusable ingestion contract and prove it with a small number of high-value sources:

- Website forms
- Generic authenticated webhooks
- Zapier, Make, and n8n
- One native lead source, provisionally Meta Lead Ads

Meta Lead Ads is only a suggested first native integration. It must be validated against target-customer demand before becoming a roadmap commitment.

## Proposed Ingestion Flow

```text
External source
    → receive event
    → authenticate and validate
    → store ingestion record
    → normalize source fields
    → identify or deduplicate prospect
    → create prospect or enrich existing prospect
    → record source attribution
    → assign owner and apply tags
    → optionally enroll in an existing sequence
    → record activity and processing outcome
```

### Receive

Accept an event from a configured source. Every source should have an organization-scoped connection and authentication mechanism.

### Normalize

Convert provider-specific payloads into a shared lead shape. Normalize phone numbers, email addresses, names, countries, timestamps, and source identifiers before matching or persistence.

### Deduplicate

Look for an existing prospect using stable identities such as normalized phone number, normalized email address, or a provider-specific contact identifier.

The system must use an idempotency key or provider event identifier so retries cannot create duplicate prospects.

### Create or enrich

Create a new prospect when no confident match exists. When a match exists, apply the agreed field-update policy and retain the incoming event as a separate source record.

### Attribute

Record where the lead originated, including provider, connection, form, campaign, ad, landing page, and available tracking parameters. Original and most-recent attribution should remain distinguishable.

### Route

Apply configured tags, assignment rules, initial pipeline state, and optional sequence enrollment. Record the resulting actions in the existing activity history.

## Prospective Data Model

These entities are conceptual and require schema design before implementation.

### Lead sources

Represents an organization’s configured intake connection.

Potential fields include organization, source type, display name, connection status, encrypted credentials reference, configuration, created time, and last successful event time.

### Lead ingestion events

Provides an immutable processing ledger for incoming payloads.

Potential fields include organization, lead source, external event ID, payload reference, received time, processing state, matched prospect, error summary, attempt count, and processed time.

Raw payload retention, encryption, redaction, and expiration policies remain undecided.

### Prospect identities

Allows one prospect to have multiple ways of being identified across sources and communication channels.

Examples include normalized phone number, normalized email address, Facebook lead/contact ID, WhatsApp identity, Instagram identity, or an external CRM ID. A unique constraint should prevent the same organization-scoped identity from silently belonging to multiple prospects.

### Prospect attributions

Records the relationship between a prospect and its acquisition source.

Potential fields include source, campaign, ad set, ad, form, landing page, referrer, UTM parameters, captured time, and whether the record represents original or latest attribution.

### Field mappings

Defines how an external source payload maps into ReachFlow prospect fields.

Mappings may include transforms, defaults, required-field rules, and destination fields. The first version should favor a constrained mapping system over arbitrary executable expressions.

## Reliability and Security Requirements

A production ingestion system would need:

- Organization-scoped credentials and authorization
- Signed webhook verification where supported
- Secret rotation and encrypted credential storage
- Replay protection and idempotent processing
- Fast acknowledgement of provider webhooks
- Background processing for enrichment and routing
- Retry handling with bounded backoff
- Dead-letter or failed-event review
- Rate-limit handling
- Structured logs and per-source health visibility
- Payload size limits and schema validation
- Personal-data retention and deletion policies
- Audit records for connection and mapping changes

These are foundational requirements, not optional polish, because silent loss or duplication of leads would undermine the feature’s core value.

## Suggested Delivery Sequence

### Foundation

- Shared normalized lead contract
- Organization-scoped lead sources
- Ingestion event ledger
- Idempotency and duplicate detection
- Prospect creation/enrichment service
- Attribution and routing rules
- Processing logs and failure review

### Initial adapters

- Generic inbound webhook
- Embeddable or hosted website form
- Zapier/Make/n8n documentation and templates
- One validated native lead-source integration

### Later expansion

- Additional advertising and form providers
- Duplicate-review and manual merge workflow
- More advanced assignment rules and lead scoring
- Outbound integration webhooks
- Selected inbound messaging channels, only if customer demand justifies the additional platform scope

## Open Product Decisions

The following items are intentionally unresolved and must be decided during discovery.

1. **Product boundary:** Is the desired outcome lead capture only, selected inbound messaging channels, or a future unified inbox?
2. **First native source:** Is Meta Lead Ads the highest-value integration for the initial customer segment, or should another source take priority?
3. **Duplicate handling:** Should high-confidence matches merge automatically, create a review suggestion, or vary by source?
4. **Update precedence:** When incoming data conflicts with an existing prospect, should it overwrite, fill blanks only, or follow field-specific rules?
5. **Identity confidence:** Which identifiers are safe for automatic matching, and which combinations require manual review?
6. **Integration strategy:** Should the first release prioritize native integrations, automation platforms, or both?
7. **Routing depth:** Should v1 only create prospects, or also support assignment, tags, status selection, and sequence enrollment?
8. **Payload retention:** How long should raw inbound payloads be stored, and which sensitive fields must be redacted?
9. **Customer configuration:** Should field mappings and routing rules be self-service in the UI or initially configured by administrators?
10. **Commercial model:** Which capabilities belong to each subscription tier, and will native integrations have usage limits?

## Discovery Work Before Approval

Before converting this inquiry into an implementation plan:

- Interview target agencies about their three most important lead sources.
- Quantify current lead volume, duplicate rate, response delay, and manual entry effort.
- Identify which sources provide webhooks or supported APIs and what approval requirements apply.
- Validate whether customers need lead records only or expect to reply from ReachFlow.
- Select one native integration based on demonstrated demand rather than feature breadth.
- Define measurable success criteria, such as capture success rate, time-to-pipeline, duplicate rate, and percentage of leads automatically assigned.

## Preliminary Success Criteria

These are proposed evaluation criteria and are not yet approved targets:

- A valid inbound event creates or enriches exactly one organization-scoped prospect.
- Retried events do not create duplicate prospects or attribution records.
- Every processed event has a visible outcome and failure reason.
- Source and campaign attribution remain traceable after prospect updates.
- Routing actions are deterministic and auditable.
- An administrator can identify unhealthy connections or failed events without database access.
- No source can access or affect another organization’s prospects or configuration.

## Current Conclusion

The lead ingestion hub is the most compatible first step for ReachFlow. It delivers the business outcome of consolidating leads from multiple sources while reusing the existing CRM workflow. Connected messaging and a unified inbox should remain possible future directions, but they should not be treated as implicit requirements of the first release.

