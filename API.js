
const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadButton = document.querySelector("#load-btn");
const status = document.querySelector("#status");
const notesList = document.querySelector("#notes-list");

const noteForm = document.querySelector("#note-form");
const titleInput = document.querySelector("#title-input");
const bodyInput = document.querySelector("#body-input");
const submitButton = document.querySelector("#submit-btn");

// Track the notes currently displayed on the page.
const displayedNotes = new Map();


// Reusable request function
async function request(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    return response;
}


// Display a note and its Delete button
function displayNote(note) {
    const listItem = document.createElement("li");
    listItem.dataset.noteId = note.id;

    const title = document.createElement("h2");
    title.textContent = note.title;

    const body = document.createElement("p");
    body.textContent = note.body || "";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener("click", function () {
        deleteNote(note.id, listItem, deleteButton);
    });

    listItem.appendChild(title);
    listItem.appendChild(body);
    listItem.appendChild(deleteButton);

    notesList.appendChild(listItem);
}


// GET - Load notes
async function loadNotes() {
    try {
        loadButton.disabled = true;
        status.textContent = "Loading notes...";

        const response = await request(`${API_URL}?_limit=10`);
        const notes = await response.json();

        notesList.textContent = "";
        displayedNotes.clear();

        if (notes.length === 0) {
            const emptyMessage = document.createElement("li");
            emptyMessage.textContent = "No notes found.";
            notesList.appendChild(emptyMessage);

            status.textContent = "No notes were found.";
            return;
        }

        notes.forEach(function (note) {
            displayedNotes.set(note.id, note);
            displayNote(note);
        });

        status.textContent =
            `Loaded ${notes.length} notes from the server.`;

    } catch (error) {
        status.textContent =
            "Sorry, we could not load the notes. Please try again.";

    } finally {
        loadButton.disabled = false;
    }
}


// POST - Create a note
async function createNote(event) {
    event.preventDefault();

    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();

    if (title === "") {
        status.textContent = "Please enter a title.";
        titleInput.focus();
        return;
    }

    if (title.length > 100) {
        status.textContent = "Title must be 100 characters or less.";
        titleInput.focus();
        return;
    }

    try {
        submitButton.disabled = true;
        status.textContent = "Creating note...";

        const response = await request(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title: title,
                body: body,
                userId: 1
            })
        });

        const createdNote = await response.json();

        // JSONPlaceholder returns a simulated new ID but does not
        // permanently store the created post. Keep it in the browser's
        // displayed list for this session; reloading may not retain it.
        displayedNotes.set(createdNote.id, createdNote);

        // Remove the empty-state message if present.
        notesList.textContent = "";

        // Rebuild the list so the newly created note appears at the top.
        const allNotes = Array.from(displayedNotes.values());
        allNotes.reverse().forEach(displayNote);

        status.textContent =
            `Note created (status ${response.status}, id ${createdNote.id}).`;

        noteForm.reset();

    } catch (error) {
        status.textContent =
            "Sorry, we could not create the note. Please try again.";

    } finally {
        submitButton.disabled = false;
    }
}


// DELETE - Remove a note
async function deleteNote(noteId, listItem, deleteButton) {
    try {
        deleteButton.disabled = true;
        status.textContent = "Deleting note...";

        const response = await request(`${API_URL}/${noteId}`, {
            method: "DELETE"
        });

        /*
         * JSONPlaceholder simulates DELETE requests; it does not
         * permanently store or delete our data. We remove the note
         * from the current page after a successful response only.
         * A later reload may show server-provided posts again.
         */
        listItem.remove();
        displayedNotes.delete(noteId);

        if (displayedNotes.size === 0) {
            const emptyMessage = document.createElement("li");
            emptyMessage.textContent = "No notes found.";
            notesList.appendChild(emptyMessage);
        }

        status.textContent =
            `Note deleted successfully (status ${response.status}, id ${noteId}).`;

    } catch (error) {
        status.textContent =
            `Could not delete note ${noteId}. Please try again.`;

        deleteButton.disabled = false;
    }
}


// Event listeners
loadButton.addEventListener("click", loadNotes);
noteForm.addEventListener("submit", createNote);
