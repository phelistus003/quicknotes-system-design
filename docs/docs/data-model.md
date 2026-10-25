# QuickNotes Data Model

## 1. Overview

QuickNotes is a note-taking application that allows users to create, view, update, delete, and organize notes using tags.

This document defines the database structure, relationships, constraints, example SQL queries, and indexing strategy for the application.

**Database choice:** PostgreSQL (relational SQL database).

PostgreSQL is suitable because QuickNotes requires reliable relationships between users, notes, and tags, as well as data integrity, transactions, and flexible querying.

## 2. Entities

The database contains four entities.

### 2.1 Users

Stores account information for registered QuickNotes users.

| Column | Data type | Constraints |
|---|---|---|
| id | BIGSERIAL | Primary key |
| name | VARCHAR(100) | NOT NULL |
| email | VARCHAR(255) | NOT NULL, UNIQUE |
| password_hash | TEXT | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL, default current timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, default current timestamp |

Passwords must be stored as secure password hashes, never as plain text.

### 2.2 Notes

Stores notes created by users. Every note belongs to one user.

| Column | Data type | Constraints |
|---|---|---|
| id | BIGSERIAL | Primary key |
| user_id | BIGINT | Foreign key referencing users.id |
| title | VARCHAR(100) | NOT NULL |
| body | TEXT | NOT NULL, default empty string |
| created_at | TIMESTAMPTZ | NOT NULL, default current timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, default current timestamp |

The title is limited to 100 characters. The `user_id` foreign key associates each note with its owner.

### 2.3 Tags

Stores labels that users can apply to their notes, such as `Work`, `School`, or `Personal`.

| Column | Data type | Constraints |
|---|---|---|
| id | BIGSERIAL | Primary key |
| user_id | BIGINT | Foreign key referencing users.id |
| name | VARCHAR(50) | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL, default current timestamp |

A tag belongs to a user. The combination of `user_id` and `name` must be unique so the same user cannot create duplicate tags with the same name.

### 2.4 Note_Tags

Connects notes and tags. This junction table supports a many-to-many relationship: a note can have multiple tags, and a tag can be assigned to multiple notes.

| Column | Data type | Constraints |
|---|---|---|
| note_id | BIGINT | Foreign key referencing notes.id |
| tag_id | BIGINT | Foreign key referencing tags.id |
| created_at | TIMESTAMPTZ | NOT NULL, default current timestamp |

The combination of `note_id` and `tag_id` forms the composite primary key, preventing the same tag from being attached to the same note more than once.

## 3. Entity relationships

- **Users → Notes:** One-to-many. A user can own many notes, but each note belongs to one user.
- **Users → Tags:** One-to-many. A user can create many tags, but each tag belongs to one user.
- **Notes ↔ Tags:** Many-to-many. The `note_tags` junction table connects notes with tags.

### Relationship diagram

```text
USERS
  |
  | 1-to-many
  |
  +---------------- NOTES
  |                    |
  |                    | 1-to-many
  |                    |
  |                 NOTE_TAGS
  |                    |
  |                    | many-to-1
  |                    |
  +---------------- TAGS
```

The junction table connects `notes` and `tags`. A note can have no tags, one tag, or several tags.

## 4. CREATE TABLE statements

The following statements use PostgreSQL syntax. Create the tables in dependency order so that referenced tables exist before their foreign keys are defined.

```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notes (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(100) NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notes_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_notes_title_not_blank
        CHECK (LENGTH(TRIM(title)) > 0)
);

CREATE TABLE tags (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_tags_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_tags_user_name
        UNIQUE (user_id, name),

    CONSTRAINT chk_tags_name_not_blank
        CHECK (LENGTH(TRIM(name)) > 0)
);

CREATE TABLE note_tags (
    note_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (note_id, tag_id),

    CONSTRAINT fk_note_tags_note
        FOREIGN KEY (note_id)
        REFERENCES notes(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_note_tags_tag
        FOREIGN KEY (tag_id)
        REFERENCES tags(id)
        ON DELETE CASCADE
);
```

### Referential integrity

Foreign keys prevent notes, tags, and note-tag links from referring to nonexistent records. `ON DELETE CASCADE` removes dependent records when a user, note, or tag is deleted.

The application must also verify that a user owns both a note and any tag being attached to it. The foreign keys alone do not enforce that ownership rule across the two tables.

