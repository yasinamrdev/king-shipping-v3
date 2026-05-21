const userToken = localStorage.getItem('userToken');
const userData = JSON.parse(localStorage.getItem('userData') || 'null');

// ═══════════ TOAST SYSTEM ═══════════
function showToast(title, desc, icon, duration) {
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
  setTimeout(function() { if (toast.parentElement) toast.remove(); }, duration || 5000);
  // Sound based on icon
  if (typeof SoundManager !== 'undefined') {
    if (icon === '📦' || icon === '🎉') SoundManager.newShipment();
    else if (icon === '❌') SoundManager.error();
    else if (icon === '⚠️') SoundManager.warning();
    else if (icon === '📋' || icon === '✅') SoundManager.success();
    else if (icon === '🔔') SoundManager.notification();
  }
}

// ═══════════ NAVBAR ═══════════
function updateNavbar() {
  var gb = document.getElementById('guestButtons');
  var ub = document.getElementById('userButtons');
  var nu = document.getElementById('navUsername');
  if (userToken && userData) {
    if (gb) gb.style.display = 'none';
    if (ub) ub.style.display = 'flex';
    if (nu) nu.textContent = userData.name || 'شحناتي';
    autoFillRequestForm();
  } else {
    if (gb) gb.style.display = 'flex';
    if (ub) ub.style.display = 'none';
  }
}

function logoutUser() {
  localStorage.removeItem('userToken');
  localStorage.removeItem('userData');
  showToast('🚪 تم تسجيل الخروج', 'نشوفك على خير', '👋');
  setTimeout(function() { window.location.reload(); }, 800);
}

function autoFillRequestForm() {
  if (!userToken || !userData) return;
  var n = document.getElementById('rName');
  var p = document.getElementById('rPhone');
  if (n && !n.value) n.value = userData.name || '';
  if (p && !p.value) p.value = userData.phone || '';
}

// ═══════════ TRACKING ═══════════
async function trackShipment() {
  var input = document.getElementById('trackInput');
  var tn = input.value.trim().toUpperCase();
  var re = document.getElementById('trackResult');
  var tb = document.getElementById('trackBtn');
  if (!tn) { re.innerHTML = '<p class="track-empty">⚠️ من فضلك أدخل رقم الشحنة</p>'; input.focus(); return; }
  tb.disabled = true; tb.innerHTML = '⏳ جاري البحث...'; re.innerHTML = '<p class="track-loading">🔍 جاري البحث عن الشحنة...</p>';
  try {
    var r = await fetch('/api/track/' + encodeURIComponent(tn));
    var d = await r.json();
    if (r.ok && d.success) {
      var s = d.data;
      var sl = { new: 'تم الاستلام', transit: 'قيد التوصيل', done: 'تم التسليم', rejected: 'مرفوضة' };
      var sbc = { new: 'status-received', transit: 'status-transit', done: 'status-delivered', rejected: 'status-rejected' };
      var h = '<div class="timeline show"><div class="timeline-header"><div><span class="shipment-id">🔖 ' + s.tracking_number + '</span><div style="font-size:0.8rem;color:var(--gray);margin-top:4px;">👤 ' + (s.customer_name || '') + ' | 🛣️ ' + (s.route_name || '') + ' | ⚖️ ' + (s.weight || 1) + ' كجم</div></div><span class="status-badge ' + sbc[s.status] + '">' + sl[s.status] + '</span></div><div class="steps">';
      var steps = [
        { k: 'new', i: '📦', t: 'تم استلام الطرد', d: 'تم استلام الشحنة في مستودعاتنا' },
        { k: 'transit', i: '🛵', t: 'قيد التوصيل', d: 'المندوب في الطريق إليك' },
        { k: 'done', i: '✅', t: 'تم التسليم', d: 'تم تسليم الطرد بنجاح' }
      ];
      var order = ['new', 'transit', 'done', 'rejected'];
      var curIdx = order.indexOf(s.status);
      steps.forEach(function(stp, i) {
        var idx = order.indexOf(stp.k);
        var isDone = curIdx > idx || (s.status === stp.k && s.status === 'done');
        var isActive = s.status === stp.k && s.status !== 'done';
        var dotClass = isDone ? 'done' : (isActive ? 'active' : '');
        var lineClass = isDone ? 'done' : '';
        h += '<div class="step">' + (i < steps.length - 1 ? '<div class="step-line ' + lineClass + '"></div>' : '') + '<div class="step-dot ' + dotClass + '">' + (isDone ? '✓' : stp.i) + '</div><div class="step-content"><div class="step-title">' + stp.t + '</div><div class="step-date">' + new Date(s.created_at || Date.now()).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) + '</div><div class="step-desc">' + stp.d + '</div></div></div>';
      });
      if (s.status === 'rejected') {
        h += '<div class="step"><div class="step-dot active" style="background:var(--danger);border-color:var(--danger);">❌</div><div class="step-content"><div class="step-title" style="color:var(--danger);">تم رفض الشحنة</div><div class="step-date">' + new Date(s.updated_at || Date.now()).toLocaleDateString('ar-EG') + '</div></div></div>';
      }
      if (s.courier_name) {
        h += '<div style="margin-top:20px;padding:16px;background:var(--gray-light);border-radius:12px;display:flex;align-items:center;gap:10px;">🛵 المندوب المسؤول: <strong>' + s.courier_name + '</strong></div>';
      }
      h += '</div></div>';
      re.innerHTML = h;
    } else {
      re.innerHTML = '<p class="track-not-found">❌ ' + (d.error || 'لم يتم العثور على الشحنة') + '</p>';
    }
  } catch (err) {
    re.innerHTML = '<p class="track-not-found">❌ تعذر الاتصال بالخادم. تأكد من اتصالك بالإنترنت.</p>';
  } finally {
    tb.disabled = false;
    tb.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg> تتبع';
  }
}

