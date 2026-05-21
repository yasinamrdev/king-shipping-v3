const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

class Database {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('neon.tech')
        ? { rejectUnauthorized: false }
        : false,
      max: 5
    });
    this._ready = false;
  }

  _sql(sql) {
    let i = 0;
    return sql.replace(/\?/g, () => `$${++i}`);
  }

  async runQuery(sql, params = []) {
    return this.pool.query(this._sql(sql), params);
  }

  async getQuery(sql, params = []) {
    const r = await this.pool.query(this._sql(sql), params);
    return r.rows[0] || null;
  }

  async allQuery(sql, params = []) {
    const r = await this.pool.query(this._sql(sql), params);
    return r.rows;
  }

  async initialize() {
    if (this._ready) return;
    await this.pool.query(`CREATE TABLE IF NOT EXISTS admins (id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, commission_percent REAL DEFAULT 20, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await this.pool.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL UNIQUE, email TEXT, store_name TEXT, store_link TEXT, password TEXT NOT NULL, address TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await this.pool.query(`CREATE TABLE IF NOT EXISTS couriers (id SERIAL PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL UNIQUE, password TEXT DEFAULT '123456', vehicle_type TEXT DEFAULT 'motorcycle', status TEXT DEFAULT 'available', is_active BOOLEAN DEFAULT TRUE, last_login TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await this.pool.query(`CREATE TABLE IF NOT EXISTS routes (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, base_price REAL DEFAULT 0, extra_kg_price REAL DEFAULT 0, delivery_time TEXT DEFAULT '24-48 ساعة', is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await this.pool.query(`CREATE TABLE IF NOT EXISTS shipments (id SERIAL PRIMARY KEY, tracking_number TEXT UNIQUE NOT NULL, user_id INTEGER, sender_name TEXT NOT NULL, sender_phone TEXT NOT NULL, sender_address TEXT, customer_name TEXT NOT NULL, customer_phone TEXT NOT NULL, customer_address TEXT NOT NULL, route_id INTEGER, status TEXT DEFAULT 'new', courier_id INTEGER, weight REAL DEFAULT 1.0, size TEXT DEFAULT 'medium', shipping_price REAL DEFAULT 0, commission_percent REAL DEFAULT 20, commission_amount REAL DEFAULT 0, net_profit REAL DEFAULT 0, notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(courier_id) REFERENCES couriers(id), FOREIGN KEY(route_id) REFERENCES routes(id))`);
    await this.pool.query(`CREATE TABLE IF NOT EXISTS shipment_history (id SERIAL PRIMARY KEY, shipment_id INTEGER NOT NULL, status TEXT NOT NULL, location TEXT, notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(shipment_id) REFERENCES shipments(id) ON DELETE CASCADE)`);
    await this.pool.query(`CREATE TABLE IF NOT EXISTS requests (id SERIAL PRIMARY KEY, user_id INTEGER, name TEXT NOT NULL, phone TEXT NOT NULL, route_id INTEGER, packages_count INTEGER DEFAULT 1, weight REAL DEFAULT 1.0, size TEXT DEFAULT 'medium', sender_address TEXT, customer_name TEXT, customer_phone TEXT, customer_address TEXT, store_link TEXT, notes TEXT, status TEXT DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(route_id) REFERENCES routes(id))`);
    await this.pool.query(`CREATE TABLE IF NOT EXISTS returns (id SERIAL PRIMARY KEY, shipment_id INTEGER NOT NULL, user_id INTEGER, reason TEXT NOT NULL, status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','received')), admin_notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(shipment_id) REFERENCES shipments(id), FOREIGN KEY(user_id) REFERENCES users(id))`);
    await this.pool.query(`CREATE TABLE IF NOT EXISTS contact_messages (id SERIAL PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL, message TEXT NOT NULL, is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await this.pool.query(`CREATE TABLE IF NOT EXISTS courier_notifications (id SERIAL PRIMARY KEY, courier_id INTEGER NOT NULL, shipment_id INTEGER, message TEXT NOT NULL, is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(courier_id) REFERENCES couriers(id), FOREIGN KEY(shipment_id) REFERENCES shipments(id) ON DELETE SET NULL)`);
    await this.pool.query(`CREATE TABLE IF NOT EXISTS admin_notifications (id SERIAL PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await this.pool.query(`CREATE TABLE IF NOT EXISTS payouts (id SERIAL PRIMARY KEY, courier_id INTEGER NOT NULL, amount REAL NOT NULL, notes TEXT, status TEXT DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(courier_id) REFERENCES couriers(id))`);
    console.log('✅ All tables created');
    await this.seedData();
    this._ready = true;
    console.log('✅ Database ready');
  }

  async seedData() {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await this.pool.query('INSERT INTO admins (username, password, commission_percent) VALUES ($1, $2, $3) ON CONFLICT (username) DO NOTHING', [adminUsername, hashedPassword, 20]);
    const hp = await bcrypt.hash('123456', 10);
    const couriers = [['مندوب 1', '01000000001'],['مندوب 2', '01000000002'],['مندوب 3', '01000000003'],['مندوب 4', '01000000004']];
    for (const [name, phone] of couriers) await this.pool.query('INSERT INTO couriers (name, phone, password, status) VALUES ($1,$2,$3,$4) ON CONFLICT (phone) DO NOTHING', [name, phone, hp, 'available']);
    const routes = [['خط القاهرة', 50, 10, '24 ساعة'],['خط الجيزة', 45, 8, '24 ساعة'],['خط الإسكندرية', 60, 12, '24-48 ساعة'],['خط الدلتا', 65, 15, '48 ساعة'],['خط الصعيد', 70, 18, '48-72 ساعة']];
    for (const [name, base, extra, time] of routes) await this.pool.query('INSERT INTO routes (name, base_price, extra_kg_price, delivery_time) VALUES ($1,$2,$3,$4) ON CONFLICT (name) DO NOTHING', [name, base, extra, time]);
    const userPass = await bcrypt.hash('123456', 10);
    await this.pool.query('INSERT INTO users (name, phone, email, store_name, password) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (phone) DO NOTHING', ['متجر تجريبي', '01000000005', 'test@example.com', 'متجري', userPass]);
    console.log('✅ Seed data inserted');
  }

  getAdmin(username) { return this.getQuery('SELECT * FROM admins WHERE username = ?', [username]); }
  async updateCommission(percent) { await this.runQuery('UPDATE admins SET commission_percent = ? WHERE id = 1', [percent]); return this.getQuery('SELECT commission_percent FROM admins WHERE id = 1'); }
  getCommission() { return this.getQuery('SELECT commission_percent FROM admins WHERE id = 1'); }

  getUserByPhone(phone) { return this.getQuery('SELECT * FROM users WHERE phone = ?', [phone]); }
  getUserById(id) { return this.getQuery('SELECT * FROM users WHERE id = ?', [id]); }
  async createUser(data) { const hp = await bcrypt.hash(data.password || '123456', 10); const r = await this.runQuery('INSERT INTO users (name, phone, email, store_name, store_link, password, address) VALUES (?,?,?,?,?,?,?) RETURNING id', [data.name, data.phone, data.email || null, data.storeName || null, data.storeLink || null, hp, data.address || null]); return this.getUserById(r.rows[0].id); }
  async updateUser(id, data) { const f = [], p = []; let i = 1; if (data.name) { f.push('name = $' + i++); p.push(data.name); } if (data.phone) { f.push('phone = $' + i++); p.push(data.phone); } if (data.email) { f.push('email = $' + i++); p.push(data.email); } if (data.storeName) { f.push('store_name = $' + i++); p.push(data.storeName); } if (data.storeLink) { f.push('store_link = $' + i++); p.push(data.storeLink); } if (data.address) { f.push('address = $' + i++); p.push(data.address); } if (f.length === 0) return null; p.push(id); await this.runQuery('UPDATE users SET ' + f.join(', ') + ' WHERE id = $' + i, p); return this.getUserById(id); }
  getUserShipments(userId) { return this.allQuery('SELECT s.*, c.name as courier_name, r.name as route_name FROM shipments s LEFT JOIN couriers c ON s.courier_id = c.id LEFT JOIN routes r ON s.route_id = r.id WHERE s.user_id = ? ORDER BY s.created_at DESC', [userId]); }

  getRoutes() { return this.allQuery('SELECT * FROM routes WHERE is_active = TRUE ORDER BY name'); }
  getAllRoutes() { return this.allQuery('SELECT * FROM routes ORDER BY name'); }
  async createRoute(data) { const r = await this.runQuery('INSERT INTO routes (name, base_price, extra_kg_price, delivery_time) VALUES (?,?,?,?) RETURNING id', [data.name, data.basePrice || 0, data.extraKgPrice || 0, data.deliveryTime || '24-48 ساعة']); return this.getQuery('SELECT * FROM routes WHERE id = ?', [r.rows[0].id]); }
  async updateRoute(id, data) { const f = [], p = []; let i = 1; if (data.name) { f.push('name = $' + i++); p.push(data.name); } if (data.basePrice !== undefined) { f.push('base_price = $' + i++); p.push(data.basePrice); } if (data.extraKgPrice !== undefined) { f.push('extra_kg_price = $' + i++); p.push(data.extraKgPrice); } if (data.deliveryTime) { f.push('delivery_time = $' + i++); p.push(data.deliveryTime); } if (data.isActive !== undefined) { f.push('is_active = $' + i++); p.push(data.isActive); } if (f.length === 0) return null; p.push(id); await this.runQuery('UPDATE routes SET ' + f.join(', ') + ' WHERE id = $' + i, p); return this.getQuery('SELECT * FROM routes WHERE id = ?', [id]); }
  async deleteRoute(id) { await this.runQuery('DELETE FROM routes WHERE id = ?', [id]); }
  getRoutesSummary() { return this.allQuery('SELECT r.id, r.name, r.base_price, r.extra_kg_price, r.delivery_time, r.is_active, COUNT(s.id) as total_shipments, COALESCE(SUM(CASE WHEN s.status = \'done\' THEN s.shipping_price ELSE 0 END), 0) as total_revenue, COALESCE(SUM(CASE WHEN s.status = \'done\' THEN s.net_profit ELSE 0 END), 0) as total_profit, COALESCE(SUM(CASE WHEN s.status = \'transit\' THEN 1 ELSE 0 END), 0) as in_transit, COALESCE(SUM(CASE WHEN s.status = \'new\' THEN 1 ELSE 0 END), 0) as new_orders FROM routes r LEFT JOIN shipments s ON r.id = s.route_id GROUP BY r.id, r.name, r.base_price, r.extra_kg_price, r.delivery_time, r.is_active ORDER BY r.name'); }

  getCouriers() { return this.allQuery('SELECT * FROM couriers WHERE is_active = TRUE ORDER BY name'); }
  getCourierById(id) { return this.getQuery('SELECT * FROM couriers WHERE id = ?', [id]); }
  getCourierByPhone(phone) { return this.getQuery('SELECT * FROM couriers WHERE phone = ? AND is_active = TRUE', [phone]); }
  getCourierStats() { return this.allQuery('SELECT c.id, c.name, c.phone, c.status, c.vehicle_type, COUNT(s.id) as total_shipments, SUM(CASE WHEN s.status = \'new\' THEN 1 ELSE 0 END) as new_count, SUM(CASE WHEN s.status = \'transit\' THEN 1 ELSE 0 END) as transit_count, SUM(CASE WHEN s.status = \'done\' THEN 1 ELSE 0 END) as done_count, SUM(CASE WHEN s.status = \'rejected\' THEN 1 ELSE 0 END) as rejected_count FROM couriers c LEFT JOIN shipments s ON c.id = s.courier_id WHERE c.is_active = TRUE GROUP BY c.id, c.name, c.phone, c.status, c.vehicle_type ORDER BY c.name'); }
  async createCourier(data) { const hp = await bcrypt.hash(data.password || '123456', 10); const r = await this.runQuery('INSERT INTO couriers (name, phone, password, vehicle_type) VALUES (?,?,?,?) RETURNING id', [data.name, data.phone, hp, data.vehicleType || 'motorcycle']); return this.getCourierById(r.rows[0].id); }
  async updateCourier(id, data) { const f = [], p = []; let i = 1; if (data.name) { f.push('name = $' + i++); p.push(data.name); } if (data.phone) { f.push('phone = $' + i++); p.push(data.phone); } if (data.password) { f.push('password = $' + i++); p.push(await bcrypt.hash(data.password, 10)); } if (data.vehicleType) { f.push('vehicle_type = $' + i++); p.push(data.vehicleType); } if (data.status) { f.push('status = $' + i++); p.push(data.status); } if (f.length === 0) return null; f.push('last_update = CURRENT_TIMESTAMP'); p.push(id); await this.runQuery('UPDATE couriers SET ' + f.join(', ') + ' WHERE id = $' + i, p); return this.getCourierById(id); }
  async updateCourierStatus(id, status) { await this.runQuery('UPDATE couriers SET status = ?, last_update = CURRENT_TIMESTAMP WHERE id = ?', [status, id]); return this.getCourierById(id); }
  async deleteCourier(id) { await this.runQuery('UPDATE couriers SET is_active = FALSE WHERE id = ?', [id]); }
  getCourierShipments(courierId, status = null) { let q = 'SELECT s.*, r.name as route_name FROM shipments s LEFT JOIN routes r ON s.route_id = r.id WHERE s.courier_id = ?'; const p = [courierId]; if (status) { q += ' AND s.status = ?'; p.push(status); } q += ' ORDER BY s.created_at DESC'; return this.allQuery(q, p); }
  getCourierNotifications(courierId) { return this.allQuery('SELECT * FROM courier_notifications WHERE courier_id = ? ORDER BY created_at DESC LIMIT 20', [courierId]); }
  async sendCourierNotification(courierId, shipmentId, message) { await this.runQuery('INSERT INTO courier_notifications (courier_id, shipment_id, message) VALUES (?,?,?)', [courierId, shipmentId, message]); }
  async sendAdminNotification(type, title, message) { await this.runQuery('INSERT INTO admin_notifications (type, title, message) VALUES (?,?,?)', [type, title, message]); }
  getAdminNotifications() { return this.allQuery('SELECT * FROM admin_notifications ORDER BY created_at DESC LIMIT 30'); }
  getUnreadAdminNotificationsCount() { return this.getQuery('SELECT COUNT(*) as count FROM admin_notifications WHERE is_read = FALSE').then(r => r.count); }
  async markAdminNotificationRead(id) { await this.runQuery('UPDATE admin_notifications SET is_read = TRUE WHERE id = ?', [id]); }

  getShipments({ page = 1, limit = 50, status, search, courier, route } = {}) { let q = 'SELECT s.*, c.name as courier_name, u.name as user_name, r.name as route_name FROM shipments s LEFT JOIN couriers c ON s.courier_id = c.id LEFT JOIN users u ON s.user_id = u.id LEFT JOIN routes r ON s.route_id = r.id WHERE 1=1'; const p = []; if (status) { q += ' AND s.status = ?'; p.push(status); } if (search) { q += ' AND (s.tracking_number LIKE ? OR s.customer_name LIKE ?)'; p.push('%' + search + '%', '%' + search + '%'); } if (courier) { q += ' AND s.courier_id = ?'; p.push(courier); } if (route) { q += ' AND s.route_id = ?'; p.push(route); } q += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?'; p.push(limit, (page - 1) * limit); return this.allQuery(q, p); }
  getShipmentById(id) { return this.getQuery('SELECT s.*, c.name as courier_name, u.name as user_name, r.name as route_name FROM shipments s LEFT JOIN couriers c ON s.courier_id = c.id LEFT JOIN users u ON s.user_id = u.id LEFT JOIN routes r ON s.route_id = r.id WHERE s.id = ?', [id]); }
  getShipmentByTracking(tn) { return this.getQuery('SELECT s.*, c.name as courier_name, r.name as route_name FROM shipments s LEFT JOIN couriers c ON s.courier_id = c.id LEFT JOIN routes r ON s.route_id = r.id WHERE s.tracking_number = ?', [tn]); }

  async createShipment(data) {
    const tn = 'KS-' + Date.now().toString().slice(-8);
    const comm = await this.getCommission();
    const pct = comm?.commission_percent || 20;
    const sp = data.shippingPrice || 0;
    const ca = (sp * pct) / 100;
    const np = sp - ca;
    let courierId = data.courierId || null;
    if (!courierId) {
      const couriers = await this.getCouriers();
      const available = couriers.filter(c => c.status === 'available');
      if (available.length > 0) {
        courierId = available[Math.floor(Math.random() * available.length)].id;
        await this.updateCourierStatus(courierId, 'busy');
        await this.sendCourierNotification(courierId, null, '🚀 شحنة جديدة: ' + tn + ' - ' + data.customerName);
      }
    }
    const r = await this.runQuery('INSERT INTO shipments (tracking_number, user_id, sender_name, sender_phone, sender_address, customer_name, customer_phone, customer_address, route_id, courier_id, weight, size, shipping_price, commission_percent, commission_amount, net_profit, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id', [tn, data.userId || null, data.senderName, data.senderPhone, data.senderAddress || null, data.customerName, data.customerPhone, data.customerAddress, data.routeId || null, courierId, data.weight || 1, data.size || 'medium', sp, pct, ca, np, data.notes || null]);
    const shipmentId = r.rows[0].id;
    await this.runQuery('INSERT INTO shipment_history (shipment_id, status, notes) VALUES (?,?,?)', [shipmentId, 'new', 'تم إنشاء الشحنة']);
    await this.sendAdminNotification('new_shipment', '📦 شحنة جديدة', 'تم إنشاء شحنة برقم ' + tn);
    return this.getShipmentById(shipmentId);
  }

  async updateShipment(id, data) { const f = [], p = []; let i = 1; if (data.customerName) { f.push('customer_name = $' + i++); p.push(data.customerName); } if (data.customerPhone) { f.push('customer_phone = $' + i++); p.push(data.customerPhone); } if (data.customerAddress) { f.push('customer_address = $' + i++); p.push(data.customerAddress); } if (data.routeId) { f.push('route_id = $' + i++); p.push(data.routeId); } if (data.courierId) { f.push('courier_id = $' + i++); p.push(data.courierId); } if (data.weight) { f.push('weight = $' + i++); p.push(data.weight); } if (data.size) { f.push('size = $' + i++); p.push(data.size); } if (data.shippingPrice !== undefined) { f.push('shipping_price = $' + i++); p.push(data.shippingPrice); const comm = await this.getCommission(); const pct = comm?.commission_percent || 20; const ca = (data.shippingPrice * pct) / 100; f.push('commission_percent = $' + i++); p.push(pct); f.push('commission_amount = $' + i++); p.push(ca); f.push('net_profit = $' + i++); p.push(data.shippingPrice - ca); } if (data.notes) { f.push('notes = $' + i++); p.push(data.notes); } if (f.length === 0) return null; f.push('updated_at = CURRENT_TIMESTAMP'); p.push(id); await this.runQuery('UPDATE shipments SET ' + f.join(', ') + ' WHERE id = $' + i, p); return this.getShipmentById(id); }
  async updateShipmentStatus(id, status, location = null, notes = null) { await this.runQuery('UPDATE shipments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id]); await this.runQuery('INSERT INTO shipment_history (shipment_id, status, location, notes) VALUES (?,?,?,?)', [id, status, location, notes]); return this.getShipmentById(id); }
  async deleteShipment(id) { await this.runQuery('DELETE FROM shipments WHERE id = ?', [id]); }

  async createRequest(data) { const r = await this.runQuery('INSERT INTO requests (user_id, name, phone, route_id, packages_count, weight, size, sender_address, customer_name, customer_phone, customer_address, store_link, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id', [data.userId || null, data.name, data.phone, data.routeId || null, data.packagesCount || 1, data.weight || 1, data.size || 'medium', data.senderAddress || null, data.customerName || null, data.customerPhone || null, data.customerAddress || null, data.storeLink || null, data.notes || null]); await this.sendAdminNotification('new_request', '📋 طلب جديد', 'طلب من: ' + data.name); return this.getQuery('SELECT * FROM requests WHERE id = ?', [r.rows[0].id]); }
  async convertRequestToShipment(requestId, shippingPrice = 0, courierId = null) { const req = await this.getQuery('SELECT * FROM requests WHERE id = ?', [requestId]); if (!req) return null; const s = await this.createShipment({ userId: req.user_id, senderName: req.name, senderPhone: req.phone, senderAddress: req.sender_address || '', customerName: req.customer_name || req.name, customerPhone: req.customer_phone || req.phone, customerAddress: req.customer_address || '', routeId: req.route_id, courierId, weight: req.weight, size: req.size, shippingPrice, notes: 'محول من طلب #' + req.id }); await this.runQuery('UPDATE requests SET status = ? WHERE id = ?', ['converted', requestId]); return s; }

  async createReturn(data) { const r = await this.runQuery('INSERT INTO returns (shipment_id, user_id, reason) VALUES (?,?,?) RETURNING id', [data.shipmentId, data.userId, data.reason]); await this.sendAdminNotification('return_request', '🔄 طلب إرجاع', 'طلب إرجاع للشحنة'); return this.getQuery('SELECT r.*, s.tracking_number, s.customer_name FROM returns r LEFT JOIN shipments s ON r.shipment_id = s.id WHERE r.id = ?', [r.rows[0].id]); }
  getReturns() { return this.allQuery('SELECT r.*, s.tracking_number, s.customer_name, s.shipping_price, u.name as user_name FROM returns r LEFT JOIN shipments s ON r.shipment_id = s.id LEFT JOIN users u ON r.user_id = u.id ORDER BY r.created_at DESC'); }
  getUserReturns(userId) { return this.allQuery('SELECT r.*, s.tracking_number, s.customer_name FROM returns r LEFT JOIN shipments s ON r.shipment_id = s.id WHERE r.user_id = ? ORDER BY r.created_at DESC', [userId]); }
  async updateReturnStatus(id, status, adminNotes = null) { const f = ['status = ?', 'updated_at = CURRENT_TIMESTAMP']; const p = [status]; if (adminNotes) { f.push('admin_notes = ?'); p.push(adminNotes); } p.push(id); await this.runQuery('UPDATE returns SET ' + f.join(', ') + ' WHERE id = ?', p); return this.getQuery('SELECT * FROM returns WHERE id = ?', [id]); }

  async createContactMessage(data) { const r = await this.runQuery('INSERT INTO contact_messages (name, phone, message) VALUES (?,?,?) RETURNING id', [data.name, data.phone, data.message]); await this.sendAdminNotification('new_message', '💬 رسالة جديدة', 'رسالة من: ' + data.name); return this.getQuery('SELECT * FROM contact_messages WHERE id = ?', [r.rows[0].id]); }
  getContactMessages() { return this.allQuery('SELECT * FROM contact_messages ORDER BY created_at DESC'); }
  async deleteContactMessage(id) { await this.runQuery('DELETE FROM contact_messages WHERE id = ?', [id]); }

  async getStats() { return this.getQuery('SELECT COUNT(*) as total_shipments, SUM(CASE WHEN status = \'new\' THEN 1 ELSE 0 END) as new_shipments, SUM(CASE WHEN status = \'transit\' THEN 1 ELSE 0 END) as transit_shipments, SUM(CASE WHEN status = \'done\' THEN 1 ELSE 0 END) as done_shipments, SUM(CASE WHEN status = \'rejected\' THEN 1 ELSE 0 END) as rejected_shipments, COALESCE(SUM(CASE WHEN status = \'done\' THEN net_profit ELSE 0 END), 0) as total_net_profit, COALESCE(SUM(CASE WHEN status = \'done\' THEN commission_amount ELSE 0 END), 0) as total_commission, COUNT(DISTINCT courier_id) as active_couriers FROM shipments'); }
}

module.exports = Database;
