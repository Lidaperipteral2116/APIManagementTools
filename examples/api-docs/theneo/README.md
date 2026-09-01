# Theneo (ours): spec to published docs with the CLI and the UI

**What this shows:** Publishing `specs/demo-api.yaml` as hosted, AI-described API documentation on Theneo, first with `@theneo/cli` 0.20.0 (create, import, publish) and then through the dashboard (Create Project, AI description modes, theme, private/public publish, custom domain), plus the agent-facing output (llms.txt) and two ways to keep the docs in sync with the spec (GitHub Sync and the "Theneo API Documentation" GitHub Action).

Theneo is the maintainers' product; this walkthrough describes it as specifically as the other two. Of the three folders here it is the shortest path from spec to a hosted, shareable page: after `theneo login`, one `project create` command imports, fills the missing descriptions, and publishes, whereas Redoc leaves you holding an HTML file and Stoplight needs a workspace, a project, a Git connection, and a publish step. The trade-off is that the result lives on Theneo's hosting and account model, and one plan-gated feature is called out under Notes.

Folder layout:

| File | Purpose |
|---|---|
| `.env.example` | `THENEO_API_KEY=` placeholder; copy to `.env` and never commit the real value |
| `theneo-docs-sync.yml` | Ready-to-copy GitHub Actions workflow using the Marketplace action |
| `images/` | Screenshot slots for the UI steps (`.gitkeep` only) |

## Prerequisites

- A Theneo account and workspace. The free Starter plan (one public project) is enough for this walkthrough; see Notes for what is plan-gated. Sign-up: <https://app.theneo.io>.
- An API key from the Theneo dashboard. Put it in `.env` as `THENEO_API_KEY=...` (copy `.env.example`). It is a credential; keep it out of git and out of shell history where you can (`export THENEO_API_KEY="$(cat .env | cut -d= -f2)"` or a secrets manager).
- Node 22 (tested with v22.23.2) for the CLI. Everything below was run with `npx -y @theneo/cli@0.20.0`; `npm install -g @theneo/cli@0.20.0` gives you a plain `theneo` binary instead. 0.20.0 was the current version on npm on 2026-09-01.
- The shared Prism mock, started from the repository root, if you want the published docs' Try It console to have something local to talk to (only works from your own browser; Theneo's servers cannot reach `127.0.0.1`):

  ```sh
  npx -y @stoplight/prism-cli@5.16.0 mock -p 4010 specs/demo-api.yaml
  ```

Nothing below was run against a live Theneo account in this session (no credentials were used). Command names and flags were verified by running the CLI's `--help` locally; outputs that need an account are marked as such.

## Steps

### Route A: CLI

All commands run from the repository root.

1. Authenticate once. The token is stored in a CLI profile (`--profile` selects one; default is `default`).

   ```sh
   npx -y @theneo/cli@0.20.0 login --token "$THENEO_API_KEY"
   ```

   `login --help` also lists `--api-url` and `--app-url` for self-hosted deployments.

2. Create the project from the spec, let the AI fill in only the descriptions that are missing, and publish in one go:

   ```sh
   npx -y @theneo/cli@0.20.0 project create \
     --name parcelio-demo \
     --file specs/demo-api.yaml \
     --generate-description fill \
     --publish
   ```

   Add `--public` to make the published page publicly reachable (private is the default), `--workspace <slug>` to target a non-default workspace, or `--link <url>` instead of `--file` to import from a URL. `--postman-api-key` plus one or more `--postman-collection <id>` imports a Postman collection instead of an OpenAPI file.

3. Find the result. The `project import --help` text documents the URL pattern: `https://app.theneo.io/<workspace-slug>/<project-slug>/<version-slug>`. `theneo project list` prints the slugs.

4. Push an updated spec into the same project and republish:

   ```sh
   npx -y @theneo/cli@0.20.0 project import \
     --project parcelio-demo \
     --file specs/demo-api.yaml \
     --import-type overwrite \
     --publish
   ```

   `--import-type` choices are `endpoints`, `overwrite`, `append`, `merge`, `merge_v2`. `overwrite` replaces the API reference with the file; `merge_v2` with `--description-merge-strategy keep_old` (plus `--keepOldParameterDescription` / `--keepOldSectionDescription` for the older `merge`) preserves descriptions edited by hand in the dashboard. `--generate-description` is available on import too, but only together with `--import-type overwrite`; the CLI README says other import types error when it is passed. `--projectVersion <slug>` targets a specific version; `--tab <slug>` restricts the import to one tab.

