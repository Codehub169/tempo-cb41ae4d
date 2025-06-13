const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const app = express();
const PORT = 9000; // Project requirement: frontend on port 9000

// Database setup
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path.join(dataDir, 'clinic.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Create tables if they don't exist
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS contacts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT,
                message TEXT NOT NULL,
                submission_date TEXT DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) console.error("Error creating contacts table", err.message);
            });

            db.run(`CREATE TABLE IF NOT EXISTS appointments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_name TEXT NOT NULL,
                phone TEXT NOT NULL,
                email TEXT,
                preferred_doctor TEXT,
                preferred_date TEXT NOT NULL,
                preferred_time_slot TEXT,
                reason TEXT,
                submission_date TEXT DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) console.error("Error creating appointments table", err.message);
            });
        });
    }
});

// Middleware
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.post('/api/contact', (req, res) => {
    const { name, email, phone, message } = req.body;
    if (!name || !email || !message) {
        return res.status(400).json({ message: 'Name, email, and message are required.' });
    }

    const stmt = db.prepare('INSERT INTO contacts (name, email, phone, message) VALUES (?, ?, ?, ?)');
    stmt.run(name, email, phone, message, function(err) {
        if (err) {
            console.error('Error inserting contact data:', err.message);
            return res.status(500).json({ message: 'Failed to send message. Please try again later.' });
        }
        res.status(201).json({ message: 'Message received successfully! We will get back to you soon.', contactId: this.lastID });
    });
    stmt.finalize();
});

app.post('/api/book-appointment', (req, res) => {
    const { patient_name, phone, email, preferred_doctor, preferred_date, preferred_time_slot, reason } = req.body;
    if (!patient_name || !phone || !preferred_date) {
        return res.status(400).json({ message: 'Patient name, phone, and preferred date are required.' });
    }

    const stmt = db.prepare('INSERT INTO appointments (patient_name, phone, email, preferred_doctor, preferred_date, preferred_time_slot, reason) VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmt.run(patient_name, phone, email, preferred_doctor, preferred_date, preferred_time_slot, reason, function(err) {
        if (err) {
            console.error('Error inserting appointment data:', err.message);
            return res.status(500).json({ message: 'Failed to book appointment. Please try again later.' });
        }
        res.status(201).json({ message: 'Appointment requested successfully! Our team will call to confirm.', appointmentId: this.lastID });
    });
    stmt.finalize();
});

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/services.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'services.html'));
});

app.get('/doctors.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'doctors.html'));
});

app.get('/contact.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

app.get('/booking.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'booking.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
