# QuickNotes System Architecture

## 1. Overview

QuickNotes is a note-taking application designed to help users create, view, update, delete, and organize notes using tags.

The initial frontend uses HTML, CSS, and JavaScript to communicate with a demonstration API. This architecture describes a proposed production system with a backend API, a relational database, caching, asynchronous processing, and infrastructure designed to support growth.

The design targets one million registered users while prioritizing security, reliability, maintainability, and responsive performance.

## 2. System requirements

### 2.1 Functional requirements

The system must:

1. Allow users to register, log in, and authenticate securely.
2. Allow authenticated users to create, read, update, and delete notes.
3. Allow users to organize notes with tags.
4. Prevent users from accessing or modifying other users' private notes.
5. Validate input, including requiring a note title of no more than 100 characters.
6. Return consistent success and error responses from the API.
7. Support searching, filtering, sorting, and paginating notes.
8. Provide useful loading, success, empty, and error states in the frontend.

### 2.2 Non-functional requirements

- **Scalability:** Support growth toward one million registered users.
- **Availability:** Continue serving requests when an application server fails.
- **Performance:** Target a 95th-percentile response time below 300 ms for ordinary cached or indexed reads, excluding unusually expensive queries and external dependencies.
- **Security:** Use HTTPS, secure password hashing, authentication, authorization, input validation, and rate limiting.
- **Data integrity:** Use PostgreSQL constraints and transactions to protect relationships and important changes.
- **Maintainability:** Separate frontend, API, database, caching, and background-processing responsibilities.
- **Observability:** Collect logs, metrics, traces, and alerts to detect errors and performance problems.
- **Recovery:** Maintain tested backups and a documented database recovery procedure.

These are design targets, not measured guarantees. Load testing and operational monitoring would be required to confirm them.

## 3. High-level architecture diagram

```text
                     USERS
                       |
                       v
                 +-----------+
                 |   DNS     |
                 +-----------+
                       |
                       v
                 +-----------+
                 |   CDN     |
                 | Static UI |
                 +-----------+
                       |
                       v
              +------------------+
              | Load Balancer    |
              | Health Checks    |
              +------------------+
                  /           \
                 v             v
          +-------------+ +-------------+
          | API Server 1| | API Server 2|
          | Stateless   | | Stateless   |
          +-------------+ +-------------+
                 \             /
                  \           /
                   v         v
                +----------------+
                | Shared Cache   |
                | Redis Cluster  |
                +----------------+
                       |
                       v
                +----------------+
                | Primary        |
                | PostgreSQL DB  |
                +----------------+
                       |
                       | Replication
                       v
                +----------------+
                | Read Replica   |
                +----------------+

             API servers also publish jobs
                       |
                       v
                +----------------+
                | Durable Queue  |
                +----------------+
                       |
                       v
                +----------------+
                | Worker Pool    |
                | Notifications, |
                | exports, etc.  |
                +----------------+
```

The diagram represents logical components, not a complete deployment topology. In production, critical components should be deployed with appropriate redundancy across availability zones.

## 4. Component explanations

### 4.1 DNS

DNS translates the application's domain name into the appropriate network destination.

A reliable managed DNS provider should be used, with health-aware routing where appropriate. DNS caching means that routing changes may not take effect instantly for every client.

### 4.2 Content Delivery Network (CDN)

The CDN serves static assets such as HTML, CSS, JavaScript, icons, and images from geographically distributed edge locations.

This reduces latency for users and decreases the amount of static traffic reaching the origin infrastructure.

Private note data and authenticated API responses must not be publicly cached. CDN caching rules should distinguish static assets from sensitive responses.

### 4.3 Load balancer

The load balancer distributes incoming API requests across healthy application servers.

It performs health checks and stops routing requests to unhealthy instances. Multiple application servers prevent one application-process failure from taking the entire API offline.

The load balancer itself must be a managed or redundant service rather than a single manually maintained machine.

### 4.4 Stateless application servers

The application servers implement the QuickNotes API, including:

- Authentication and authorization.
- Input validation.
- Note and tag operations.
- Database queries.
- Error handling and response formatting.
- Publishing asynchronous jobs when necessary.

The servers should be stateless: session state should not depend on memory stored on one particular instance. This allows instances to be replaced, restarted, or scaled horizontally.

A minimum of two application instances should run across separate availability zones where supported. Autoscaling can add instances when CPU utilization, request latency, or request volume rises.

### 4.5 Shared cache

A Redis-compatible cache can store frequently accessed, non-sensitive or appropriately protected data, such as popular metadata and selected note-list results.

The cache reduces repeated database work and can improve response times.

Cache keys must include the authenticated user's identity and relevant filters so that one user's data is never returned to another user. Authorization must still be enforced by the application.

