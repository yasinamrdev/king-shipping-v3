const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const Database = require('./database');
require('dotenv').config();

const app = express();
const db = new Database();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) { console.error('❌ JWT_SECRET is required in .env'); process.exit(1); }

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

const adminAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'الرجاء تسجيل الدخول' });
  try { const decoded = jwt.verify(token, JWT_SECRET); if (decoded.role !== 'admin') return res.status(403).json({ error: 'غير مصرح' }); req.adminId = decoded.id; next(); }
  catch (err) { res.status(403).json({ error: 'انتهت الجلسة' }); }
};

const courierAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'الرجاء تسجيل الدخول' });
  try { const decoded = jwt.verify(token, JWT_SECRET); if (decoded.role !== 'courier') return res.status(403).json({ error: 'غير مصرح' }); req.courierId = decoded.id; next(); }
  catch (err) { res.status(403).json({ error: 'انتهت الجلسة' }); }
};

const userAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'الرجاء تسجيل الدخول' });
  try { const decoded = jwt.verify(token, JWT_SECRET); if (decoded.role !== 'user') return res.status(403).json({ error: 'غير مصرح' }); req.userId = decoded.id; next(); }
  catch (err) { res.status(403).json({ error: 'انتهت الجلسة' }); }
};

// ═══════════ AI ═══════════
const aiResponses = {
  'كيف': 'مرحباً! يمكنني مساعدتك في:\n• تتبع شحنتك - استخدم رقم التتبع في صفحة التتبع\n• طلب مندوب - املأ نموذج الطلب\n• معرفة الأسعار - راجع صفحة الخطوط\n• إرجاع منتج - سجل دخولك واذهب لشحناتي\n• التواصل معنا - استخدم صفحة تواصل معنا',
  'تتبع': 'لتتبع شحنتك، أدخل رقم التتبع في خانة "تتبع الشحنة" في الصفحة الرئيسية.',
  'سعر': 'أسعار الشحن تختلف حسب الخط. راجع صفحة الخطوط لمعرفة الأسعار التفصيلية.',
  'مندوب': 'لطلب مندوب، املأ نموذج "اطلب مندوباً" في الصفحة الرئيسية مع بيانات المرسل والمستلم.',
  'ارجاع': 'لإرجاع منتج:\n1. سجل دخولك\n2. اذهب إلى "شحناتي"\n3. اضغط "استرجاع" على الشحنة المسلمة\n4. اكتب سبب الإرجاع',
  'حساب': 'لإنشاء حساب:\n1. اضغط "حساب جديد" في الأعلى\n2. املأ بياناتك\n3. بعد التسجيل يمكنك تتبع شحناتك',
  'شحن': 'نظام كينج شيبنج يوفر:\n• شحن سريع\n• تتبع لحظي\n• أسعار تنافسية\n• تغليف احترافي\n• الدفع عند الاستلام',
  'خط': 'الخطوط المتاحة تغطي جميع محافظات مصر. كل خط له سعر أساسي وسعر للكيلو الإضافي.',
  'وقت': 'مدة التوصيل:\n• القاهرة والجيزة: 24 ساعة\n• باقي المحافظات: 24-72 ساعة',
  'سلام': 'وعليكم السلام! كيف أقدر أساعدك؟',
  'شكر': 'العفو! أي خدمة تانية؟',
  'مرحبا': 'أهلاً بيك في كينج شيبنج! أقدر أساعدك في إيه؟',
  'محافظة': 'نوصل لكل محافظات مصر! 🚀\n• القاهرة والجيزة: 24 ساعة\n• الإسكندرية والدلتا: 24-48 ساعة\n• الصعيد: 48-72 ساعة',
  'تلفون': '📞 خدمة العملاء: 01126368641\n💬 واتساب: 01126368641',
  'الشركة': '👑 كينج شيبنج - King Shipping\nشركة شحن مصرية متخصصة في توصيل الطرود لجميع محافظات مصر. نتميز بالسرعة والأمان وأفضل الأسعار.',
  'مين': '👑 كينج شيبنج - King Shipping\nأنا المساعد الذكي للنظام. أقدر أساعدك في:\n• تتبع الشحنات\n• طلب مندوب\n• الأسعار والخطوط\n• الإرجاع والاستبدال',
  'كام': '💰 الأسعار حسب الخط:\n• الخطوط تبدأ من 45 جنيهاً\n• كل خط له سعر أساسي وسعر للكيلو الإضافي\n• راجع صفحة الخطوط للتفاصيل',
};
app.post('/api/ai/ask', (req, res) => {
  const q = (req.body.question || '').trim().toLowerCase();
  let a = '👋 شكراً لسؤالك! يمكنني مساعدتك في:\n• تتبع الشحنات\n• طلب مندوب\n• معرفة الأسعار\n• إرجاع المنتجات\n• إنشاء حساب\n\n💡 جرّب: "مرحبا"، "تتبع"، "سعر"، "مندوب"';
  for (const [k, v] of Object.entries(aiResponses)) { if (q.includes(k)) { a = v; break; } }
  if (q.includes('رقم') || q.includes('تليفون') || q.includes('تلفون')) a = '📞 خدمة العملاء: 01126368641\n💬 واتساب: 01126368641';
  if (q.includes('عنوان') || q.includes('مكان') || q.includes('مقر')) a = '📍 القاهرة الجديدة - مصر.\n📞 للاستفسار: 01126368641';
  res.json({ success: true, answer: a });
});