// ═══════════ REQUEST FORM ═══════════
async function submitRequest(event) {
  event.preventDefault();
  var rs = document.getElementById('rRoute');
  if (!rs || !rs.value) { showToast('⚠️ تنبيه', 'من فضلك اختر الخط أولاً', '⚠️'); rs.focus(); return; }
  var sp = 50;
  try {
    var rr = await fetch('/api/routes');
    var rd = await rr.json();
    var rts = rd.data || rd;
    var sr = rts.find(function(r) { return r.id == rs.value; });
    if (sr) sp = sr.base_price || 50;
  } catch (e) {}

  var body = {
    name: document.getElementById('rName').value.trim(),
    phone: document.getElementById('rPhone').value.trim(),
    routeId: rs.value,
    packagesCount: parseInt(document.getElementById('rCount').value) || 1,
    weight: parseFloat(document.getElementById('rWeight').value) || 1,
    size: document.getElementById('rSize').value,
    senderAddress: document.getElementById('rAddress').value.trim(),
    customerName: document.getElementById('rCustomerName').value.trim(),
    customerPhone: document.getElementById('rCustomerPhone').value.trim(),
    customerAddress: document.getElementById('rCustomerAddress').value.trim(),
    storeLink: document.getElementById('rStoreLink').value.trim(),
    notes: document.getElementById('rNotes').value.trim(),
    shippingPrice: sp,
    userId: userData ? userData.id : null,
    autoConvert: true
  };

  if (!body.name || !body.phone || !body.customerName || !body.customerPhone || !body.senderAddress || !body.customerAddress) {
    showToast('⚠️ تنبيه', 'من فضلك املأ جميع الحقول المطلوبة', '⚠️');
    return;
  }

  var se = document.getElementById('requestSuccess');
  var sb = document.querySelector('#requestForm .btn-submit');
  se.style.display = 'none';
  if (sb) { sb.disabled = true; sb.textContent = '⏳ جاري إنشاء الشحنة...'; }

  try {
    var r1 = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    var d1 = await r1.json();
    if (!r1.ok) { showToast('❌ خطأ', d1.error || 'حدث خطأ في إنشاء الطلب', '❌'); return; }

    var r2 = await fetch('/api/requests/' + d1.data.id + '/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shippingPrice: sp })
    });
    var d2 = await r2.json();
    if (r2.ok && d2.success) {
      se.innerHTML = '<div style="font-size:1.2rem;margin-bottom:8px;">✅ تم إنشاء شحنتك بنجاح!</div><div style="font-size:0.85rem;color:var(--gray);margin-bottom:12px;">كود التتبع الخاص بك:</div><div style="font-size:1.8rem;font-weight:900;color:var(--navy);background:var(--gold);padding:12px 24px;border-radius:12px;display:inline-block;letter-spacing:2px;font-family:monospace;margin-bottom:16px;">' + d2.data.tracking_number + '</div><div style="font-size:0.82rem;color:var(--gray);margin-bottom:16px;">استخدم هذا الكود لتتبع شحنتك في أي وقت</div><button onclick="copyCode(\'' + d2.data.tracking_number + '\')" style="background:var(--navy);color:var(--gold);border:none;padding:12px 24px;border-radius:10px;font-family:Cairo,sans-serif;font-weight:700;cursor:pointer;font-size:0.95rem;">📋 نسخ الكود</button>';
      se.style.display = 'block';
      document.querySelectorAll('#requestForm input, #requestForm textarea').forEach(function(el) {
        if (el.id !== 'rName' && el.id !== 'rPhone' && el.id !== 'rAddress' && el.id !== 'rStoreLink') el.value = '';
      });
      document.getElementById('rCount').value = '1';
      document.getElementById('rWeight').value = '1';
      document.getElementById('rSize').value = 'medium';
      rs.value = '';
      showToast('🎉 تهانينا!', 'تم إنشاء شحنتك بنجاح! كود التتبع: ' + d2.data.tracking_number, '📦');
      setTimeout(function() { se.style.display = 'none'; }, 20000);
    } else {
      showToast('❌ خطأ', 'حدث خطأ في إنشاء الشحنة', '❌');
    }
  } catch (e) {
    showToast('❌ خطأ', 'تعذر الاتصال بالخادم', '❌');
  } finally {
    if (sb) { sb.disabled = false; sb.textContent = '📦 إرسال الطلب'; }
  }
}