Cache invalidation is needed when notes or tags change. If the cache is unavailable, the API should normally fall back to the database, subject to database capacity limits.

### 4.6 Primary PostgreSQL database

The primary database stores authoritative records for users, notes, tags, and note-tag relationships.

All writes go to the primary database. Database constraints and transactions protect data consistency.

The database should use encrypted connections, least-privilege credentials, automated backups, monitoring, and high-availability options. Connection pooling prevents excessive numbers of application connections from overwhelming PostgreSQL.

### 4.7 Read replica

A read replica receives replicated database changes and can serve appropriate read-only queries, reducing load on the primary database.

Replication may lag behind the primary. Requests requiring immediate read-after-write consistency should read from the primary or use a consistency-aware routing strategy.

A replica is not a substitute for backups: accidental deletion or corruption can also propagate through replication.

### 4.8 Durable message queue

The queue stores background jobs until workers can process them. Examples include sending notifications, generating exports, or performing other work that does not need to finish before an API response is returned.

The API should publish jobs only when appropriate, and important database changes that must reliably produce a job may require a transactional outbox pattern.

Jobs should be processed idempotently, retried with limits and backoff, and moved to a dead-letter queue after repeated failure.

### 4.9 Worker pool

Workers consume jobs from the queue independently of the API servers.

This keeps slow background tasks from unnecessarily increasing the latency of user-facing requests. Workers can scale separately according to queue depth and processing time.

### 4.10 Monitoring and security

Centralized logs, application metrics, distributed tracing, alerts, and audit events help operators identify failures and investigate incidents.

Security controls include HTTPS, secure password hashing, access tokens or secure sessions, authorization checks, rate limiting, input validation, secret management, and data encryption at rest where supported.

Logs must not expose passwords, access tokens, or private note contents unnecessarily.

## 5. Capacity estimates for one million users

These are planning assumptions, not measured usage statistics. Real capacity must be established through monitoring and load testing.

### 5.1 Traffic assumptions

Assume:

- Registered users: 1,000,000.
- Daily active users: 20%, or 200,000.
- Reads per active user per day: 20.
- Writes per active user per day: 2.
- Peak traffic multiplier: 5 times the average request rate.

| Metric | Calculation | Estimate |
|---|---|---:|
| Daily active users | 1,000,000 × 20% | 200,000 |
| Daily reads | 200,000 × 20 | 4,000,000 |
| Daily writes | 200,000 × 2 | 400,000 |
| Average read rate | 4,000,000 ÷ 86,400 | 46 reads/sec |
| Average write rate | 400,000 ÷ 86,400 | 4.6 writes/sec |
| Estimated peak reads | 46 × 5 | 231 reads/sec |
| Estimated peak writes | 4.6 × 5 | 23 writes/sec |

This model counts logical application reads and writes, not every database operation, retry, background job, or asset request. A single API request may produce multiple database queries.

A cache can reduce database reads, but cache misses and invalidations must be included in capacity tests.

### 5.2 Storage estimate

Assume that each daily active user creates two notes per day and each stored note averages approximately 2 KB of raw note data, including an allowance for basic record overhead.

- New notes per day: 200,000 × 2 = 400,000.
- New notes per year: 400,000 × 365 = 146,000,000.
- Raw note storage per year: 146,000,000 × 2 KB ≈ 292 GB using decimal units.

This estimate excludes tags, indexes, additional database overhead, replication, backups, logs, and growth in existing notes. Actual storage requirements will vary considerably with note length and retention behavior.

Database capacity planning should separately account for indexes, replication, backup retention, and free space. Storage growth should be measured continuously rather than relying on the estimate alone.

### 5.3 Scaling strategy

Start with a small, monitored deployment and validate performance before adding infrastructure.

As traffic grows:

1. Add API instances behind the load balancer.
2. Tune SQL queries, indexes, and connection pooling.
3. Cache high-volume reads where correctness permits.
4. Offload noncritical work to queues and workers.
5. Add read replicas for suitable read-heavy workloads.
6. Increase database capacity and storage as measurements require.
7. Consider partitioning or other advanced database strategies only when observed bottlenecks justify the added complexity.

## 6. Request flows

### 6.1 GET /api/v1/notes

This endpoint returns notes belonging to the authenticated user.

1. The client sends a GET request over HTTPS.
2. DNS resolves the API hostname.
3. The load balancer routes the request to a healthy API server.
4. The API server validates the authentication credentials.
5. The server determines the user identity and applies authorization and query validation.
6. The server checks the cache for an appropriate user-scoped result, if caching is enabled.
7. On a cache miss, the API queries PostgreSQL, normally using the primary or a suitable read replica according to the consistency requirements.
8. The server returns a paginated JSON response.
9. The client renders the notes and an appropriate success, empty, or error state.

