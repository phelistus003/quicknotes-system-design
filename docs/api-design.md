# QuickNotes API Design

## 1. Overview

QuickNotes is a note-taking application that allows users to create, view, update, organize, and delete their notes.

This document defines the REST API contract for the QuickNotes backend. It specifies the endpoints, HTTP methods, request and response formats, success status codes, and error handling rules.

### Base URL

```text
https://api.quicknotes.example/api/v1
```

The domain above is a placeholder for the future production API.

### API conventions

- **Protocol:** HTTPS
- **Data format:** JSON
- **Authentication:** Bearer token authentication
- **Resource naming:** Plural nouns, such as `/notes` and `/tags`
- **Dates:** ISO 8601 timestamps in UTC
- **Character encoding:** UTF-8
- **API versioning:** `/api/v1`

Authenticated endpoints operate on the current user’s resources. A user must not be allowed to access another user's private notes without authorization.

---

## 2. Endpoint table

| Method | Endpoint | Description | Success status |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Register a new user | 201 Created |
| POST | `/api/v1/auth/login` | Authenticate a user | 200 OK |
| GET | `/api/v1/notes` | List the authenticated user's notes | 200 OK |
| GET | `/api/v1/notes/{id}` | Retrieve one note by ID | 200 OK |
| POST | `/api/v1/notes` | Create a note | 201 Created |
| PUT | `/api/v1/notes/{id}` | Replace a note's editable fields | 200 OK |
| PATCH | `/api/v1/notes/{id}` | Update selected note fields | 200 OK |
| DELETE | `/api/v1/notes/{id}` | Delete a note | 204 No Content |
| GET | `/api/v1/tags` | List the user's tags | 200 OK |
| POST | `/api/v1/notes/{id}/tags` | Associate a tag with a note | 201 Created |

All endpoints except registration and login require authentication.

---

## 3. Authentication

Authenticated requests must include a valid access token.

Example request header:

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

The backend must verify the token and identify the authenticated user before accessing private resources.

An absent or invalid token returns `401 Unauthorized`. An authenticated user who lacks permission for an operation receives `403 Forbidden`, where the resource's existence and access policy permit that distinction.

---

## 4. List notes

### `GET /api/v1/notes`

Returns a paginated list of notes belonging to the authenticated user.

Optional query parameters:

| Parameter | Type | Description |
|---|---|---|
| `page` | Integer | Page number, starting at 1 |
| `limit` | Integer | Number of notes per page; maximum 100 |
| `search` | String | Search note titles and bodies |
| `tagId` | Integer or string | Filter notes by tag |
| `sort` | String | Sort by `createdAt` or `updatedAt` |
| `order` | String | `asc` or `desc` |

Example request:

```http
GET /api/v1/notes?page=1&limit=10&sort=updatedAt&order=desc
```

Success response: `200 OK`