function copyCode(c) {
  navigator.clipboard.writeText(c).then(function() {
    showToast('✅ تم النسخ', 'تم نسخ الكود: ' + c, '📋');
  }).catch(function() {
    showToast('📋 الكود', c, '📋');
  });
}

// ═══════════ AI ASSISTANT ═══════════
var chatHistory = JSON.parse(localStorage.getItem('aiChatHistory') || '[]');

function renderChatHistory() {
  var chat = document.getElementById('aiChat');
  if (!chat) return;
  chat.innerHTML = '';
  if (chatHistory.length === 0) {
    chat.innerHTML = '<div class="ai-msg bot"><span>🤖 مرحباً! أنا المساعد الذكي لكينج شيبنج. اسألني عن:<br>• تتبع الشحنات<br>• طلب مندوب<br>• الأسعار والخطوط<br>• الإرجاع والاستبدال<br>• إنشاء حساب</span></div>';
    return;
  }
  chatHistory.forEach(function(msg) {
    chat.innerHTML += '<div class="ai-msg ' + msg.role + '"><span>' + (msg.role === 'bot' ? '🤖 ' : '🧑 ') + msg.text + '</span></div>';
  });
}

async function askAI() {
  var q = document.getElementById('aiQuestion');
  var chat = document.getElementById('aiChat');
  var question = q.value.trim();
  if (!question) return;

  chatHistory.push({ role: 'user', text: question });
  chat.innerHTML += '<div class="ai-msg user"><span>' + question + '</span></div>';
  q.value = '';
  chat.innerHTML += '<div class="ai-loading">🤖 جاري التفكير...</div>';
  chat.scrollTop = chat.scrollHeight;

  try {
    var r = await fetch('/api/ai/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: question })
    });
    var d = await r.json();
    var loading = chat.querySelector('.ai-loading');
    if (loading) loading.remove();

    var answer = d.answer || 'عذراً، لم أتمكن من فهم سؤالك. حاول صياغته بطريقة مختلفة.';
    chatHistory.push({ role: 'bot', text: answer });
    chat.innerHTML += '<div class="ai-msg bot"><span>' + answer + '</span></div>';
    localStorage.setItem('aiChatHistory', JSON.stringify(chatHistory));
  } catch (e) {
    var loading = chat.querySelector('.ai-loading');
    if (loading) loading.remove();
    chat.innerHTML += '<div class="ai-msg bot"><span style="background:#fee2e2;color:#991b1b;">❌ تعذر الاتصال بالمساعد الذكي</span></div>';
  }
  chat.scrollTop = chat.scrollHeight;
}

function clearChat() {
  if (confirm('مسح سجل المحادثة؟')) {
    chatHistory = [];
    localStorage.removeItem('aiChatHistory');
    var chat = document.getElementById('aiChat');
    if (chat) {
      chat.innerHTML = '<div class="ai-msg bot"><span>🤖 مرحباً! أنا المساعد الذكي لكينج شيبنج. اسألني عن:<br>• تتبع الشحنات<br>• طلب مندوب<br>• الأسعار والخطوط<br>• الإرجاع والاستبدال<br>• إنشاء حساب</span></div>';
    }
  }
}

