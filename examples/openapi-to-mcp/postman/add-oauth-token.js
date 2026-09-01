// Post-processes the converted collection so OAuth2 requests send
// `Authorization: Bearer {{bearerToken}}`. openapi-to-postmanv2 copies the
// OAuth2 flow URLs and scopes into each request's auth block but leaves the
// access token empty, so newman (which never runs an authorization-code
// flow) sends no Authorization header at all and every OAuth2 operation 401s.
//
// Usage: node add-oauth-token.js parcelio.postman_collection.json parcelio.with-token.postman_collection.json
const fs = require("node:fs");
const [, , input, output] = process.argv;
if (!input || !output) {
  console.error("usage: node add-oauth-token.js <in.json> <out.json>");
  process.exit(2);
}
const collection = JSON.parse(fs.readFileSync(input, "utf8"));
let patched = 0;
const walk = (items) => {
  for (const item of items) {
    if (item.item) walk(item.item);
    else if (item.request?.auth?.type === "oauth2") {
      const params = item.request.auth.oauth2;
      if (!params.some((p) => p.key === "accessToken")) {
        params.push({ key: "accessToken", value: "{{bearerToken}}", type: "string" });
        params.push({ key: "addTokenTo", value: "header", type: "string" });
        patched++;
      }
    }
  }
};
walk(collection.item);
fs.writeFileSync(output, JSON.stringify(collection, null, 2) + "\n");
console.log(`patched ${patched} oauth2 requests -> ${output}`);
