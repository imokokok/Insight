# Insight Oracle Data Analytics Platform - API Reference

Complete API documentation for the Insight Oracle Data Analytics Platform. All endpoints require authentication via Bearer token unless otherwise noted.

## Table of Contents

- [Authentication](#authentication)
- [Oracle Endpoints](#oracle-endpoints)
- [Alerts Endpoints](#alerts-endpoints)
- [Favorites Endpoints](#favorites-endpoints)
- [Snapshots Endpoints](#snapshots-endpoints)
- [Authentication Endpoints](#authentication-endpoints)
- [Cron Endpoints](#cron-endpoints)
- [Error Codes](#error-codes)
- [Rate Limiting](#rate-limiting)
- [Caching](#caching)

---

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <your_access_token>
```

Tokens are obtained through the OAuth authentication flow via `/api/auth/callback`.

---

## Oracle Endpoints

### GET /api/oracles

Retrieve current price or historical prices from oracle providers.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider` | string | Yes | Oracle provider name |
| `symbol` | string | Yes | Trading pair symbol (e.g., "BTC/USD") |
| `chain` | string | No | Blockchain network |
| `period` | number | No | Historical period in days (positive integer) |

**Supported Providers:**

| Provider | Value | Description |
|----------|-------|-------------|
| Chainlink | `chainlink` | Decentralized oracle network |
| Band Protocol | `band-protocol` | Cross-chain data oracle |
| UMA | `uma` | Optimistic oracle |
| Pyth | `pyth` | High-frequency data oracle |
| API3 | `api3` | First-party oracle solution |

**Supported Chains:**

| Chain | Value |
|-------|-------|
| Ethereum | `ethereum` |
| Arbitrum | `arbitrum` |
| Optimism | `optimism` |
| Polygon | `polygon` |
| Solana | `solana` |
| Avalanche | `avalanche` |
| Fantom | `fantom` |
| BNB Chain | `bnb-chain` |
| Base | `base` |
| Scroll | `scroll` |
| zkSync | `zksync` |
| Aptos | `aptos` |
| Sui | `sui` |
| Gnosis | `gnosis` |
| Mantle | `mantle` |
| Linea | `linea` |
| Cosmos | `cosmos` |
| Osmosis | `osmosis` |
| Injective | `injective` |
| Sei | `sei` |

**Response (Current Price):**

```json
{
  "provider": "chainlink",
  "symbol": "BTC/USD",
  "chain": "ethereum",
  "data": {
    "provider": "chainlink",
    "symbol": "BTC/USD",
    "chain": "ethereum",
    "price": 67432.15,
    "timestamp": 1710374400000,
    "decimals": 8,
    "confidence": 0.98,
    "source": "aggregated"
  },
  "timestamp": 1710374400000,
  "source": "fresh"
}
```

**Response (Historical Prices):**

```json
{
  "provider": "chainlink",
  "symbol": "BTC/USD",
  "chain": "ethereum",
  "period": 7,
  "data": [
    {
      "provider": "chainlink",
      "symbol": "BTC/USD",
      "chain": "ethereum",
      "price": 67432.15,
      "timestamp": 1710374400000,
      "decimals": 8,
      "confidence": 0.98
    }
  ],
  "count": 168,
  "timestamp": 1710374400000,
  "source": "cache"
}
```

**Example Request:**

```bash
curl -X GET "https://api.insight.example.com/api/oracles?provider=chainlink&symbol=BTC/USD&chain=ethereum" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Request (Historical):**

```bash
curl -X GET "https://api.insight.example.com/api/oracles?provider=chainlink&symbol=BTC/USD&period=7" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### GET /api/oracles/[provider]

Alternative endpoint to retrieve prices using provider in the URL path.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider` | string | Yes | Oracle provider name (in URL path) |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `symbol` | string | Yes | Trading pair symbol |
| `chain` | string | No | Blockchain network |
| `period` | number | No | Historical period in days |

**Example Request:**

```bash
curl -X GET "https://api.insight.example.com/api/oracles/chainlink?symbol=BTC/USD&chain=ethereum" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### POST /api/oracles

Batch request for multiple prices in a single API call.

**Request Body:**

```json
{
  "requests": [
    {
      "provider": "chainlink",
      "symbol": "BTC/USD",
      "chain": "ethereum"
    },
    {
      "provider": "band-protocol",
      "symbol": "ETH/USD",
      "chain": "polygon"
    }
  ]
}
```

**Response:**

```json
{
  "timestamp": 1710374400000,
  "results": [
    {
      "request": {
        "provider": "chainlink",
        "symbol": "BTC/USD",
        "chain": "ethereum"
      },
      "status": "fulfilled",
      "data": {
        "provider": "chainlink",
        "symbol": "BTC/USD",
        "chain": "ethereum",
        "price": 67432.15,
        "timestamp": 1710374400000,
        "decimals": 8
      },
      "source": "fresh",
      "error": null
    },
    {
      "request": {
        "provider": "band-protocol",
        "symbol": "ETH/USD",
        "chain": "polygon"
      },
      "status": "rejected",
      "data": null,
      "source": null,
      "error": "Failed to fetch price from band-protocol"
    }
  ]
}
```

**Example Request:**

```bash
curl -X POST "https://api.insight.example.com/api/oracles" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "requests": [
      {"provider": "chainlink", "symbol": "BTC/USD"},
      {"provider": "api3", "symbol": "ETH/USD"}
    ]
  }'
```

---

## Alerts Endpoints

### GET /api/alerts

Retrieve all alerts for the authenticated user.

**Response:**

```json
{
  "alerts": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "user-uuid",
      "symbol": "BTC/USD",
      "provider": "chainlink",
      "chain": "ethereum",
      "condition_type": "above",
      "target_value": 70000,
      "is_active": true,
      "last_triggered_at": null,
      "created_at": "2024-03-14T10:00:00Z",
      "updated_at": "2024-03-14T10:00:00Z"
    }
  ],
  "count": 1
}
```

**Example Request:**

```bash
curl -X GET "https://api.insight.example.com/api/alerts" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### POST /api/alerts

Create a new price alert.

**Request Body:**

```json
{
  "name": "BTC Above 70k",
  "symbol": "BTC/USD",
  "chain": "ethereum",
  "condition_type": "above",
  "target_value": 70000,
  "provider": "chainlink",
  "is_active": true
}
```

**Condition Types:**

| Type | Description |
|------|-------------|
| `above` | Alert when price goes above target |
| `below` | Alert when price goes below target |
| `change_percent` | Alert when price changes by percentage |

**Response:**

```json
{
  "alert": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "user-uuid",
    "symbol": "BTC/USD",
    "provider": "chainlink",
    "chain": "ethereum",
    "condition_type": "above",
    "target_value": 70000,
    "is_active": true,
    "last_triggered_at": null,
    "created_at": "2024-03-14T10:00:00Z",
    "updated_at": "2024-03-14T10:00:00Z"
  },
  "message": "Alert created successfully"
}
```

**Example Request:**

```bash
curl -X POST "https://api.insight.example.com/api/alerts" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "BTC Above 70k",
    "symbol": "BTC/USD",
    "condition_type": "above",
    "target_value": 70000
  }'
```

---

### GET /api/alerts/[id]

Retrieve a specific alert by ID.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Alert UUID |

**Response:**

```json
{
  "alert": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "user-uuid",
    "symbol": "BTC/USD",
    "provider": "chainlink",
    "chain": "ethereum",
    "condition_type": "above",
    "target_value": 70000,
    "is_active": true,
    "last_triggered_at": null,
    "created_at": "2024-03-14T10:00:00Z",
    "updated_at": "2024-03-14T10:00:00Z"
  }
}
```

**Example Request:**

```bash
curl -X GET "https://api.insight.example.com/api/alerts/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### PUT /api/alerts/[id]

Update an existing alert.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Alert UUID |

**Request Body (all fields optional):**

```json
{
  "name": "BTC Above 75k",
  "target_value": 75000,
  "is_active": false
}
```

**Response:**

```json
{
  "alert": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "user-uuid",
    "symbol": "BTC/USD",
    "provider": "chainlink",
    "chain": "ethereum",
    "condition_type": "above",
    "target_value": 75000,
    "is_active": false,
    "last_triggered_at": null,
    "created_at": "2024-03-14T10:00:00Z",
    "updated_at": "2024-03-14T12:00:00Z"
  },
  "message": "Alert updated successfully"
}
```

**Example Request:**

```bash
curl -X PUT "https://api.insight.example.com/api/alerts/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"target_value": 75000}'
```

---

### DELETE /api/alerts/[id]

Delete an alert.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Alert UUID |

**Response:**

```json
{
  "message": "Alert deleted successfully"
}
```

**Example Request:**

```bash
curl -X DELETE "https://api.insight.example.com/api/alerts/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### GET /api/alerts/events

Retrieve alert events for the authenticated user.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `acknowledged` | boolean | No | Filter by acknowledgment status |
| `limit` | number | No | Limit number of results |

**Response:**

```json
{
  "events": [
    {
      "id": "event-uuid",
      "alert_id": "alert-uuid",
      "user_id": "user-uuid",
      "triggered_at": "2024-03-14T10:00:00Z",
      "price": 70150.50,
      "condition_met": "above",
      "acknowledged": false,
      "acknowledged_at": null
    }
  ],
  "count": 1
}
```

**Example Request:**

```bash
curl -X GET "https://api.insight.example.com/api/alerts/events?acknowledged=false&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### POST /api/alerts/events/[id]/acknowledge

Acknowledge an alert event.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Event UUID |

**Response:**

```json
{
  "event": {
    "id": "event-uuid",
    "alert_id": "alert-uuid",
    "user_id": "user-uuid",
    "triggered_at": "2024-03-14T10:00:00Z",
    "price": 70150.50,
    "condition_met": "above",
    "acknowledged": true,
    "acknowledged_at": "2024-03-14T10:05:00Z"
  },
  "message": "Event acknowledged successfully"
}
```

**Example Request:**

```bash
curl -X POST "https://api.insight.example.com/api/alerts/events/event-uuid/acknowledge" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Favorites Endpoints

### GET /api/favorites

Retrieve all favorites for the authenticated user.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `config_type` | string | No | Filter by configuration type |

**Config Types:**

| Type | Description |
|------|-------------|
| `oracle_config` | Oracle configuration favorites |
| `symbol` | Symbol favorites |
| `chain_config` | Chain configuration favorites |

**Response:**

```json
{
  "favorites": [
    {
      "id": "favorite-uuid",
      "user_id": "user-uuid",
      "name": "My BTC Watchlist",
      "config_type": "oracle_config",
      "config_data": {
        "selectedOracles": ["chainlink", "api3"],
        "symbol": "BTC/USD"
      },
      "created_at": "2024-03-14T10:00:00Z"
    }
  ],
  "count": 1
}
```

**Example Request:**

```bash
curl -X GET "https://api.insight.example.com/api/favorites?config_type=oracle_config" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### POST /api/favorites

Create a new favorite.

**Request Body:**

```json
{
  "name": "My ETH Watchlist",
  "config_type": "oracle_config",
  "config_data": {
    "selectedOracles": ["chainlink", "pyth"],
    "symbol": "ETH/USD"
  }
}
```

**Response:**

```json
{
  "favorite": {
    "id": "favorite-uuid",
    "user_id": "user-uuid",
    "name": "My ETH Watchlist",
    "config_type": "oracle_config",
    "config_data": {
      "selectedOracles": ["chainlink", "pyth"],
      "symbol": "ETH/USD"
    },
    "created_at": "2024-03-14T10:00:00Z"
  },
  "message": "Favorite added successfully"
}
```

**Example Request:**

```bash
curl -X POST "https://api.insight.example.com/api/favorites" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My ETH Watchlist",
    "config_type": "oracle_config",
    "config_data": {"selectedOracles": ["chainlink"], "symbol": "ETH/USD"}
  }'
```

---

### GET /api/favorites/[id]

Retrieve a specific favorite by ID.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Favorite UUID |

**Response:**

```json
{
  "favorite": {
    "id": "favorite-uuid",
    "user_id": "user-uuid",
    "name": "My BTC Watchlist",
    "config_type": "oracle_config",
    "config_data": {
      "selectedOracles": ["chainlink", "api3"],
      "symbol": "BTC/USD"
    },
    "created_at": "2024-03-14T10:00:00Z"
  }
}
```

**Example Request:**

```bash
curl -X GET "https://api.insight.example.com/api/favorites/favorite-uuid" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### PUT /api/favorites/[id]

Update an existing favorite.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Favorite UUID |

**Request Body (all fields optional):**

```json
{
  "name": "Updated Watchlist",
  "config_data": {
    "selectedOracles": ["chainlink", "pyth", "api3"],
    "symbol": "BTC/USD"
  }
}
```

**Response:**

```json
{
  "favorite": {
    "id": "favorite-uuid",
    "user_id": "user-uuid",
    "name": "Updated Watchlist",
    "config_type": "oracle_config",
    "config_data": {
      "selectedOracles": ["chainlink", "pyth", "api3"],
      "symbol": "BTC/USD"
    },
    "created_at": "2024-03-14T10:00:00Z"
  },
  "message": "Favorite updated successfully"
}
```

**Example Request:**

```bash
curl -X PUT "https://api.insight.example.com/api/favorites/favorite-uuid" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Watchlist"}'
```

---

### DELETE /api/favorites/[id]

Delete a favorite.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Favorite UUID |

**Response:**

```json
{
  "message": "Favorite deleted successfully"
}
```

**Example Request:**

```bash
curl -X DELETE "https://api.insight.example.com/api/favorites/favorite-uuid" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Snapshots Endpoints

### GET /api/snapshots

Retrieve all snapshots for the authenticated user.

**Response:**

```json
{
  "snapshots": [
    {
      "id": "snapshot-uuid",
      "user_id": "user-uuid",
      "symbol": "BTC/USD",
      "name": "BTC Price Snapshot",
      "selected_oracles": ["chainlink", "api3", "pyth"],
      "price_data": [
        {
          "provider": "chainlink",
          "symbol": "BTC/USD",
          "price": 67432.15,
          "timestamp": 1710374400000
        }
      ],
      "stats": {
        "avgPrice": 67450.00,
        "weightedAvgPrice": 67445.50,
        "maxPrice": 67480.00,
        "minPrice": 67420.00,
        "priceRange": 60.00,
        "variance": 400.5,
        "standardDeviation": 20.01,
        "standardDeviationPercent": 0.03
      },
      "is_public": false,
      "created_at": "2024-03-14T10:00:00Z",
      "updated_at": "2024-03-14T10:00:00Z"
    }
  ],
  "count": 1
}
```

**Example Request:**

```bash
curl -X GET "https://api.insight.example.com/api/snapshots" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### POST /api/snapshots

Create a new snapshot.

**Request Body:**

```json
{
  "name": "BTC Price Analysis",
  "symbol": "BTC/USD",
  "selected_oracles": ["chainlink", "api3", "pyth"],
  "price_data": [
    {
      "provider": "chainlink",
      "symbol": "BTC/USD",
      "price": 67432.15,
      "timestamp": 1710374400000,
      "confidence": 0.98
    }
  ],
  "stats": {
    "avgPrice": 67450.00,
    "weightedAvgPrice": 67445.50,
    "maxPrice": 67480.00,
    "minPrice": 67420.00,
    "priceRange": 60.00,
    "variance": 400.5,
    "standardDeviation": 20.01,
    "standardDeviationPercent": 0.03
  },
  "is_public": false
}
```

**Response:**

```json
{
  "snapshot": {
    "id": "snapshot-uuid",
    "user_id": "user-uuid",
    "symbol": "BTC/USD",
    "name": "BTC Price Analysis",
    "selected_oracles": ["chainlink", "api3", "pyth"],
    "price_data": [],
    "stats": {},
    "is_public": false,
    "created_at": "2024-03-14T10:00:00Z",
    "updated_at": "2024-03-14T10:00:00Z"
  },
  "message": "Snapshot created successfully"
}
```

**Example Request:**

```bash
curl -X POST "https://api.insight.example.com/api/snapshots" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "BTC Price Analysis",
    "symbol": "BTC/USD",
    "selected_oracles": ["chainlink"],
    "price_data": [],
    "stats": {}
  }'
```

---

### GET /api/snapshots/[id]

Retrieve a specific snapshot by ID.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Snapshot UUID |

**Notes:**

- Public snapshots can be accessed without authentication
- Private snapshots require authentication and ownership

**Response:**

```json
{
  "snapshot": {
    "id": "snapshot-uuid",
    "user_id": "user-uuid",
    "symbol": "BTC/USD",
    "name": "BTC Price Snapshot",
    "selected_oracles": ["chainlink", "api3"],
    "price_data": [],
    "stats": {},
    "is_public": false,
    "created_at": "2024-03-14T10:00:00Z",
    "updated_at": "2024-03-14T10:00:00Z"
  }
}
```

**Example Request:**

```bash
curl -X GET "https://api.insight.example.com/api/snapshots/snapshot-uuid" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### PUT /api/snapshots/[id]

Update an existing snapshot.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Snapshot UUID |

**Request Body (all fields optional):**

```json
{
  "name": "Updated Snapshot Name",
  "is_public": true
}
```

**Response:**

```json
{
  "snapshot": {
    "id": "snapshot-uuid",
    "user_id": "user-uuid",
    "symbol": "BTC/USD",
    "name": "Updated Snapshot Name",
    "selected_oracles": ["chainlink"],
    "price_data": [],
    "stats": {},
    "is_public": true,
    "created_at": "2024-03-14T10:00:00Z",
    "updated_at": "2024-03-14T12:00:00Z"
  },
  "message": "Snapshot updated successfully"
}
```

**Example Request:**

```bash
curl -X PUT "https://api.insight.example.com/api/snapshots/snapshot-uuid" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Snapshot Name"}'
```

---

### DELETE /api/snapshots/[id]

Delete a snapshot.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Snapshot UUID |

**Response:**

```json
{
  "message": "Snapshot deleted successfully"
}
```

**Example Request:**

```bash
curl -X DELETE "https://api.insight.example.com/api/snapshots/snapshot-uuid" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### POST /api/snapshots/[id]/share

Share a snapshot publicly.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Snapshot UUID |

**Response:**

```json
{
  "message": "Snapshot shared successfully",
  "share_url": "https://insight.example.com/snapshots/snapshot-uuid",
  "snapshot": {
    "id": "snapshot-uuid",
    "user_id": "user-uuid",
    "symbol": "BTC/USD",
    "name": "Shared Snapshot",
    "selected_oracles": ["chainlink"],
    "price_data": [],
    "stats": {},
    "is_public": true,
    "created_at": "2024-03-14T10:00:00Z",
    "updated_at": "2024-03-14T12:00:00Z"
  }
}
```

**Example Request:**

```bash
curl -X POST "https://api.insight.example.com/api/snapshots/snapshot-uuid/share" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Authentication Endpoints

### GET /api/auth/callback

OAuth callback handler for authentication providers.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | Yes | OAuth authorization code |
| `state` | string | No | Redirect path after authentication |
| `error` | string | No | OAuth error code |
| `error_description` | string | No | OAuth error description |

**Response:**

Redirects to the application with authentication cookies set:
- `sb-access-token`: Session access token
- `sb-refresh-token`: Session refresh token

**Error Redirects:**

- `/auth/error?error=missing_code` - No authorization code provided
- `/auth/error?error=auth_failed` - Failed to exchange code for session
- `/auth/error?error=server_error` - Server configuration error

---

### GET /api/auth/profile

Retrieve the authenticated user's profile.

**Response:**

```json
{
  "profile": {
    "id": "user-uuid",
    "display_name": "John Doe",
    "preferences": {
      "default_oracle": "chainlink",
      "default_symbol": "BTC/USD",
      "theme": "system"
    },
    "notification_settings": {
      "email_alerts": true,
      "push_notifications": false,
      "alert_frequency": "immediate"
    },
    "created_at": "2024-03-14T10:00:00Z",
    "updated_at": "2024-03-14T10:00:00Z"
  }
}
```

**Example Request:**

```bash
curl -X GET "https://api.insight.example.com/api/auth/profile" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### PUT /api/auth/profile

Update the authenticated user's profile.

**Request Body:**

```json
{
  "display_name": "Jane Doe",
  "preferences": {
    "default_oracle": "api3",
    "default_symbol": "ETH/USD",
    "theme": "dark",
    "chart_settings": {
      "show_confidence_interval": true,
      "auto_refresh": true,
      "refresh_interval": 30000
    }
  }
}
```

**Response:**

```json
{
  "profile": {
    "id": "user-uuid",
    "display_name": "Jane Doe",
    "preferences": {
      "default_oracle": "api3",
      "default_symbol": "ETH/USD",
      "theme": "dark"
    },
    "created_at": "2024-03-14T10:00:00Z",
    "updated_at": "2024-03-14T12:00:00Z"
  },
  "message": "Profile updated successfully"
}
```

**Example Request:**

```bash
curl -X PUT "https://api.insight.example.com/api/auth/profile" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"display_name": "Jane Doe"}'
```

---

## Cron Endpoints

### GET /api/cron/cleanup

Cleanup expired price records from the database.

**Authentication:**

Requires `CRON_SECRET` in Authorization header:
```
Authorization: Bearer <CRON_SECRET>
```

**Response:**

```json
{
  "success": true,
  "deletedCount": 1500,
  "timestamp": "2024-03-14T00:00:00.000Z"
}
```

**Example Request:**

```bash
curl -X GET "https://api.insight.example.com/api/cron/cleanup" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

### POST /api/cron/cleanup

Alternative POST method for cleanup endpoint (same functionality as GET).

---

## Error Codes

All error responses follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "retryable": true
  }
}
```

### Error Code Reference

| Code | HTTP Status | Description | Retryable |
|------|-------------|-------------|-----------|
| `MISSING_PARAMS` | 400 | Required parameters missing | No |
| `INVALID_PARAMS` | 400 | Invalid parameter value | No |
| `INVALID_PROVIDER` | 400 | Unknown oracle provider | No |
| `BAD_REQUEST` | 400 | Malformed request body | No |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication | No |
| `FORBIDDEN` | 403 | Insufficient permissions | No |
| `NOT_FOUND` | 404 | Resource not found | No |
| `CLIENT_NOT_FOUND` | 500 | Oracle client initialization failed | No |
| `ORACLE_FETCH_FAILED` | 500 | Failed to fetch data from oracle | Yes |
| `BATCH_REQUEST_FAILED` | 500 | Batch request processing failed | Yes |
| `INTERNAL_ERROR` | 500 | Unexpected server error | Yes |

### Error Response Examples

**Missing Parameters:**

```json
{
  "error": {
    "code": "MISSING_PARAMS",
    "message": "Missing required parameters: provider, symbol",
    "retryable": false
  }
}
```

**Invalid Provider:**

```json
{
  "error": {
    "code": "INVALID_PROVIDER",
    "message": "Invalid provider: invalid-oracle. Valid providers: chainlink, band-protocol, uma, pyth, api3",
    "retryable": false
  }
}
```

**Unauthorized:**

```json
{
  "error": "Unauthorized"
}
```

**Not Found:**

```json
{
  "error": "Alert not found"
}
```

---

## Rate Limiting

API endpoints are rate-limited to ensure fair usage:

| Endpoint Type | Rate Limit | Window |
|---------------|------------|--------|
| Price queries | 100 requests | 1 minute |
| Batch requests | 20 requests | 1 minute |
| User operations | 60 requests | 1 minute |
| Cron endpoints | 10 requests | 1 minute |

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1710374460
```

---

## Caching

Oracle price data is cached for performance:

| Data Type | Cache Duration | Stale-While-Revalidate |
|-----------|----------------|------------------------|
| Current Price | 30 seconds | 60 seconds |
| Historical Prices | 5 minutes | 10 minutes |

Cache headers are included in responses:

```
Cache-Control: public, s-maxage=30, stale-while-revalidate=60
```

The `source` field in responses indicates data origin:

| Source | Description |
|--------|-------------|
| `fresh` | Data fetched directly from oracle |
| `cache` | Data served from cache |

---

## Data Types

### PriceData

```typescript
interface PriceData {
  provider: OracleProvider;
  symbol: string;
  chain?: Blockchain;
  price: number;
  timestamp: number;
  decimals: number;
  confidence?: number;
  source?: string;
  change?: number;
  confidenceInterval?: ConfidenceInterval;
  change24h?: number;
  change24hPercent?: number;
}
```

### SnapshotStats

```typescript
interface SnapshotStats {
  avgPrice: number;
  weightedAvgPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  variance: number;
  standardDeviation: number;
  standardDeviationPercent: number;
}
```

### UserPreferences

```typescript
interface UserPreferences {
  default_oracle?: string;
  default_symbol?: string;
  default_chain?: string;
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  chart_settings?: {
    show_confidence_interval?: boolean;
    auto_refresh?: boolean;
    refresh_interval?: number;
  };
}
```

---

## Versioning

The API is versioned through the URL path. The current version is `v1` (implicit in all endpoints).

Breaking changes will be introduced in new versions while maintaining backward compatibility for existing versions.

---

## Support

For API support and questions:

- GitHub Issues: [Project Repository]
- Documentation: [Documentation URL]
- Status Page: [Status URL]