// ═══════════ CONTACT FORM ═══════════
async function sendContactMessage(e) {
  e.preventDefault();
  var form = e.target;
  var name = document.getElementById('contactName') ? document.getElementById('contactName').value.trim() : '';
  var phone = document.getElementById('contactPhone') ? document.getElementById('contactPhone').value.trim() : '';
  var message = document.getElementById('contactMessage') ? document.getElementById('contactMessage').value.trim() : '';

  if (!name || !phone || !message) {
    showToast('⚠️ تنبيه', 'من فضلك املأ جميع الحقول', '⚠️');
    return;
  }
  if (phone.length < 10) {
    showToast('⚠️ تنبيه', 'رقم الهاتف غير صحيح', '⚠️');
    return;
  }
  try {
    var r = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, phone: phone, message: message })
    });
    var d = await r.json();
    if (r.ok && d.success) {
      showToast('✅ تم الإرسال', 'تم إرسال رسالتك بنجاح! سنتواصل معك قريباً.', '📨');
      form.reset();
    } else {
      showToast('❌ خطأ', d.error || 'حدث خطأ في الإرسال', '❌');
    }
  } catch (err) {
    showToast('❌ خطأ', 'تعذر الاتصال بالخادم', '❌');
  }
}

// ═══════════ LOAD ROUTES ═══════════
async function loadRoutes() {
  try {
    var r = await fetch('/api/routes');
    if (r.ok) {
      var d = await r.json();
      var rts = d.data || d;
      var tb = document.getElementById('routesBody');
      if (tb) {
        if (rts.length === 0) {
          tb.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--gray);">لم يتم إضافة خطوط بعد</td></tr>';
        } else {
          tb.innerHTML = rts.map(function(rt) {
            return '<tr><td><span class="gov-tag">🛣️ ' + rt.name + '</span></td><td>' + (rt.delivery_time || '—') + '</td><td><span class="price-tag">' + (rt.base_price || 0) + ' ج</span></td><td>+' + (rt.extra_kg_price || 0) + ' ج</td></tr>';
          }).join('');
        }
      }
      var s = document.getElementById('rRoute');
      if (s) {
        var sv = s.value;
        s.innerHTML = '<option value="">اختر الخط</option>' + rts.map(function(rt) {
          return '<option value="' + rt.id + '" ' + (rt.id == sv ? 'selected' : '') + '>' + rt.name + ' (' + rt.base_price + ' ج)</option>';
        }).join('');
      }
    }
  } catch (e) {}
}

// ═══════════ HERO STATS ═══════════
async function loadHeroStats() {
  try {
    var r = await fetch('/api/stats');
    if (r.ok) {
      var d = await r.json();
      if (d && d.data) {
        var stats = [
          { num: (d.data.total_shipments || 0) + '+', label: 'شحنة' },
          { num: '27', label: 'محافظة' },
          { num: '98%', label: 'رضا العملاء' },
          { num: '24', label: 'ساعة توصيل' }
        ];
        var container = document.querySelector('.hero-stats');
        if (container) {
          container.innerHTML = stats.map(function(s) {
            return '<div class="stat"><span class="stat-number">' + s.num + '</span><span class="stat-label">' + s.label + '</span></div>';
          }).join('');
        }
      }
    }
  } catch (e) {}
}

// ═══════════ BACK TO TOP ═══════════
function toggleBackToTop() {
  var btn = document.getElementById('backToTop');
  if (!btn) return;
  if (window.scrollY > 500) {
    btn.classList.add('show');
  } else {
    btn.classList.remove('show');
  }
}

// ═══════════ INIT ═══════════
document.getElementById('hamburger')?.addEventListener('click', function() {
  this.classList.toggle('active');
  document.getElementById('navLinks').classList.toggle('open');
});

document.getElementById('trackInput')?.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') trackShipment();
});

document.getElementById('aiQuestion')?.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') askAI();
});

document.getElementById('clearChat')?.addEventListener('click', clearChat);

window.addEventListener('scroll', toggleBackToTop);

window.addEventListener('DOMContentLoaded', function() {
  updateNavbar();
  loadRoutes();
  loadHeroStats();
  renderChatHistory();
  // Sound toggle state
  var st = document.getElementById('soundToggle');
  if (st && typeof SoundManager !== 'undefined') {
    if (localStorage.getItem('soundMuted') === 'true') { SoundManager._enabled = false; st.classList.add('muted'); st.textContent = '🔇'; }
    st.addEventListener('click', function() {
      var muted = this.classList.contains('muted');
      this.textContent = muted ? '🔊' : '🔇';
      localStorage.setItem('soundMuted', muted ? 'false' : 'true');
    });
  }
});

setInterval(loadRoutes, 30000);
setInterval(updateNavbar, 5000);