```json
{
  "data": [
    {
      "id": 101,
      "userId": 1,
      "title": "Study plan",
      "body": "Revise SQL and practice queries.",
      "tags": [],
      "createdAt": "2026-10-25T10:00:00Z",
      "updatedAt": "2026-10-25T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

If the user has no notes, the API returns `200 OK` with an empty `data` array and pagination metadata.

---

## 5. Retrieve a single note

### `GET /api/v1/notes/{id}`

Returns one note owned by the authenticated user.

Example request:

```http
GET /api/v1/notes/101
```

Success response: `200 OK`

```json
{
  "data": {
    "id": 101,
    "userId": 1,
    "title": "Study plan",
    "body": "Revise SQL and practice queries.",
    "tags": [],
    "createdAt": "2026-10-25T10:00:00Z",
    "updatedAt": "2026-10-25T10:00:00Z"
  }
}
```

If the note does not exist or is not accessible to the user, the API returns `404 Not Found`.

---

## 6. Create a note

### `POST /api/v1/notes`

Creates a new note for the authenticated user.

The server derives `userId` from the authenticated identity rather than trusting a client-supplied user ID.

#### Request JSON

```json
{
  "title": "My first note",
  "body": "Learning how REST APIs work.",
  "tagIds": [2, 4]
}
```

Validation rules:

- `title` is required.
- `title` must contain between 1 and 100 characters after trimming whitespace.
- `body` is optional and defaults to an empty string.
- `tagIds` is optional and must reference tags the user is allowed to use.
- Unknown fields must not be used to override protected properties such as `userId`, `id`, or timestamps.

#### Success response: `201 Created`

```http
HTTP/1.1 201 Created
Location: /api/v1/notes/101
Content-Type: application/json
```

```json
{
  "data": {
    "id": 101,
    "userId": 1,
    "title": "My first note",
    "body": "Learning how REST APIs work.",
    "tags": [
      {
        "id": 2,
        "name": "Learning"
      },
      {
        "id": 4,
        "name": "Work"
      }
    ],
    "createdAt": "2026-10-25T10:00:00Z",
    "updatedAt": "2026-10-25T10:00:00Z"
  }
}
```

The database generates the note ID and timestamps. The backend persists the note before returning success.

---

## 7. Replace a note

### `PUT /api/v1/notes/{id}`

Replaces all editable fields of an existing note.

Example request:

```http
PUT /api/v1/notes/101
Content-Type: application/json
```

```json
{
  "title": "Updated study plan",
  "body": "Practice SQL and database design.",
  "tagIds": [2]
}
```

Success response: `200 OK`

```json
{
  "data": {
    "id": 101,
    "userId": 1,
    "title": "Updated study plan",
    "body": "Practice SQL and database design.",
    "tags": [
      {
        "id": 2,
        "name": "Learning"
      }
    ],
    "createdAt": "2026-10-25T10:00:00Z",
    "updatedAt": "2026-10-25T11:00:00Z"
  }
}
```

The backend validates the request, verifies ownership, updates the editable fields, and sets `updatedAt` to the new update time.

---

## 8. Partially update a note

### `PATCH /api/v1/notes/{id}`

Updates only the fields included in the request.

Example request:

```json
{
  "title": "Revised study plan"
}
```

Success response: `200 OK`

```json
{
  "data": {
    "id": 101,
    "userId": 1,
    "title": "Revised study plan",
    "body": "Practice SQL and database design.",
    "tags": [
      {
        "id": 2,
        "name": "Learning"
      }
    ],
    "createdAt": "2026-10-25T10:00:00Z",
    "updatedAt": "2026-10-25T12:00:00Z"
  }
}
```

Fields not supplied remain unchanged. The backend validates every field that is supplied.

---

## 9. Delete a note

### `DELETE /api/v1/notes/{id}`

Permanently deletes a note owned by the authenticated user.

Example request:

```http
DELETE /api/v1/notes/101
Authorization: Bearer <access_token>
```

Success response:

```http
HTTP/1.1 204 No Content
```

A `204` response has no response body.

The backend must verify ownership and perform the deletion. Subsequent attempts to retrieve the deleted note return `404 Not Found`.

---

## 10. Authentication endpoints

### `POST /api/v1/auth/register`

Registers a user.

Request:

```json
{
  "name": "Alex",
  "email": "alex@example.com",
  "password": "example-password"
}
```

Success: `201 Created`

The response returns the user's public profile and must never include the password or password hash.

### `POST /api/v1/auth/login`

Authenticates a user.

Request:

```json
{
  "email": "alex@example.com",
  "password": "example-password"
}
```

Success: `200 OK`

```json
{
  "data": {
    "accessToken": "<access_token>",
    "tokenType": "Bearer",
    "expiresIn": 3600
  }
}
```

Passwords must be securely hashed at rest. Production authentication must use appropriate rate limiting and secure token handling.

---

## 11. Tags endpoints

### `GET /api/v1/tags`

Returns the authenticated user's tags.

Success: `200 OK`

```json
{
  "data": [
    {
      "id": 2,
      "name": "Learning"
    },
    {
      "id": 4,
      "name": "Work"
    }
  ]
}
```

### `POST /api/v1/notes/{id}/tags`

Associates an existing tag with a note.

Request:

```json
{
  "tagId": 2
}
```

Success: `201 Created`

```json
{
  "data": {
    "noteId": 101,
    "tagId": 2
  }
}
```

The backend must verify that the user can access both the note and the tag. Duplicate associations should be handled consistently, for example by returning `409 Conflict`.

---

## 12. Error handling

The API uses standard HTTP status codes to communicate failure.

| Status code | Meaning | Example |
|---|---|---|
| `400 Bad Request` | Invalid request or validation failure | Missing title |
| `401 Unauthorized` | Missing or invalid authentication | Expired access token |
| `403 Forbidden` | Authenticated user lacks permission | Restricted operation |
| `404 Not Found` | Resource not found or not accessible | Missing note |
| `409 Conflict` | Request conflicts with existing state | Duplicate tag association |
| `413 Content Too Large` | Request body exceeds the allowed size | Oversized request |
| `415 Unsupported Media Type` | Unsupported request content type | Non-JSON body |
| `422 Unprocessable Content` | Request is syntactically valid but semantically invalid, where this distinction is used | Invalid tag combination |
| `429 Too Many Requests` | Rate limit exceeded | Too many login attempts |
| `500 Internal Server Error` | Unexpected server failure | Unhandled backend exception |
| `503 Service Unavailable` | Service temporarily unavailable | Database maintenance |

The API should use a consistent JSON error format for responses that include a body.

### Example error response

HTTP status: `400 Bad Request`

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "details": [
      {
        "field": "title",
        "message": "Title is required and must not exceed 100 characters."
      }
    ],
    "requestId": "req_example_123"
  }
}
```

The `details` array may be empty when there are no field-specific errors. `requestId` helps developers and operators trace failures in server logs.

Error responses must not expose stack traces, database credentials, access tokens, password hashes, or other sensitive implementation details.

---

## 13. Security and reliability

The backend team should implement the following safeguards:

1. Enforce HTTPS in production.
2. Authenticate protected requests and verify resource ownership.
3. Validate and normalize incoming data on the server.
4. Use parameterized SQL queries to prevent SQL injection.
5. Apply request-size limits and rate limiting.
6. Avoid exposing sensitive data in errors and logs.
7. Use database transactions when an operation changes related records, such as notes and tags.
8. Use automated tests for authorization, validation, and error handling.
9. Monitor request latency, error rates, and database health.
10. Configure backups and test recovery procedures.

---

## 14. Frontend integration note

The current QuickNotes browser prototype uses JSONPlaceholder at:

`https://jsonplaceholder.typicode.com/posts`

That service is useful for demonstrating GET, POST, and DELETE requests, but it is not the production QuickNotes backend defined in this document. It does not provide the authentication, ownership enforcement, persistent storage, or complete endpoint contract described above.

When the real backend is implemented, the frontend should use the configured QuickNotes API base URL and follow its authentication and response formats.

## 15. Conclusion

This API contract gives the QuickNotes backend team a consistent specification for managing users, notes, and tags. Using REST conventions, clear validation rules, standard HTTP status codes, and consistent error responses makes the system easier to implement, test, secure, and maintain.