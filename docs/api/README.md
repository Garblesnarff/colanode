# API Documentation

This directory contains comprehensive documentation for the Colanode API.

## Table of Contents

- [Chat API](chat-api.md) - Documentation for chat-related endpoints
- [AI Providers](ai-providers.md) - Information about AI provider integration

## Overview

The Colanode API provides programmatic access to all features of the platform, including:

- User and account management
- Workspace and collaboration features
- Content management (nodes, documents, databases)
- Chat and AI assistance
- File storage and management

## Authentication

Most API endpoints require authentication via JWT tokens. Tokens can be obtained through the login process and should be included in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

## Rate Limiting

API requests may be rate-limited to ensure fair usage. Rate limit information is included in response headers:

- `X-RateLimit-Limit`: The maximum number of requests allowed in the current window
- `X-RateLimit-Remaining`: The number of requests remaining in the current window
- `X-RateLimit-Reset`: The time when the current window resets (Unix timestamp)

## Error Handling

All API endpoints use standard HTTP status codes:

- `200` - Success
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing or invalid authentication)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

Error responses include a JSON body with error details:

```json
{
  "code": "error_code",
  "message": "Human-readable error message"
}
```