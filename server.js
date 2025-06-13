const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 9000;

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin';
const JWT_SECRET = 'your-super-secret-key-for-jwt-!@#$%^&*()';

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

            // Create doctors table
            db.run(`CREATE TABLE IF NOT EXISTS doctors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                specialty TEXT NOT NULL,
                bio TEXT,
                image_url TEXT
            )`, (err) => {
                if (err) console.error("Error creating doctors table", err.message);
            });

            // Modify appointments table to use preferred_doctor_id
            // Step 1: Check if 'preferred_doctor_id' column exists
            db.all("PRAGMA table_info(appointments)", (err, columns) => {
                if (err) {
                    console.error("Error fetching appointments table info:", err.message);
                    // If appointments table doesn't exist yet, create it fully below
                     db.run(`CREATE TABLE IF NOT EXISTS appointments (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        patient_name TEXT NOT NULL,
                        phone TEXT NOT NULL,
                        email TEXT,
                        preferred_date TEXT NOT NULL,
                        preferred_time_slot TEXT,
                        reason TEXT,
                        submission_date TEXT DEFAULT CURRENT_TIMESTAMP,
                        preferred_doctor_id INTEGER REFERENCES doctors(id)
                    )`, (err) => {
                        if (err) console.error("Error creating appointments table initially", err.message);
                    });
                    return;
                }
                
                const hasOldDoctorColumn = columns.some(col => col.name === 'preferred_doctor');
                const hasNewDoctorIdColumn = columns.some(col => col.name === 'preferred_doctor_id');

                if (!hasNewDoctorIdColumn) {
                    db.run(`ALTER TABLE appointments ADD COLUMN preferred_doctor_id INTEGER REFERENCES doctors(id)`, (err) => {
                        if (err) {
                            console.warn("Could not add preferred_doctor_id column (might exist or other issue, e.g. table has data with FK constraint):", err.message);
                        } else {
                            console.log("Column 'preferred_doctor_id' added to appointments table.");
                             // If old column 'preferred_doctor' exists, it's generally better to handle its data migration
                             // and removal in a separate, controlled script. For this prototype, we'll leave it.
                        }
                    });
                } else {
                     // Ensure the base appointments table is created if it somehow passed the initial check but is malformed
                    db.run(`CREATE TABLE IF NOT EXISTS appointments (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        patient_name TEXT NOT NULL,
                        phone TEXT NOT NULL,
                        email TEXT,
                        preferred_date TEXT NOT NULL,
                        preferred_time_slot TEXT,
                        reason TEXT,
                        submission_date TEXT DEFAULT CURRENT_TIMESTAMP,
                        preferred_doctor_id INTEGER REFERENCES doctors(id) 
                        ${hasOldDoctorColumn && !hasNewDoctorIdColumn ? ', preferred_doctor TEXT' : ''} 
                    )`, (err) => {
                        if (err) console.error("Error creating/ensuring appointments table structure", err.message);
                    });
                }
            });
        });
    }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
    const { patient_name, phone, email, preferred_doctor_id, preferred_date, preferred_time_slot, reason } = req.body;
    if (!patient_name || !phone || !preferred_date) {
        return res.status(400).json({ message: 'Patient name, phone, and preferred date are required.' });
    }
    let doctorId = preferred_doctor_id === 'any' || !preferred_doctor_id ? null : parseInt(preferred_doctor_id);

    const stmt = db.prepare('INSERT INTO appointments (patient_name, phone, email, preferred_doctor_id, preferred_date, preferred_time_slot, reason) VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmt.run(patient_name, phone, email, doctorId, preferred_date, preferred_time_slot, reason, function(err) {
        if (err) {
            console.error('Error inserting appointment data:', err.message);
            return res.status(500).json({ message: 'Failed to book appointment. Please try again later.' });
        }
        res.status(201).json({ message: 'Appointment requested successfully! Our team will call to confirm.', appointmentId: this.lastID });
    });
    stmt.finalize();
});

