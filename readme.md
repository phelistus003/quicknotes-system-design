# QuickNotes — API Client & System Design

## Project Overview

QuickNotes is a note-taking application prototype designed to help users create, view, and delete notes through an API client.

This project combines a working frontend demonstration with production-oriented system design documentation. It covers API request handling, input validation, database modeling, scalability, reliability, and architectural trade-offs.

The current frontend uses [JSONPlaceholder](https://jsonplaceholder.typicode.com/) as a demonstration API. The production API and infrastructure described in the documentation are proposed designs and have not yet been implemented.

## Features

- Fetch and display notes using HTTP GET.
- Create notes using HTTP POST.
- Delete notes using HTTP DELETE.
- Validate note titles and enforce a 100-character maximum.
- Display loading, success, empty, and error states.
- Disable relevant buttons while requests are in progress.
- Safely display user-provided text using `textContent`.
- Document a proposed REST API, relational data model, and scalable production architecture.

## Technologies Used

- HTML5
- CSS3
- JavaScript (Fetch API, async/await)
- JSONPlaceholder
- PostgreSQL — proposed production database
- Git and GitHub

## Project Structure

```text
quicknotes-system-design/
├── index.html
├── api.js
├── style.css
├── README.md
└── docs/
    ├── api-design.md
    ├── data-model.md
    └── architecture.md
```

## How to Run the Project

### Prerequisites

- A modern web browser.
- Git, if you want to clone the repository.
- An internet connection to access JSONPlaceholder.

### Option 1: Open the HTML file

1. Clone or download the repository.
2. Open the project folder.
3. Open `index.html` in your browser.
4. Load the notes and test creating and deleting notes.

### Option 2: Use Visual Studio Code

1. Open the project folder in Visual Studio Code.
2. Open `index.html`.
3. Start the page using the Live Server extension, if installed.
4. Test the note operations in your browser.

**Important:** JSONPlaceholder simulates write operations. Created and deleted posts are not permanently saved by the demonstration service, so changes may not persist after reloading the page.

## Documentation

The `docs/` directory contains the system design deliverables:

- [API Design](docs/api-design.md) — endpoint definitions, request and response examples, authentication, and error handling.
- [Data Model](docs/data-model.md) — users, notes, tags, relationships, SQL table definitions, example queries, and indexing.
- [System Architecture](docs/architecture.md) — requirements, capacity estimates for one million registered users, architecture diagram, request flows, trade-offs, and failure mitigation.

## Production Architecture

The proposed production design includes:

- A CDN for static assets.
- A load balancer distributing traffic across multiple stateless API servers.
- A shared cache for suitable reads.
- PostgreSQL as the primary relational database, with a read replica.
- A durable queue and background workers for asynchronous tasks.
- Monitoring, security controls, backups, and high-availability measures.

These components are documented as a design proposal; they are not all deployed in the current frontend prototype.

## What I Learned

1. **API integration:** Making asynchronous HTTP requests, handling responses and errors, and validating input before submitting data.
2. **Database design:** Modeling relationships between users, notes, and tags using primary keys, foreign keys, SQL queries, and indexes.
3. **System design:** Planning for scalability, performance, security, availability, capacity, and single points of failure.

## Future Improvements

- Implement a real backend API with persistent database storage.
- Add user registration, authentication, and authorization.
- Add note editing, searching, filtering, and tag management.
- Add automated tests and API integration tests.
- Deploy the production architecture and validate it through load testing.

## Author

Developed as a software engineering and system design capstone project.