var token = localStorage.getItem('kingToken');
var adminData = JSON.parse(localStorage.getItem('kingAdmin') || '{}');
if (!token) window.location.href = 'admin-login';
document.getElementById('adminName').textContent = adminData.username || 'المدير';

// ═══════════ TOAST SYSTEM ═══════════
function showToast(title, desc, icon) {
  var container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  var toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = '<span class="icon">' + (icon || '🔔') + '</span><div class="content"><div class="title">' + title + '</div>' + (desc ? '<div class="desc">' + desc + '</div>' : '') + '</div><button class="close" onclick="this.parentElement.remove()">✕</button>';
  container.appendChild(toast);
  setTimeout(function() { if (toast.parentElement) toast.remove(); }, 5000);
  if (typeof SoundManager !== 'undefined') {
    if (icon === '📦' || icon === '✅' || icon === '🎉') SoundManager.success();
    else if (icon === '❌' || icon === '🗑️') SoundManager.error();
    else if (icon === '⚠️') SoundManager.warning();
    else if (icon === '🔔') SoundManager.notification();
    else if (icon === '💰') SoundManager.newShipment();
  }
}

async function api(url, options) {
  options = options || {};
  var headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
  if (options.headers) { for (var k in options.headers) headers[k] = options.headers[k]; }
  try {
    var response = await fetch(url, { method: options.method || 'GET', headers: headers, body: options.body });
    if (response.status === 401 || response.status === 403) { localStorage.clear(); window.location.href = 'admin-login'; return null; }
    return response.json();
  } catch (e) { showToast('❌ خطأ', 'تعذر الاتصال بالخادم', '❌'); return null; }
}

// ═══════════ SIDEBAR ═══════════
document.querySelectorAll('.sidebar-nav button').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.sidebar-nav button').forEach(function(b) { b.classList.remove('active'); });
    this.classList.add('active');
    var section = this.dataset.section;
    document.querySelectorAll('[id^="section-"]').forEach(function(s) { s.classList.add('section-hidden'); });
    var target = document.getElementById('section-' + section);
    if (target) target.classList.remove('section-hidden');
    document.getElementById('pageTitle').textContent = this.textContent.trim();
    var loaders = {
      dashboard: loadDashboard,
      shipments: loadShipments,
      couriers: loadCouriers,
      routes: loadRoutesAdmin,
      'routes-report': loadRoutesReport,
      messages: loadMessages,
      returns: loadReturns,
      commission: loadCommission,
      payouts: loadPayouts
    };
    if (loaders[section]) loaders[section]();
  });
});

// ═══════════ DASHBOARD ═══════════
async function loadDashboard() {
  try {
    var stats = await api('/api/stats');
    if (stats && stats.data) {
      document.getElementById('statTotal').textContent = stats.data.total_shipments || 0;
      document.getElementById('statTransit').textContent = stats.data.transit_shipments || 0;
      document.getElementById('statDone').textContent = stats.data.done_shipments || 0;
      document.getElementById('statRejected').textContent = stats.data.rejected_shipments || 0;
      document.getElementById('statProfit').textContent = (stats.data.total_net_profit || 0) + ' ج';
      document.getElementById('statCommission').textContent = (stats.data.total_commission || 0) + ' ج';
    }
    var shipments = await api('/api/shipments?limit=5');
    var data = shipments && shipments.data ? shipments.data : [];
    var sl = { new: 'جديدة', transit: 'قيد التوصيل', done: 'تم التسليم', rejected: 'مرفوضة' };
    var sb = { new: 'badge-new', transit: 'badge-transit', done: 'badge-done', rejected: 'badge-rejected' };
    document.getElementById('dashboardTable').innerHTML = data.length === 0
      ? '<tr><td colspan="7" class="empty-state">لا توجد شحنات</td></tr>'
      : data.map(function(s) {
          return '<tr><td><strong>' + s.tracking_number + '</strong></td><td>' + (s.sender_name || '—') + '</td><td>' + (s.customer_name || '—') + '</td><td>' + (s.route_name || '—') + '</td><td><span class="badge ' + sb[s.status] + '">' + sl[s.status] + '</span></td><td>' + (s.shipping_price || 0) + ' ج</td><td style="color:var(--success);font-weight:700;">' + (s.net_profit || 0) + ' ج</td></tr>';
        }).join('');
  } catch (err) {}
}