5. Preview or publish separately when you do not want `--publish` on the import:

   ```sh
   npx -y @theneo/cli@0.20.0 project preview --project parcelio-demo   # validates the page before publishing
   npx -y @theneo/cli@0.20.0 project publish --project parcelio-demo
   ```

### Route B: Dashboard

1. **Create Project.** In the workspace, click Create Project. The import step offers three sources: upload a file, paste a link, or connect Postman (via API key and collection). Upload `specs/demo-api.yaml`. Theneo's own quickstart words it as: upload your file, paste a link, or connect a Postman collection, and it parses and structures the content automatically (<https://docs.theneo.io/get-started/quickstart>).

   ![step 1](images/step-1.png)
   <!-- MAINTAINER: add screenshot of the Create Project dialog with the three import sources -->

2. **AI descriptions.** Choose one of three modes for the import: **Full** (AI writes descriptions throughout), **Enhance** (AI supplements what is there), or **Off**. For this spec, Enhance is the interesting one: six operations have no description at all and four have one-liners. The CLI uses different names, but the definitions line up: the docs describe Enhance as filling gaps "without modifying existing material" and the CLI README describes `fill` as generating descriptions "only for empty" fields, so Enhance is `fill`; Full ("generates fresh content across all documentation sections") is `overwrite` ("Regenerate all descriptions with AI"); Off is `no_generation` (sources: https://docs.theneo.io/ai-in-theneo/ai-co-pilot-technical-writer and https://github.com/Theneo-Inc/theneo-tools/blob/main/packages/theneo-cli/README.md, 2026-09-02).

   ![step 2](images/step-2.png)
   <!-- MAINTAINER: add screenshot of the AI description mode picker -->

3. **Editor.** The import lands in the editor with one section per tag and one page per operation. `listPackages` is where you can see the AI's work on the operation with neither summary nor description. Hand-edit anything the AI got wrong here; those edits are what `merge_v2 --description-merge-strategy keep_old` protects on the next import.

   ![step 3](images/step-3.png)
   <!-- MAINTAINER: add screenshot of the editor open on listPackages showing the generated description -->

4. **Theme.** Project settings expose logo, colours, fonts, and layout options. Custom CSS is a Growth-plan feature (see Notes).

   ![step 4](images/step-4.png)
   <!-- MAINTAINER: add screenshot of the theme / branding settings -->

5. **Publish.** Publish as **private** (visible to invited users) or **public**. The page URL follows the pattern in Route A step 3.

   ![step 5](images/step-5.png)
   <!-- MAINTAINER: add screenshot of the Publish dialog with the private/public toggle -->

6. **Custom domain.** Under publishing settings, enter the domain (for example `docs.parcelio.example.com`) and create the CNAME record Theneo shows you; TLS certificates are issued automatically. Requires the Business plan or above (see Notes).

   ![step 6](images/step-6.png)
   <!-- MAINTAINER: add screenshot of the custom domain settings with the CNAME target -->

7. **Agent-readable output.** Every published project also serves an `llms.txt` at `/llms.txt` under the project's published base URL (Theneo's own is `https://app.theneo.io/theneo/quickstart/llms.txt`), so LLM crawlers and agents get a plain-text index of the docs. It is generated from the Title, Description, and Slug fields in each page's SEO management settings, includes only published pages that have that metadata, and regenerates on every publish (source: https://docs.theneo.io/ai-in-theneo/llms-txt, 2026-09-02). For an MCP server generated from the same spec, see the Elva walkthrough in [`examples/openapi-to-mcp/elva/`](../../openapi-to-mcp/elva/); that is a separate product from the maintainers and is not part of the Theneo docs project.

   ![step 7](images/step-7.png)
   <!-- MAINTAINER: add screenshot of the published docs with the llms.txt link visible -->

