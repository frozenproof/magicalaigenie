class NotesApp {
    async loadConfig() {
        try {
            // const response = await fetch('notes.cfg');
            // if (response.ok) {
            //     const config = await response.json();
            //     if (config.defaultDirectory) {
            //         const dirHandle = await window.showDirectoryPicker({
            //             startIn: config.defaultDirectory
            //         });
            //         if (dirHandle) {
            //             this.dirHandle = dirHandle;
            //             this.saveLocation.textContent = `Save Location: ${this.dirHandle.name}`;
            //             await this.loadNotes();
            //         }
            //     }
            // }
        } catch (err) {
            console.log('No config file found, using defaults');
        }
    }
    
    constructor() {
        this.dirHandle = null;
        this.currentNote = null;
        this.notes = new Map();
        this.loadConfig().then(() => this.setupUI());
        this.startClock();
    }

    startClock() {
        const updateClock = () => {
            const now = new Date();
            const time = now.toLocaleString()
                .replace('T', ' ')
                .replace(/\.\d{3}Z$/, '');
                document.getElementById('clock').textContent = time;
        };
        updateClock();
        setInterval(updateClock, 1000);
    }

    async setupUI() {
        // UI Elements
        this.titleInput = document.getElementById('noteTitle');
        this.contentInput = document.getElementById('noteContent');
        this.noteList = document.getElementById('noteList');
        this.status = document.getElementById('status');
        this.saveLocation = document.getElementById('saveLocation');
        
        // Button Events
        document.getElementById('newNote').onclick = () => this.newNote();
        document.getElementById('saveNote').onclick = () => this.saveCurrentNote();
        document.getElementById('chooseDir').onclick = () => this.chooseDirectory();
        document.getElementById('deleteNote').onclick = () => this.deleteCurrentNote();
        document.getElementById('importNote').onclick = () => this.importNotes();

        // Editor Events
        this.titleInput.oninput = () => this.setUnsaved();
        this.contentInput.oninput = () => this.setUnsaved();

        // Setup drag and drop
        this.setupDragAndDrop();
    }

    setupDragAndDrop() {
        // Allow dropping notes into editor
        this.contentInput.ondragover = (e) => {
            e.preventDefault();
            e.currentTarget.classList.add('drag-over');
        };
        
        this.contentInput.ondragleave = (e) => {
            e.currentTarget.classList.remove('drag-over');
        };
        
        this.contentInput.ondrop = async (e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('drag-over');
            const noteId = e.dataTransfer.getData('text/plain');
            const note = this.notes.get(noteId);
            if (note) {
                // Insert note content at cursor position or append
                const cursorPos = this.contentInput.selectionStart;
                const currentContent = this.contentInput.value;
                const newContent = currentContent.slice(0, cursorPos) + 
                                 note.content + 
                                 currentContent.slice(cursorPos);
                this.contentInput.value = newContent;
                this.setUnsaved();
            }
        };
    }



    async chooseDirectory() {
        try {
            this.dirHandle = await window.showDirectoryPicker();
            this.saveLocation.textContent = `Save Location: ${this.dirHandle.name}`;
            this.setStatus(`Using directory: ${this.dirHandle.name}`);
            await this.loadNotes();
        } catch (err) {
            this.setStatus('Error choosing directory');
            this.saveLocation.textContent = 'No folder selected';
        }
    }

    async loadNotes() {
        if (!this.dirHandle) return;
        this.notes.clear();
        
        for await (const entry of this.dirHandle.values()) {
            if (entry.kind === 'file' && entry.name.endsWith('.md')) {
                const note = await this.loadNote(entry);
                this.notes.set(note.id, note);
            }
        }
        
        this.refreshNoteList();
    }

    async loadNote(fileHandle) {
        try {
            const file = await fileHandle.getFile();
            const text = await file.text();
            const id = fileHandle.name.replace('.md', '');
            
            let title = 'Untitled';
            let content = text;
            let modified = file.lastModified;
            
            // Parse content and metadata
            if (text.startsWith('# ')) {
                const lines = text.split('\n');
                title = lines[0].substring(2).trim();
                
                // Look for timestamp in metadata
                const timestampMatch = text.match(/<!-- Last saved: (.*?) -->/);
                if (timestampMatch) {
                    modified = new Date(timestampMatch[1]).getTime();
                    // Remove metadata line from content
                    content = lines.slice(3).join('\n').trim();
                } else {
                    content = lines.slice(2).join('\n').trim();
                }
            }
    
            return {
                id,
                title,
                content,
                modified,
                unsaved: false
            };
        } catch (err) {
            console.error('Load error:', err);
            return {
                id: fileHandle.name.replace('.md', ''),
                title: 'Error loading note',
                content: '',
                modified: new Date(),
                unsaved: false
            };
        }
    }

    async saveCurrentNote() {
        if (!this.currentNote || !this.dirHandle) return;
        
        try {
            const saveTime = new Date().toISOString();
            const fileHandle = await this.dirHandle.getFileHandle(
                `${this.currentNote.id}.md`,
                { create: true }
            );
            
            // Include timestamp in file content
            const noteContent = `# ${this.currentNote.title}
                        <!-- Last saved: ${saveTime} -->

                        ${this.currentNote.content}`;
            
            const writer = await fileHandle.createWritable();
            await writer.write(noteContent);
            await writer.close();
            
            this.currentNote.unsaved = false;
            this.currentNote.modified = saveTime;
            this.refreshNoteList();
            this.setStatus('Note saved');
        } catch (err) {
            console.error('Save error:', err);
            this.setStatus('Error saving note');
        }
    }


    async deleteCurrentNote() {
        if (!this.currentNote || !this.dirHandle) return;

        if (!confirm('Are you sure you want to delete this note?')) return;

        try {
            await this.dirHandle.removeEntry(`${this.currentNote.id}.md`);
            this.notes.delete(this.currentNote.id);
            this.titleInput.value = '';
            this.contentInput.value = '';
            this.currentNote = null;
            this.refreshNoteList();
            this.setStatus('Note deleted');
        } catch (err) {
            console.error('Delete error:', err);
            this.setStatus('Error deleting note');
        }
    }

    async importNotes() {
        if (!this.dirHandle) {
            this.setStatus('Please select a save directory first');
            return;
        }

        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = '.md,.txt';

        input.onchange = async (e) => {
            const files = Array.from(e.target.files);
            let importedCount = 0;

            for (const file of files) {
                try {
                    const content = await file.text();
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const id = `note-${timestamp}-${file.name.replace(/[^a-zA-Z0-9]/g, '-')}`;
                    
                    let title = file.name.replace(/\.(md|txt)$/, '');
                    let noteContent = content;

                    if (content.startsWith('# ')) {
                        const lines = content.split('\n');
                        title = lines[0].substring(2).trim();
                        noteContent = lines.slice(2).join('\n');
                    }

                    // Save the note file
                    const fileHandle = await this.dirHandle.getFileHandle(`${id}.md`, { create: true });
                    const writer = await fileHandle.createWritable();
                    await writer.write(`# ${title}\n\n${noteContent}`);
                    await writer.close();

                    // Add to notes collection
                    this.notes.set(id, {
                        id,
                        title,
                        content: noteContent,
                        modified: new Date(),
                        unsaved: false
                    });
                    importedCount++;
                } catch (err) {
                    console.error('Error importing file:', file.name, err);
                }
            }

            this.refreshNoteList();
            this.setStatus(`Imported ${importedCount} note${importedCount !== 1 ? 's' : ''}`);
        };

        input.click();
    }

    newNote() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const note = {
            id: `note-${timestamp}`,
            title: 'New Note',
            content: '',
            modified: new Date(),
            unsaved: true
        };
        
        this.notes.set(note.id, note);
        this.refreshNoteList();
        this.selectNote(note);
        this.titleInput.focus();
        this.titleInput.select();
    }

    selectNote(note) {
        this.currentNote = note;
        this.titleInput.value = note.title;
        this.contentInput.value = note.content;
        this.refreshNoteList();
    }

    setUnsaved() {
        if (this.currentNote) {
            this.currentNote.unsaved = true;
            this.currentNote.title = this.titleInput.value;
            this.currentNote.content = this.contentInput.value;
            this.currentNote.modified = new Date();
            this.refreshNoteList();
        }
    }

    refreshNoteList() {
        this.noteList.innerHTML = '';
        for (const note of this.notes.values()) {
            this.noteList.appendChild(this.createNoteElement(note));
        }
    }

    createNoteElement(note) {
        const el = document.createElement('div');
        el.className = 'note-item';
        if (this.currentNote && this.currentNote.id === note.id) {
            el.classList.add('selected');
        }
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'note-title';
        titleDiv.textContent = note.title || 'Untitled';
        if (note.unsaved) {
            titleDiv.textContent += ' *';
        }

        const timeDiv = document.createElement('div');
        timeDiv.className = 'note-time';
        timeDiv.textContent = new Date(note.modified).toLocaleString();

        el.appendChild(titleDiv);
        el.appendChild(timeDiv);

        el.draggable = true;
        el.onclick = () => this.selectNote(note);
        
        el.ondragstart = (e) => {
            e.dataTransfer.setData('text/plain', note.id);
            el.classList.add('dragging');
        };
        el.ondragend = () => el.classList.remove('dragging');
        
        return el;
    }

    setStatus(message) {
        this.status.textContent = message;
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new NotesApp();
    window.addEventListener('beforeunload', (e) => {
    const app = window.app;
    if (app && app.notes) {
        for (const note of app.notes.values()) {
            if (note.unsaved) {
                e.preventDefault();
                // e.returnValue = '';
                return;
            }
        }
    }
});
});