// ═══════════ SHIPMENTS ═══════════
async function loadShipments() {
  try {
    var searchVal = document.getElementById('searchShipment')?.value;
    var url = '/api/shipments';
    if (searchVal) url += '?search=' + encodeURIComponent(searchVal);
    var data = await api(url);
    var shipments = data && data.data ? data.data : [];
    var sl = { new: 'جديدة', transit: 'قيد التوصيل', done: 'تم التسليم', rejected: 'مرفوضة' };
    var sb = { new: 'badge-new', transit: 'badge-transit', done: 'badge-done', rejected: 'badge-rejected' };
    document.getElementById('shipmentsTable').innerHTML = shipments.length === 0
      ? '<tr><td colspan="10" class="empty-state">لا توجد شحنات</td></tr>'
      : shipments.map(function(s) {
          return '<tr><td><strong>' + s.tracking_number + '</strong></td><td>' + (s.sender_name || '—') + '</td><td>' + (s.customer_name || '—') + '</td><td>' + (s.route_name || '—') + '</td><td>' + (s.weight || 1) + ' كجم</td><td>' + (s.shipping_price || 0) + ' ج</td><td style="color:var(--success);">' + (s.net_profit || 0) + ' ج</td><td><select class="badge ' + sb[s.status] + '" onchange="updateStatus(' + s.id + ', this.value)" style="border:none;cursor:pointer;font-family:Cairo,sans-serif;font-weight:700;">' + Object.entries(sl).map(function(e) { return '<option value="' + e[0] + '" ' + (s.status === e[0] ? 'selected' : '') + '>' + e[1] + '</option>'; }).join('') + '</select></td><td>' + (s.courier_name || '—') + '</td><td><div class="actions"><button class="btn-xs btn-edit" onclick="editShipment(' + s.id + ')">✏️</button><button class="btn-xs btn-print" onclick="printInvoice(' + s.id + ')">🧾</button><button class="btn-xs btn-delete" onclick="deleteShipment(' + s.id + ')">🗑️</button></div></td></tr>';
        }).join('');
  } catch (err) {}
}

async function updateStatus(id, status) {
  await api('/api/shipments/' + id + '/status', { method: 'PATCH', body: JSON.stringify({ status: status }) });
  loadShipments();
  loadDashboard();
  showToast('🔄 تم التحديث', 'تم تحديث حالة الشحنة', '📦');
}

async function deleteShipment(id) {
  if (!confirm('⚠️ هل أنت متأكد من حذف هذه الشحنة؟')) return;
  await api('/api/shipments/' + id, { method: 'DELETE' });
  loadShipments();
  loadDashboard();
  showToast('🗑️ تم الحذف', 'تم حذف الشحنة', '🗑️');
}

var editingShipmentId = null;

async function openShipmentModal() {
  editingShipmentId = null;
  document.getElementById('shipmentModalTitle').textContent = '📦 إضافة شحنة جديدة';
  ['shipSenderName', 'shipSenderPhone', 'shipCustName', 'shipCustPhone', 'shipSenderAddr', 'shipCustAddr', 'shipNotes'].forEach(function(id) { document.getElementById(id).value = ''; });
  document.getElementById('shipWeight').value = '1';
  document.getElementById('shipPrice').value = '0';
  document.getElementById('shipSize').value = 'medium';
  await loadRoutesForSelect();
  await loadCouriersForSelect();
  document.getElementById('shipmentModal').classList.add('show');
}

async function editShipment(id) {
  var d = await api('/api/shipments/' + id);
  var s = (d && d.data) ? d.data : d;
  if (!s) return;
  editingShipmentId = s.id;
  document.getElementById('shipmentModalTitle').textContent = '✏️ تعديل شحنة - ' + s.tracking_number;
  document.getElementById('shipSenderName').value = s.sender_name || '';
  document.getElementById('shipSenderPhone').value = s.sender_phone || '';
  document.getElementById('shipCustName').value = s.customer_name || '';
  document.getElementById('shipCustPhone').value = s.customer_phone || '';
  document.getElementById('shipSenderAddr').value = s.sender_address || '';
  document.getElementById('shipCustAddr').value = s.customer_address || '';
  document.getElementById('shipWeight').value = s.weight || 1;
  document.getElementById('shipPrice').value = s.shipping_price || 0;
  document.getElementById('shipSize').value = s.size || 'medium';
  document.getElementById('shipNotes').value = s.notes || '';
  await loadRoutesForSelect();
  await loadCouriersForSelect();
  document.getElementById('shipRoute').value = s.route_id || '';
  document.getElementById('shipCourier').value = s.courier_id || '';
  document.getElementById('shipmentModal').classList.add('show');
}

