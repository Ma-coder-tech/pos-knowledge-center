# V1 API Contract

## Overview

Base path: `/api/v1`

Authentication:
- Bearer token for authenticated web clients
- Tenant isolation enforced on every request
- Merchant-facing endpoints may additionally scope by `audience=merchant`
- Development scaffold currently uses `x-tenant-id` header until auth is implemented

Conventions:
- JSON request/response bodies
- `id` values are UUIDs
- Timestamps are ISO 8601 UTC strings
- Pagination uses `limit` and `cursor`
- Soft-deleted records are excluded by default

Standard error shape:

```json
{
  "error": {
    "code": "validation_error",
    "message": "productId is required",
    "details": {
      "field": "productId"
    },
    "requestId": "f50cb22e-9e8e-441c-9f2a-f6fe3d6f67b4"
  }
}
```

## Auth And Tenant Context

### `POST /tenants`
Bootstrap endpoint for development and initial setup.

Request:

```json
{
  "name": "Demo POS",
  "slug": "demo-pos",
  "timezone": "Africa/Kigali"
}
```

### `GET /tenants`
Returns all tenants. Intended for development bootstrap until auth is added.

### `GET /me`
Returns the signed-in user and current tenant membership.

Response:

```json
{
  "user": {
    "id": "1a1d9b83-cf86-4553-9947-7e44e5ad6ed0",
    "email": "agent@example.com",
    "name": "Support Agent"
  },
  "membership": {
    "tenantId": "db8e5bf7-4605-4bf8-b004-81495e3f9248",
    "role": "support_agent"
  }
}
```

## Setup And Catalog

### `GET /catalog`
Returns the tenant catalog used for content authoring and retrieval filters.

Response:

```json
{
  "products": [],
  "modules": [],
  "deviceModels": [],
  "releaseVersions": [],
  "glossaryTerms": []
}
```

### `POST /products`

Request:

```json
{
  "name": "Kiosk POS",
  "slug": "kiosk-pos",
  "description": "Self-service ordering product"
}
```

Response: `201 Created`

```json
{
  "product": {
    "id": "2a53eb5d-c798-4e0e-8ee7-44d200e89fd3",
    "name": "Kiosk POS",
    "slug": "kiosk-pos",
    "description": "Self-service ordering product",
    "createdAt": "2026-03-12T10:00:00Z"
  }
}
```

### `POST /modules`

Request:

```json
{
  "productId": "2a53eb5d-c798-4e0e-8ee7-44d200e89fd3",
  "name": "Hardware",
  "slug": "hardware",
  "description": "Device setup and troubleshooting"
}
```

### `POST /device-models`

Request:

```json
{
  "productId": "2a53eb5d-c798-4e0e-8ee7-44d200e89fd3",
  "vendor": "Epson",
  "model": "TM-m30III",
  "category": "printer",
  "aliases": ["receipt printer", "kitchen printer"]
}
```

### `POST /release-versions`

Request:

```json
{
  "productId": "2a53eb5d-c798-4e0e-8ee7-44d200e89fd3",
  "version": "4.8.1",
  "channel": "stable",
  "releasedAt": "2026-03-01T00:00:00Z"
}
```

### `POST /glossary-terms`

Request:

```json
{
  "canonicalTerm": "POS terminal",
  "description": "Primary cashier-facing checkout device",
  "aliases": ["register", "station", "till"]
}
```

## Content

### `GET /content`
Filters:
- `status`
- `type`
- `audience`
- `productId`
- `moduleId`
- `deviceModelId`
- `releaseVersionId`
- `cursor`
- `limit`

Response:

```json
{
  "items": [
    {
      "id": "5b060880-93a2-4520-9a5b-aea3dcc64817",
      "type": "article",
      "title": "Printer Setup",
      "status": "published",
      "audience": "merchant",
      "updatedAt": "2026-03-12T10:00:00Z"
    }
  ],
  "nextCursor": null
}
```

### `POST /content`
Creates the metadata shell for a content item and an initial draft version.

Request:

```json
{
  "type": "article",
  "title": "Printer Setup",
  "summary": "How to install and test a receipt printer",
  "audience": "merchant",
  "productIds": ["2a53eb5d-c798-4e0e-8ee7-44d200e89fd3"],
  "moduleIds": ["f9702740-a44f-45a6-b56e-c39d6778e90f"],
  "deviceModelIds": ["0cc29d10-bfdf-4a61-aedc-2d8983254af7"],
  "releaseVersionIds": ["eab0f93c-d93f-4941-b27f-82ae8882dc13"],
  "verticals": ["restaurant"],
  "tags": ["hardware", "setup"]
}
```

Response: `201 Created`