8. **GitHub Sync.** In the project's GitHub Sync settings: click Connect GitHub (a popup installs the Theneo GitHub App), click Install / Configure repositories and pick all or selected repositories, then choose the repository, branch (default `main`), and folder (default `theneo_docs`); one project links to one repo, branch, and folder. It is two-way, one direction at a time: Sync to GitHub writes the project's docs into that folder as a single commit, and a push to the synced branch that touches the folder triggers an import and republish. Whichever direction runs next overwrites, so do not edit both sides between syncs. Note that this syncs the docs folder, not the spec file; keeping the API reference itself in step with `specs/demo-api.yaml` is what the Action in the next section is for (source: https://docs.theneo.io/automation-and-dev-tools/github-sync, 2026-09-02).

   ![step 8](images/step-8.png)
   <!-- MAINTAINER: add screenshot of the GitHub Sync settings -->

## Expected output

Observed 2026-09-01 by running the CLI locally without logging in. Top-level help:

```
$ npx -y @theneo/cli@0.20.0 --help
Usage: theneo [options] [command]

A CLI for the Theneo application

Options:
  -v, --version       Output the current version of the CLI
  -h, --help          display help for command

Commands:
  login [options]     Login in theneo cli
  project <action>    Project related commands
  workspace <action>  Workspace related commands
  export [options]
  version <action>    Project version related commands
  help [command]      display help for command
```

`project create --help` (this is the source for the flag names in Route A):

```
Usage: theneo project create [options]

Create new project

Options:
  --name <name>                                  Project name
  --workspace <workspace-slug>                   Enter workspace slug where the project should be created in, if not present uses default workspace
  -f, --file <file>                              API file path to import (eg: docs/openapi.yml)
  --link <link>                                  API file URL to create project using it
  --postman-api-key <postman-api-key>            Postman API Key (env: THENEO_POSTMAN_API_KEY)
  --postman-collection <postman-collection>      Postman collection id, you can use multiple times
  --empty                                        Creates empty project (default: false)
  --sample                                       Creates project with sample template (default: false)
  --publish                                      Publish the project after creation (default: false)
  --public                                       Make published documentation to be publicly accessible. Private by default (default: false)
  --generate-description <generate-description>  Indicates if AI should be used for description generation (choices: "fill", "overwrite", "no_generation", default: "no_generation")
  --profile <string>                             Use a specific profile from your config file.
  -h, --help                                     display help for command
```

`project import --help` (trimmed to the options used above):

```
Usage: theneo project import [options]

Import updated documentation into Theneo using file, link or postman collection

Note: Published document link has this pattern:
https://app.theneo.io/<workspace-slug>/<project-slug>/<version-slug>

Options:
  --project <project-slug>                       Specify the project slug to import updated documentation in
  -f, --file <file>                              API file path to import (eg: docs/openapi.yml)
  --import-type <import-type>                    Indicates how should the new api spec be imported (choices: "endpoints", "overwrite", "append", "merge", "merge_v2")
  --description-merge-strategy <strategy>        For merge_v2: keep_new (prefer new spec descriptions) or keep_old (preserve existing) (choices: "keep_new", "keep_old", default: "keep_new")
  --publish                                      Automatically publish the project (default: false)
  --projectVersion <version-slug>                Project version slug to import to, if not provided then default version will be used
  --generate-description <generate-description>  Indicates if AI should be used for description generation (choices: "fill", "overwrite", "no_generation", default: "no_generation")
  --tab <tab-slug>                               Import into specific tab only (optional)
```

Any project command without a stored token:

```
$ npx -y @theneo/cli@0.20.0 project list
need to authorize first, please run `theneo login` command
```

Output of `project create` and `project import` against a real workspace: not captured in this run (requires an API key). [MEASURE: wall-clock time from `project create` to the published URL responding, with `--generate-description fill`.]

## Keeping docs in sync with the spec

Three options, in order of how much they depend on your CI:

1. **GitHub Action.** `theneo-docs-sync.yml` in this folder is a complete workflow; copy it to `.github/workflows/`. Action name and inputs were taken from the Marketplace listing on 2026-09-01 (<https://github.com/marketplace/actions/theneo-api-documentation>, source repo <https://github.com/Theneo-Inc/api-documentation>, latest release 1.8.0):

   ```yaml
   - uses: Theneo-Inc/api-documentation@1.8.0
     with:
       FILE_PATH: specs/demo-api.yaml            # required
       PROJECT_SLUG: parcelio-demo               # required
       SECRET: ${{ secrets.THENEO_SECRET }}      # required; the API key
       IMPORT_OPTION: overwrite                  # optional: overwrite (default) | merge | endpoints | append
       AUTO_PUBLISH: true                        # optional, default false
       # WORKSPACE_SLUG, VERSION_SLUG            # optional targeting
       # INCLUDE_GITHUB_METADATA: true           # optional, shows the GitHub actor in the editor
       # SECTION_DESCRIPTION_MERGE_STRATEGY / PARAMETER_DESCRIPTION_MERGE_STRATEGY: keep_new | keep_old
   ```

   Store the key as the repository secret `THENEO_SECRET`. Trigger on `paths: ['specs/demo-api.yaml']` so unrelated pushes do not re-import. With `IMPORT_OPTION: overwrite`, every run replaces the reference with the file, so hand edits in the editor are lost; use `merge` with the `keep_old` strategies if the editor is a source of truth too.

2. **CLI in any CI.** The same `project import ... --publish` from Route A step 4 with `THENEO_API_KEY` injected as a secret, for GitLab, Jenkins, or anything that is not GitHub Actions. Run `theneo login --token "$THENEO_API_KEY"` first in the job.

3. **GitHub Sync** from the dashboard (Route B step 8), which watches the repository itself and needs no workflow file.

Whichever you pick, the spec in git stays the source of truth for structure; the question is only what happens to descriptions edited in Theneo, which is what the merge strategies decide.

## Notes

What worked cleanly: the CLI installs and runs under Node 22 via `npx` with no native dependencies, help output is complete enough to write this walkthrough from, and it refuses politely without a token. The Marketplace action's inputs match the CLI's import options one to one, so switching between the two is mechanical.

What needed hand-editing: nothing in this folder, since nothing was run against an account. The things a maintainer with a key should do next: run Route A, capture the create/import output into Expected output, take the eight screenshots, and check the special cases listed below on the live project.

**`--generate-description fill` versus `overwrite` on this spec.** `fill` generates text only where the field is empty. At the operation level on `demo-api.yaml` that means exactly the six operations with no description, `dispatchShipment`, `listPackages`, `removePackage`, `tracking_event_ingest`, `cancelPickup`, and `testWebhookSubscription`, get AI-written descriptions (and `listPackages`, the one with no summary either, is the only place a generated title can appear). The four thin descriptions, `Update shipment.`, `Get package.`, `Returns a carrier.`, and `Get a webhook.`, are non-empty, so `fill` leaves them exactly as they are; the nineteen good descriptions are untouched. `overwrite` regenerates all twenty-nine, which fixes the four thin ones at the cost of replacing the nineteen hand-written ones (including the carefully worded `cancelShipment` and `createWebhookSubscription` text). The practical sequence is `fill` first, then either fix the four thin ones by hand in the editor or re-import with `overwrite` and review the diff. `no_generation` (the default) imports the spec as is, defects included, which is what you want when the spec is the only source of truth. `fill` is not limited to operations: the CLI README describes it as generating descriptions "only for empty parameters", and Theneo's AI feature is documented as covering endpoint, parameter, and response descriptions, so expect empty parameter and response descriptions to be filled too (sources: https://github.com/Theneo-Inc/theneo-tools/blob/main/packages/theneo-cli/README.md and https://docs.theneo.io/ai-in-theneo/ai-overview, 2026-09-02). Component schema descriptions are not mentioned in either source.

How Theneo treats the spec's special cases: not observed in this run, because no project was created. Each item below is what to check when the screenshots are taken:

- **Missing summary on `listPackages`:** with `no_generation`, what title does the page get, operationId or path?
- **OAuth2 scopes:** whether each write operation lists its required scope(s) and the flow URLs, and how the Try It console asks for the bearer token.
- **Multipart upload (`uploadShipmentDocument`):** whether the Try It console offers a file picker for `file` and whether the `encoding.file.contentType` list is displayed.
- **Binary label response (`getShipmentLabel`):** how the `application/pdf` / `image/png` `200` body is shown and whether Try It can download it.
- **OpenAPI 3.1 `webhooks`:** whether `shipmentStatusChanged` gets its own section, and whether the global `security` requirement is (wrongly) applied to it, as both Redoc and Elements do in the sibling walkthroughs ([`../redoc/`](../redoc/), [`../stoplight/`](../stoplight/)).

**One honest limitation.** Custom domains are not available on the free Starter plan. The pricing page (<https://www.theneo.io/pricing>, fetched 2026-09-01) lists "Custom domain" under Business at $120/month, along with up to 7 projects; Starter is limited to 1 public project, and "Custom CSS" starts at Growth ($400/month). So the step 6 URL `docs.parcelio.example.com` is a paid feature; the free tier publishes under `app.theneo.io/<workspace>/<project>`.

Gotchas: `--key` and `--versionSlug` still appear in `--help` but are marked deprecated; use `--project` and `--projectVersion`. `--import-type overwrite` plus editor edits is the classic way to lose work; decide early whether git or the editor owns descriptions. The Try It console on the published page runs in the reader's browser, so it can reach a local Prism mock on `127.0.0.1:4010` only for the person running it; everyone else sees the fictional production server.