// Public API to get doctors for booking form and public pages
app.get('/api/doctors', (req, res) => {
    db.all('SELECT id, name, specialty, bio, image_url FROM doctors ORDER BY name', [], (err, rows) => {
        if (err) {
            console.error('Error fetching doctors:', err.message);
            return res.status(500).json({ message: 'Failed to fetch doctors.' });
        }
        res.json(rows);
    });
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

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.status(401).json({ message: 'Access token is missing.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid or expired token.' });
        req.user = user;
        next();
    });
}

// Get appointments for admin (joined with doctors)
app.get('/api/admin/appointments', authenticateToken, (req, res) => {
    const query = `
        SELECT 
            a.id, a.patient_name, a.phone, a.email, 
            a.preferred_date, a.preferred_time_slot, a.reason, a.submission_date,
            d.name as doctor_name
        FROM appointments a
        LEFT JOIN doctors d ON a.preferred_doctor_id = d.id
        ORDER BY a.submission_date DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error fetching appointments for admin:', err.message);
            return res.status(500).json({ message: 'Failed to fetch appointments.' });
        }
        const appointments = rows.map(app => ({
            ...app,
            doctor_name: app.doctor_name || 'Any Available Doctor'
        })); 
        res.json(appointments);
    });
});

// Delete an appointment
app.delete('/api/admin/appointments/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM appointments WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Error deleting appointment:', err.message);
            return res.status(500).json({ message: 'Failed to delete appointment.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Appointment not found.'});
        }
        res.json({ message: 'Appointment deleted successfully.' });
    });
});

// Doctor Management APIs
app.post('/api/admin/doctors', authenticateToken, (req, res) => {
    const { name, specialty, bio, image_url } = req.body;
    if (!name || !specialty) {
        return res.status(400).json({ message: 'Doctor name and specialty are required.' });
    }
    const stmt = db.prepare('INSERT INTO doctors (name, specialty, bio, image_url) VALUES (?, ?, ?, ?)');
    stmt.run(name, specialty, bio || null, image_url || null, function(err) {
        if (err) {
            console.error('Error adding doctor:', err.message);
            if (err.message.includes('UNIQUE constraint failed: doctors.name')) {
                return res.status(409).json({ message: 'Doctor with this name already exists.' });
            }
            return res.status(500).json({ message: 'Failed to add doctor.' });
        }
        res.status(201).json({ message: 'Doctor added successfully.', doctorId: this.lastID });
    });
    stmt.finalize();
});

app.get('/api/admin/doctors', authenticateToken, (req, res) => {
    db.all('SELECT id, name, specialty, bio, image_url FROM doctors ORDER BY name', [], (err, rows) => {
        if (err) {
            console.error('Error fetching doctors for admin:', err.message);
            return res.status(500).json({ message: 'Failed to fetch doctors.' });
        }
        res.json(rows);
    });
});

app.delete('/api/admin/doctors/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.get('SELECT COUNT(*) as count FROM appointments WHERE preferred_doctor_id = ?', [id], (err, row) => {
        if (err) {
            console.error('Error checking appointments for doctor:', err.message);
            return res.status(500).json({ message: 'Failed to delete doctor due to a server error checking appointments.' });
        }
        if (row.count > 0) {
            return res.status(400).json({ message: `Cannot delete doctor. ${row.count} appointment(s) are linked to this doctor. Please update or delete those appointments first.` });
        }

        db.run('DELETE FROM doctors WHERE id = ?', [id], function(err) {
            if (err) {
                console.error('Error deleting doctor:', err.message);
                return res.status(500).json({ message: 'Failed to delete doctor.' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Doctor not found.'});
            }
            res.json({ message: 'Doctor deleted successfully.' });
        });
    });
});

// Serve HTML pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/services.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'services.html')));
app.get('/doctors.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'doctors.html')));
app.get('/contact.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'contact.html')));
app.get('/booking.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'booking.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
