# Privacy and data protection

How AfyaSolar Intelligence handles personal data, written for implementers,
reviewers and data protection authorities. The user-facing policy shown in the
product lives at `web-platform/src/app/privacy-policy/page.tsx`; this document is
the project-level companion to it and is the one to read first.

## Applicable law

The platform is designed to comply with the **Tanzania Personal Data Protection
Act, 2022** and its subsidiary regulations, and with **UNICEF's Policy on
Personal Data Protection** where the project operates alongside UNICEF
programmes.

## Roles

| Role | Who |
|---|---|
| Data controller | The health facility or the health authority operating the deployment. They decide why staff and operational data are processed. |
| Data processor | Ubuntu Afyalink Company Limited, when it runs a hosted instance on a controller's behalf. |
| Neither | Anyone self-hosting the MIT-licensed code independently becomes their own controller. Publishing the software creates no processing relationship. |

A deployment intended for production should complete a processing agreement
between the facility and whoever operates the instance, and register with
Tanzania's Personal Data Protection Commission where the Act requires it.

## What is and is not collected

**Personal data processed:** names, email addresses, phone numbers and role
assignments of *facility staff and administrators* who hold accounts, plus
authentication records including login events.

**Not personal data:** solar and energy telemetry, facility resilience scores,
climate hazard exposure, and equipment health. These describe buildings and
equipment, not people.

**Never collected: patient data.** The platform holds no clinical records, no
patient identifiers and no health information about any individual. It measures
whether the power stays on, not who is treated.

### On children

The project's purpose is to protect health services that children depend on, and
UNICEF's data protection policy applies for that reason. This does not mean the
platform collects children's data, and it does not. Account holders are adult
health workers and administrators. The product policy's statement that the
service is "not intended for children under 13" refers to who may hold an
account. Both statements are true and they are not in tension: children are the
beneficiaries of the service, never its data subjects.

## Lawful basis

| Processing | Basis under the Act |
|---|---|
| Staff accounts, authentication, audit logs | Legitimate interests of the controller in securing and operating the system |
| Service messages (outage and hazard alerts by SMS) | Performance of the service the facility has asked for |
| Subscription and payment records | Performance of a contract, and legal obligation for financial records |
| Public open resilience data | Not personal data, so outside the Act |

## Retention

| Data | Retained |
|---|---|
| Staff account records | For the life of the account, then 90 days after closure |
| Authentication and audit events | 12 months |
| Device telemetry | 24 months at full resolution, aggregated thereafter |
| Financial and subscription records | 7 years, as tax law requires |
| Public open data snapshots | Indefinitely, as they contain no personal data |

These are the project's defaults. A controller may set shorter periods, and
should document any longer one.

## De-identification of the public feed

`GET /api/open/resilience` is the Digital Public Good surface and is the only
endpoint that publishes without authentication. Its guarantees are implemented as
a pure function in `web-platform/src/lib/climate/open-resilience-feed.ts` and
enforced by tests in the adjacent test file.

The feed:

1. **Carries no identifiers.** No facility id, no facility name, no latitude or
   longitude. A test asserts each of these is absent from the serialised output.
2. **Aggregates to region level.** Individual facilities are never a row.
3. **Applies small-cell suppression.** A region reporting fewer than
   `MIN_REGION_FACILITIES` (currently 3) facilities is withheld entirely. With a
   portfolio of roughly a dozen sites, a one- or two-facility region would
   describe individual buildings closely enough to identify them.
4. **Resists reconstruction by subtraction.** Facilities in withheld regions are
   also excluded from the portfolio totals. Publishing a portfolio mean next to
   every regional mean would otherwise let a reader solve for the withheld
   remainder, which for a single-facility region discloses that facility exactly.
   The feed reports how many regions and facilities were withheld, so the
   omission is visible rather than silent.
5. **Excludes degraded records**, which carry no usable climate data.

**Scope of the guarantee.** Suppression is a count threshold, which protects
against disclosure from a single snapshot. It is not a formal privacy mechanism
and does not by itself address an adversary correlating successive snapshots with
an external register of facility locations. Revisiting this with a
differential-privacy mechanism is planned should the portfolio or the publication
cadence grow.

## Data residency and international transfer

The stack is self-hostable, so a controller who runs it on infrastructure inside
Tanzania keeps all data in-country. That is the design intent.

The managed hosted instance currently relies on third-party services that process
data outside Tanzania, including the database host, media storage and application
hosting; where the advisory language model is enabled, prompt content is processed
by that provider. A deployment that must guarantee in-country residency should
self-host and leave those integrations disabled — the platform runs on its
deterministic fallback path without the language model.

## Rights of data subjects

Staff whose data is processed may request access, correction, deletion,
restriction, and a copy of their data in a portable format. Requests go to the
controller operating the deployment. Export tooling exists in
`web-platform/src/lib/reports/` and produces CSV, XLSX, PDF and DOC.

Export is currently an administrator function; a self-service flow letting an
individual download their own record is on the roadmap. Until it ships,
controllers service these requests through the administrator export.

## Security

Vulnerability reporting, secrets handling and the security posture are covered in
[`SECURITY.md`](../SECURITY.md).

## Open work

- Complete a data protection impact assessment.
- Add a self-service data export and deletion flow.
- Translate the user-facing policy into Swahili, since the product is
  Swahili-first.
- Document a breach-notification timeline meeting the Act's requirements.
