const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Налаштування безпеки та обробки даних
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Статичний доступ до папки з завантаженими фото
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🌟 РОЗДАЧА ФРОНТЕНДУ: Сервер сам показує твій фронтенд із папки frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// Шляхи до локальних файлів бази даних
const USERS_FILE = path.join(__dirname, 'users.json');
const ORDERS_FILE = path.join(__dirname, 'orders.json');

// Допоміжні функції для зчитування/запису JSON
const loadData = (file) => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : [];
const saveData = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// Перевірка та автоматичне створення папки uploads, якщо її немає
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'));
}

// Налаштування multer для збереження фотографій клієнтів (замовлення по фото)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Секретний ключ для JWT (береться з налаштувань Railway або використовується дефолтний)
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_artcanvas';

// Мідлвар для перевірки авторизації користувача
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ msg: 'Доступ заборонено. Авторизуйтесь!' });
  try {
    const cleanToken = token.split(' ')[1] || token;
    const decoded = jwt.verify(cleanToken, JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) { 
    res.status(401).json({ msg: 'Токен завеликий або недійсний' }); 
  }
};

// ==========================================
// API РОУТИ ДЛЯ АВТОРИЗАЦІЇ (AUTH)
// ==========================================

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
// API РОУТИ ДЛЯ ГАЛЕРЕЇ ТА ЗАМОВЛЕНЬ
// ==========================================

// Отримання списку картин для Галереї (Каталогу)
app.get('/api/paintings', (req, res) => {
  // Демонстраційні картини, які одразу відобразяться на фронтенді в галереї
  const mockPaintings = [
    { 
      _id: "1", 
      title: "Захід сонця над Дніпром", 
      price: 2500, 
      category: "Пейзаж", 
      technique: "Олія", 
      size: "50x70 см", 
      imageUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=500", 
      description: "Теплий літній вечір на березі річки, виконаний класичними мазками олією." 
    },
    { 
      _id: "2", 
      title: "Абстрактна думка", 
      price: 4200, 
      category: "Абстракція", 
      technique: "Акрил", 
      size: "60x60 см", 
      imageUrl: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=500", 
      description: "Яскрава інтер'єрна робота, що передає хаос та гармонію людських емоцій." 
    }
  ];
  res.json(mockPaintings);
});

// Створення єдиного замовлення (для всіх 3-х типів)
app.post('/api/paintings/order', authMiddleware, upload.single('photo'), (req, res) => {
  const { orderType, size, material, comment, canvasImage, totalPrice, items } = req.body;
  let orders = loadData(ORDERS_FILE);

  // Визначаємо шлях до картинки залежно від типу замовлення
  let customImage = null;
  if (orderType === 'by_photo' && req.file) {
    customImage = `/uploads/${req.file.filename}`; // збережений файл через multer
  } else if (orderType === 'canvas_editor') {
    customImage = canvasImage; // рядок base64 з онлайн-редактора
  }

  const newOrder = {
    id: Date.now().toString(),
    userId: req.user.id,
    orderType,
    items: items ? JSON.parse(items) : [],
    customImage,
    specifications: { size, material, comment },
    totalPrice: Number(totalPrice),
    status: 'pending',
    createdAt: new Date()
  };

  orders.push(newOrder);
  saveData(ORDERS_FILE, orders);
  res.json({ msg: '🎉 Замовлення успішно прийнято!', order: newOrder });
});

// Перенаправлення будь-яких інших запитів на головну сторінку фронтенду
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Запуск сервера на порту, який динамічно виділяє Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Сервер успішно запущено на порту ${PORT}`));
