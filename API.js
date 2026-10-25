
const API_URL = "https://jsonplaceholder.typicode.com/posts?_limit=10";

const loadButton = document.querySelector("#load-btn");
const status = document.querySelector("#status");
const notesList = document.querySelector("#notes-list");


async function loadNotes() {
    try {
        // Show loading state
        status.textContent = "Loading notes...";
        loadButton.disabled = true;

        // Send GET request
        const response = await fetch(API_URL);

        // Check if request was successful
        if (!response.ok) {
            throw new Error("Failed to load notes.");
        }

        // Convert response to JavaScript data
        const notes = await response.json();

        // Clear previous notes
        notesList.textContent = "";

        // Handle empty response
        if (notes.length === 0) {
            const emptyMessage = document.createElement("li");
            emptyMessage.textContent = "No notes found.";
            notesList.appendChild(emptyMessage);

            status.textContent = "No notes were found.";
            return;
        }

        // Display each note
        notes.forEach(function (note) {
            const listItem = document.createElement("li");

            const title = document.createElement("h2");
            title.textContent = note.title;

            const body = document.createElement("p");
            body.textContent = note.body;

            listItem.appendChild(title);
            listItem.appendChild(body);

            notesList.appendChild(listItem);
        });

        // Success message
        status.textContent = `Loaded ${notes.length} notes from the server.`;

    } catch (error) {
        // Error state
        status.textContent = "Sorry, we could not load the notes.";
        notesList.textContent = "";

    } finally {
        // Enable button again
        loadButton.disabled = false;
    }
}


// Run loadNotes when the button is clicked
loadButton.addEventListener("click", loadNotes);