async function saveShipment() {
  var body = {
    senderName: document.getElementById('shipSenderName').value.trim(),
    senderPhone: document.getElementById('shipSenderPhone').value.trim(),
    customerName: document.getElementById('shipCustName').value.trim(),
    customerPhone: document.getElementById('shipCustPhone').value.trim(),
    routeId: parseInt(document.getElementById('shipRoute').value) || null,
    courierId: parseInt(document.getElementById('shipCourier').value) || null,
    weight: parseFloat(document.getElementById('shipWeight').value) || 1,
    size: document.getElementById('shipSize').value,
    senderAddress: document.getElementById('shipSenderAddr').value.trim(),
    customerAddress: document.getElementById('shipCustAddr').value.trim(),
    shippingPrice: parseFloat(document.getElementById('shipPrice').value) || 0,
    notes: document.getElementById('shipNotes').value.trim()
  };
  if (!body.senderName || !body.senderPhone || !body.customerName || !body.customerPhone) {
    showToast('⚠️ تنبيه', 'من فضلك املأ الحقول الأساسية', '⚠️');
    return;
  }
  if (editingShipmentId) {
    await api('/api/shipments/' + editingShipmentId, { method: 'PUT', body: JSON.stringify(body) });
    showToast('✏️ تم التعديل', 'تم تعديل الشحنة بنجاح', '📦');
  } else {
    await api('/api/shipments', { method: 'POST', body: JSON.stringify(body) });
    showToast('✅ تم', 'تم إنشاء الشحنة بنجاح', '📦');
  }
  document.getElementById('shipmentModal').classList.remove('show');
  loadShipments();
  loadDashboard();
}

async function loadRoutesForSelect() {
  var d = await api('/api/routes/all');
  var routes = (d && d.data) ? d.data : [];
  document.getElementById('shipRoute').innerHTML = '<option value="">اختر الخط</option>' + routes.filter(function(r) { return r.is_active; }).map(function(r) { return '<option value="' + r.id + '">' + r.name + '</option>'; }).join('');
}

async function loadCouriersForSelect() {
  var d = await api('/api/couriers');
  var couriers = (d && d.data) ? d.data : [];
  document.getElementById('shipCourier').innerHTML = '<option value="">اختر مندوباً</option>' + couriers.map(function(c) { return '<option value="' + c.id + '">' + c.name + ' (' + (c.status === 'available' ? '🟢' : '🔴') + ')</option>'; }).join('');
}

// ═══════════ COURIERS ═══════════
async function loadCouriers() {
  var d = await api('/api/couriers/stats');
  var couriers = (d && d.data) ? d.data : [];
  var sl = { available: '🟢 متاح', busy: '🔴 مشغول', offline: '⚫ غير متصل' };
  var sb = { available: 'badge-available', busy: 'badge-busy', offline: 'badge-rejected' };
  document.getElementById('couriersTable').innerHTML = couriers.length === 0
    ? '<tr><td colspan="8" class="empty-state">لا يوجد مناديب</td></tr>'
    : couriers.map(function(c) {
        return '<tr><td><strong>🛵 ' + c.name + '</strong></td><td>' + c.phone + '</td><td><span class="badge ' + sb[c.status] + '">' + sl[c.status] + '</span></td><td>' + (c.total_shipments || 0) + '</td><td style="color:var(--success);">' + (c.done_count || 0) + '</td><td style="color:var(--warning);">' + (c.transit_count || 0) + '</td><td style="color:var(--danger);">' + (c.rejected_count || 0) + '</td><td><div class="actions"><button class="btn-xs btn-edit" onclick="editCourier(' + c.id + ')">✏️</button><button class="btn-xs btn-delete" onclick="deleteCourier(' + c.id + ')">🗑️</button></div></td></tr>';
      }).join('');
}

var editingCourierId = null;

function openCourierModal() {
  editingCourierId = null;
  document.getElementById('courierModalTitle').textContent = '🛵 إضافة مندوب جديد';
  ['courierName', 'courierPhone', 'courierPassword'].forEach(function(id) { document.getElementById(id).value = ''; });
  document.getElementById('courierVehicle').value = 'motorcycle';
  document.getElementById('courierStatus').value = 'available';
  document.getElementById('courierModal').classList.add('show');
}

