const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'frontend')));

const USERS_FILE = path.join(__dirname, 'users.json');
const ORDERS_FILE = path.join(__dirname, 'orders.json');
const PAINTINGS_FILE = path.join(__dirname, 'paintings.json');

const loadData = (file) => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : [];
const saveData = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'));
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_artcanvas';

// Мідлвар захисту для клієнтів
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ msg: 'Доступ заборонено. Авторизуйтесь!' });
  try {
    const cleanToken = token.split(' ')[1] || token;
    const decoded = jwt.verify(cleanToken, JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) { 
    res.status(401).json({ msg: 'Сесія застаріла' }); 
  }
};

// Мідлвар захисту для адміністратора
const adminMiddleware = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ msg: 'Потрібні права адміністратора!' });
  try {
    const cleanToken = token.split(' ')[1] || token;
    const decoded = jwt.verify(cleanToken, JWT_SECRET);
    if (decoded.user.role !== 'admin') {
      return res.status(403).json({ msg: 'У вас немає доступу!' });
    }
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Недійсний токен адміна' });
  }
};

// --- РОУТИ АВТОРИЗАЦІЇ (ТЕЛЕФОН) ---
app.post('/api/auth/register', async (req, res) => {
  const { name, phone, password } = req.body;
  let users = loadData(USERS_FILE);
  
  if (users.find(u => u.phone === phone)) {
    return res.status(400).json({ msg: 'Користувач з цим номером телефону вже існує!' });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  const newUser = { id: Date.now().toString(), name, phone, password: hashedPassword };
  
  users.push(newUser);
  saveData(USERS_FILE, users);
  
  const token = jwt.sign({ user: { id: newUser.id, role: 'user' } }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: newUser.id, name: newUser.name, phone: newUser.phone } });
});

app.post('/api/auth/login', async (req, res) => {
  const { phone, password } = req.body;
  let users = loadData(USERS_FILE);
  
  const user = users.find(u => u.phone === phone);
  if (!user) return res.status(400).json({ msg: 'Неправильний номер телефону або пароль' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ msg: 'Неправильний номер телефону або пароль' });

  const token = jwt.sign({ user: { id: user.id, role: 'user' } }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name: user.name, phone: user.phone } });
});

app.post('/api/auth/admin-login', (req, res) => {
  const { login, password } = req.body;
  if (login === "admin" && password === "Admin777Canvas") {
    const token = jwt.sign({ user: { id: "admin_root", role: "admin" } }, JWT_SECRET, { expiresIn: '1d' });
    return res.json({ token, msg: "Успішний вхід в панель керування!" });
  }
  return res.status(401).json({ msg: "Невірний логін або пароль адміна!" });
});

// --- РОУТИ ГАЛЕРЕЇ ---
app.get('/api/paintings', (req, res) => {
  res.json(loadData(PAINTINGS_FILE));
});

app.post('/api/paintings/add', adminMiddleware, (req, res) => {
  const { title, price, category, technique, size, description, imageUrl } = req.body;
  let paintings = loadData(PAINTINGS_FILE);
  if (!imageUrl) return res.status(400).json({ msg: 'Вкажіть посилання на фото!' });

  const newPainting = { _id: Date.now().toString(), title, price: Number(price), category, technique, size, description, imageUrl };
  paintings.push(newPainting);
  saveData(PAINTINGS_FILE, paintings);
  res.json({ msg: '🎉 Картину успішно додано!', painting: newPainting });
});

// --- РОУТИ ЗАМОВЛЕНЬ ---
app.post('/api/paintings/order', authMiddleware, upload.single('photo'), (req, res) => {
  const { orderType, size, material, comment, canvasImage, totalPrice, items } = req.body;
  let orders = loadData(ORDERS_FILE);

  let customImage = orderType === 'by_photo' && req.file ? `/uploads/${req.file.filename}` : (orderType === 'canvas_editor' ? canvasImage : null);

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

// 👑 РОУТИ АДМІНІСТРАТОРА: ОТРИМАННЯ ЗАМОВЛЕНЬ + ТЕЛЕФОНИ
app.get('/api/admin/orders', adminMiddleware, (req, res) => {
  let orders = loadData(ORDERS_FILE);
  let users = loadData(USERS_FILE);

  let ordersWithUsers = orders.map(order => {
    const buyer = users.find(u => u.id === order.userId);
    return {
      ...order,
      buyerName: buyer ? buyer.name : 'Невідомий клієнт',
      buyerPhone: buyer ? buyer.phone : 'Телефон відсутній'
    };
  });
  res.json(ordersWithUsers);
});

// 👑 РОУТ АДМІНІСТРАТОРА: ЗМІНА СТАТУСУ ЗАМОВЛЕННЯ
app.put('/api/admin/orders/:id/status', adminMiddleware, (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;
  
  let orders = loadData(ORDERS_FILE);
  const orderIndex = orders.findIndex(o => o.id === orderId);

  if (orderIndex === -1) {
    return res.status(404).json({ msg: 'Замовлення не знайдено!' });
  }

  orders[orderIndex].status = status;
  saveData(ORDERS_FILE, orders);
  res.json({ msg: `Статус замовлення №${orderId} успішно змінено!` });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Сервер запущено на порту ${PORT}`));
