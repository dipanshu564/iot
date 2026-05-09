const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// DB setup
const db = new sqlite3.Database('./data.db');
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS sensor_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    temp REAL,
    hum REAL,
    timestamp TEXT
  )`);
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'register.html'));
});

app.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, password], (err) => {
    if (err) {
      return res.send('Error registering user');
    }
    res.redirect('/?message=Registered successfully');
  });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, row) => {
    if (err || !row) {
      return res.send('Invalid credentials');
    }
    res.redirect(`/dashboard?user=${row.name}`);
  });
});

app.get('/dashboard', (req, res) => {
  const user = req.query.user;
  if (!user) return res.redirect('/');
  fs.readFile('dashboard.html', 'utf8', (err, data) => {
    if (err) return res.send('Error');
    // Simple replace for username
    data = data.replace('{{username}}', user);
    res.send(data);
  });
});

app.get('/api/latest', (req, res) => {
  db.get('SELECT * FROM sensor_data ORDER BY id DESC LIMIT 1', (err, row) => {
    if (err || !row) return res.json({ temp: 'N/A', hum: 'N/A', time: 'N/A', date: 'N/A' });
    const date = new Date(row.timestamp);
    res.json({
      temp: row.temp + " 'C",
      hum: row.hum + ' %',
      time: date.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
      date: date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })
    });
  });
});

app.get('/api/records', (req, res) => {
  db.all('SELECT * FROM sensor_data ORDER BY id DESC', (err, rows) => {
    if (err) return res.json([]);
    const records = rows.map((row, index) => {
      const date = new Date(row.timestamp);
      return {
        id: row.id,
        num: index + 1,
        temp: row.temp + " 'C",
        hum: row.hum + ' %',
        time: date.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
        date: date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })
      };
    });
    res.json(records);
  });
});

app.post('/api/save-text', (req, res) => {
  const { text } = req.body;
  if (text.length > 16) return res.send('Text too long');
  fs.writeFile('lcd.txt', text, (err) => {
    if (err) return res.send('Error');
    res.send('Saved');
  });
});

app.get('/api/get-lcd-text', (req, res) => {
  fs.readFile('lcd.txt', 'utf8', (err, data) => {
    if (err) return res.send('');
    res.send(data);
  });
});

// ESP API
app.get('/save-data', (req, res) => {
  const { temp, hum } = req.query;
  const timestamp = new Date().toISOString();
  db.run('INSERT INTO sensor_data (temp, hum, timestamp) VALUES (?, ?, ?)', [parseFloat(temp), parseFloat(hum), timestamp], (err) => {
    if (err) return res.send('Error');
    res.send('Data saved');
  });
});

app.delete('/api/delete/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM sensor_data WHERE id = ?', [id], (err) => {
    if (err) return res.send('Error');
    res.send('Deleted');
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});