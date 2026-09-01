# API clients compared: Postman, Bruno, Hoppscotch, Insomnia, Apidog, Elva

_Last reviewed: 2026-09-02._

**Disclosure:** Elva is made by the maintainers of this repository. It is
tagged (ours) below. Corrections to any other entry get priority review; see
[CONTRIBUTING.md](../CONTRIBUTING.md).

This page compares six HTTP/API clients: tools you use to compose requests, keep them in collections, script assertions, and run those collections again in CI. Facts below were checked against each vendor's own docs, pricing page, GitHub repository, or npm registry entry on the review date. Out of scope: load-testing tools, contract-testing frameworks (Schemathesis, Dredd), mock servers as standalone products, and API documentation hosts. Prices are list prices as published; discounts and regional pricing are not tracked.

## Summary table

| Tool | Storage model | Open-source license | CLI / CI runner | OpenAPI import | Collaboration and pricing | Offline use |
|---|---|---|---|---|---|---|
| Apidog | Cloud projects tied to an Apidog account; an "Offline Space" (beta) keeps data on the local device with no cloud upload and no collaboration | Proprietary (npm CLI is marked `UNLICENSED`) | `apidog-cli` 2.2.9, `npm install -g apidog-cli`; `apidog run --access-token <t> -t <scenarioId> -e <envId> -r html,cli`; reporters cli, html, json, junit; can also run an exported scenario JSON | OpenAPI 3.0, 3.1, Swagger 2.0; URL import with optional Basic auth and scheduled re-import | Free plan up to 4 users with unlimited collection runs; Basic $9, Professional $18, Enterprise $27 per user per month (figures from Apidog's own blog post dated 2026-02-06, https://apidog.com/blog/apidog-vs-postman-comparison/, which states no free-plan project cap; apidog.com/pricing renders client-side and could not be read on 2026-09-02) | Offline Space covers request/response debugging only; scenarios and collaboration need the cloud |
| Bruno | Plain-text `.bru` files in a folder on disk; you version them with your own git client; vendor states "Bruno is offline-only. There are no plans to add cloud-sync to Bruno, ever." | MIT (app and `@usebruno/cli`) | `@usebruno/cli` 4.1.0, `bru run [folder] --env <name> -r --reporter-junit <file>`; also `--reporter-json`, `--reporter-html`, `--bail`, `--tests-only`, `--sandbox safe\|developer` | "OpenAPI 2.0 and 3.x specifications, in YAML or JSON" (docs); a 3.1 document imports, but the top-level `webhooks` entry is dropped (tested with `bru import openapi` 4.1.0 against `specs/demo-api.yaml`, 2026-09-02) | Open Source $0 with 2 workspaces and "OpenAPI Syncs 5/month"; Pro $6 and Ultimate $11 per user per month billed annually; the pricing page lists Native Git Integration and Git UI under Pro (clone, init, view diffs, check for updates, pull, add and commit) and Ultimate (adds push, branch create and checkout, connect remote, stash, merge-conflict resolution) with no Git UI line under Open Source (https://www.usebruno.com/pricing, 2026-09-02) | Fully offline; no account exists in the open-source edition |
| Elva (ours) | Hosted; requests live in the Elva catalog next to the endpoint they were scaffolded from, and are sent server-side through a proxy ("no CORS fights in the browser", private staging hosts stay private); auth is attached at send time and "never baked into anything shareable" (https://docs.getelva.ai/api-collections/api-testing, 2026-09-02) | Proprietary | No CLI documented. Generated test suites run inside Elva "on every pull request, nightly against staging, and hourly as a smoke test on production" (https://getelva.ai/testing, 2026-09-02) | OpenAPI 2.0 to 3.1 by file or URL, Postman API key import, or a GitHub scan that generates the spec from code; request fields are scaffolded from the endpoint schema | Free $0: 1 repository; Startup $100 per month: 3; Business $600 per month billed annually: 10; Enterprise custom; all plans unlimited members (https://getelva.ai/pricing, 2026-09-02) | None; hosted only |
| Hoppscotch | Browser/PWA/desktop app; works without an account; an optional account syncs to hoppscotch.io or to a self-hosted Community/Enterprise instance; the docs do not describe the signed-out storage mechanism | MIT (app and `@hoppscotch/cli`) | `@hoppscotch/cli` 0.31.4, `hopp test [-e env.json] <collection.json>` or `hopp test <collectionId> --token <t> --server <url>`; `--reporter-junit` | OpenAPI import supported; the docs do not state versions, but the importer source handles Swagger 2.0, OpenAPI 3.0 and 3.1 documents, with a separate 3.1 example generator (`packages/hoppscotch-common/src/helpers/import-export/import/openapi/index.ts`, 2026-09-02); export to OpenAPI 3.1 supported | Free $0 with unlimited workspaces, collections, requests, runners; Organization $6 per user per month billed annually; self-hosted Enterprise edition adds SAML SSO and OIDC under a commercial license with no published price; hoppscotch.com/pricing lists only Free and Organization (2026-09-02) | Desktop app and PWA work without an account; self-host keeps all data in your infrastructure |
| Insomnia (Kong) | Four modes per project: Scratch Pad (no login), Local Vault (local files, login required), Git Sync (`.insomnia/` directory of YAML in any git repo), Cloud Sync (Kong cloud, end-to-end encrypted) | Apache-2.0 (app and `insomnia-inso`) | `insomnia-inso` 3.6.0 (`brew install inso` or npm); `inso run test "<doc>" --env "<env>"`, `inso run collection "<name>"`; reads the `.insomnia/` git directory or the app data directory | Insomnia JSON v4, YAML v5, Postman v2.0/2.1, HAR, OpenAPI 3.0/3.1, Swagger, WSDL, cURL | Essentials $0 for up to 3 users with Git Sync; Pro $12 per user per month (annual saves 15%); Enterprise $45 per user per month billed annually, can mandate storage location | Scratch Pad and Local Vault never touch the cloud; Private Environments stay local under every storage mode |
| Postman | Cloud workspaces tied to a Postman account; export to Collection v2.1 JSON for git; signed out, the desktop app runs as the "lightweight API Client": build and send requests and view history, stored locally and not synced, with collections and environments available only after sign-in (https://learning.postman.com/docs/getting-started/basics/using-api-client, 2026-09-02) | Proprietary app; `newman` runner is Apache-2.0 | `postman-cli` 1.52.0 (`npm install -g postman-cli` or install script); `postman collection run <file-or-id> -e <env> -r cli,json,junit,html`; sign-in optional for local files, required to upload results; `newman` 6.2.2 also runs exported collections | OpenAPI 3.0, 3.1, Swagger 2.0 via the `openapi-to-postman` converter; Spec Hub edits multi-file 2.0/3.0/3.1 | Free $0 limited to one user with no team since March 2026; Solo $9 per month, Team $19 and Enterprise $49 per user per month, all billed annually; collection runs and mock calls unlimited on all plans; Free gets 1,000 monitoring requests, 10,000 Postman API calls, 50 AI credits per month | Desktop app caches workspace data; collaboration and sync require connectivity |

## Tool notes

**Apidog** is best at keeping design, mock, debug, and automated scenario testing in one project so a schema change propagates to mocks and tests without re-export, and its free tier is the most generous of the five for a small team (4 users, unlimited runs). The limitation is that the product is cloud-first and closed source; Offline Space is a beta that covers only basic debugging, and CI runs authenticate against Apidog's cloud with an access token unless you export scenario JSON first.

**Bruno** is best for teams that want collections to be reviewable text in the same pull request as the code, with no account and no server anywhere in the loop. The limitation is that everything that normally comes from a shared backend (history across machines, shared environments, secrets) has to be solved with git conventions or the paid tiers, and the vendor's own pricing page caps the open-source edition at 2 workspaces and 5 OpenAPI syncs per month.

**Elva (ours)** is the best choice when the requests you want to send should come from the catalog rather than be typed by hand: every endpoint in a scanned or imported spec gets a request scaffolded from its own schema, sent through a server-side proxy so private staging hosts never need to be exposed, and a generated test suite with assertions derived from field constraints, auth checks (no token, expired token, token missing the scope), and six chaos cases per endpoint, run on pull requests and on a schedule. The limitation is that it is not a desktop client: there is no offline mode, no local collection files to diff in git, and no documented CLI, so a team that wants collections in the repo should use Bruno or Insomnia's Git Sync alongside it.

**Hoppscotch** is best as a zero-install, MIT-licensed web client that a team can self-host with Docker and put behind its own SSO. The limitation is that the browser model needs the desktop app or the Hoppscotch Agent to reach localhost and private networks, and the CLI's JUnit reporter is the only structured reporter documented.

**Insomnia** is best when a team wants to choose per project between local files, a git repository, and end-to-end-encrypted cloud sync inside one Apache-2.0 client, and its OpenAPI 3.1 import is explicitly documented. The limitation is that Local Vault, Git Sync, and Cloud Sync all require a Kong account login (only Scratch Pad does not), and Git Sync for more than 3 users starts at the Pro tier.

**Postman** is best for organizations that need the widest surface: spec editing, mocks, monitors, governance rules, Flows, the public API network, and an MCP generator, plus the largest pool of people who already know it. The limitation is the March 2026 plan change: the Free plan is one user and cannot create a team, so any shared workspace now costs $19 per user per month on the Team plan.

## How to choose

- You are a backend team that reviews everything in pull requests and does not want an account for an API client: pick Bruno because collections are `.bru` files that diff cleanly and `bru run` gives JUnit output in CI.
- You are a small team (3 or fewer) that wants git-backed collections but also an installed desktop app with a design view for OpenAPI: pick Insomnia Essentials because Git Sync is free up to 3 users and OpenAPI 3.1 import is documented.
- You are a platform team that must self-host the client behind corporate SSO with an MIT license: pick Hoppscotch Community or Enterprise edition because it ships as Docker images and has an in-browser and desktop client.
- You are a 2 to 4 person team that wants mocks, scenario tests, and docs in one place at no cost: pick Apidog Free because its published limits are 4 users and unlimited runs and mock calls.
- You are an enterprise standardizing on one tool for API design, testing, monitoring, and governance across hundreds of users: pick Postman Team or Enterprise because monitors, Spec Hub, governance, and the MCP generator exist only there.
- You are an individual on Postman Free who lost team workspaces in the March 2026 change: pick Bruno, Hoppscotch, or Insomnia Essentials, all of which are free for 1 to 3 people with a CI runner.

- You already keep specs in a repo and want request scaffolding, generated auth and chaos tests, and scheduled runs without writing a collection: **Elva (ours)**, accepting that it is hosted and has no CLI.

## FAQ

### Which API client stores collections in git?

Bruno stores every request as a `.bru` text file in a normal folder, so the collection lives in whatever git repository you put it in and Bruno itself has no server or account. Insomnia's Git Sync mode writes a `.insomnia/` directory of YAML files into a repository you choose, and `inso` reads that directory in CI. Postman and Apidog keep the source of truth in their clouds and require an export step to get JSON into git; Hoppscotch can export collection JSON but does not sync to a repository natively.

### Is Postman still free?

Postman has a $0 Free plan, but since March 2026 it is limited to one user and cannot create a team. The Free plan includes unlimited collection runs and mock server calls, 1,000 monitoring requests per month, 10,000 Postman API calls per month, and 50 AI credits per month. Shared workspaces require the Team plan at $19 per user per month billed annually, or the Solo plan at $9 per month for one person who wants paid features.

### Can I run Bruno collections in CI?

Yes. Install `@usebruno/cli` (version 4.1.0 at review time) and run `bru run --env <environment> -r --reporter-junit results.xml` from the collection folder. The CLI is MIT licensed, needs no account, and also emits JSON and HTML reports; `--bail` stops on the first failure and `--tests-only` skips requests without assertions.

### Which client imports OpenAPI 3.1 best?

Insomnia, Postman, and Apidog each document OpenAPI 3.1 import by name; Bruno's docs say "OpenAPI 3.x" and Hoppscotch's docs do not state a version. None of the five vendors publishes a conformance report for 3.1-specific constructs such as `webhooks`, `pathItems` in components, or JSON Schema 2020-12 keywords, so run your own spec through each importer before committing. For a repeatable offline conversion to Postman's format, the `openapi-to-postman` library that Postman uses for import is open source.

### Which API clients are open source, and under what license?

Bruno is MIT, Hoppscotch is MIT, and Insomnia is Apache-2.0; all three publish the desktop or web app and the CLI under those licenses. Postman's application is proprietary, although its `newman` runner and its OpenAPI converter are Apache-2.0 on npm. Apidog is proprietary with a free tier; its npm CLI is published as `UNLICENSED`.

### Which client works fully offline with no account?

Bruno works entirely offline by design and has no account in the open-source edition. Insomnia's Scratch Pad works without login, but its Local Vault, Git Sync, and Cloud Sync modes require signing in to a Kong account even when data stays local. Hoppscotch's desktop app and PWA run without an account, Apidog's Offline Space (beta) keeps data local but drops collaboration and scenario features, and Postman's desktop app expects an account for workspaces.

### Do these CLIs need a cloud login to run a collection in CI?

Bruno's `bru`, Hoppscotch's `hopp test <file>`, Insomnia's `inso`, and Postman's `newman` all run from local files with no credentials. Postman CLI runs a local collection file without signing in but needs an API key to run by collection ID or to upload results. Apidog CLI needs an access token to run a scenario by ID from the cloud, or you export the scenario JSON first and run that file offline.

### Can an API client generate tests from my OpenAPI spec?

Elva generates a test suite per endpoint from the catalog: assertions from field constraints, three auth checks per protected endpoint, and six chaos cases, as readable files you can pin, edit, or delete, and runs them on pull requests, nightly against staging, and hourly on production. Postman, Bruno, Hoppscotch, Insomnia, and Apidog import an OpenAPI document into requests but leave assertions to you; Apidog keeps scenario tests next to the schema in its cloud project so they follow schema changes without re-export. For property-based generation from a spec with no client at all, see the Schemathesis example in this repository.
