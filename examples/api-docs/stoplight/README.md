# Stoplight (SmartBear): Platform walkthrough plus the open-source Elements page

**What this shows:** Two routes from `specs/demo-api.yaml` to browsable reference docs with Stoplight: the hosted Stoplight Platform (Studio Web, a Git-linked project, publishing), and the open-source Stoplight Elements web component, which is fully runnable from this folder against the Prism mock.

Stoplight's genuine strength is the design-first loop: a visual OpenAPI editor (Studio Web) sitting on top of the same open-source pieces used elsewhere in this repo, Spectral for linting and Prism for mocking, with hosted docs at the end. Elements is the renderer behind those hosted docs and is the most widely embedded open-source reference UI with a working Try It console.

Folder layout:

| File | Purpose |
|---|---|
| `elements/index.html` | Static page that loads Elements 9.0.25 from unpkg and points it at the shared spec |
| `images/` | Screenshot slots for the hosted steps (`.gitkeep` only) |

## Prerequisites

- Node 22 (tested with v22.23.2). Elements needs no install; the page pulls the pinned bundle from a CDN, so the browser needs internet access to `unpkg.com`.
- For the hosted route: a Stoplight account and workspace (`<workspace>.stoplight.io`). SmartBear owns Stoplight since 2023. Plans on 2026-09-02 (<https://stoplight.io/pricing>): Free at $0 with 1 user and 1 project; Basic $44 per month billed annually with the first 3 users included; Startup $113 per month annually with 8 users included; Pro Team $362 per month annually with 15 users included; Enterprise by quote. Paid plans carry a 14-day trial.
- The Prism mock, started from the repository root (Elements' Try It console sends real HTTP requests, and this is what it will hit):

  ```sh
  npx -y @stoplight/prism-cli@5.16.0 mock -p 4010 specs/demo-api.yaml
  ```

  Prism enforces the spec's security: read operations need an `X-API-Key` header with any value, OAuth2 operations need `Authorization: Bearer <anything>`. Prism also answers CORS preflights (observed response header `Access-Control-Allow-Origin: http://localhost:3000`), which is what makes browser-side Try It possible.

## Steps

### Route A: Stoplight Platform (hosted)

Stoplight Studio, the Electron desktop app, is no longer the path SmartBear points people at. A SmartBear community thread titled "Will stoplight studio continue to be updated?" carries a staff reply (2023-08-16) that long-term support for Studio Desktop is "not currently part of Stoplight's plans", that moving to Studio Web is highly recommended, and that Component Libraries, Style Guides, and Masking cannot be supported in Desktop (<https://community.smartbear.com/discussions/stoplight/will-stoplight-studio-continue-to-be-updated/263631>, read 2026-09-02 through a text proxy because direct fetches return HTTP 403). There have been no Studio desktop releases on GitHub since the acquisition. Everything below uses Studio Web.

Documentation pages referenced: "Add Projects" (<https://docs.stoplight.io/docs/platform/projects/add-projects>), "Work with Files", "Git Overview", "GitHub" (<https://docs.stoplight.io/docs/platform/dhre9np9qe1dc-git-hub>), "Publish Git Projects" (<https://docs.stoplight.io/docs/platform/442228a0e4a74-publish-git-projects>). The docs site is client-rendered; the UI labels below were read from the rendered pages on 2026-09-02.

1. Sign in at `https://<workspace>.stoplight.io`. Create a workspace if you do not have one.

   ![step 1](images/step-1.png)
   <!-- MAINTAINER: add screenshot of the workspace home / Projects list -->

2. Add a project. Stoplight offers two kinds: a **Git project** connected to a repository (GitHub, GitLab, Bitbucket, Azure DevOps; GitHub Enterprise is Pro Team / Enterprise plans only per the docs) and a **web project** that is not tied to a repository, meant for "quick and easy publishing". For this repo pick Git project, authorize the Stoplight GitHub app, and select the repository and default branch.

   ![step 2](images/step-2.png)
   <!-- MAINTAINER: add screenshot of the Add Project dialog with the Git provider picker -->

3. Stoplight indexes the branch by directory. Without a config file it looks for OpenAPI files under `reference/`, Markdown under `docs/`, images under `assets/images/`, and JSON Schema under `models/`, so `specs/demo-api.yaml` is not picked up as is. Add a `.stoplight.json` (JSON or JSONC) at the repository root to point it at `specs/`:

   ```json
   {
     "formats": { "openapi": { "rootDir": "specs" } }
   }
   ```

   `formats.<type>.rootDir` is required per type, `include` takes micromatch globs, `exclude` skips paths, and `editor.lineWidth` sets the YAML wrap width in Studio (source: <https://docs.stoplight.io/docs/platform/a63ea8365060b-configure-projects>). In Studio Web the same file is created from the Add (+) icon under "Stoplight Config", then "Apply Config". Alternatively, for a web project, use the Add (+) icon, choose API, then "Import Existing Files" to upload an OpenAPI YAML or JSON file (or a Postman Collection); "Import File" and "Import Directory" on the same menu take single files and whole directories or zip files (source: <https://docs.stoplight.io/docs/platform/58bf119ddff88-work-with-files>). The docs do not describe importing from a URL.

   ![step 3](images/step-3.png)
   <!-- MAINTAINER: add screenshot of the file tree showing specs/demo-api.yaml detected -->

4. Open the file in Studio Web. The form view shows every operation; `listPackages` appears under its operationId because it has no summary. Any edit made here is a commit on a branch of the connected repo (Studio Web works on branches; see "Branch Management" in the docs). Do not commit changes to `specs/demo-api.yaml` from here; the defects are deliberate.

   ![step 4](images/step-4.png)
   <!-- MAINTAINER: add screenshot of Studio Web with the Packages group expanded -->

5. Publish. Git projects publish a chosen branch; the published docs then follow that branch. When the project is created through the default GitHub integration, Stoplight installs a webhook on the repository, and every push to a branch with publishing enabled republishes the docs, mock servers, and explorer, usually within a few seconds; self-hosted Git servers or custom credentials need the webhook set up by hand (source: <https://docs.stoplight.io/docs/platform/442228a0e4a74-publish-git-projects>). Visibility is set per project from the Share dialog: Public (anonymous visitors), Internal (all workspace members; the default for new projects), or Private (Basic plan and above; only members and guests with direct project access) (source: <https://docs.stoplight.io/docs/platform/be67e532b4b2a-manage-project-access>).

   ![step 5](images/step-5.png)
   <!-- MAINTAINER: add screenshot of the Publish panel -->

6. The published reference lives at `https://<workspace>.stoplight.io/docs/<project>` and renders with the same Elements engine as Route B, so the rendering notes below apply to both.

   ![step 6](images/step-6.png)
   <!-- MAINTAINER: add screenshot of the published docs page for listCarriers -->

### Route B: Stoplight Elements (open source, runnable)

`elements/index.html` is the whole integration:

```html
<script src="https://unpkg.com/@stoplight/elements@9.0.25/web-components.min.js"></script>
<link rel="stylesheet" href="https://unpkg.com/@stoplight/elements@9.0.25/styles.min.css">
...
<elements-api
  apiDescriptionUrl="../../../../specs/demo-api.yaml"
  router="hash"
  layout="sidebar"
></elements-api>
```

Both CDN URLs were checked with `curl -I` on 2026-09-01 and returned HTTP 200 (`text/javascript` and `text/css`). The same paths exist on `https://cdn.jsdelivr.net/npm/@stoplight/elements@9.0.25/...` (also 200) if you prefer that CDN. Attribute names come from the Elements options reference (<https://github.com/stoplightio/elements/blob/main/docs/getting-started/elements/elements-options.md>): `apiDescriptionUrl`, `apiDescriptionDocument`, `router` (`history` default, `hash`, `memory`, `static`), `layout` (`sidebar` default, `responsive`, `stacked`), `hideTryIt`, `hideTryItPanel`, `hideSchemas`, `hideExport`, `hideInternal`, `tryItCorsProxy`, `tryItCredentialsPolicy` (`omit` default, `include`, `same-origin`), `logo`, `basePath`.

1. Start Prism (see Prerequisites) in one terminal.

2. From the repository root, serve the repo as static files:

   ```sh
   npx -y serve@14.2.6 -l 3000 .
   ```

   `serve` 14.2.6 was the `latest` tag on npm on 2026-09-01 (`npm view serve version`).

3. Open <http://localhost:3000/examples/api-docs/stoplight/elements/> (the directory URL; `serve` redirects `.../index.html` to it with a 301).

4. Pick any read operation, for example `Carriers > List carriers`. In the Try It panel on the right, the server dropdown next to the Send button lists both `servers` entries from the spec; choose `Local Prism mock server (see specs/README.md)`. Elements pre-fills `X-API-Key: 123`, which Prism accepts. Click **Send**.

5. For an OAuth2 operation such as `Dispatch shipment`, Elements switches the auth field to `Token: Bearer 123` and adds the `Authorization` header automatically; Prism accepts any bearer value.

## Expected output

Route A: not captured (no account was used in this run). Route B, observed 2026-09-01:

`serve` log after step 3:

```
 INFO  Accepting connections at http://localhost:3000
 HTTP  9/1/2026 10:03:40 PM ::1 GET /examples/api-docs/stoplight/elements/
 HTTP  9/1/2026 10:03:40 PM ::1 Returned 200 in 34 ms
 HTTP  9/1/2026 10:03:40 PM ::1 GET /specs/demo-api.yaml
 HTTP  9/1/2026 10:03:40 PM ::1 Returned 200 in 1 ms
```

The page renders the title `Parcelio Shipments API`, a `v1.4.0` badge, an "API Base URL" box listing both servers, a Security box for the API key, the eight tag groups under ENDPOINTS, a WEBHOOKS group with `Shipment status changed`, and a SCHEMAS group with all 39 component schemas. The browser console showed no errors.

Step 4 (List carriers, sent to the Prism server): the panel shows `200 OK` and the body Prism generated from the schema examples, identical to what `curl` gets for the same request:

```
$ curl -s -H 'X-API-Key: 123' -H 'Accept: application/json, application/problem+json' http://127.0.0.1:4010/carriers
{"data":[{"id":"car_ups","name":"UPS","enabled":true,"countries":["st"],"tracking_url_template":"https://www.ups.com/track?tracknum={tracking_number}"}],"next_cursor":"eyJpZCI6InNocF85ZjNLcUxtMlhhIn0","has_more":true}
```

(`"countries": ["st"]` is Prism filling a two-character string constraint with the first two letters of `string`; that is the mock, not Elements.)

## Keeping docs in sync with the spec

Route A (Platform): a Git project is the sync mechanism. The published docs follow the configured branch, so a merged change to `specs/demo-api.yaml` is the update. The republish is automatic: the Git webhook Stoplight installs on the repository triggers a re-analysis on every push to a branch with publishing enabled, usually within a few seconds (source: <https://docs.stoplight.io/docs/platform/442228a0e4a74-publish-git-projects>). Editing in Studio Web produces commits on a branch, so review happens in your normal pull-request flow, and Spectral rulesets attached as a Stoplight style guide run inside the editor. Nothing else to wire up, and nothing to wire up means nothing you can run in your own CI either.

Route B (Elements): the page fetches the YAML at load time, so it is always as fresh as whatever the static server serves. There is no build step to forget. The CI job is therefore lint plus a copy:

```yaml
# .github/workflows/elements-docs.yml
name: Elements docs
on:
  push:
    branches: [main]
    paths:
      - 'specs/demo-api.yaml'
      - 'examples/api-docs/stoplight/elements/**'
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Lint with Spectral
        run: npx -y @stoplight/spectral-cli@6.16.3 lint specs/demo-api.yaml
      - name: Assemble the static site (same relative layout as the repo)
        run: |
          mkdir -p site/specs site/examples/api-docs/stoplight/elements
          cp specs/demo-api.yaml site/specs/
          cp examples/api-docs/stoplight/elements/index.html site/examples/api-docs/stoplight/elements/
      - uses: actions/upload-artifact@v4
        with:
          name: elements-site
          path: site/
```

Replace the upload step with your static host's deploy action. If the YAML is served from a different origin than the page, that origin must send CORS headers; the Try It console has the same requirement toward the API (hence `tryItCorsProxy`).

## Notes

What worked cleanly: Elements 9.0.25 parsed the OpenAPI 3.1 document without complaint (nullable unions render as `string or null`, `const` renders as `Value: "shipment.status_changed"`, 3.1 `examples` arrays show up as `Example:` chips). Try It against Prism worked on the first attempt because Prism sends permissive CORS headers.

What needed hand-editing: the relative `apiDescriptionUrl`. The page sits four directories below the repo root (`examples/api-docs/stoplight/elements/`), so the path is `../../../../specs/demo-api.yaml`, one level more than a first guess of three. `serve`'s clean-URL redirect (`index.html` to `/`) also cost a minute; open the directory URL. No changes to the spec.

How Elements treats the spec's defects and special cases (observed 2026-09-01 in the local page; the hosted docs use the same renderer):

- **Missing summary on `listPackages`:** the sidebar item and the page heading show the operationId `listPackages`, next to siblings titled `Add a package to a shipment`, `Get package`, `Remove package`. No warning anywhere.
- **Missing descriptions** (`dispatchShipment`, `removePackage`, `tracking_event_ingest`, `cancelPickup`, `testWebhookSubscription`): the page goes straight from the method/URL bar to the `Request` heading. **Thin descriptions** are printed verbatim. Elements has no fallback text and no lint; pair it with Spectral if you want the gap reported.
- **OAuth2 scopes:** a collapsible `Security: OAuth 2.0` box under `Request`. Expanded, it shows the scheme description, `Authorization Code OAuth Flow`, the Authorize, Token, and Refresh URLs, and `Scopes:` listing only the scopes that operation requires (`shipments:write - Create, update, dispatch, and cancel shipments, packages, and pickups.`). The other three scopes are not listed on that operation, which is arguably the right call. The Try It panel switches its auth input to `Token: Bearer 123`.
- **Multipart upload (`uploadShipmentDocument`):** `Body` labelled `multipart/form-data`; `file` is `string` with `required`, `type` shows the five allowed values as chips, `description` shows the length limit. The Try It panel renders a form with `file*`, `type*` (dropdown pre-set to `commercial_invoice`), `description`, and an `Omit description` checkbox. The generated curl uses `--form file=`, `--form type=commercial_invoice`. As with Redoc, the `encoding.file.contentType` list is not displayed.
- **Binary label response (`getShipmentLabel`):** the `200` body has a content-type dropdown (`application/pdf`, `image/png`) and renders as a bare `string` with no example. The generated curl sends `Accept: application/pdf, image/png, application/problem+json`. Sending it through Try It returns whatever Prism produces for a binary schema, which is a placeholder string rather than a PDF.
- **OpenAPI 3.1 `webhooks`:** a separate `WEBHOOKS` sidebar group with an envelope icon and `POST` badge. The page heading is the summary, the method bar shows `POST shipmentStatusChanged` (the map key, since there is no URL), header parameters and body render normally, and the body sample is generated from `ShipmentStatusChangedEvent`. Two quirks: the webhook gets a full Try It panel with a Send button, which has nothing to send to, and it shows `Security: API Key` because the document-level `security` is applied to it. Both are cosmetic; `hideTryItPanel` cannot be set per operation, so live with it or add `security: []` to the webhook in a copy of the spec.
- **`allOf` descriptions:** the `PackageList` response on `listPackages` is captioned `Cursor pagination envelope fields shared by every list response.`, which is the description of the `Pagination` schema being merged in. Elements picks the description from the last `allOf` member that has one. Harmless here, confusing when the merged member's description is about something else.
- The header of every page has an `Export` button offering the original and bundled spec; set `hideExport` if the spec should not be downloadable.

Not covered here: Prism itself (started in Prerequisites, documented elsewhere in this repo) and Spectral rulesets, which are the spec-quality examples' topic.
