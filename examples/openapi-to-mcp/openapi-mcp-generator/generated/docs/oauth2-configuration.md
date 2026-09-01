# OAuth2 Configuration

This API uses OAuth2 for authentication. The MCP server can handle OAuth2 authentication in the following ways:

1. **Using a pre-acquired token**: You provide a token you've already obtained
2. **Using client credentials flow**: The server automatically acquires a token using your client ID and secret

## Environment Variables

### OAuth2

Required for operations that create, change, or delete resources.
Tokens expire after one hour; use the refresh token to obtain a new
one.


**Configuration Variables:**

- `OAUTH_CLIENT_ID_OAUTH2`: Your OAuth client ID
- `OAUTH_CLIENT_SECRET_OAUTH2`: Your OAuth client secret
- `OAUTH_TOKEN_OAUTH2`: Pre-acquired OAuth token (required for authorization code flow)

**Authorization Code Flow:**

- Authorization URL: `https://auth.parcelio.example.com/oauth/authorize`
- Token URL: `https://auth.parcelio.example.com/oauth/token`

**Available Scopes:**

- `shipments:read`: Read shipments, packages, and tracking events.
- `shipments:write`: Create, update, dispatch, and cancel shipments, packages, and pickups.
- `tracking:write`: Push carrier tracking events (carrier integrations only).
- `webhooks:manage`: Create, test, and delete webhook subscriptions.

## Token Caching

The MCP server automatically caches OAuth tokens obtained via client credentials flow. Tokens are cached for their lifetime (as specified by the `expires_in` parameter in the token response) minus 60 seconds as a safety margin.

When making API requests, the server will:
1. Check for a cached token that's still valid
2. Use the cached token if available
3. Request a new token if no valid cached token exists
