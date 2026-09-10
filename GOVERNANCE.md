# Project Governance

## Overview

AfyaSolar Intelligence is an open-source project stewarded by **Ubuntu Afyalink Company
Limited** (the "Maintainer"). It is released under the [MIT License](./LICENSE) and is
intended to meet the [Digital Public Good](https://digitalpublicgoods.net/) standard.

This document describes how decisions are made and how the project is maintained, in line with
the UNICEF Venture Fund open-source commitments (RFPS-NYH-2026-503931).

## Roles

- **Maintainer (Ubuntu Afyalink Company Limited).** Holds overall responsibility for the
  project's direction, reviews and merges contributions, cuts releases, and owns the
  intellectual property. UNICEF owns no part of the code or IP.
- **Contributors.** Anyone who submits issues, documentation, tests, or code under the
  [Contributing guidelines](./CONTRIBUTING.md).
- **Committers.** Contributors granted write access to the repository. A Committer reviews
  and merges pull requests in the areas they know, and is listed in
  [`.github/CODEOWNERS`](./.github/CODEOWNERS).

### Becoming a Committer

A project that only one company can maintain is not really open. The path is
deliberately concrete:

1. Land roughly five non-trivial pull requests that pass review, in any mix of code, tests
   or documentation.
2. Show sustained engagement over at least two months: reviewing others' pull requests,
   triaging issues, or answering questions.
3. Any existing Committer nominates you in a public issue. The Maintainer confirms within
   14 days, giving reasons if declining.

Committers who have been inactive for a year move to emeritus status and can return by
asking. Nothing about this is a loyalty test; it is a check that someone understands the
codebase and the context it runs in.

### If the Maintainer steps away

Should Ubuntu Afyalink Company Limited stop maintaining this project, it commits to
announcing that in the repository, and to transferring stewardship to the active Committers
or to a nominated successor organisation. The code is MIT-licensed and the models are
Apache-2.0, so a fork can carry on regardless. Saying so explicitly is the point: nobody
adopting this platform should depend on one company continuing to exist.

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
  their trained scoring weights**. Already published: the platform and AI-service source in this
  repository, plus the climate model and training dataset on Hugging Face
  (`afyalink/afyasolar-chronos-48m-climate-ea-v1`, `afyalink/afyasolar-nasa-power-east-africa`).
- The project **commits to publishing a public real-time open-data API** (anonymised, read-only
  facility-resilience data), to keeping it available, and to publishing patches in perpetuity,
  funded by the platform's recurring managed-service revenue. This feed is live at
  `GET /api/open/resilience`, aggregated to region level with no facility identifiers, names or
  coordinates. See [`docs/PRIVACY.md`](./docs/PRIVACY.md) for the de-identification method.
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