// ═══════════ AUTH ═══════════
app.post('/api/admin/login', async (req, res) => { try { const { username, password } = req.body; const admin = await db.getAdmin(username); if (!admin) return res.status(401).json({ error: 'بيانات غير صحيحة' }); const valid = await bcrypt.compare(password, admin.password); if (!valid) return res.status(401).json({ error: 'بيانات غير صحيحة' }); const token = jwt.sign({ id: admin.id, username: admin.username, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' }); res.json({ success: true, token, admin: { id: admin.id, username: admin.username } }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });
app.post('/api/user/register', async (req, res) => { try { const existing = await db.getUserByPhone(req.body.phone); if (existing) return res.status(400).json({ error: 'رقم الهاتف مسجل بالفعل' }); const user = await db.createUser(req.body); const token = jwt.sign({ id: user.id, name: user.name, phone: user.phone, role: 'user' }, JWT_SECRET, { expiresIn: '30d' }); res.status(201).json({ success: true, token, user: { id: user.id, name: user.name, phone: user.phone } }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });
app.post('/api/user/login', async (req, res) => { try { const { phone, password } = req.body; if (!phone || !password) return res.status(400).json({ error: 'يرجى إدخال الهاتف وكلمة المرور' }); const user = await db.getUserByPhone(phone); if (!user) return res.status(401).json({ error: 'رقم الهاتف غير مسجل' }); const valid = await bcrypt.compare(password, user.password); if (!valid) return res.status(401).json({ error: 'كلمة المرور غير صحيحة' }); const token = jwt.sign({ id: user.id, name: user.name, phone: user.phone, role: 'user' }, JWT_SECRET, { expiresIn: '30d' }); res.json({ success: true, token, user: { id: user.id, name: user.name, phone: user.phone } }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });
app.post('/api/courier/login', async (req, res) => { try { const { phone, password } = req.body; if (!phone || !password) return res.status(400).json({ error: 'يرجى إدخال الهاتف وكلمة المرور' }); const courier = await db.getCourierByPhone(phone); if (!courier) return res.status(401).json({ error: 'رقم الهاتف غير مسجل' }); const valid = await bcrypt.compare(password, courier.password); if (!valid) return res.status(401).json({ error: 'كلمة المرور غير صحيحة' }); await db.runQuery('UPDATE couriers SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [courier.id]); const token = jwt.sign({ id: courier.id, name: courier.name, role: 'courier' }, JWT_SECRET, { expiresIn: '24h' }); res.json({ success: true, token, courier: { id: courier.id, name: courier.name, status: courier.status } }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });

// ═══════════ USER ═══════════
app.get('/api/user/shipments', userAuth, async (req, res) => { try { const s = await db.getUserShipments(req.userId); res.json({ success: true, data: s }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });
app.get('/api/user/profile', userAuth, async (req, res) => { try { const u = await db.getUserById(req.userId); res.json({ success: true, data: u }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });
app.put('/api/user/profile', userAuth, async (req, res) => { try { const u = await db.updateUser(req.userId, req.body); res.json({ success: true, data: u }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });
app.get('/api/user/returns', userAuth, async (req, res) => { try { const r = await db.getUserReturns(req.userId); res.json({ success: true, data: r }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });

// ═══════════ CONTACT ═══════════
app.post('/api/contact', async (req, res) => { try { const { name, phone, message } = req.body; if (!name || !phone || !message) return res.status(400).json({ error: 'جميع الحقول مطلوبة' }); if (name.length < 2 || phone.length < 5 || message.length < 3) return res.status(400).json({ error: 'البيانات غير صالحة' }); const r = await db.createContactMessage({ name: name.trim(), phone: phone.trim(), message: message.trim() }); res.status(201).json({ success: true, data: r }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });
app.get('/api/contact/messages', adminAuth, async (req, res) => { try { const m = await db.getContactMessages(); res.json({ success: true, data: m }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });
app.delete('/api/contact/messages/:id', adminAuth, async (req, res) => { try { await db.deleteContactMessage(req.params.id); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });

// ═══════════ COURIER ═══════════
app.get('/api/courier/my-shipments', courierAuth, async (req, res) => { try { const s = await db.getCourierShipments(req.courierId, req.query.status); res.json({ success: true, data: s }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });
app.get('/api/courier/notifications', courierAuth, async (req, res) => { try { const n = await db.getCourierNotifications(req.courierId); res.json({ success: true, data: n }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });

// ⭐ تحديث حالة الشحنة من المندوب - مع تغيير حالة المندوب تلقائياً
app.patch('/api/courier/shipments/:id/status', courierAuth, async (req, res) => {
  try {
    const shipment = await db.getShipmentById(req.params.id);
    if (!shipment || shipment.courier_id !== req.courierId) return res.status(403).json({ error: 'غير مصرح' });
    const updated = await db.updateShipmentStatus(req.params.id, req.body.status);
    
    // ⭐ تغيير حالة المندوب تلقائياً
    if (req.body.status === 'transit') {
      await db.updateCourierStatus(req.courierId, 'busy');
    }
    if (req.body.status === 'done' || req.body.status === 'rejected') {
      await db.updateCourierStatus(req.courierId, 'available');
    }
    
    res.json({ success: true, data: updated });
  } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); }
});

// ═══════════ SHIPMENTS ═══════════
app.get('/api/shipments', adminAuth, async (req, res) => { try { const r = await db.getShipments(req.query); res.json({ success: true, data: r }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });
app.get('/api/shipments/:id', async (req, res) => { try { const s = await db.getShipmentById(req.params.id); if (!s) return res.status(404).json({ error: 'غير موجودة' }); res.json({ success: true, data: s }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });
app.post('/api/shipments', adminAuth, async (req, res) => { try { const s = await db.createShipment(req.body); res.status(201).json({ success: true, data: s }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });
app.put('/api/shipments/:id', adminAuth, async (req, res) => { try { const u = await db.updateShipment(req.params.id, req.body); if (!u) return res.status(404).json({ error: 'غير موجود' }); res.json({ success: true, data: u }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });
app.patch('/api/shipments/:id/status', adminAuth, async (req, res) => { try { const u = await db.updateShipmentStatus(req.params.id, req.body.status); res.json({ success: true, data: u }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });
app.delete('/api/shipments/:id', adminAuth, async (req, res) => { try { await db.deleteShipment(req.params.id); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });
app.get('/api/track/:tn', async (req, res) => { try { const s = await db.getShipmentByTracking(req.params.tn); if (!s) return res.status(404).json({ error: 'رقم الشحنة غير موجود' }); res.json({ success: true, data: s }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });

// ═══════════ COURIERS MANAGEMENT ═══════════
app.get('/api/couriers', adminAuth, async (req, res) => { try { const c = await db.getCouriers(); res.json({ success: true, data: c }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });
app.get('/api/couriers/stats', adminAuth, async (req, res) => { try { const s = await db.getCourierStats(); res.json({ success: true, data: s }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });
app.post('/api/couriers', adminAuth, async (req, res) => { try { const c = await db.createCourier(req.body); res.status(201).json({ success: true, data: c }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });
app.put('/api/couriers/:id', adminAuth, async (req, res) => { try { const u = await db.updateCourier(req.params.id, req.body); if (!u) return res.status(404).json({ error: 'غير موجود' }); res.json({ success: true, data: u }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });
app.delete('/api/couriers/:id', adminAuth, async (req, res) => { try { await db.deleteCourier(req.params.id); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });

// ═══════════ ROUTES ═══════════
app.get('/api/routes', async (req, res) => { try { const r = await db.getRoutes(); res.json({ success: true, data: r }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });
app.get('/api/routes/all', adminAuth, async (req, res) => { try { const r = await db.getAllRoutes(); res.json({ success: true, data: r }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });
app.get('/api/routes/report', adminAuth, async (req, res) => { try { const s = await db.getRoutesSummary(); const t = { total_shipments: s.reduce((a, r) => a + (r.total_shipments || 0), 0), total_revenue: s.reduce((a, r) => a + (r.total_revenue || 0), 0), total_profit: s.reduce((a, r) => a + (r.total_profit || 0), 0), total_in_transit: s.reduce((a, r) => a + (r.in_transit || 0), 0), total_new: s.reduce((a, r) => a + (r.new_orders || 0), 0) }; res.json({ success: true, data: { routes: s, totals: t } }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });
app.post('/api/routes', adminAuth, async (req, res) => { try { const r = await db.createRoute(req.body); res.status(201).json({ success: true, data: r }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });
app.put('/api/routes/:id', adminAuth, async (req, res) => { try { const u = await db.updateRoute(req.params.id, req.body); if (!u) return res.status(404).json({ error: 'غير موجود' }); res.json({ success: true, data: u }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });
app.delete('/api/routes/:id', adminAuth, async (req, res) => { try { await db.deleteRoute(req.params.id); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });

// ═══════════ REQUESTS ═══════════
app.post('/api/requests', async (req, res) => { try { const { name, phone, routeId } = req.body; if (!name || !phone || !routeId) return res.status(400).json({ error: 'الاسم والهاتف والخط مطلوبون' }); const r = await db.createRequest(req.body); res.status(201).json({ success: true, data: r }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });
app.get('/api/requests', adminAuth, async (req, res) => { try { const r = await db.allQuery('SELECT * FROM requests ORDER BY created_at DESC'); res.json({ success: true, data: r }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });

app.post('/api/requests/:id/convert', async (req, res) => {
  try {
    const shippingPrice = parseFloat(req.body.shippingPrice) || 0;
    
    const couriers = await db.getCouriers();
    const availableCouriers = couriers.filter(function(c) { return c.status === 'available'; });
    const courierId = availableCouriers.length > 0 
      ? availableCouriers[Math.floor(Math.random() * availableCouriers.length)].id 
      : null;
    
    const shipment = await db.convertRequestToShipment(req.params.id, shippingPrice, courierId);
    if (!shipment) return res.status(404).json({ error: 'الطلب غير موجود' });
    
    if (courierId) await db.updateCourierStatus(courierId, 'busy');
    
    res.json({ success: true, data: shipment, tracking_number: shipment.tracking_number });
  } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); }
});

// ═══════════ RETURNS ═══════════
app.post('/api/returns', userAuth, async (req, res) => { try { const r = await db.createReturn({ shipmentId: req.body.shipmentId, userId: req.userId, reason: req.body.reason }); res.status(201).json({ success: true, data: r }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });
app.get('/api/returns', adminAuth, async (req, res) => { try { const r = await db.getReturns(); res.json({ success: true, data: r }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });
app.patch('/api/returns/:id', adminAuth, async (req, res) => { try { const u = await db.updateReturnStatus(req.params.id, req.body.status, req.body.adminNotes); res.json({ success: true, data: u }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });

// ═══════════ COMMISSION ═══════════
app.get('/api/commission', adminAuth, async (req, res) => { try { const r = await db.getCommission(); res.json({ success: true, data: r }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });
app.put('/api/commission', adminAuth, async (req, res) => { try { const r = await db.updateCommission(req.body.percent); res.json({ success: true, data: r }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });

// ═══════════ STATS ═══════════
app.get('/api/stats', adminAuth, async (req, res) => { try { const s = await db.getStats(); res.json({ success: true, data: s }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });

// ═══════════ PAYOUTS ═══════════
app.get('/api/payouts', adminAuth, async (req, res) => { try { const r = await db.allQuery('SELECT p.*, c.name as courier_name FROM payouts p LEFT JOIN couriers c ON p.courier_id = c.id ORDER BY p.created_at DESC'); res.json({ success: true, data: r }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });
app.post('/api/payouts', adminAuth, async (req, res) => { try { const { courierId, amount, notes } = req.body; if (!courierId || !amount) return res.status(400).json({ error: 'المندوب والمبلغ مطلوبان' }); const r = await db.runQuery('INSERT INTO payouts (courier_id, amount, notes) VALUES (?,?,?) RETURNING id', [courierId, amount, notes || '']); const p = await db.getQuery('SELECT p.*, c.name as courier_name FROM payouts p LEFT JOIN couriers c ON p.courier_id = c.id WHERE p.id = ?', [r.rows[0].id]); res.status(201).json({ success: true, data: p }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });
app.patch('/api/payouts/:id', adminAuth, async (req, res) => { try { await db.runQuery('UPDATE payouts SET status = ? WHERE id = ?', [req.body.status, req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });

// ═══════════ NOTIFICATIONS ═══════════
app.get('/api/admin/notifications', adminAuth, async (req, res) => { try { const n = await db.getAdminNotifications(); res.json({ success: true, data: n }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });
app.get('/api/admin/notifications/count', adminAuth, async (req, res) => { try { const c = await db.getUnreadAdminNotificationsCount(); res.json({ success: true, count: c }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });
app.patch('/api/admin/notifications/:id', adminAuth, async (req, res) => { try { await db.markAdminNotificationRead(req.params.id); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'حدث خطأ' }); } });

// ═══════════ START ═══════════
async function startServer() {
  try {
    await db.initialize();
    app.listen(PORT, () => {
      console.log('═══════════════════════════════════════');
      console.log('👑  King Shipping Server v2.0');
      console.log('═══════════════════════════════════════');
      console.log('🚀  Server: http://localhost:' + PORT);
      console.log('📊  Admin: http://localhost:' + PORT + '/admin-login');
      console.log('🛵  Courier: http://localhost:' + PORT + '/courier-login');
      console.log('👤  User: http://localhost:' + PORT + '/user-login');
      console.log('═══════════════════════════════════════');
    });
  } catch (err) {
    console.error('Failed to start server:', err);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, db, startServer };