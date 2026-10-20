# AGENT.md — PMD Frontend Operating Guide

This file is the implementation contract for AI-assisted work in `ShahinKian/pmd-front`.

The goal is to keep the frontend aligned with the real backend contracts, external Base Info services, authorization rules, and workflow behavior. Do not invent domain rules that are not defined by the backend or the documented external services.

---

## 1. Project Scope

Repository: `ShahinKian/pmd-front`

Primary application responsibilities:

- Authentication and authorized UI access.
- Rendering PMD forms and dashboards.
- Calling the PMD backend (`pmd-api`) for:
  - authentication;
  - users/roles;
  - forecasts;
  - program profiles;
  - workflow transitions;
  - PlanProvider relationships;
  - current-user provider plan access.
- Calling the external Base Info service from the frontend server only for:
  - networks;
  - network groups;
  - program structures;
  - program degrees;
  - business/job types;
  - activity types;
  - program-maker personnel;
  - plans;
  - plan detail;
  - plan items;
  - estimate/personnel detail.
- Resolving display names and external reference data for `PlanId`, `ProviderId`, networks, groups, and related external entities.

The frontend MUST NOT become a second source of truth for business workflow.

---

## 2. Architecture Rules

Use the existing Next.js App Router architecture.

Prefer:

- Server Components for server-rendered data when appropriate.
- Route Handlers / BFF endpoints for browser-to-external-service access.
- Server-only service modules for secret-bearing requests.
- Client Components only for interactive UI behavior that requires them.

Do not move secrets to browser code.

Do not duplicate API clients in multiple pages.

Do not hard-code backend or external-service domain data when it can be resolved dynamically.

---

## 3. Authentication and Tokens

Authentication is owned by `pmd-api`.

The frontend MUST:

- use backend auth endpoints;
- preserve backend token semantics;
- enforce UI access based on backend-returned roles/permissions;
- refresh/re-authenticate according to the existing app mechanism.

The frontend MUST NOT:

- fabricate roles;
- derive permissions from route names alone;
- bypass backend authorization;
- treat a hidden button as a security control.

Backend authorization remains authoritative.

---

## 4. Workflow Ownership — Mandatory Rule

Workflow between forms and entities is implemented in backend endpoints.

The frontend MUST NOT recreate, infer, bypass, or maintain a parallel workflow state machine.

Allowed frontend behavior:

- render actions according to current state and authorization;
- call documented workflow endpoints;
- display backend validation errors;
- refresh UI state after a successful transition;
- disable impossible actions when the backend state makes them invalid.

Forbidden frontend behavior:

- directly assigning workflow states;
- jumping over backend transitions;
- simulating approve/reject/return behavior locally;
- creating local-only workflow states;
- allowing an action merely because a role name appears in the UI;
- silently ignoring backend workflow validation.

When backend and frontend assumptions disagree, backend behavior wins.

---

## 5. Backend API Responsibility

Use `pmd-api` for application-owned data and behavior, including:

- auth;
- users;
- roles;
- user network/group assignments;
- `providerId` stored on users;
- forecasts;
- program profiles;
- workflow actions;
- PlanProvider many-to-many relations.

The frontend MUST NOT use the external Base Info service as a substitute for backend-owned data.

---

## 6. External Base Info Service

### 6.1 Purpose

The Base Info service is an external reference-data service consumed only by the frontend layer.

Base URL:

```text
http://172.16.60.34/api/v1/baseinfo
```

All documented calls use:

```text
Method: GET
X-API-KEY: {API_KEY}
Content-Type: application/json
```

The API key is a secret.

### 6.2 Environment Variables

Use server-only environment variables:

```env
BASEINFO_BASE_URL=http://172.16.60.34/api/v1/baseinfo
BASEINFO_API_KEY=...
```

Optional operational override:

```env
BASEINFO_PROVIDER_JOB_ID=
```

Never define the Base Info API key as `NEXT_PUBLIC_*`.

Forbidden:

```env
NEXT_PUBLIC_BASEINFO_API_KEY=...
```

---

## 7. Base Info Security Rules

The browser MUST NOT call `172.16.60.34` directly.

The browser MUST NOT receive `X-API-KEY`.

All browser-originated Base Info requests must pass through the Next.js server layer.

Preferred structure:

```text
app/
  api/
    base-info/
      networks/route.ts
      network-groups/[networkId]/route.ts
      structure-programs/route.ts
      program-degrees/[structureId]/route.ts
      business-types/route.ts
      activity-types/[jobId]/route.ts
      program-makers/route.ts
      plans/[networkId]/route.ts
      plan-detail/[planId]/route.ts
      plan-items/[planId]/route.ts
      estimate-detail/[planId]/route.ts

lib/
  base-info/
    client.ts
    endpoints.ts
    types.ts
    normalize.ts
    provider.ts
```