The API must restrict the query to the authenticated user's records. It must never trust a client-supplied user ID as proof of ownership.

### 6.2 POST /api/v1/notes

This endpoint creates a note.

1. The client sends a POST request containing the title, body, and optional tag IDs over HTTPS.
2. DNS and the load balancer route the request to a healthy API server.
3. The API authenticates the user and validates the request body.
4. The server verifies that any referenced tags belong to the authenticated user.
5. The server inserts the note into PostgreSQL using the authenticated user's ID.
6. If required background work must reliably follow the write, the server records an associated job through a reliable publishing mechanism, such as a transactional outbox.
7. The API commits the transaction and returns `201 Created` with the new note representation.
8. Relevant cached data is invalidated or updated.
9. Background workers process queued jobs independently.

If validation or authorization fails, the API returns a suitable error response without creating the note.

## 7. Architecture trade-offs

### Trade-off 1: Caching versus consistency

**Benefit:** Caching reduces database load and can improve read latency.

**Cost:** Cached results can become stale, and invalidation logic adds complexity.

**Decision:** Cache only suitable reads, scope cache keys by user and query parameters, invalidate affected entries after writes, and bypass the cache for operations requiring stronger consistency.

### Trade-off 2: Read replicas versus immediate consistency

**Benefit:** Replicas can distribute read traffic away from the primary database.

**Cost:** Replication lag can cause a newly created or updated note to appear temporarily outdated.

**Decision:** Use replicas for queries that tolerate eventual consistency. Route read-after-write operations and other consistency-sensitive requests to the primary.

### Trade-off 3: Asynchronous workers versus simpler request handling

**Benefit:** Background jobs keep slow work out of the main request path and allow independent scaling.

**Cost:** Queues introduce retries, duplicate-delivery risks, monitoring requirements, and more moving parts.

**Decision:** Use a queue only for work that benefits from asynchronous processing. Make workers idempotent, monitor queue depth, and define retry and dead-letter policies.

### Trade-off 4: High availability versus cost

**Benefit:** Redundant instances, database failover, replicated queues, and multi-zone deployments reduce downtime risks.

**Cost:** These services increase infrastructure cost and operational complexity.

**Decision:** Prioritize redundancy for critical components, establish recovery objectives, and scale the deployment according to service requirements and measured demand.

## 8. Single points of failure (SPOFs)

A single point of failure is a component whose failure can cause a critical part of the system to become unavailable.

| Component or risk | Failure impact | Mitigation |
|---|---|---|
| Single API server | API becomes unavailable if that server fails | Run multiple stateless instances across availability zones |
| Single load balancer | Traffic cannot reach healthy application instances | Use a managed, redundant load-balancing service |
| Primary database failure | Writes may stop and some reads may become unavailable | Use database high availability, automated failover, backups, and recovery testing |
| Cache outage | Increased latency and database load | Use a redundant cache deployment and a controlled database fallback |
| Queue outage | Background jobs may stop being accepted or processed | Use a durable, replicated queue and alert on delivery failures |
| Single worker | Background tasks accumulate or stop | Run multiple workers and monitor queue depth |
| DNS provider or configuration failure | Clients may fail to resolve the service | Use reliable managed DNS, protected configuration, and tested recovery procedures |
| Shared network or availability-zone failure | Multiple components may become unreachable | Distribute critical services across zones and test failure scenarios |
| Credential or secret compromise | Unauthorized access to systems or data | Use secret management, least privilege, rotation, and audit monitoring |

### Availability and recovery considerations

- Health checks should remove unhealthy application instances from service.
- Critical managed infrastructure should be deployed with appropriate redundancy.
- Database backups must be tested through restoration exercises.
- Recovery objectives should specify the acceptable recovery time objective (RTO) and recovery point objective (RPO).
- Alerts should detect rising error rates, high latency, database saturation, replication lag, and queue backlogs.
- Failover behavior must be tested; having a replica or backup does not automatically guarantee successful recovery.

Redundancy reduces the risk of downtime, but it does not eliminate every failure mode. Shared configuration errors, security incidents, and regional outages can still affect multiple components.

## 9. Conclusion

QuickNotes uses a layered architecture with a CDN, load balancer, stateless API servers, a shared cache, PostgreSQL, a read replica, a durable queue, and background workers.

The design supports horizontal application scaling, controlled database growth, secure user-level data access, and asynchronous processing. The capacity estimates provide an initial planning baseline for one million registered users, while actual infrastructure decisions should be based on measured traffic, load testing, reliability requirements, and operating cost.

The architecture is a proposed production design. The current frontend demonstration using JSONPlaceholder does not yet implement these production infrastructure components.