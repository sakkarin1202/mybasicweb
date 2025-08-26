const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.'));

// Initialize SQLite database
const dbPath = path.join(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        initializeDatabase();
    }
});

// Create users table if it doesn't exist
function initializeDatabase() {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            gender TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            country TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    db.run(createTableQuery, (err) => {
        if (err) {
            console.error('Error creating table:', err.message);
        } else {
            console.log('Users table ready.');
        }
    });
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Register new user
app.post('/register', (req, res) => {
    const { name, gender, email, country } = req.body;
    
    // Validation
    if (!name || !gender || !email || !country) {
        return res.status(400).send('All fields are required');
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).send('Invalid email format');
    }
    
    const insertQuery = `
        INSERT INTO users (name, gender, email, country)
        VALUES (?, ?, ?, ?)
    `;
    
    db.run(insertQuery, [name, gender, email, country], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).send('Email already exists');
            }
            console.error('Database error:', err.message);
            return res.status(500).send('Database error');
        }
        
        console.log(`New user registered: ${name} (ID: ${this.lastID})`);
        res.status(200).send('User registered successfully');
    });
});

// Get all users
app.get('/users', (req, res) => {
    const selectQuery = `
        SELECT id, name, gender, email, country, created_at
        FROM users
        ORDER BY created_at DESC
    `;
    
    db.all(selectQuery, [], (err, rows) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: 'Database error' });
        }
        
        res.json(rows);
    });
});

// Get user by ID
app.get('/users/:id', (req, res) => {
    const userId = req.params.id;
    const selectQuery = `
        SELECT id, name, gender, email, country, created_at
        FROM users
        WHERE id = ?
    `;
    
    db.get(selectQuery, [userId], (err, row) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!row) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(row);
    });
});

// Delete user (optional feature)
app.delete('/users/:id', (req, res) => {
    const userId = req.params.id;
    const deleteQuery = `DELETE FROM users WHERE id = ?`;
    
    db.run(deleteQuery, [userId], function(err) {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).send('Database error');
        }
        
        if (this.changes === 0) {
            return res.status(404).send('User not found');
        }
        
        console.log(`User deleted: ID ${userId}`);
        res.status(200).send('User deleted successfully');
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Registration form is ready!');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});