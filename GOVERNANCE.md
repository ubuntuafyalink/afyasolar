# Project Governance

## Overview

AfyaSolar Intelligence is an open-source project stewarded by **Ubuntu Afyalink Company
Limited** (the "Maintainer"). It is released under the [Apache License 2.0](./LICENSE) and is
intended to meet the [Digital Public Good](https://digitalpublicgoods.net/) standard.

This document describes how decisions are made and how the project is maintained, in line with
the UNICEF Venture Fund open-source commitments (RFPS-NYH-2026-503931).

## Roles

- **Maintainer (Ubuntu Afyalink Company Limited).** Holds overall responsibility for the
  project's direction, reviews and merges contributions, cuts releases, and owns the
  intellectual property. UNICEF owns no part of the code or IP.
- **Contributors.** Anyone who submits issues, documentation, tests, or code under the
  [Contributing guidelines](./CONTRIBUTING.md).

## Decision-making

- Routine changes (bug fixes, docs, tests) are decided by maintainer review on a pull request.
- Significant changes (architecture, data model, public API/contract changes, new
  dependencies) are proposed in an issue first for discussion, then implemented via PR.
- The Maintainer is the final arbiter on scope and roadmap, and commits to acting
  transparently and in the interest of the health-facility users the platform serves.

## Open-source commitments

- The **entire funded solution** is and will remain open source — application code, the
  resilience-scoring engine, climate and carbon modules, messaging, the open-data API, the
  database schema, and (as they are built) all machine-learning training/inference code **and
  their trained scoring weights**.
- The project maintains a **public real-time open-data API** and commits to keeping it
  available and to publishing patches in perpetuity, funded by the platform's recurring
  managed-service revenue.
- What is *not* published is the live operational data, any personal data (protected by law,
  not by closed source), and the separately-funded commercial energy-service operation — none
  of which are funded code.

## Releases

Releases are tagged in git using semantic versioning (starting at `v0.1.0`) with a summary of
changes. The `main` branch is the source of truth.

## Security & data protection

Security and personal-data handling are governed by [SECURITY.md](./SECURITY.md) and the
platform's privacy policy, aligned to Tanzania's Personal Data Protection Act (2022) and
UNICEF's data-protection standards for vulnerable populations (children).
