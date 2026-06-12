const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Налаштування безпеки та лімітів для передачі великих зображень (наприклад, Canvas Base64)
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Статичний доступ до папки з завантаженими фотографіями товарів та клієнтів
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🌟 РОЗДАЧА ФРОНТЕНДУ: Сервер сам показує твій фронтенд із папки frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// Шляхи до файлів нашої локальної бази даних
const USERS_FILE = path.join(__dirname, 'users.json');
const ORDERS_FILE = path.join(__dirname, 'orders.json');
const PAINTINGS_FILE = path.join(__dirname, 'paintings.json');

// Допоміжні функції для зчитування/запису JSON-файлів
const loadData = (file) => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : [];
const saveData = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// Автоматичне створення папки uploads на сервері, якщо її немає
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'));
}

// Налаштування модуля multer для збереження файлів (картин та фото замовлень)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Секретний ключ для шифрування JWT (береться з хмари Railway або ставиться дефолтний)
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_artcanvas';

// Мідлвар для захисту роутів (перевірка авторизації користувача)
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
app.get('/api/paintings', (req, res) => {
  let paintings = loadData(PAINTINGS_FILE);
  
  // Якщо база даних порожня (перший запуск), створимо демо-товари
  if (paintings.length === 0) {
    paintings = [
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
    saveData(PAINTINGS_FILE, paintings);
  }
  res.json(paintings);
});

// Додавання нової картини на продаж (через admin.html)
app.post('/api/paintings/add', upload.single('image'), (req, res) => {
  const { title, price, category, technique, size, description } = req.body;
  let paintings = loadData(PAINTINGS_FILE);

  if (!req.file) {
    return res.status(400).json({ msg: 'Будь ласка, завантажте фотографію картини!' });
  }

  const newPainting = {
    _id: Date.now().toString(),
    title,
    price: Number(price),
    category,
    technique,
    size,
    description,
    imageUrl: `/uploads/${req.file.filename}` // Локальне посилання всередині сервера
  };

  paintings.push(newPainting);
  saveData(PAINTINGS_FILE, paintings);

  res.json({ msg: '🎉 Картину успішно додано в загальний каталог!', painting: newPainting });
});

// ==========================================
// 🛒 API РОУТИ ДЛЯ ОФОРМЛЕННЯ ЗАМОВЛЕНЬ
// ==========================================

// Створення замовлення (для всіх типів: з каталогу, завантаження фото, Canvas)
app.post('/api/paintings/order', authMiddleware, upload.single('photo'), (req, res) => {
  const { orderType, size, material, comment, canvasImage, totalPrice, items } = req.body;
  let orders = loadData(ORDERS_FILE);

  let customImage = null;
  if (orderType === 'by_photo' && req.file) {
    customImage = `/uploads/${req.file.filename}`;
  } else if (orderType === 'canvas_editor') {
    customImage = canvasImage; // рядок у форматі base64
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
  res.json({ msg: '🎉 Замовлення успішно створено!', order: newOrder });
});

// Запасний роут: якщо користувач оновить сторінку вручну, сервер поверне головну сторінку
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Запуск сервера (порт автоматично виділяється платформою Railway)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Сервер успішно запущено на порту ${PORT}`));