A different folder organization is acceptable only if the same security boundary is preserved.

---

## 8. Standard Base Info Response

The standard response shape is:

```json
{
  "IsSuccess": true,
  "Message": null,
  "Data": [
    {
      "Value": "210",
      "Text": "شبکه ورزش",
      "Selected": false,
      "Disabled": false,
      "Group": null
    }
  ]
}
```

Recommended TypeScript model:

```ts
export interface BaseInfoItem {
  Value: string;
  Text: string;
  Selected: boolean;
  Disabled: boolean;
  Group: unknown | null;
}

export interface BaseInfoResponse<T = BaseInfoItem[]> {
  IsSuccess: boolean;
  Message: string | null;
  Data: T;
}
```

Do not assume HTTP `200` alone means business success.

Always validate:

- HTTP status;
- `IsSuccess`;
- expected `Data` shape.

---

## 9. Base Info Endpoint Mapping

The external API route names below are contractual.

Do not “correct” their spelling.

### 9.1 Networks

External:

```text
GET /networks
```

Suggested internal route:

```text
GET /api/base-info/networks
```

### 9.2 Network Groups

External:

```text
GET /networkgroups/{networkId}
```

Example:

```text
/networkgroups/210
```

Suggested internal route:

```text
GET /api/base-info/network-groups/{networkId}
```

### 9.3 Program Structures

External:

```text
GET /structurePrograms
```

Suggested internal route:

```text
GET /api/base-info/structure-programs
```

### 9.4 Program Degree

External:

```text
GET /programDgree/{structureId}
```

Important: external spelling is `programDgree`.

Suggested internal route:

```text
GET /api/base-info/program-degrees/{structureId}
```

### 9.5 Business Types

External:

```text
GET /bussinessTypes
```

Important: external spelling is `bussinessTypes`.

Suggested internal route:

```text
GET /api/base-info/business-types
```

### 9.6 Activity Types

External:

```text
GET /activityTypes/{jobId}
```

Suggested internal route:

```text
GET /api/base-info/activity-types/{jobId}
```

### 9.7 Program-Maker Personnel

External:

```text
GET /personelProgramMaker?jobId={jobId}&networkId={networkId}
```

Important: external spelling is `personelProgramMaker`.

Suggested internal route:

```text
GET /api/base-info/program-makers?jobId={jobId}&networkId={networkId}
```

### 9.8 Plans

External:

```text
GET /plans/{networkId}
```

Suggested internal route:

```text
GET /api/base-info/plans/{networkId}
```

### 9.9 Plan Detail

External:

```text
GET /planDetail/{planId}
```

Suggested internal route:

```text
GET /api/base-info/plan-detail/{planId}
```

### 9.10 Plan Items

External:

```text
GET /planItems/{planId}
```

Suggested internal route:

```text
GET /api/base-info/plan-items/{planId}
```

### 9.11 Estimate / Personnel Detail

External:

```text
GET /estimateDetail/{planId}
```

Suggested internal route:

```text
GET /api/base-info/estimate-detail/{planId}
```

---

## 10. Base Info Client Rules

Use one centralized server-only client.

It must:

- build URLs from `BASEINFO_BASE_URL`;
- attach `X-API-KEY`;
- use `GET`;
- validate responses;
- normalize failures;
- never log the API key;
- never return the API key in error messages;
- support request timeout/abort;
- avoid copy-pasted fetch logic across pages.

Example behavior:

```ts
await fetch(url, {
  method: "GET",
  headers: {
    "X-API-KEY": process.env.BASEINFO_API_KEY!,
    "Content-Type": "application/json"
  },
  cache: "no-store"
});
```

Do not copy this fetch block into every page or component.

---

## 11. Base Info Error Handling

Known external errors:

```text
401 Unauthorized
400 Bad Request
500 Internal Error
```

Recommended user-facing messages:

```text
401:
دسترسی به سرویس اطلاعات پایه امکان‌پذیر نیست.

400:
پارامتر ارسالی به سرویس اطلاعات پایه معتبر نیست.

500:
سرویس اطلاعات پایه در حال حاضر پاسخ صحیح نمی‌دهد.

Network / timeout:
ارتباط با سرویس اطلاعات پایه برقرار نشد.
```

Do not expose:

- Base Info IP details unless required for an admin-only diagnostic page;
- `X-API-KEY`;
- stack traces;
- raw secret-bearing request data.

---

