
const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadButton = document.querySelector("#load-btn");
const status = document.querySelector("#status");
const notesList = document.querySelector("#notes-list");

const noteForm = document.querySelector("#note-form");
const titleInput = document.querySelector("#title-input");
const bodyInput = document.querySelector("#body-input");
const submitButton = document.querySelector("#submit-btn");


// ========================================
// GET - Load notes
// ========================================

async function loadNotes() {
    try {
        status.textContent = "Loading notes...";
        loadButton.disabled = true;

        const response = await fetch(`${API_URL}?_limit=10`);

        if (!response.ok) {
            throw new Error("Failed to load notes.");
        }

        const notes = await response.json();

        notesList.textContent = "";

        // Empty state
        if (notes.length === 0) {
            const emptyMessage = document.createElement("li");

            emptyMessage.textContent = "No notes found.";

            notesList.appendChild(emptyMessage);

            status.textContent = "No notes were found.";

            return;
        }

        // Display notes
        notes.forEach(function (note) {
            displayNote(note);
        });

        status.textContent =
            `Loaded ${notes.length} notes from the server.`;

    } catch (error) {

        status.textContent =
            "Sorry, we could not load the notes.";

        notesList.textContent = "";

    } finally {

        loadButton.disabled = false;
    }
}


// ========================================
// Display a note
// ========================================

function displayNote(note) {

    const listItem = document.createElement("li");

    const title = document.createElement("h2");

    title.textContent = note.title;

    const body = document.createElement("p");

    body.textContent = note.body;

    listItem.appendChild(title);
    listItem.appendChild(body);

    notesList.appendChild(listItem);
}


// ========================================
// POST - Create a note
// ========================================

async function createNote(event) {

    // Prevent page refresh
    event.preventDefault();

    const title = titleInput.value.trim();

    const body = bodyInput.value.trim();


    // ========================================
    // Validation
    // ========================================

    if (title === "") {

        status.textContent =
            "Please enter a title.";

        titleInput.focus();

        return;
    }


    if (title.length > 100) {

        status.textContent =
            "Title must be 100 characters or less.";

        titleInput.focus();

        return;
    }


    try {

        // Disable button while request is running
        submitButton.disabled = true;

        status.textContent =
            "Creating note...";


        // Data being sent to the API
        const newNote = {
            title: title,
            body: body,
            userId: 1
        };


        // ========================================
        // Send POST request
        // ========================================

        const response = await fetch(API_URL, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(newNote)

        });


        // Check response
        if (!response.ok) {

            throw new Error(
                "Failed to create note."
            );
        }


        // Convert response to JavaScript
        const createdNote = await response.json();


        // ========================================
        // Create note element
        // ========================================

        const listItem = document.createElement("li");


        const titleElement =
            document.createElement("h2");

        titleElement.textContent =
            createdNote.title;


        const bodyElement =
            document.createElement("p");

        bodyElement.textContent =
            createdNote.body;


        listItem.appendChild(titleElement);

        listItem.appendChild(bodyElement);


        // Put new note at the TOP
        notesList.prepend(listItem);


        // ========================================
        // Success message
        // ========================================

        status.textContent =
            `Note created (status ${response.status}, id ${createdNote.id}).`;


        // Clear form
        noteForm.reset();

    } catch (error) {

        status.textContent =
            "Sorry, we could not create the note.";

    } finally {

        // Enable button again
        submitButton.disabled = false;
    }
}


// ========================================
// Event listeners
// ========================================

loadButton.addEventListener(
    "click",
    loadNotes
);


noteForm.addEventListener(
    "submit",
    createNote
);
