const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Налаштування безпеки та лімітів для передачі великих даних (наприклад, малюнків Canvas у Base64)
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Статичний доступ до папки з завантаженими фотографіями замовлень
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🌟 РОЗДАЧА ФРОНТЕНДУ: Сервер автоматично роздає HTML/JS файли з папки frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// Шляхи до файлів нашої локальної бази даних (JSON)
const USERS_FILE = path.join(__dirname, 'users.json');
const ORDERS_FILE = path.join(__dirname, 'orders.json');
const PAINTINGS_FILE = path.join(__dirname, 'paintings.json');

// Допоміжні функції для зчитування/запису JSON-файлів
const loadData = (file) => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : [];
const saveData = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// Перевірка та автоматичне створення папки uploads, щоб сервер не падав при замовленні по фото
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'));
}

// Налаштування модуля multer для збереження файлів замовлень клієнтів
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Секретний ключ для шифрування JWT (береться з хмари Railway або ставиться дефолтний)
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_artcanvas';

// Мідлвар для захисту роутів замовлень (перевірка авторизації користувача)
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ msg: 'Доступ заборонено. Будь ласка, авторизуйтесь!' });
  try {
    const cleanToken = token.split(' ')[1] || token;
    const decoded = jwt.verify(cleanToken, JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) { 
    res.status(401).json({ msg: 'Сесія застаріла або токен недійсний' }); 
  }
};

// ==========================================
// 🔐 API РОУТИ ДЛЯ АВТОРИЗАЦІЇ (AUTH)
// ==========================================

// Реєстрація нового користувача
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  let users = loadData(USERS_FILE);
  
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ msg: 'Користувач з таким Email вже існує' });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = { id: Date.now().toString(), name, email, password: hashedPassword };
  users.push(newUser);
  saveData(USERS_FILE, users);

  const token = jwt.sign({ user: { id: newUser.id } }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: newUser.id, name: newUser.name, email: newUser.email } });
});

// Вхід в акаунт
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  let users = loadData(USERS_FILE);
  
  const user = users.find(u => u.email === email);
  if (!user) return res.status(400).json({ msg: 'Неправильний Email або пароль' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ msg: 'Неправильний Email або пароль' });

  const token = jwt.sign({ user: { id: user.id } }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

// ==========================================
// 🎨 API РОУТИ ДЛЯ КАТАЛОГУ (ГАЛЕРЕЇ)
// ==========================================

// Отримання списку всіх картин на продаж
app.get('/api/paintings', (