async function editCourier(id) {
  var d = await api('/api/couriers');
  var c = (d && d.data ? d.data : []).find(function(x) { return x.id === id; });
  if (!c) return;
  editingCourierId = c.id;
  document.getElementById('courierModalTitle').textContent = '✏️ تعديل مندوب - ' + c.name;
  document.getElementById('courierName').value = c.name;
  document.getElementById('courierPhone').value = c.phone;
  document.getElementById('courierPassword').value = '';
  document.getElementById('courierVehicle').value = c.vehicle_type || 'motorcycle';
  document.getElementById('courierStatus').value = c.status;
  document.getElementById('courierModal').classList.add('show');
}

async function saveCourier() {
  var body = {
    name: document.getElementById('courierName').value.trim(),
    phone: document.getElementById('courierPhone').value.trim(),
    vehicleType: document.getElementById('courierVehicle').value,
    status: document.getElementById('courierStatus').value
  };
  var pw = document.getElementById('courierPassword').value.trim();
  if (pw) body.password = pw;
  if (!body.name || !body.phone) { showToast('⚠️ تنبيه', 'الاسم والهاتف مطلوبان', '⚠️'); return; }
  if (editingCourierId) {
    await api('/api/couriers/' + editingCourierId, { method: 'PUT', body: JSON.stringify(body) });
    showToast('✏️ تم التعديل', 'تم تعديل بيانات المندوب', '🛵');
  } else {
    await api('/api/couriers', { method: 'POST', body: JSON.stringify(body) });
    showToast('✅ تم', 'تم إضافة المندوب بنجاح', '🛵');
  }
  document.getElementById('courierModal').classList.remove('show');
  loadCouriers();
}

async function deleteCourier(id) {
  if (!confirm('⚠️ هل أنت متأكد من حذف هذا المندوب؟')) return;
  await api('/api/couriers/' + id, { method: 'DELETE' });
  loadCouriers();
  showToast('🗑️ تم الحذف', 'تم حذف المندوب', '🗑️');
}

// ═══════════ ROUTES ═══════════
async function loadRoutesAdmin() {
  var d = await api('/api/routes/all');
  var routes = (d && d.data) ? d.data : [];
  document.getElementById('routesTable').innerHTML = routes.length === 0
    ? '<tr><td colspan="6" class="empty-state">لا توجد خطوط</td></tr>'
    : routes.map(function(r) {
        return '<tr><td><strong>🛣️ ' + r.name + '</strong></td><td><input type="number" value="' + r.base_price + '" data-id="' + r.id + '" data-field="base_price" style="width:100px;border:1px solid var(--gray-mid);border-radius:6px;padding:6px;font-family:Cairo,sans-serif;"></td><td><input type="number" value="' + r.extra_kg_price + '" data-id="' + r.id + '" data-field="extra_kg_price" style="width:100px;border:1px solid var(--gray-mid);border-radius:6px;padding:6px;font-family:Cairo,sans-serif;"></td><td><input type="text" value="' + r.delivery_time + '" data-id="' + r.id + '" data-field="delivery_time" style="width:120px;border:1px solid var(--gray-mid);border-radius:6px;padding:6px;font-family:Cairo,sans-serif;"></td><td><span class="badge ' + (r.is_active ? 'badge-active' : 'badge-inactive') + '">' + (r.is_active ? '🟢 نشط' : '🔴 مخفي') + '</span></td><td><div class="actions"><button class="btn-xs btn-edit" onclick="toggleRoute(' + r.id + ', ' + (r.is_active ? 0 : 1) + ')">' + (r.is_active ? '👁️ إخفاء' : '👁️ إظهار') + '</button><button class="btn-xs btn-delete" onclick="deleteRoute(' + r.id + ')">🗑️</button></div></td></tr>';
      }).join('');
}

async function saveAllRoutes() {
  var inputs = document.querySelectorAll('#routesTable input');
  for (var i = 0; i < inputs.length; i++) {
    var input = inputs[i];
    var id = input.dataset.id;
    var field = input.dataset.field;
    var value = field === 'delivery_time' ? input.value : parseFloat(input.value);
    var body = {};
    if (field === 'base_price') body.basePrice = value;
    if (field === 'extra_kg_price') body.extraKgPrice = value;
    if (field === 'delivery_time') body.deliveryTime = value;
    await api('/api/routes/' + id, { method: 'PUT', body: JSON.stringify(body) });
  }
  showToast('💾 تم الحفظ', 'تم حفظ جميع تعديلات الأسعار', '✅');
  loadRoutesAdmin();
}

async function toggleRoute(id, isActive) {
  await api('/api/routes/' + id, { method: 'PUT', body: JSON.stringify({ isActive: isActive }) });
  loadRoutesAdmin();
}