## 12. Numeric External ID Validation

Base Info commonly returns identifiers in `Value` as strings.

Convert only at the boundary where a numeric ID is required.

Example:

```ts
const id = Number(item.Value);

if (!Number.isInteger(id) || id <= 0) {
  throw new Error("Invalid external identifier");
}
```

Never submit:

- `NaN`;
- zero;
- negative values;
- unvalidated free-text values

as `networkId`, `jobId`, `planId`, or `providerId`.

---

## 13. Provider Identity — Critical Domain Rule

`providerId` is the external program-maker/provider personnel ID.

It is NOT:

- internal Auth `userId`;
- role ID;
- username;
- PlanProvider row ID;
- network ID;
- plan ID.

The source of `providerId` is the selected personnel record returned by the external personnel endpoint.

Conceptually:

```text
BaseInfo personelProgramMaker item.Value
                ↓
         positive integer
                ↓
           providerId
                ↓
           pmd-api User
```

---

## 14. Provider User Registration

When creating a user with role `Providers`, `providerId` is mandatory.

When creating a non-Provider user, `providerId` must be `null` or omitted according to backend contract.

### Required UI flow

```text
Select user role(s)
        ↓
Does the user have Providers role?
        ├─ No
        │   └─ providerId = null
        │
        └─ Yes
            ↓
        Select relevant network
            ↓
        Resolve Provider jobId
            ↓
        Load program-maker personnel
            ↓
        Show personnel for that network
            ↓
        User selects one provider
            ↓
        item.Value -> validated positive integer
            ↓
        providerId
            ↓
        POST /api/auth/register
```

Example Providers payload:

```json
{
  "fullName": "علی رضایی",
  "userName": "ali.rezaei",
  "password": "Password123",
  "roles": ["Providers"],
  "networkIds": [210],
  "networkGroupId": 5,
  "providerId": 15
}
```

Example non-Providers payload:

```json
{
  "fullName": "علی رضایی",
  "userName": "ali.rezaei",
  "password": "Password123",
  "roles": ["PlanManager"],
  "networkIds": [210],
  "networkGroupId": 5,
  "providerId": null
}
```

---

## 15. Provider Job ID Resolution

Do not blindly hard-code:

```ts
const PROVIDER_JOB_ID = 1;
```

unless the organization explicitly defines that value as a permanent contract.

Preferred resolution order:

1. If `BASEINFO_PROVIDER_JOB_ID` contains a valid positive integer, use it.
2. Otherwise call:

```text
GET /bussinessTypes
```

3. Find the business type corresponding to `تهیه‌کننده`.
4. Convert its `Value` to a validated positive integer.
5. Use that ID in:

```text
/personelProgramMaker?jobId={jobId}&networkId={networkId}
```

When comparing Persian labels, normalize text first.

Recommended normalization includes:

- `ي` -> `ی`
- `ك` -> `ک`
- trim
- collapsing repeated whitespace

Do not depend on whitespace or Arabic/Persian Unicode variants.

---

## 16. Provider Selection Must Be Network-Safe

When the selected network changes:

```text
providerId = null
provider options = []
```

Then reload provider personnel for the new network.

Never retain a provider selected from a previous network.

Never submit a provider unless it exists in the currently loaded provider option set.

If multiple network assignments exist for a user, do not merge provider lists from unrelated networks without an explicit business rule.

The provider identity and the user's access networks are separate concepts.

---

## 17. User Network Scope vs Provider Identity

Keep these concepts separate:

```text
networkIds
```

represent application access / organizational scope.

```text
providerId
```

represents external provider identity.

Do not infer one from the other.

A provider may have plans across multiple networks even when the user record has specific assigned network scopes.

For the current logged-in provider's own plans, backend logic is authoritative.

---

## 18. Editing Existing Provider Users

For an existing user, use the backend provider-assignment endpoint:

```text
PUT /api/auth/users/{userId}/provider
```

Example:

```json
{
  "providerId": 15
}
```

Do not directly mutate the database.

Do not send `userId` as `providerId`.

Respect the backend authorization policy for user assignment management.

---

## 19. PlanProvider Many-to-Many

PlanProvider links external `PlanId` to external `ProviderId`.

Conceptual key:

```text
(PlanId, ProviderId)
```

Do not confuse this relation with Auth users.

One plan can have multiple providers.

One provider can have multiple plans.

Names/details are resolved from external Base Info; relation ownership is in `pmd-api`.

---

## 20. Current Provider Plans

For a logged-in provider, use:

```text
GET /api/plan-providers/my/plans
```

Do not build the current-user view by calling:

