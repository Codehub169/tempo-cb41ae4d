const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const jwt = require('jsonwebtoken'); // Added for JWT

const app = express();
const PORT = 9000; // Project requirement: frontend on port 9000

// Admin credentials & JWT Secret (for a real app, use environment variables and hashed passwords)
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin';
const JWT_SECRET = 'your-super-secret-key-for-jwt-!@#$%^&*()';

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
            db.run(`CREATE TABLE IF NOT EXISTS contacts (\n                id INTEGER PRIMARY KEY AUTOINCREMENT,\n                name TEXT NOT NULL,\n                email TEXT NOT NULL,\n                phone TEXT,\n                message TEXT NOT NULL,\n                submission_date TEXT DEFAULT CURRENT_TIMESTAMP\n            )`, (err) => {
                if (err) console.error("Error creating contacts table", err.message);
            });

            db.run(`CREATE TABLE IF NOT EXISTS appointments (\n                id INTEGER PRIMARY KEY AUTOINCREMENT,\n                patient_name TEXT NOT NULL,\n                phone TEXT NOT NULL,\n                email TEXT,\n                preferred_doctor TEXT,\n                preferred_date TEXT NOT NULL,\n                preferred_time_slot TEXT,\n                reason TEXT,\n                submission_date TEXT DEFAULT CURRENT_TIMESTAMP\n            )`, (err) => {
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

// Admin API Routes
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        const token = jwt.sign({ username: username, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ success: true, token: token });
    } else {
        res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }
});

// JWT Authentication Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer TOKEN

    if (token == null) {
        return res.status(401).json({ message: 'Access token is missing.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token.' });
        }
        req.user = user;
        next();
    });
}

app.get('/api/admin/appointments', authenticateToken, (req, res) => {
    db.all('SELECT * FROM appointments ORDER BY submission_date DESC', [], (err, rows) => {
        if (err) {
            console.error('Error fetching appointments:', err.message);
            return res.status(500).json({ message: 'Failed to fetch appointments.' });
        }
        res.json(rows);
    });
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

// Serve admin.html (can be accessed via /admin or /admin.html due to static serving)
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
