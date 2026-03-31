# Insight Oracle Data Analytics Platform - API Reference

Complete API documentation for the Insight Oracle Data Analytics Platform. All endpoints require authentication via Bearer token unless otherwise noted.

## Table of Contents

- [Authentication](#authentication)
- [Oracle Endpoints](#oracle-endpoints)
- [Alerts Endpoints](#alerts-endpoints)
- [Favorites Endpoints](#favorites-endpoints)
- [Snapshots Endpoints](#snapshots-endpoints)
- [Authentication Endpoints](#authentication-endpoints)
- [Health Endpoints](#health-endpoints)
- [Cron Endpoints](#cron-endpoints)
- [Error Codes](#error-codes)
- [Rate Limiting](#rate-limiting)
- [Caching](#caching)
- [API Versioning](#api-versioning)

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

| Parameter  | Type   | Required | Description                                  |
| ---------- | ------ | -------- | -------------------------------------------- |
| `provider` | string | Yes      | Oracle provider name                         |
| `symbol`   | string | Yes      | Trading pair symbol (e.g., "BTC/USD")        |
| `chain`    | string | No       | Blockchain network                           |
| `period`   | number | No       | Historical period in days (positive integer) |

**Supported Providers:**

| Provider      | Value           | Description                  |
| ------------- | --------------- | ---------------------------- |
| Chainlink     | `chainlink`     | Decentralized oracle network |
| Band Protocol | `band-protocol` | Cross-chain data oracle      |
| UMA           | `uma`           | Optimistic oracle            |
| Pyth          | `pyth`          | High-frequency data oracle   |
| API3          | `api3`          | First-party oracle solution  |

**Supported Chains:**

| Chain     | Value       |
| --------- | ----------- |
| Ethereum  | `ethereum`  |
| Arbitrum  | `arbitrum`  |
| Optimism  | `optimism`  |
| Polygon   | `polygon`   |
| Solana    | `solana`    |
| Avalanche | `avalanche` |
| Fantom    | `fantom`    |
| BNB Chain | `bnb-chain` |
| Base      | `base`      |
| Scroll    | `scroll`    |
| zkSync    | `zksync`    |
| Aptos     | `aptos`     |
| Sui       | `sui`       |
| Gnosis    | `gnosis`    |
| Mantle    | `mantle`    |
| Linea     | `linea`     |
| Cosmos    | `cosmos`    |
| Osmosis   | `osmosis`   |
| Injective | `injective` |
| Sei       | `sei`       |

**Response (Current Price):**

```json
{
  "success": true,
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
  "meta": {
    "timestamp": 1710374400000
  },
  "source": "fresh"
}
```

**Response (Historical Prices):**

```json
{
  "success": true,
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
  "meta": {
    "timestamp": 1710374400000
  },
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

| Parameter  | Type   | Required | Description                        |
| ---------- | ------ | -------- | ---------------------------------- |
| `provider` | string | Yes      | Oracle provider name (in URL path) |

**Query Parameters:**

| Parameter | Type   | Required | Description               |
| --------- | ------ | -------- | ------------------------- |
| `symbol`  | string | Yes      | Trading pair symbol       |
| `chain`   | string | No       | Blockchain network        |
| `period`  | number | No       | Historical period in days |

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
  "success": true,
  "data": {
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
  },
  "meta": {
    "timestamp": 1710374400000
  }
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
  "success": true,
  "data": [
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
  "meta": {
    "timestamp": 1710374400000
  }
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

| Type             | Description                            |
| ---------------- | -------------------------------------- |
| `above`          | Alert when price goes above target     |
| `below`          | Alert when price goes below target     |
| `change_percent` | Alert when price changes by percentage |

**Response:**

```json
{
  "success": true,
  "data": {
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
  "meta": {
    "timestamp": 1710374400000
  }
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

### POST /api/alerts/batch

Batch operations on multiple alerts (enable, disable, delete).

**Request Body:**

```json
{
  "action": "enable",
  "alertIds": ["550e8400-e29b-41d4-a716-446655440000", "660e8400-e29b-41d4-a716-446655440001"]
}
```

**Actions:**

| Action    | Description                     |
| --------- | ------------------------------- |
| `enable`  | Activate the specified alerts   |
| `disable` | Deactivate the specified alerts |
| `delete`  | Delete the specified alerts     |

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Batch enable completed",
    "results": {
      "processed": 2,
      "succeeded": 2,
      "failed": 0,
      "successIds": [
        "550e8400-e29b-41d4-a716-446655440000",
        "660e8400-e29b-41d4-a716-446655440001"
      ],
      "failedIds": []
    }
  },
  "meta": {
    "timestamp": 1710374400000
  }
}
```

**Example Request:**

```bash
curl -X POST "https://api.insight.example.com/api/alerts/batch" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "disable",
    "alertIds": ["550e8400-e29b-41d4-a716-446655440000"]
  }'
```

---

### GET /api/alerts/[id]

Retrieve a specific alert by ID.

**Path Parameters:**

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| `id`      | string | Yes      | Alert UUID  |

**Response:**

```json
{
  "success": true,
  "data": {
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
  "meta": {
    "timestamp": 1710374400000
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

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| `id`      | string | Yes      | Alert UUID  |

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
  "success": true,
  "data": {
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
  "meta": {
    "timestamp": 1710374400000
  }
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

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| `id`      | string | Yes      | Alert UUID  |

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Alert deleted successfully"
  },
  "meta": {
    "timestamp": 1710374400000
  }
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

| Parameter      | Type    | Required | Description                     |
| -------------- | ------- | -------- | ------------------------------- |
| `acknowledged` | boolean | No       | Filter by acknowledgment status |
| `limit`        | number  | No       | Limit number of results         |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "event-uuid",
      "alert_id": "alert-uuid",
      "user_id": "user-uuid",
      "triggered_at": "2024-03-14T10:00:00Z",
      "price": 70150.5,
      "condition_met": "above",
      "acknowledged": false,
      "acknowledged_at": null
    }
  ],
  "meta": {
    "timestamp": 1710374400000
  }
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

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| `id`      | string | Yes      | Event UUID  |

**Response:**

```json
{
  "success": true,
  "data": {
    "event": {
      "id": "event-uuid",
      "alert_id": "alert-uuid",
      "user_id": "user-uuid",
      "triggered_at": "2024-03-14T10:00:00Z",
      "price": 70150.5,
      "condition_met": "above",
      "acknowledged": true,
      "acknowledged_at": "2024-03-14T10:05:00Z"
    }
  },
  "meta": {
    "timestamp": 1710374400000
  }
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

| Parameter     | Type   | Required | Description                  |
| ------------- | ------ | -------- | ---------------------------- |
| `config_type` | string | No       | Filter by configuration type |

**Config Types:**

| Type            | Description                    |
| --------------- | ------------------------------ |
| `oracle_config` | Oracle configuration favorites |
| `symbol`        | Symbol favorites               |
| `chain_config`  | Chain configuration favorites  |

**Response:**

```json
{
  "success": true,
  "data": [
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
  "meta": {
    "timestamp": 1710374400000
  }
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
  "success": true,
  "data": {
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
  "meta": {
    "timestamp": 1710374400000
  }
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

| Parameter | Type   | Required | Description   |
| --------- | ------ | -------- | ------------- |
| `id`      | string | Yes      | Favorite UUID |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "favorite-uuid",
    "user_id": "user-uuid",
    "name": "My BTC Watchlist",
    "config_type": "oracle_config",
    "config_data": {
      "selectedOracles": ["chainlink", "api3"],
      "symbol": "BTC/USD"
    },
    "created_at": "2024-03-14T10:00:00Z"
  },
  "meta": {
    "timestamp": 1710374400000
  }
}
```

**Example Request:**

```bash
curl -X GET "https://api.insight.example.com/api/favorites/favorite-uuid" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### DELETE /api/favorites/[id]

Delete a favorite.

**Path Parameters:**

| Parameter | Type   | Required | Description   |
| --------- | ------ | -------- | ------------- |
| `id`      | string | Yes      | Favorite UUID |

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Favorite deleted successfully"
  },
  "meta": {
    "timestamp": 1710374400000
  }
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
  "success": true,
  "data": [
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
        "avgPrice": 67450.0,
        "weightedAvgPrice": 67445.5,
        "maxPrice": 67480.0,
        "minPrice": 67420.0,
        "priceRange": 60.0,
        "variance": 400.5,
        "standardDeviation": 20.01,
        "standardDeviationPercent": 0.03
      },
      "is_public": false,
      "created_at": "2024-03-14T10:00:00Z",
      "updated_at": "2024-03-14T10:00:00Z"
    }
  ],
  "meta": {
    "timestamp": 1710374400000
  }
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
    "avgPrice": 67450.0,
    "weightedAvgPrice": 67445.5,
    "maxPrice": 67480.0,
    "minPrice": 67420.0,
    "priceRange": 60.0,
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
  "success": true,
  "data": {
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
  "meta": {
    "timestamp": 1710374400000
  }
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

| Parameter | Type   | Required | Description   |
| --------- | ------ | -------- | ------------- |
| `id`      | string | Yes      | Snapshot UUID |

**Notes:**

- Public snapshots can be accessed without authentication
- Private snapshots require authentication and ownership

**Response:**

```json
{
  "success": true,
  "data": {
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
  },
  "meta": {
    "timestamp": 1710374400000
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

| Parameter | Type   | Required | Description   |
| --------- | ------ | -------- | ------------- |
| `id`      | string | Yes      | Snapshot UUID |

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
  "success": true,
  "data": {
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
  "meta": {
    "timestamp": 1710374400000
  }
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

| Parameter | Type   | Required | Description   |
| --------- | ------ | -------- | ------------- |
| `id`      | string | Yes      | Snapshot UUID |

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Snapshot deleted successfully"
  },
  "meta": {
    "timestamp": 1710374400000
  }
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

| Parameter | Type   | Required | Description   |
| --------- | ------ | -------- | ------------- |
| `id`      | string | Yes      | Snapshot UUID |

**Response:**

```json
{
  "success": true,
  "data": {
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
  },
  "meta": {
    "timestamp": 1710374400000
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

| Parameter           | Type   | Required | Description                        |
| ------------------- | ------ | -------- | ---------------------------------- |
| `code`              | string | Yes      | OAuth authorization code           |
| `state`             | string | No       | Redirect path after authentication |
| `error`             | string | No       | OAuth error code                   |
| `error_description` | string | No       | OAuth error description            |

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
  "success": true,
  "data": {
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
  },
  "meta": {
    "timestamp": 1710374400000
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
  "success": true,
  "data": {
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
    }
  },
  "meta": {
    "timestamp": 1710374400000
  }
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

## Health Endpoints

### GET /api/health

Health check endpoint. Does not require authentication.

**Response:**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-03-14T10:00:00.000Z",
    "version": "0.1.0",
    "uptime": 3600.5,
    "checks": {
      "database": {
        "status": "ok",
        "latency": 45
      },
      "memory": {
        "status": "ok",
        "used": 52428800,
        "total": 67108864,
        "percentage": 78.12
      },
      "environment": {
        "status": "ok",
        "nodeEnv": "production",
        "hasRequiredEnvVars": true
      }
    }
  },
  "meta": {
    "timestamp": 1710374400000
  }
}
```

**Status Values:**

| Status      | HTTP Code | Description                |
| ----------- | --------- | -------------------------- |
| `healthy`   | 200       | All systems operational    |
| `degraded`  | 200       | Some systems have warnings |
| `unhealthy` | 503       | Critical systems failing   |

**Health Check Details:**

| Check         | Status Values            | Description               |
| ------------- | ------------------------ | ------------------------- |
| `database`    | `ok`, `error`            | Database connectivity     |
| `memory`      | `ok`, `warning`, `error` | Memory usage levels       |
| `environment` | `ok`, `error`            | Environment configuration |

**Example Request:**

```bash
curl -X GET "https://api.insight.example.com/api/health"
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
  "data": {
    "success": true,
    "deletedCount": 1500,
    "timestamp": "2024-03-14T00:00:00.000Z"
  },
  "meta": {
    "timestamp": 1710374400000
  }
}
```

**Example Request:**

```bash
curl -X GET "https://api.insight.example.com/api/cron/cleanup" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## Error Codes

All error responses follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "retryable": true,
    "details": {},
    "i18nKey": "errors.errorCode"
  },
  "meta": {
    "timestamp": 1710374400000,
    "requestId": "req-uuid"
  }
}
```

### Error Code Reference

| Code                   | HTTP Status | Description                         | Retryable |
| ---------------------- | ----------- | ----------------------------------- | --------- |
| `VALIDATION_ERROR`     | 400         | Request validation failed           | No        |
| `NOT_FOUND`            | 404         | Resource not found                  | No        |
| `AUTHENTICATION_ERROR` | 401         | Missing or invalid authentication   | No        |
| `AUTHORIZATION_ERROR`  | 403         | Insufficient permissions            | No        |
| `CONFLICT`             | 409         | Resource conflict (e.g., duplicate) | No        |
| `RATE_LIMIT_EXCEEDED`  | 429         | Rate limit exceeded                 | Yes       |
| `INTERNAL_ERROR`       | 500         | Unexpected server error             | Yes       |

### Error Response Examples

**Validation Error:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Missing required fields: action, alertIds",
    "retryable": false,
    "details": {
      "field": "alertIds",
      "constraints": {
        "isArray": true,
        "isNotEmpty": true
      }
    },
    "i18nKey": "errors.validation"
  },
  "meta": {
    "timestamp": 1710374400000
  }
}
```

**Not Found:**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Alert not found",
    "retryable": false,
    "details": {
      "resource": "alert",
      "identifier": "550e8400-e29b-41d4-a716-446655440000"
    },
    "i18nKey": "errors.notFound"
  },
  "meta": {
    "timestamp": 1710374400000
  }
}
```

**Unauthorized:**

```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "message": "Unauthorized",
    "retryable": false,
    "details": {
      "reason": "missing_token"
    },
    "i18nKey": "errors.authentication"
  },
  "meta": {
    "timestamp": 1710374400000
  }
}
```

---

## Rate Limiting

API endpoints are rate-limited to ensure fair usage using a sliding window algorithm.

### Rate Limit Presets

| Preset     | Rate Limit   | Window     | Use Case                   |
| ---------- | ------------ | ---------- | -------------------------- |
| `strict`   | 20 requests  | 60 seconds | Sensitive endpoints        |
| `moderate` | 60 requests  | 60 seconds | User operations            |
| `api`      | 100 requests | 60 seconds | Default API endpoints      |
| `lenient`  | 200 requests | 60 seconds | Batch/aggregation requests |

### Default Rate Limits

The default rate limit is **100 requests per 60 seconds** for most API endpoints.

### Rate Limit Headers

All responses include rate limit information in headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1710374460
```

### Rate Limit Exceeded Response

When rate limit is exceeded, the API returns:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later",
    "retryable": true,
    "details": {
      "retryAfter": 30
    },
    "i18nKey": "errors.rateLimit"
  },
  "meta": {
    "timestamp": 1710374400000
  }
}
```

With headers:

```
Retry-After: 30
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1710374460
```

---

## Caching

Oracle price data is cached for performance using a stale-while-revalidate strategy.

### Cache Configuration

| Data Type         | staleTime | gcTime | Description                     |
| ----------------- | --------- | ------ | ------------------------------- |
| Price Data        | 30s       | 60s    | Current price from oracles      |
| Historical Prices | 5min      | 10min  | Historical price data           |
| Alert Data        | 15s       | 30s    | User alerts and events          |
| Airnode Stats     | 60s       | 2min   | API3 Airnode statistics         |
| DAPI Coverage     | 5min      | 10min  | Decentralized API coverage data |
| OHLC Data         | 5min      | 10min  | Open/High/Low/Close candle data |
| Quality History   | 5min      | 10min  | Historical quality metrics      |

### Cache Headers

Responses include cache information:

```
Cache-Control: public, s-maxage=30, stale-while-revalidate=60
```

### Cache Configuration Reference

```typescript
const CACHE_CONFIG = {
  price: {
    staleTime: 30000, // 30 seconds
    gcTime: 60000, // 60 seconds
  },
  historical: {
    staleTime: 300000, // 5 minutes
    gcTime: 600000, // 10 minutes
  },
  alerts: {
    staleTime: 15000, // 15 seconds
    gcTime: 30000, // 30 seconds
  },
  // ... more configurations
};
```

### Data Source Indicator

The `source` field in responses indicates data origin:

| Source  | Description                       |
| ------- | --------------------------------- |
| `fresh` | Data fetched directly from oracle |
| `cache` | Data served from cache            |

---

## API Versioning

The API uses URL-based versioning. The current version is `v1`.

### Version Header

All responses include version information:

```
X-API-Version: v1
```

### Versioned Endpoints

API versions are specified in the URL path:

```
/api/v1/oracles
/api/v1/alerts
```

### Version Deprecation

When a version is deprecated, additional headers are included:

```
X-API-Version: v1
X-API-Deprecated: true
X-API-Deprecation-Date: 2024-12-01T00:00:00.000Z
X-API-Sunset-Date: 2025-06-01T00:00:00.000Z
Link: <https://api.insight.example.com/api/v2>; rel="successor-version"
```

### Supported Versions

| Version | Status  | Deprecation Date |
| ------- | ------- | ---------------- |
| `v1`    | Current | -                |

### Migration

When a version is deprecated:

1. A `Deprecation-Date` header indicates when support will end
2. A `Sunset-Date` header indicates the final date of support
3. A `Link` header with `rel="successor-version"` points to the new version
4. After the sunset date, requests to the deprecated version will return `410 Gone`

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

### ApiSuccessResponse

```typescript
interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    timestamp: number;
    requestId?: string;
    [key: string]: unknown;
  };
}
```

### ApiErrorResponse

```typescript
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    retryable: boolean;
    details?: Record<string, unknown>;
    i18nKey?: string;
  };
  meta?: {
    timestamp: number;
    requestId?: string;
  };
}
```

---

## Support

For API support and questions:

- GitHub Issues: [Project Repository]
- Documentation: [Documentation URL]
- Status Page: [Status URL]