async function deleteRoute(id) {
  if (!confirm('⚠️ هل أنت متأكد من حذف هذا الخط؟')) return;
  await api('/api/routes/' + id, { method: 'DELETE' });
  loadRoutesAdmin();
  showToast('🗑️ تم الحذف', 'تم حذف الخط', '🛣️');
}

function openRouteModal() {
  ['routeName', 'routeTime', 'routeBase', 'routeExtra'].forEach(function(id) { document.getElementById(id).value = ''; });
  document.getElementById('routeBase').value = '0';
  document.getElementById('routeExtra').value = '0';
  document.getElementById('routeModal').classList.add('show');
}

async function saveRoute() {
  var body = {
    name: document.getElementById('routeName').value.trim(),
    deliveryTime: document.getElementById('routeTime').value.trim(),
    basePrice: parseFloat(document.getElementById('routeBase').value) || 0,
    extraKgPrice: parseFloat(document.getElementById('routeExtra').value) || 0
  };
  if (!body.name) { showToast('⚠️ تنبيه', 'من فضلك أدخل اسم الخط', '⚠️'); return; }
  await api('/api/routes', { method: 'POST', body: JSON.stringify(body) });
  document.getElementById('routeModal').classList.remove('show');
  loadRoutesAdmin();
  showToast('✅ تم', 'تم إضافة الخط بنجاح', '🛣️');
}

// ═══════════ ROUTES REPORT ═══════════
async function loadRoutesReport() {
  try {
    var d = await api('/api/routes/report');
    var report = d && d.data ? d.data : null;
    if (!report) return;
    document.getElementById('routesStatsGrid').innerHTML =
      '<div class="stat-card"><div class="stat-card-label">📦 إجمالي الشحنات</div><div class="stat-card-value">' + (report.totals.total_shipments || 0) + '</div></div>' +
      '<div class="stat-card"><div class="stat-card-label">🛵 قيد التوصيل</div><div class="stat-card-value" style="color:var(--warning);">' + (report.totals.total_in_transit || 0) + '</div></div>' +
      '<div class="stat-card"><div class="stat-card-label">🆕 طلبات جديدة</div><div class="stat-card-value" style="color:var(--blue-light);">' + (report.totals.total_new || 0) + '</div></div>' +
      '<div class="stat-card"><div class="stat-card-label">💰 إجمالي الإيرادات</div><div class="stat-card-value" style="color:var(--success);">' + (report.totals.total_revenue || 0) + ' ج</div></div>' +
      '<div class="stat-card"><div class="stat-card-label">💎 صافي الربح</div><div class="stat-card-value" style="color:var(--success);">' + (report.totals.total_profit || 0) + ' ج</div></div>';
    document.getElementById('routesReportTable').innerHTML = report.routes.length === 0
      ? '<tr><td colspan="7" class="empty-state">لا توجد بيانات</td></tr>'
      : report.routes.map(function(r) {
          return '<tr><td><strong>🛣️ ' + r.name + '</strong></td><td>' + (r.base_price || 0) + ' ج</td><td><strong>' + (r.total_shipments || 0) + '</strong></td><td style="color:var(--warning);">' + (r.in_transit || 0) + '</td><td style="color:var(--blue-light);">' + (r.new_orders || 0) + '</td><td style="color:var(--success);font-weight:700;">' + (r.total_revenue || 0) + ' ج</td><td style="color:var(--success);font-weight:700;">' + (r.total_profit || 0) + ' ج</td></tr>';
        }).join('');
    document.getElementById('routesReportFooter').innerHTML =
      '<tr><td><strong>📊 المجموع الكلي</strong></td><td>—</td><td><strong>' + (report.totals.total_shipments || 0) + '</strong></td><td><strong>' + (report.totals.total_in_transit || 0) + '</strong></td><td><strong>' + (report.totals.total_new || 0) + '</strong></td><td style="color:var(--success);"><strong>' + (report.totals.total_revenue || 0) + ' ج</strong></td><td style="color:var(--success);"><strong>' + (report.totals.total_profit || 0) + ' ج</strong></td></tr>';
  } catch (err) {}
}

