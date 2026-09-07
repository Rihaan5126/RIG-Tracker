# Instagram API capability matrix

Researched **2026-09-07**, before application code. Meta's official Postman documentation was accessible. Direct developer reference pages returned HTTP 429 or fetch errors; restrictions were not bypassed. Unverified fields remain disabled. Documentation support does not establish an individual app's permission or App Review approval.

## Official references

- [M1: Meta Instagram Platform collection](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api): professional account access and login models.
- [M2: Meta Instagram Login](https://www.postman.com/meta/instagram/folder/6raa77c/instagram-api-with-instagram-login): no linked Page required; current `instagram_business_*` scopes.
- [M3: Meta Insights requirements](https://www.postman.com/meta/instagram/folder/23987686-f659d7d1-d74c-44e4-9192-9b1e8694c511): own professional account/media, basic and manage-insights permissions.
- [M4: Meta Insights requests](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api?entity=request-23987686-1ff01566-3509-48bd-a0f4-8571a91ccfdf): account/media metric examples; compatibility depends on type/version.
- [M5: Meta Facebook Login](https://www.postman.com/meta/instagram/folder/u4g5a2a/instagram-api-with-facebook-login): conditional other-professional-account metadata; consumer accounts unavailable.
- [R1: Business Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login): direct retrieval blocked; endpoint verification required before live deployment.
- [R2: Getting started](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/get-started): direct retrieval blocked; field verification required.
- [R3: Business Discovery](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-discovery/): direct retrieval blocked; not implemented.
- [R4: Insights reference](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/insights): direct retrieval blocked; M3/M4 establish capability scope only.

`UNSUPPORTED` means unavailable in the configured MVP provider. `UNCERTAIN` fails closed. Every fixture has `source=mock`; it is never labeled official. Missing values stay null. The chosen live adapter uses Instagram Login for the connected professional account only. Facebook Business Discovery needs a separate adapter. Explicit OAuth endpoint, version, and verified-field settings are required; there is no guessed version or fallback to fictional data in Meta mode.

| Requested feature / field                                    | Classification          | Official evidence / boundary                     | Mock or application behavior              |
| ------------------------------------------------------------ | ----------------------- | ------------------------------------------------ | ----------------------------------------- |
| Landing, dashboard, navigation, responsive UI, skeletons     | DERIVED BY RIGTRACKER   | Application                                      | Implemented                               |
| User authentication, sessions, deletion                      | DERIVED BY RIGTRACKER   | Separate RIGtracker identity                     | Implemented                               |
| Connect Instagram OAuth                                      | AUTHORIZED-ACCOUNT-ONLY | M2; exact endpoints need R1 verification         | Disabled without configuration            |
| State, scopes, encrypted tokens, expiry, disconnect          | DERIVED BY RIGTRACKER   | Application security                             | Implemented                               |
| Own professional profile and media                           | AUTHORIZED-ACCOUNT-ONLY | M1/M2                                            | Fictional fixtures                        |
| Arbitrary consumer profile lookup                            | UNSUPPORTED             | M1/M5 limitation                                 | Named fictional profiles only             |
| Other public professional profiles                           | UNCERTAIN               | M5 conditional; R3 inaccessible; different login | Fictional accounts                        |
| ID, username                                                 | AUTHORIZED-ACCOUNT-ONLY | M1/M2 identity; returned fields only             | Fictional                                 |
| Name, bio, picture, website                                  | UNCERTAIN               | R2 field details inaccessible                    | Optional verified-field setting; fixtures |
| Followers, following, media count, account type              | UNCERTAIN               | R2 unavailable                                   | Optional verified-field setting; fixtures |
| Verification badge                                           | UNCERTAIN               | No verified field reference                      | Null                                      |
| Origin/confidence/fetch time                                 | DERIVED BY RIGTRACKER   | Normalized models                                | Implemented                               |
| Snapshot creation/deduplication                              | DERIVED BY RIGTRACKER   | Local observations                               | 366 daily snapshots                       |
| Username/name/bio/photo/website changes                      | DERIVED BY RIGTRACKER   | Stable provider ID; snapshot diff                | Multiple fictional changes                |
| Followers/following/media-count changes                      | DERIVED BY RIGTRACKER   | Null-safe difference                             | Implemented                               |
| Timeline, field filters, date periods, text/photo diff       | DERIVED BY RIGTRACKER   | Local history                                    | Implemented                               |
| Historical follower/following/media charts                   | DERIVED BY RIGTRACKER   | No retroactive Meta history claim                | Actual fixture timestamps                 |
| Absolute/percent/daily/weekly growth                         | DERIVED BY RIGTRACKER   | Observed interval                                | Implemented                               |
| Scheduling, intervals, caching, retries, quotas              | DERIVED BY RIGTRACKER   | Conservative limits; backoff                     | Durable jobs                              |
| New media events                                             | DERIVED BY RIGTRACKER   | Available media IDs                              | Implemented                               |
| Media ID/type/caption/URL/time/permalink                     | AUTHORIZED-ACCOUNT-ONLY | M1/M2; optional fields need R2 verification      | 48 items per profile                      |
| Images, videos, carousels, reels                             | AUTHORIZED-ACCOUNT-ONLY | M1/M4                                            | All represented                           |
| Likes/comments                                               | AUTHORIZED-ACCOUNT-ONLY | M4, only when returned                           | Fictional metrics                         |
| Views/reach/shares/saves                                     | AUTHORIZED-ACCOUNT-ONLY | M3/M4; type/version dependent                    | Fictional metrics                         |
| Legacy impressions/plays, duration                           | UNCERTAIN               | Current compatibility unverified                 | Null when unavailable                     |
| Reel watch-time metrics                                      | AUTHORIZED-ACCOUNT-ONLY | M4; optional verified configuration              | Unavailable in default adapter            |
| Account/media insights                                       | AUTHORIZED-ACCOUNT-ONLY | M3/M4; manage-insights scope                     | Fictional analytics                       |
| Total/period posts, average likes/comments/views             | DERIVED BY RIGTRACKER   | Available sample; coverage disclosed             | Implemented                               |
| Mean/median engagement, best/worst posts                     | DERIVED BY RIGTRACKER   | Required operands only                           | Implemented                               |
| Posting weekday/hour/frequency, content mix                  | DERIVED BY RIGTRACKER   | UTC, available sample                            | Implemented                               |
| Engagement/view/reach, share/save rates                      | DERIVED BY RIGTRACKER   | Explicit denominators                            | Implemented                               |
| Own Story analytics                                          | UNCERTAIN               | M4 metrics; retrieval/retention unverified       | Explicit unavailable state                |
| Anonymous third-party Story retrieval                        | UNSUPPORTED             | No supported source identified                   | Explicit unavailable state                |
| Comments                                                     | AUTHORIZED-ACCOUNT-ONLY | M1/M2; extra permission                          | Interface; disabled in minimal scope      |
| Mentions                                                     | UNCERTAIN               | M5 is a different login model                    | Interface; unavailable                    |
| URL recognition, canonicalization, tracking cleanup          | DERIVED BY RIGTRACKER   | Visible URL syntax only                          | Implemented                               |
| Redirect inspection                                          | DERIVED BY RIGTRACKER   | MVP makes no network requests                    | Chain empty, clearly disclosed            |
| Identify person sharing a link                               | UNSUPPORTED             | No authorized source                             | Never requested                           |
| Bookmarks, notes, tags, labels, filtering                    | DERIVED BY RIGTRACKER   | Workspace records                                | Implemented                               |
| Comparison of 2–5 accounts                                   | DERIVED BY RIGTRACKER   | Local observations                               | Implemented                               |
| Notifications: changes, thresholds, spikes, failures, expiry | DERIVED BY RIGTRACKER   | Local rule engine                                | In-app delivery                           |
| Email and Discord                                            | DERIVED BY RIGTRACKER   | Delivery interfaces                              | Payload builder; no automatic sending     |
| 24h/7d/30d changes, moving average, spikes                   | DERIVED BY RIGTRACKER   | Adequate observations; no interpolation          | Implemented                               |
| REST API, API docs, health/readiness                         | DERIVED BY RIGTRACKER   | Application                                      | Implemented                               |
| CSV/JSON export                                              | DERIVED BY RIGTRACKER   | User-owned records                               | Implemented                               |
| SQL migrations, indexes, telemetry, logs                     | DERIVED BY RIGTRACKER   | Infrastructure                                   | Implemented                               |
| Privacy, terms, local deletion                               | DERIVED BY RIGTRACKER   | Application policy                               | Implemented                               |
| Private profiles and hidden contacts/recovery data           | UNSUPPORTED             | No permitted source                              | Never generated/requested                 |
| Passwords/cookies/bypasses/impersonation                     | UNSUPPORTED             | Product prohibition                              | No integration path                       |
| Hashtags, discovery, scores, reports, teams, API keys        | UNCERTAIN               | Future modules require separate review           | Not claimed implemented                   |

## Architecture and live acceptance gate

TypeScript is used throughout: `src/providers/instagram/{base,meta-api,mock,normalization,exceptions}.ts`. Methods return internal models. Unsupported methods throw a normalized exception; Meta mode never returns mocks. Data origin follows fields into snapshots, calculations and exports.

Before enabling live access: verify R1/R2 against the app dashboard, set the reviewed OAuth endpoints, API version and fields, obtain necessary App Review/Advanced Access, and test consent, denial, revocation and each metric with an authorized account. Live OAuth/provider acceptance is not possible without credentials. Fixture tests are not proof of live access.
