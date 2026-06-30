const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 4000;

const DATA_FILE = path.join(__dirname, 'data.json');
const ADMIN_USERS = [
  { username: 'admin1', password: 'admin123' },
  { username: 'admin2', password: 'admin123' },
  { username: 'admin3', password: 'admin123' },
  { username: 'admin4', password: 'admin123' },
  { username: 'admin5', password: 'admin123' }
];

function initDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ tickets: [], nextId: 1 }, null, 2));
  }
}
initDataFile();

function readTickets() {
  const data = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(data).tickets;
}
function writeTickets(tickets) {
  const data = fs.readFileSync(DATA_FILE, 'utf8');
  const json = JSON.parse(data);
  json.tickets = tickets;
  fs.writeFileSync(DATA_FILE, JSON.stringify(json, null, 2));
}
function getNextId() {
  const data = fs.readFileSync(DATA_FILE, 'utf8');
  const json = JSON.parse(data);
  const nextId = json.nextId || 1;
  json.nextId = nextId + 1;
  fs.writeFileSync(DATA_FILE, JSON.stringify(json, null, 2));
  return nextId;
}
function generateTicketNo() {
  const now = new Date();
  const dateStr = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0') +
    now.getSeconds().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `JX${dateStr}${random}`;
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'jixi-youjia-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) next();
  else res.status(401).json({ error: '未登录' });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, 'uploads/'); },
  filename: (req, file, cb) => { cb(null, 'logo.png'); }
});
const upload = multer({ storage });

// 前台公开API（仅查询）
app.get('/api/public/tickets', (req, res) => {
  const { ticket_no, phone } = req.query;
  let tickets = readTickets();
  if (ticket_no) tickets = tickets.filter(t => t.ticket_no === ticket_no);
  else if (phone) tickets = tickets.filter(t => t.phone === phone);
  else return res.status(400).json({ error: '请提供工单号或手机号' });
  const result = tickets.map(t => ({
    ticket_no: t.ticket_no,
    customer_name: t.customer_name,
    device_model: t.device_model,
    fault: t.fault,
    visit_fee: t.visit_fee,
    inspect_fee: t.inspect_fee,
    repair_cost: t.repair_cost,
    parts_cost: t.parts_cost,
    total_amount: t.total_amount,
    payment_status: t.payment_status,
    created_at: t.created_at,
    payment_date: t.payment_date
  }));
  res.json(result);
});

// 后台管理API
app.get('/api/admin/tickets', requireAuth, (req, res) => {
  const tickets = readTickets();
  tickets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(tickets);
});
app.get('/api/admin/tickets/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  const ticket = readTickets().find(t => t.id === id);
  if (!ticket) return res.status(404).json({ error: '工单不存在' });
  res.json(ticket);
});
app.post('/api/admin/tickets', requireAuth, (req, res) => {
  const { customer_name, phone, device_model, fault, visit_fee = 0, inspect_fee = 0, repair_cost = 0, parts_cost = 0 } = req.body;
  if (!customer_name) return res.status(400).json({ error: '客户姓名不能为空' });
  const id = getNextId();
  const ticket_no = generateTicketNo();
  const total_amount = Number(visit_fee) + Number(inspect_fee) + Number(repair_cost) + Number(parts_cost);
  const now = new Date().toISOString();
  const newTicket = {
    id, ticket_no, customer_name, phone: phone || '', device_model: device_model || '',
    fault: fault || '', visit_fee: Number(visit_fee), inspect_fee: Number(inspect_fee),
    repair_cost: Number(repair_cost), parts_cost: Number(parts_cost),
    total_amount, payment_status: 0, payment_date: null, created_at: now, updated_at: now
  };
  const tickets = readTickets();
  tickets.push(newTicket);
  writeTickets(tickets);
  res.status(201).json(newTicket);
});
app.put('/api/admin/tickets/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  const { customer_name, phone, device_model, fault, visit_fee, inspect_fee, repair_cost, parts_cost, payment_status } = req.body;
  let tickets = readTickets();
  const index = tickets.findIndex(t => t.id === id);
  if (index === -1) return res.status(404).json({ error: '工单不存在' });
  const old = tickets[index];
  const updated = { ...old,
    customer_name: customer_name !== undefined ? customer_name : old.customer_name,
    phone: phone !== undefined ? phone : old.phone,
    device_model: device_model !== undefined ? device_model : old.device_model,
    fault: fault !== undefined ? fault : old.fault,
    visit_fee: visit_fee !== undefined ? Number(visit_fee) : old.visit_fee,
    inspect_fee: inspect_fee !== undefined ? Number(inspect_fee) : old.inspect_fee,
    repair_cost: repair_cost !== undefined ? Number(repair_cost) : old.repair_cost,
    parts_cost: parts_cost !== undefined ? Number(parts_cost) : old.parts_cost,
  };
  updated.total_amount = updated.visit_fee + updated.inspect_fee + updated.repair_cost + updated.parts_cost;
  const newPayStatus = payment_status !== undefined ? payment_status : updated.payment_status;
  if (newPayStatus === 1 && updated.payment_status === 0) updated.payment_date = new Date().toISOString();
  else if (newPayStatus === 0) updated.payment_date = null;
  updated.payment_status = newPayStatus;
  updated.updated_at = new Date().toISOString();
  tickets[index] = updated;
  writeTickets(tickets);
  res.json(updated);
});
app.delete('/api/admin/tickets/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  let tickets = readTickets();
  const newTickets = tickets.filter(t => t.id !== id);
  if (newTickets.length === tickets.length) return res.status(404).json({ error: '工单不存在' });
  writeTickets(newTickets);
  res.json({ message: '删除成功' });
});
app.post('/api/admin/upload-logo', requireAuth, upload.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请上传图片文件' });
  res.json({ message: '上传成功', url: '/uploads/logo.png' });
});
app.get('/api/public/logo', (req, res) => {
  const logoPath = '/uploads/logo.png';
  if (fs.existsSync(path.join(__dirname, 'uploads/logo.png'))) res.json({ url: logoPath });
  else res.json({ url: null });
});

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  const user = ADMIN_USERS.find(u => u.username === username && u.password === password);
  if (user) {
    req.session.isAdmin = true;
    req.session.username = username;
    res.json({ success: true, message: '登录成功' });
  } else {
    res.status(401).json({ success: false, message: '用户名或密码错误' });
  }
});
app.post('/api/admin/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});
app.get('/api/admin/check', (req, res) => {
  if (req.session && req.session.isAdmin) res.json({ loggedIn: true });
  else res.json({ loggedIn: false });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`前台查询: http://localhost:${PORT}`);
  console.log(`后台管理: http://localhost:${PORT}/admin.html`);
});