// ═══════════ MESSAGES ═══════════
async function loadMessages() {
  try {
    var d = await api('/api/contact/messages');
    var messages = (d && d.data) ? d.data : [];
    document.getElementById('messagesTable').innerHTML = messages.length === 0
      ? '<tr><td colspan="5" class="empty-state">💬 لا توجد رسائل</td></tr>'
      : messages.map(function(m) {
          return '<tr><td><strong>' + m.name + '</strong></td><td>' + m.phone + '</td><td style="max-width:350px;">' + m.message + '</td><td>' + new Date(m.created_at).toLocaleDateString('ar-EG') + '</td><td><button class="btn-xs btn-delete" onclick="deleteMessage(' + m.id + ')">🗑️</button></td></tr>';
        }).join('');
  } catch (err) {}
}

async function deleteMessage(id) {
  if (!confirm('حذف هذه الرسالة؟')) return;
  await api('/api/contact/messages/' + id, { method: 'DELETE' });
  loadMessages();
  showToast('🗑️ تم الحذف', 'تم حذف الرسالة', '🗑️');
}

// ═══════════ RETURNS ═══════════
async function loadReturns() {
  try {
    var d = await api('/api/returns');
    var returns = (d && d.data) ? d.data : [];
    var sl = { pending: '⏳ معلق', approved: '✅ مقبول', rejected: '❌ مرفوض', received: '📦 تم الاستلام' };
    var sb = { pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected', received: 'badge-received' };
    document.getElementById('returnsTable').innerHTML = returns.length === 0
      ? '<tr><td colspan="8" class="empty-state">🔄 لا توجد طلبات إرجاع</td></tr>'
      : returns.map(function(r) {
          var actions = r.status === 'pending'
            ? '<div class="actions"><button class="btn-xs btn-approve" onclick="updateReturn(' + r.id + ', \'approved\')">✅ قبول</button><button class="btn-xs btn-reject" onclick="updateReturn(' + r.id + ', \'rejected\')">❌ رفض</button></div>'
            : '<span class="badge ' + sb[r.status] + '">' + sl[r.status] + '</span>';
          return '<tr><td><strong>' + (r.tracking_number || '—') + '</strong></td><td>' + (r.customer_name || '—') + '</td><td>' + (r.user_name || '—') + '</td><td style="max-width:200px;">' + r.reason + '</td><td>' + (r.shipping_price || 0) + ' ج</td><td>' + actions + '</td><td>' + new Date(r.created_at).toLocaleDateString('ar-EG') + '</td></tr>';
        }).join('');
  } catch (err) {}
}

async function updateReturn(id, status) {
  var notes = status === 'rejected' ? prompt('سبب الرفض:') : '';
  await api('/api/returns/' + id, { method: 'PATCH', body: JSON.stringify({ status: status, adminNotes: notes }) });
  loadReturns();
  showToast('🔄 تم التحديث', 'تم تحديث حالة طلب الإرجاع', '📦');
}

// ═══════════ COMMISSION ═══════════
async function loadCommission() {
  var d = await api('/api/commission');
  document.getElementById('commissionPercent').value = (d && d.data) ? (d.data.commission_percent || 20) : 20;
}

async function saveCommission() {
  var percent = parseFloat(document.getElementById('commissionPercent').value) || 20;
  if (percent < 0 || percent > 100) { showToast('⚠️ تنبيه', 'النسبة يجب أن تكون بين 0 و 100', '⚠️'); return; }
  await api('/api/commission', { method: 'PUT', body: JSON.stringify({ percent: percent }) });
  showToast('💾 تم الحفظ', 'تم حفظ نسبة العمولة: ' + percent + '%', '💎');
}

// ═══════════ PAYOUTS ═══════════
async function loadPayouts() {
  try {
    var d = await api('/api/payouts');
    var payouts = (d && d.data) ? d.data : [];
    var ps = { pending: '⏳ معلق', paid: '✅ مدفوع', cancelled: '❌ ملغي' };
    document.getElementById('payoutsTableBody').innerHTML = payouts.length === 0
      ? '<tr><td colspan="5" class="empty-state">💰 لا توجد مدفوعات</td></tr>'
      : payouts.map(function(p) {
          var actions = p.status === 'pending'
            ? '<div class="actions"><button class="btn-xs btn-approve" onclick="updatePayout(' + p.id + ', \'paid\')">✅ تم الدفع</button><button class="btn-xs btn-reject" onclick="updatePayout(' + p.id + ', \'cancelled\')">❌ إلغاء</button></div>'
            : '<span style="color:var(--gray);">' + ps[p.status] + '</span>';
          return '<tr><td>' + (p.courier_name || '—') + '</td><td style="font-weight:700;color:var(--danger);">-' + (p.amount || 0) + ' ج</td><td>' + (p.notes || '—') + '</td><td><span style="color:var(--gray);font-size:0.85rem;">' + ps[p.status] + '</span></td><td>' + actions + '</td></tr>';
        }).join('');
    await loadCouriersForPayoutSelect();
  } catch (err) {}
}

async function loadCouriersForPayoutSelect() {
  var d = await api('/api/couriers');
  var couriers = (d && d.data) ? d.data : [];
  var sel = document.getElementById('payoutCourier');
  if (sel) {
    sel.innerHTML = '<option value="">اختر مندوب</option>' + couriers.map(function(c) { return '<option value="' + c.id + '">' + c.name + '</option>'; }).join('');
  }
}

async function savePayout() {
  var courierId = parseInt(document.getElementById('payoutCourier').value);
  var amount = parseFloat(document.getElementById('payoutAmount').value);
  var notes = document.getElementById('payoutNotes').value.trim();
  if (!courierId || !amount) { showToast('⚠️ تنبيه', 'اختر المندوب وأدخل المبلغ', '⚠️'); return; }
  await api('/api/payouts', { method: 'POST', body: JSON.stringify({ courierId: courierId, amount: amount, notes: notes }) });
  document.getElementById('payoutCourier').value = '';
  document.getElementById('payoutAmount').value = '';
  document.getElementById('payoutNotes').value = '';
  loadPayouts();
  showToast('💰 تم', 'تم تسجيل الدفعة', '💰');
}

async function updatePayout(id, status) {
  await api('/api/payouts/' + id, { method: 'PATCH', body: JSON.stringify({ status: status }) });
  loadPayouts();
  showToast('🔄 تم التحديث', 'تم تحديث حالة الدفعة', '💰');
}

// ═══════════ PRINT INVOICE ═══════════
async function printInvoice(id) {
  try {
    var d = await api('/api/shipments/' + id);
    var s = (d && d.data) ? d.data : d;
    if (!s) return;
    var sl = { new: 'جديدة', transit: 'قيد التوصيل', done: 'تم التسليم', rejected: 'مرفوضة' };
    var dt = new Date(s.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    var inv = 'INV-' + s.tracking_number;
    var sub = s.shipping_price || 0;
    var comm = s.commission_amount || 0;
    var tot = s.net_profit || 0;
    var win = window.open('', '_blank', 'width=800,height=900');
    win.document.write('<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>فاتورة ' + inv + '</title><style>@import url("https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap");*{margin:0;padding:0;}body{font-family:Cairo,sans-serif;padding:40px;direction:rtl;color:#1a1a1a;}.c{max-width:800px;margin:0 auto;border:2px solid #0a1628;border-radius:12px;overflow:hidden;}.h{background:linear-gradient(135deg,#0a1628,#1a3a6b);color:white;padding:30px;display:flex;justify-content:space-between;}.h h1{font-size:1.8rem;font-weight:900;}.h .en{color:#f5a623;font-size:0.8rem;}.b{padding:30px;}.g{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:30px;}.box{border:1px solid #e2e8f0;border-radius:10px;padding:20px;}.box h4{color:#0a1628;margin-bottom:12px;border-bottom:2px solid #f5a623;padding-bottom:8px;}table{width:100%;border-collapse:collapse;margin-bottom:30px;}th{background:#0a1628;color:white;padding:14px 16px;text-align:right;}td{padding:14px 16px;border-bottom:1px solid #e2e8f0;}.tot{margin-right:auto;max-width:350px;}.tot .r{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e2e8f0;}.tot .r.t{font-size:1.2rem;font-weight:900;color:#0a1628;border-bottom:none;border-top:3px solid #0a1628;padding-top:16px;margin-top:8px;}.tot .r label{color:#8a97b0;}.f{background:#f4f6fb;padding:20px 30px;text-align:center;font-size:0.8rem;color:#8a97b0;border-top:1px solid #e2e8f0;}.trk{text-align:center;background:#f4f6fb;padding:16px;border-radius:10px;margin-bottom:24px;border:1px dashed #0a1628;}.trk .num{font-family:monospace;font-size:1.5rem;font-weight:900;color:#f5a623;background:#0a1628;padding:8px 20px;border-radius:8px;letter-spacing:2px;display:inline-block;}@media print{body{padding:0;}.c{border:none;}}</style></head><body><div class="c"><div class="h"><div><h1>👑 كينج شيبنج</h1><div class="en">KING SHIPPING</div></div><div><h2 style="color:#f5a623;">فاتورة شحن</h2><div style="font-size:1.2rem;font-weight:900;">' + inv + '</div></div></div><div class="b"><div class="trk"><div style="font-size:0.85rem;color:#8a97b0;margin-bottom:8px;">كود تتبع الشحنة</div><div class="num">' + s.tracking_number + '</div></div><div class="g"><div class="box"><h4>بيانات المرسل</h4><p>' + (s.sender_name || '—') + '</p><p style="color:#8a97b0;font-size:0.85rem;">' + (s.sender_phone || '') + '</p><p style="color:#8a97b0;font-size:0.85rem;">' + (s.sender_address || '') + '</p></div><div class="box"><h4>بيانات المستلم</h4><p>' + (s.customer_name || '—') + '</p><p style="color:#8a97b0;font-size:0.85rem;">' + (s.customer_phone || '') + '</p><p style="color:#8a97b0;font-size:0.85rem;">' + (s.customer_address || '') + '</p></div></div><table><thead><tr><th>البيان</th><th>التفاصيل</th></tr></thead><tbody><tr><td>الخط</td><td>' + (s.route_name || '—') + '</td></tr><tr><td>الوزن</td><td>' + (s.weight || 1) + ' كجم</td></tr><tr><td>الحجم</td><td>' + (s.size || 'medium') + '</td></tr><tr><td>الحالة</td><td><strong>' + (sl[s.status] || s.status) + '</strong></td></tr><tr><td>المندوب</td><td>' + (s.courier_name || '—') + '</td></tr><tr><td>التاريخ</td><td>' + dt + '</td></tr></tbody></table><div class="tot"><div class="r"><label>سعر الشحن</label><span>' + sub + ' ج</span></div><div class="r"><label>العمولة (' + (s.commission_percent || 20) + '%)</label><span style="color:var(--warning);">-' + comm.toFixed(2) + ' ج</span></div><div class="r t"><label>صافي الربح</label><span style="color:#22c55e;">' + tot.toFixed(2) + ' ج</span></div></div></div><div class="f"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;"><span>📅 ' + dt + '</span><span>👑 كينج شيبنج - King Shipping</span></div></div></div></body></html>');
    win.document.close();
  } catch (err) { showToast('❌ خطأ', 'فشل طباعة الفاتورة', '❌'); }
}

// ═══════════ NOTIFICATIONS ═══════════
async function showNotifications() {
  try {
    var d = await api('/api/admin/notifications');
    var notifications = (d && d.data) ? d.data : [];
    if (notifications.length === 0) {
      showToast('🔔', 'لا توجد إشعارات جديدة', '🔔');
      return;
    }
    var text = notifications.slice(0, 10).map(function(n) {
      return (n.is_read ? '' : '🆕 ') + n.title + ': ' + n.message;
    }).join('\n\n');
    alert('🔔 الإشعارات:\n\n' + text);
  } catch (err) {}
}

async function checkAdminNotifications() {
  try {
    var d = await api('/api/admin/notifications/count');
    var count = d && d.count ? d.count : 0;
    var badge = document.getElementById('notifBadge');
    if (badge) {
      if (count > 0) { badge.style.display = 'inline'; badge.textContent = count > 99 ? '99+' : count; }
      else { badge.style.display = 'none'; }
    }
  } catch (err) {}
}

// ═══════════ LOGOUT ═══════════
function logout() { localStorage.clear(); window.location.href = 'admin-login'; }

// ═══════════ MODALS ═══════════
document.querySelectorAll('.modal-overlay').forEach(function(o) {
  o.addEventListener('click', function(e) { if (e.target === this) this.classList.remove('show'); });
});
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.show').forEach(function(m) { m.classList.remove('show'); });
});

// ═══════════ SEARCH ═══════════
var searchInput = document.getElementById('searchShipment');
if (searchInput) {
  searchInput.addEventListener('input', function() {
    clearTimeout(this._timeout);
    this._timeout = setTimeout(loadShipments, 500);
  });
}

// ═══════════ AUTO REFRESH ═══════════
setInterval(function() {
  var activeSection = document.querySelector('[id^="section-"]:not(.section-hidden)');
  if (activeSection) {
    var sectionId = activeSection.id.replace('section-', '');
    var loaders = {
      dashboard: loadDashboard,
      shipments: loadShipments,
      couriers: loadCouriers,
      routes: loadRoutesAdmin,
      'routes-report': loadRoutesReport,
      messages: loadMessages,
      returns: loadReturns
    };
    if (loaders[sectionId]) loaders[sectionId]();
  }
  checkAdminNotifications();
}, 5000);

loadDashboard();
