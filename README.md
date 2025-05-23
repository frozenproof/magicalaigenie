# magicalaigenie

# Local Notes App

A lightweight, offline-capable notes application that saves directly to your local filesystem.

## Features
- No dependencies, single HTML/JS implementation
- Real-time saving to local files in Markdown format
- Drag & drop support for content copying between notes
- Timestamp tracking for modifications
- Unsaved changes warning when closing
- Local time display
- No server required, runs entirely in browser

## Usage
1. Open `index.html` in a modern browser (Chrome/Edge supported :D fuck you microsoft, I only like macrohard)
2. Click "Choose Directory" to select where notes will be stored
3. Create new notes with "New Note" button
4. Import existing `.md` or `.txt` files
5. Drag notes from the sidebar to copy content into editor
6. All notes are saved as Markdown files with timestamps

## File Structure
```
your-chosen-directory/
├── index.html    # Main application file
├── notes.js      # Application logic
└── notes/        # Your notes directory (selected via browser)
    └── *.md      # Note files
```

## Note Format
Each note is saved as a Markdown file with metadata:
```markdown
# Note Title
<!-- Last saved: 2024-02-13T10:38:03.123Z -->

Note content here...
```

## Browser Requirements
- File System Access API support
- Modern browser (Chrome/Edge recommended)
- JavaScript enabled

## Limitations
- Works only in browsers supporting File System Access API (Basically any operating system that isn't mobile OS)
- Requires local file system access permission (Only for the chosen folder)
- No cloud sync (files are stored locally)

## Tips
- Use drag and drop to copy note contents
- Watch for the '*' indicator for unsaved changes
- Clock shows your local time
- Notes are automatically timestamped when saved