```text
GET /api/plan-providers/providers/{providerId}/plans
```

with a provider ID supplied by the browser.

The backend resolves the current user's stored `providerId`.

The frontend must not trust a client-supplied provider identity for “my plans”.

---

## 21. Enriching Provider Plans

`GET /api/plan-providers/my/plans` returns PlanProvider relationship data.

For display information such as plan title or other external plan attributes, resolve the returned `planId` through Base Info.

Conceptually:

```text
pmd-api
  GET /api/plan-providers/my/plans
          ↓
      planId list
          ↓
Base Info
  /planDetail/{planId}
          ↓
UI display
```

Responsibilities:

```text
pmd-api:
- ownership
- user identity
- authorization
- PlanProvider relation
- workflow

Base Info:
- external reference data
- names
- plan details
- program items
- external personnel details
```

Do not persist duplicated external names in the frontend merely to avoid proper resolution unless the project introduces an explicit cache strategy.

---

## 22. PlanProvider Management

Use backend PlanProvider endpoints for assignments.

Frontend must not modify PlanProvider via Base Info.

Management access is policy-driven in backend.

Do not assume only `Admin` may manage PlanProvider links.

The backend policy may include roles such as `PlanManager` or other configured/future roles.

The UI should reflect backend authorization but never replace it.

---

## 23. Form Dependency Rules

Dependent selectors must reset child values when parents change.

Examples:

```text
network changes
→ clear networkGroupId
→ reload network groups

structure changes
→ clear programDegree
→ reload degree options

job changes
→ clear activityType
→ reload activities

network/job changes
→ clear providerId
→ reload personnel

network changes
→ clear selected plan if that plan was loaded from the previous network
```

Do not keep stale IDs in forms.

---

## 24. Loading, Empty, and Failure States

Every async selector/list must support:

- loading;
- successful empty response;
- validation failure;
- external-service failure;
- retry where useful;
- disabled dependent controls until prerequisites exist.

An empty external list is not the same as an API error.

Do not show stale data from a previous request after a dependency changes.

Guard against out-of-order async responses when users rapidly change selectors.

---

## 25. Request Race Conditions

For dependent selects, older requests must not overwrite newer selections.

Use one of:

- `AbortController`;
- request sequence IDs;
- framework-native cancellation behavior.

Example risk:

```text
User selects network A
request A starts

User immediately selects network B
request B starts

request B completes
UI shows B

request A completes later
```

Request A must not overwrite B's personnel/options.

---

## 26. Data Normalization

Normalize external values only at boundaries.

Preserve backend JSON contracts exactly.

Do not rename backend fields in outgoing payloads.

For Base Info UI use, adapters may map:

```text
Value -> value
Text  -> label
```

but retain the original external item when needed for traceability.

Recommended normalized option type:

```ts
type SelectOption<T = number> = {
  value: T;
  label: string;
  disabled?: boolean;
};
```

---

## 27. Caching Rules

Base Info values may look static but should not be assumed permanently static.

Default safe behavior:

```text
cache: "no-store"
```

A future cache may be introduced for low-volatility lists only after explicitly defining:

- TTL;
- invalidation;
- failure fallback;
- admin refresh behavior.

Do not cache personnel or plan data indefinitely.

---

## 28. Validation Rules

Validate on both UI and API boundaries.

Examples:

- IDs must be positive integers.
- Providers user requires `providerId`.
- Non-Provider user should not carry stale `providerId`.
- `jobId` and `networkId` are required before loading personnel.
- `structureId` is required before loading program degree.
- `networkId` is required before loading plans/groups.

Frontend validation improves UX but backend validation remains authoritative.

---

## 29. Error Propagation from pmd-api

Do not replace useful backend domain errors with generic “something went wrong” messages.

Where safe, surface backend-provided validation/business messages.

Keep HTTP/domain distinctions intact.

Do not convert:

```text
400 / 403 / 404 / 409
```

into arbitrary success states.

Do not implement automatic retries for non-idempotent workflow actions.

---

## 30. UI Authorization

Use backend user profile/claims/role information.

A hidden action is not authorization.

Rules:

- Hide or disable actions users cannot use for UX.
- Still call authorized backend endpoints only.
- Handle `403` correctly.
- Refresh role-sensitive UI after authentication/session changes.
- After role assignment changes, remember that the user may need a newly issued token before claims change.

---

## 31. Forbidden Implementations

Do NOT:

- expose `BASEINFO_API_KEY`;
- call external Base Info directly from Client Components;
- store `providerId` as a string without numeric validation;
- confuse `providerId` with Auth GUID;
- hard-code provider personnel lists;
- hard-code network/group/plan names that come from Base Info;
- recreate backend workflow;
- manually write workflow states;
- bypass backend policies;
- trust provider identity sent by browser for “my” resources;
- retain provider selection after network changes;
- ignore `IsSuccess`;
- assume every HTTP 200 Base Info response is successful;
- silently swallow external service errors;
- leak stack traces or API keys to end users.

---

## 32. Recommended Base Info Service API

Prefer server-only functions similar to:

```ts
getNetworks()
getNetworkGroups(networkId)
getStructurePrograms()
getProgramDegrees(structureId)
getBusinessTypes()
getActivityTypes(jobId)
getProgramMakers(jobId, networkId)
getPlans(networkId)
getPlanDetail(planId)
getPlanItems(planId)
getEstimateDetail(planId)
```

Pages/components should call these abstractions instead of reconstructing external URLs.

---

## 33. Recommended Provider Utilities

Centralize provider-specific logic.

Suggested responsibilities:

```ts
resolveProviderJobId()
loadProvidersForNetwork(networkId)
parseProviderId(value)
normalizePersianText(value)
isProvidersRole(roles)
```

Do not reimplement the same role/provider logic independently in registration, edit-user, and assignment pages.

---

## 34. Server-Side Secret Guard

Any file that directly reads:

```ts
process.env.BASEINFO_API_KEY
```

should be server-only.

Where useful:

```ts
import "server-only";
```

Never import such modules from Client Components.

---

## 35. Logging

Logs may contain:

- route name;
- HTTP status;
- elapsed time;
- safe external IDs;
- correlation/request identifiers.

Logs must not contain:

- Base Info API key;
- passwords;
- access tokens;
- refresh tokens;
- full Authorization headers.

---

## 36. Development Without Base Info Availability

The external service is on a private network.

Do not invent production data if the service is unreachable from a developer machine.

Allowed:

- clear development error state;
- explicit mock mode only if the project intentionally introduces one;
- fixture data only in test/dev scope.

Forbidden:

- silently falling back to fake data in production;
- committing real API keys;
- treating test fixture IDs as production constants.

---

## 37. Tests to Add Around Base Info

At minimum, protect:

1. API key is never returned to browser.
2. `IsSuccess=false` becomes an error state.
3. invalid numeric `Value` is rejected.
4. Providers role requires provider selection.
5. non-Provider role clears stale `providerId`.
6. changing network clears provider selection.
7. stale personnel request cannot overwrite latest network selection.
8. current provider plan page uses `/my/plans`.
9. plan display resolves external details by `planId`.
10. failed Base Info request does not submit stale form data.

---

## 38. Tests Around Workflow

Frontend tests should verify:

- correct endpoint is called for an action;
- button availability follows returned state/permissions;
- backend validation error is shown;
- UI refreshes after successful state transition.

Do not unit-test a duplicated frontend workflow state machine because such a state machine should not exist.

---

## 39. Change Discipline

Before changing an existing API integration:

1. inspect the current endpoint contract;
2. inspect current role/policy behavior;
3. confirm whether data is owned by `pmd-api` or Base Info;
4. preserve existing behavior unless the requested change explicitly replaces it;
5. avoid broad refactors unrelated to the task.

Do not “clean up” contractual endpoint names from external systems.

---

## 40. Definition of Done for Base Info Integration

A Base Info-related change is complete only when:

- the API key stays server-side;
- the external route is called through centralized code;
- parameters are validated;
- loading/empty/error states exist;
- dependent stale values are cleared;
- race conditions are prevented;
- user-facing errors are safe;
- no backend workflow has been duplicated;
- provider identity remains correctly separated from Auth identity;
- build/type-check/tests pass.

---

## 41. Definition of Done for Provider User Registration

Provider registration/edit is complete only when:

- `Providers` role is detected correctly;
- a relevant network is selected;
- provider job ID is resolved safely;
- only providers for the selected network are shown;
- `providerId` is a validated positive integer;
- changing network clears the previous provider;
- Providers cannot be submitted without `providerId`;
- non-Providers do not retain stale `providerId`;
- payload matches `pmd-api`;
- backend validation messages are handled.

---

## 42. Source-of-Truth Summary

Use this order of authority:

```text
1. pmd-api runtime contract and authorization
2. documented backend endpoint contract
3. external Base Info service contract
4. this AGENT.md implementation guide
5. current UI assumptions
```

When the UI conflicts with the backend, fix the UI.

When Base Info spelling looks incorrect but matches the external contract, keep the external spelling at the integration boundary.

When a new requirement changes an existing rule, update both implementation and this file so future work does not reintroduce the old behavior.
