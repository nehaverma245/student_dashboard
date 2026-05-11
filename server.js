const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const USERS_FILE = path.join(__dirname, 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'eduportal-secret-key';
const TOKEN_EXPIRES = '3h';

async function readUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf8');
    return JSON.parse(data || '{}');
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
}

async function writeUsers(users) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const users = await readUsers();

  if (users[normalizedEmail]) {
    return res.status(409).json({ message: 'An account with this email already exists.' });
  }

  users[normalizedEmail] = {
    name: String(name).trim(),
    email: normalizedEmail,
    password: String(password),
    createdAt: new Date().toISOString(),
  };

  await writeUsers(users);
  return res.status(201).json({ message: 'Registration successful.' });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const users = await readUsers();
  const user = users[normalizedEmail];

  if (!user || user.password !== password) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const token = createToken({ email: user.email, name: user.name });
  return res.json({ token, name: user.name });
});

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');

  if (!token) {
    return res.status(401).json({ message: 'Authentication token is missing.' });
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

app.get('/api/profile', authMiddleware, async (req, res) => {
  return res.json({ name: req.user.name, email: req.user.email });
});

app.get('/api/dashboard', authMiddleware, async (req, res) => {
  return res.json({
    profile: {
      name: req.user.name,
      email: req.user.email,
      major: 'Computer Science & Engineering',
      semester: 6,
      roll: 'CS21047',
    },
    stats: {
      attendance: 85,
      gpa: 8.4,
      assignmentsCompleted: 18,
      assignmentsTotal: 21,
    },
    courses: [
      { name: 'Machine Learning', grade: 'A' },
      { name: 'Database Systems', grade: 'A+' },
      { name: 'Web Technologies', grade: 'B+' },
      { name: 'Cyber Security', grade: 'B' },
    ],
  });
});

app.listen(PORT, () => {
  console.log(`EduPortal backend running at http://localhost:${PORT}`);
});