The `updated_at` columns should be refreshed by the application or a database trigger whenever the corresponding record changes.

## 5. Example SQL queries

### Query 1: Get all notes belonging to a user

This query returns the notes owned by a specific user, with the most recently updated notes first.

```sql
SELECT
    id,
    title,
    body,
    created_at,
    updated_at
FROM notes
WHERE user_id = 1
ORDER BY updated_at DESC;
```

### Query 2: Retrieve notes together with their tags

This query uses `LEFT JOIN` so notes without tags are still returned.

```sql
SELECT
    n.id AS note_id,
    n.title,
    n.body,
    t.id AS tag_id,
    t.name AS tag_name
FROM notes AS n
LEFT JOIN note_tags AS nt
    ON n.id = nt.note_id
LEFT JOIN tags AS t
    ON nt.tag_id = t.id
WHERE n.user_id = 1
ORDER BY n.updated_at DESC, t.name;
```

In this query, the first join connects notes to the junction table, and the second connects the junction table to tags.

### Query 3: Count notes belonging to each user

This query uses `LEFT JOIN` to include users who have not created any notes.

```sql
SELECT
    u.id AS user_id,
    u.name,
    COUNT(n.id) AS total_notes
FROM users AS u
LEFT JOIN notes AS n
    ON u.id = n.user_id
GROUP BY u.id, u.name
ORDER BY total_notes DESC;
```

### Query 4: Search a user's notes by title

```sql
SELECT
    id,
    title,
    body,
    updated_at
FROM notes
WHERE user_id = 1
  AND title ILIKE '%meeting%'
ORDER BY updated_at DESC;
```

`ILIKE` performs a case-insensitive match in PostgreSQL. For large-scale full-text or substring searching, a dedicated search index may be needed.

## 6. Indexing strategy

Indexes help PostgreSQL locate records without scanning the entire table for every query. They improve read performance but consume storage and add overhead to inserts, updates, and deletes.

### Index 1: Notes by owner and update time

```sql
CREATE INDEX idx_notes_user_updated_at
ON notes (user_id, updated_at DESC);
```

**Purpose:** Supports the common operation of listing a user's notes in most-recently-updated order. It is useful for the notes listing endpoint.

### Index 2: Note-tag lookup by tag

```sql
CREATE INDEX idx_note_tags_tag_id
ON note_tags (tag_id);
```

**Purpose:** The composite primary key on `note_tags` starts with `note_id`. A separate index on `tag_id` helps queries find notes associated with a particular tag.

### Existing indexes

PostgreSQL automatically creates an index for a primary key and for a unique constraint. This includes indexes for `users.id`, `users.email`, and the unique combination of `tags.user_id` and `tags.name`.

Additional indexes should be introduced based on actual query patterns and query plans, rather than indexing every column.

## 7. SQL vs NoSQL decision

**Decision: Use PostgreSQL, a relational SQL database.**

### Why SQL fits QuickNotes

1. **Clear relationships:** Users own notes and tags, while `note_tags` models the many-to-many relationship between notes and tags.
2. **Data integrity:** Primary keys, foreign keys, unique constraints, and checks help prevent invalid or inconsistent data.
3. **Transactions:** Creating or updating related records can be handled atomically, preventing partial changes.
4. **Powerful queries:** SQL supports joins, filtering, sorting, grouping, and reporting without requiring the application to manually combine unrelated records.
5. **Access control:** Queries can be scoped to the authenticated user's records, with additional authorization checks in the application.

### Why not start with NoSQL?

A document database could store notes and their tags in flexible documents. However, the application's ownership relationships, constraints, and join-based queries make a relational database a natural starting point.

NoSQL may be appropriate if future requirements involve highly variable document structures, globally distributed access patterns, or workloads that justify its specific scaling model. It is not automatically faster or more scalable for every workload.

### Final decision

PostgreSQL provides the relational structure, consistency, and querying capabilities required by QuickNotes. The application can scale through appropriate indexing, query optimization, connection pooling, caching, read replicas, and database capacity planning before considering a different database technology.

## 8. Summary

This data model defines four entities: `users`, `notes`, `tags`, and `note_tags`. It establishes primary and foreign keys, enforces important constraints, demonstrates SQL queries including joins and aggregation, and proposes indexes for common access patterns.

The design is a foundation for the production QuickNotes API. Database migrations, authentication, authorization, and application-level ownership checks must be implemented when the backend is developed.