```json
{
  "content": {
    "id": "5b060880-93a2-4520-9a5b-aea3dcc64817",
    "type": "article",
    "status": "draft"
  },
  "version": {
    "id": "63499fe1-7ca5-488f-b98e-d5b3fc8e8025",
    "versionNumber": 1,
    "status": "draft"
  }
}
```

### `GET /content/{contentId}`
Returns the current editable draft for internal users or the latest published version for merchant users.

### `POST /content/{contentId}/versions`
Creates or updates a draft version.

Request:

```json
{
  "title": "Printer Setup",
  "summary": "How to install and test a receipt printer",
  "body": {
    "format": "md",
    "value": "# Printer Setup\n\n1. Plug in the device."
  },
  "changeSummary": "Added setup validation steps"
}
```

Response:

```json
{
  "version": {
    "id": "63499fe1-7ca5-488f-b98e-d5b3fc8e8025",
    "versionNumber": 3,
    "status": "draft",
    "updatedAt": "2026-03-12T10:00:00Z"
  }
}
```

### `POST /content/{contentId}/submit-review`

Request:

```json
{
  "versionId": "63499fe1-7ca5-488f-b98e-d5b3fc8e8025"
}
```

### `POST /content/{contentId}/publish`

Request:

```json
{
  "versionId": "63499fe1-7ca5-488f-b98e-d5b3fc8e8025",
  "publishTarget": "merchant"
}
```

### `POST /content/{contentId}/retire`

Request:

```json
{
  "reason": "Superseded by firmware 5.0 guide"
}
```

## Media

### `POST /media/upload-url`
Returns a presigned URL for direct upload.

Request:

```json
{
  "fileName": "printer-demo.mp4",
  "contentType": "video/mp4",
  "sizeBytes": 10485760
}
```

Response:

```json
{
  "assetId": "3df69808-ff1e-4cc5-a70f-c72bf0f350d0",
  "uploadUrl": "https://storage.example.com/presigned",
  "expiresAt": "2026-03-12T10:15:00Z"
}
```

### `POST /media`
Registers an uploaded asset.

Request:

```json
{
  "assetId": "3df69808-ff1e-4cc5-a70f-c72bf0f350d0",
  "sourceType": "upload",
  "title": "Printer Demo",
  "linkedContentId": "5b060880-93a2-4520-9a5b-aea3dcc64817"
}
```

### `POST /media/import-youtube`

Request:

```json
{
  "url": "https://www.youtube.com/watch?v=example",
  "title": "Printer Recovery Demo",
  "linkedContentId": "5b060880-93a2-4520-9a5b-aea3dcc64817"
}
```

Response:

```json
{
  "importJob": {
    "id": "76ad3aca-e488-430a-b61c-f0331af36d39",
    "status": "queued"
  }
}
```

### `POST /media/recordings`
Creates a recording session.

Request:

```json
{
  "mode": "screen_and_camera",
  "title": "Refund Workflow Demo"
}
```

Response:

```json
{
  "recordingSession": {
    "id": "b1544817-a188-4641-a1ab-e5975dc93c35",
    "uploadTarget": "https://storage.example.com/live-upload"
  }
}
```

### `GET /media/{assetId}`
Returns media metadata, processing status, transcript status, and linked content.

### `GET /media/{assetId}/transcript`

Response:

```json
{
  "segments": [
    {
      "startMs": 0,
      "endMs": 8200,
      "text": "Open the back office and choose hardware."
    }
  ]
}
```

## Troubleshooting Flows

### `GET /flows`
Filters:
- `status`
- `deviceModelId`
- `productId`
- `audience`

### `POST /flows`

Request:

```json
{
  "title": "Receipt Printer Offline",
  "symptom": "Printer does not print receipts",
  "audience": "merchant",
  "productIds": ["2a53eb5d-c798-4e0e-8ee7-44d200e89fd3"],
  "deviceModelIds": ["0cc29d10-bfdf-4a61-aedc-2d8983254af7"]
}
```

### `POST /flows/{flowId}/nodes`

Request:

```json
{
  "nodeType": "step",
  "title": "Check power light",
  "body": "Confirm the printer power LED is on.",
  "voiceText": "Step one. Check that the power light is on."
}
```

### `POST /flows/{flowId}/edges`

Request:

```json
{
  "fromNodeId": "99eb1cb9-0db7-42fe-a08e-12013522bdfe",
  "toNodeId": "c818e095-a0e3-4c56-bf16-09b9754fc4d4",
  "conditionType": "answer_equals",
  "conditionValue": "yes"
}
```

### `POST /flows/{flowId}/publish`

Request:

```json
{
  "publishTarget": "merchant"
}
```

### `POST /flows/{flowId}/run`
Starts a troubleshooting session.

Request:

```json
{
  "deviceModelId": "0cc29d10-bfdf-4a61-aedc-2d8983254af7",
  "mode": "voice"
}
```

Response:

```json
{
  "session": {
    "id": "d34594b4-2247-41a3-84dd-87f85209eab3",
    "currentNode": {
      "id": "99eb1cb9-0db7-42fe-a08e-12013522bdfe",
      "nodeType": "step",
      "title": "Check power light",
      "body": "Confirm the printer power LED is on.",
      "voiceText": "Step one. Check that the power light is on."
    }
  }
}
```

### `POST /flow-sessions/{sessionId}/advance`

Request:

```json
{
  "answer": "yes"
}
```

## Solved Issue Capture

### `POST /solved-issues`

Request:

```json
{
  "sourceType": "ticket",
  "sourceReference": "SUP-1205",
  "title": "Printer stopped printing after network outage",
  "symptom": "Orders complete but no receipt prints",
  "rootCause": "DHCP reassigned printer IP",
  "resolutionSteps": [
    "Print network configuration page",
    "Update printer IP in POS device settings",
    "Restart POS service"
  ],
  "deviceModelIds": ["0cc29d10-bfdf-4a61-aedc-2d8983254af7"],
  "productIds": ["2a53eb5d-c798-4e0e-8ee7-44d200e89fd3"],
  "audienceRecommendation": "internal"
}
```

Response:

```json
{
  "solvedIssue": {
    "id": "52314418-b1df-4d2c-b57d-7cc15871b84e",
    "status": "draft"
  }
}
```

### `POST /solved-issues/{issueId}/generate-draft`
Generates a draft article or flow from the solved issue.

Request:

```json
{
  "targetType": "troubleshooting_flow"
}
```

Response:

```json
{
  "draft": {
    "type": "troubleshooting_flow",
    "linkedFlowId": "2ebf132c-e190-4053-8077-df914263cdff"
  }
}
```

## Search And Chat

### `GET /search`
Query params:
- `q`
- `productId`
- `moduleId`
- `deviceModelId`
- `releaseVersionId`
- `audience`

Response:

```json
{
  "results": [
    {
      "id": "5b060880-93a2-4520-9a5b-aea3dcc64817",
      "type": "article",
      "title": "Printer Setup",
      "snippet": "Confirm the device is online before printing a test receipt.",
      "score": 0.92
    }
  ]
}
```

### `POST /chat/sessions`

Request:

```json
{
  "context": {
    "productId": "2a53eb5d-c798-4e0e-8ee7-44d200e89fd3",
    "deviceModelId": "0cc29d10-bfdf-4a61-aedc-2d8983254af7",
    "releaseVersionId": "eab0f93c-d93f-4941-b27f-82ae8882dc13",
    "audience": "merchant"
  }
}
```

Response:

```json
{
  "session": {
    "id": "4ed12d8d-e0fb-4c7a-b75d-61c37903e67d"
  }
}
```

### `POST /chat/sessions/{sessionId}/messages`

Request:

```json
{
  "message": "My printer is offline and not printing receipts."
}
```

Response:

```json
{
  "answer": {
    "messageId": "2d7a1c64-3972-42b7-b2ac-3fb5c7758bb0",
    "text": "Start by checking whether the printer power light is on. If it is on, confirm the cable is firmly seated.",
    "citations": [
      {
        "contentId": "5b060880-93a2-4520-9a5b-aea3dcc64817",
        "contentVersionId": "63499fe1-7ca5-488f-b98e-d5b3fc8e8025",
        "title": "Printer Setup",
        "snippet": "Check the power light and confirm the network cable is connected."
      }
    ],
    "confidence": 0.88,
    "escalationSuggested": false
  }
}
```

Behavior:
- If no approved citations are found, return `422 no_grounded_answer`.
- Merchant mode must exclude internal-only content.

## Analytics

### `POST /events`

Request:

```json
{
  "eventType": "flow_step_completed",
  "subjectId": "99eb1cb9-0db7-42fe-a08e-12013522bdfe",
  "metadata": {
    "sessionId": "d34594b4-2247-41a3-84dd-87f85209eab3"
  }
}
```

### `GET /analytics/gaps`
Returns unanswered or low-confidence topics.

### `GET /analytics/stale-content`
Returns content that should be reviewed because of age or version drift.

## Background Jobs

These are internal or admin-triggered endpoints in v1.

### `POST /jobs/reindex-content`

Request:

```json
{
  "contentId": "5b060880-93a2-4520-9a5b-aea3dcc64817"
}
```

### `POST /jobs/refresh-import`

Request:

```json
{
  "sourceImportId": "76ad3aca-e488-430a-b61c-f0331af36d39"
}
```
