/**
 * LabSupply core: namespace window.SP (API, router, shell, UI helpers)
 * ไฟล์นี้ต้องโหลดก่อนไฟล์หน้าเว็บทุกไฟล์ (สร้าง SP.pages ไว้ตั้งแต่ต้น)
 */
(function () {
  'use strict';
  const SP = window.SP = window.SP || {};
  SP.pages = SP.pages || {};
  SP.VERSION = '1.0.2';
  SP.state = { token: '', user: null, boot: null, stats: null, page: '', param: {} };
  SP.ROLE = { admin: 'ผู้ดูแลระบบ', staff: 'เจ้าหน้าที่คลัง', viewer: 'ผู้บริหาร (ดูอย่างเดียว)' };

  /* ---------- ตัวช่วยพื้นฐาน ---------- */
  SP.$ = (s, r) => (r || document).querySelector(s);
  SP.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  SP.esc = s => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ESC[c]);
  SP.r2 = n => Math.round((Number(n) || 0) * 100) / 100;
  SP.uid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
  SP.debounce = (fn, ms) => { let t; return function () { const a = arguments, s = this; clearTimeout(t); t = setTimeout(() => fn.apply(s, a), ms || 250); }; };
  SP.byName = (a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'th');
  SP.store = {
    get(k, d) { try { const v = localStorage.getItem('ls_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('ls_' + k, JSON.stringify(v)); } catch (e) { /* ไม่มีพื้นที่ */ } },
    del(k) { try { localStorage.removeItem('ls_' + k); } catch (e) { /* ignore */ } },
  };
  SP.apiUrl = () => String(SP.store.get('api_url', '') || (window.LABSUPPLY_CONFIG || {}).API_URL || '').trim();

  const _scripts = {};
  SP.loadScript = src => _scripts[src] || (_scripts[src] = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = () => res();
    s.onerror = () => { delete _scripts[src]; rej(new Error('โหลดไฟล์ไม่สำเร็จ ตรวจการเชื่อมต่ออินเทอร์เน็ต')); };
    document.head.appendChild(s);
  }));

  /* ---------- วันที่ / ตัวเลข (Asia/Bangkok เท่านั้น) ---------- */
  const fYmd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' });
  const fHm = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false });
  const nf = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 2 });
  const nf2 = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const TH_M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const TH_MF = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  SP.TH_MF = TH_MF;
  const isYmd = s => /^\d{4}-\d{2}-\d{2}/.test(String(s || ''));
  SP.today = () => fYmd.format(new Date());
  SP.ymd = d => fYmd.format(d);
  SP.addDays = (ymd, n) => fYmd.format(new Date(Date.parse(ymd + 'T12:00:00+07:00') + n * 864e5));
  SP.daysTo = ymd => Math.round((Date.parse(ymd + 'T00:00:00+07:00') - Date.parse(SP.today() + 'T00:00:00+07:00')) / 864e5);
  SP.fmt = {
    num: n => nf.format(Number(n) || 0),
    money: n => nf2.format(Number(n) || 0),
    short(n) {
      n = Number(n) || 0;
      const a = Math.abs(n);
      if (a >= 1e6) return nf.format(SP.r2(n / 1e6)) + ' ล.';
      if (a >= 1e4) return nf.format(Math.round(n / 100) / 10) + 'K';
      return nf.format(SP.r2(n));
    },
    date: s => (isYmd(s) ? (+s.slice(8, 10)) + ' ' + TH_M[+s.slice(5, 7) - 1] + ' ' + (+s.slice(0, 4) + 543) : (s || '-')),
    dateShort: s => (isYmd(s) ? (+s.slice(8, 10)) + ' ' + TH_M[+s.slice(5, 7) - 1] + ' ' + String(+s.slice(0, 4) + 543).slice(2) : (s || '-')),
    dateLong: s => (isYmd(s) ? (+s.slice(8, 10)) + ' ' + TH_MF[+s.slice(5, 7) - 1] + ' ' + (+s.slice(0, 4) + 543) : (s || '-')),
    dateTime(iso) {
      const d = iso instanceof Date ? iso : new Date(iso);
      if (isNaN(d.getTime())) return '-';
      return SP.fmt.date(fYmd.format(d)) + ' ' + fHm.format(d) + ' น.';
    },
    month: ym => TH_M[+ym.slice(5, 7) - 1] + ' ' + String(+ym.slice(0, 4) + 543).slice(2),
    qty: (n, unit) => nf.format(Number(n) || 0) + (unit ? ' ' + unit : ''),
  };
  /** แปลงวันที่ที่พิมพ์มาจาก Excel: 31/12/2569, 31/12/2026, 2026-12-31, 31-12-69 */
  SP.parseDate = function (v) {
    const s = String(v || '').trim();
    if (!s) return '';
    let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    let y, mo, d;
    if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; } else {
      m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(s);
      if (!m) return null;
      d = +m[1]; mo = +m[2]; y = +m[3];
      if (y < 100) y = y >= 50 ? 2500 + y : 2000 + y;
    }
    if (y > 2400) y -= 543;
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
    return y + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  };

  /** แยกข้อความที่คัดลอกจาก Excel (แท็บ) หรือ CSV (จุลภาค) เป็นตาราง */
  SP.parseTable = function (text) {
    text = String(text || '').replace(/\r\n?/g, '\n').replace(/\n+$/, '');
    if (!text.trim()) return [];
    const delim = text.indexOf('\t') >= 0 ? '\t' : ',';
    const rows = [];
    let row = [], cell = '', inQ = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQ) {
        if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else inQ = false; } else cell += ch;
      } else if (ch === '"' && cell === '') inQ = true;
      else if (ch === delim) { row.push(cell); cell = ''; }
      else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    row.push(cell);
    rows.push(row);
    return rows.map(r => r.map(c => c.trim())).filter(r => r.some(c => c !== ''));
  };
  SP.num = v => { const n = Number(String(v === undefined || v === null ? '' : v).replace(/[,\s฿]/g, '')); return isFinite(n) ? n : 0; };

  /* ---------- อายุวัสดุ ---------- */
  SP.thr = () => { const e = (SP.state.boot && SP.state.boot.config.expiry) || { d1: 30, d2: 60, d3: 120 }; return [e.d1, e.d2, e.d3]; };
  SP.BK_KEYS = ['expired', 'd1', 'd2', 'd3', 'over'];
  SP.bkLabel = k => {
    const t = SP.thr();
    return { expired: 'หมดอายุแล้ว', d1: 'ไม่เกิน ' + t[0] + ' วัน', d2: (t[0] + 1) + '-' + t[1] + ' วัน', d3: (t[1] + 1) + '-' + t[2] + ' วัน', over: 'มากกว่า ' + t[2] + ' วัน', none: 'ไม่มีวันหมดอายุ' }[k] || k;
  };
  SP.bkColor = k => ({ expired: '#dc2626', d1: '#ea580c', d2: '#d97706', d3: '#ca8a04', over: '#16a34a', none: '#94a3b8' }[k] || '#94a3b8');
  SP.bucket = exp => {
    if (!exp) return 'none';
    const d = SP.daysTo(exp), t = SP.thr();
    if (d < 0) return 'expired';
    if (d <= t[0]) return 'd1';
    if (d <= t[1]) return 'd2';
    if (d <= t[2]) return 'd3';
    return 'over';
  };
  SP.daysText = exp => { const d = SP.daysTo(exp); return d < 0 ? 'เลยมา ' + (-d) + ' วัน' : (d === 0 ? 'หมดอายุวันนี้' : 'อีก ' + d + ' วัน'); };
  SP.expPill = exp => {
    const k = SP.bucket(exp);
    if (k === 'none') return '<span class="exp-pill bk-none"><span class="dot"></span>ไม่มีวันหมดอายุ</span>';
    return `<span class="exp-pill bk-${k}" title="${SP.bkLabel(k)}"><span class="dot"></span>${SP.fmt.dateShort(exp)} · ${SP.daysText(exp)}</span>`;
  };
  /** แถบอายุวัสดุ: ยิ่งยาวยิ่งเหลืออายุมาก สีตามกลุ่มวันหมดอายุ */
  SP.lifeBar = exp => {
    if (!exp) return '<span class="small-muted">ไม่มีวันหมดอายุ</span>';
    const d = SP.daysTo(exp), t = SP.thr(), k = SP.bucket(exp);
    const pct = d < 0 ? 100 : Math.max(4, Math.min(100, d / (t[2] * 1.5) * 100));
    return `<div class="life" title="${SP.bkLabel(k)}"><div class="life-track"><div class="life-fill" style="width:${pct}%;background:${SP.bkColor(k)}"></div></div><small>${d < 0 ? 'หมดอายุ' : d + ' วัน'}</small></div>`;
  };
  SP.normBc = s => { s = String(s || '').trim().toUpperCase(); if (/^\d{8,14}$/.test(s)) s = s.replace(/^0+/, ''); return s; };
  SP.fefo = (a, b) => {
    const ea = a.exp || '9999-12-31', eb = b.exp || '9999-12-31';
    if (ea !== eb) return ea < eb ? -1 : 1;
    return String(a.received_at || '') < String(b.received_at || '') ? -1 : (String(a.received_at || '') > String(b.received_at || '') ? 1 : 0);
  };

  /* ---------- index ข้อมูลในเครื่อง (สแกนแล้วขึ้นทันที) ---------- */
  SP.index = function () {
    const b = SP.state.boot;
    const I = SP.idx = { item: {}, code: {}, bc: {}, cat: {}, sup: {}, req: {}, lot: {}, lotsByItem: {} };
    b.categories.forEach(c => { I.cat[c.id] = c; });
    b.suppliers.forEach(s => { I.sup[s.id] = s; });
    b.requesters.forEach(r => { I.req[r.id] = r; });
    b.items.forEach(it => {
      I.item[it.id] = it;
      it._bal = 0; it._val = 0; it._near = ''; it._lots = 0;
      I.code[String(it.code).toUpperCase()] = it;
      (it.barcodes || []).forEach(x => { I.bc[SP.normBc(x)] = it; });
    });
    b.lots.forEach(l => {
      I.lot[l.id] = l;
      (I.lotsByItem[l.item_id] = I.lotsByItem[l.item_id] || []).push(l);
      const it = I.item[l.item_id];
      if (it) {
        it._bal += l.balance; it._val += l.balance * l.price; it._lots++;
        if (l.exp && (!it._near || l.exp < it._near)) it._near = l.exp;
      }
    });
    Object.keys(I.lotsByItem).forEach(k => I.lotsByItem[k].sort(SP.fefo));
    b.items.forEach(it => {
      it._bal = SP.r2(it._bal); it._val = SP.r2(it._val);
      it._low = it.status === 'active' && it.min_qty > 0 && it._bal <= it.min_qty;
    });
    I.kpi = computeKpi(I, b);
  };
  function computeKpi(I, b) {
    const k = { items: 0, value: 0, low: 0, lots: 0, byCat: {}, bk: {}, lowList: [], expList: [] };
    ['expired', 'd1', 'd2', 'd3', 'over', 'none'].forEach(x => { k.bk[x] = { n: 0, v: 0 }; });
    b.categories.forEach(c => { k.byCat[c.id] = { n: 0, v: 0 }; });
    b.items.forEach(it => {
      if (it.status !== 'active') return;
      k.items++;
      if (k.byCat[it.category_id]) k.byCat[it.category_id].n++;
      if (it._low) { k.low++; k.lowList.push(it); }
    });
    b.lots.forEach(l => {
      const it = I.item[l.item_id];
      if (!it) return;
      const v = l.balance * l.price;
      k.value += v; k.lots++;
      if (k.byCat[it.category_id]) k.byCat[it.category_id].v += v;
      const bk = SP.bucket(l.exp);
      k.bk[bk].n++; k.bk[bk].v += v;
      if (bk !== 'none') k.expList.push(l);
    });
    k.expList.sort(SP.fefo);
    k.lowList.sort((a, c) => (a._bal / (a.min_qty || 1)) - (c._bal / (c.min_qty || 1)));
    k.value = SP.r2(k.value);
    return k;
  }
  SP.kpi = () => SP.idx.kpi;
  SP.alertCount = () => { if (!SP.idx) return 0; const k = SP.idx.kpi; return k.low + k.bk.expired.n + k.bk.d1.n; };
  SP.itemLabel = it => it ? it.name : '(ไม่พบวัสดุ)';
  SP.catOf = it => (it && SP.idx.cat[it.category_id]) || { name: '-', color: '#94a3b8' };
  SP.catDot = it => `<span class="cat-dot" style="background:${SP.esc(SP.catOf(it).color || '#94a3b8')}"></span>`;
  /** รูปวัสดุขนาดเล็ก ไม่มีรูปใช้ไอคอนสีตามประเภท cls: sm | lg | xl */
  SP.thumb = (it, cls) => (it && it.image
    ? `<span class="thumb ${cls || ''}"><img src="${SP.esc(it.image)}" alt="" loading="lazy" onerror="this.parentNode.classList.add('noimg');this.parentNode.innerHTML='<i class=&quot;bi bi-box-seam&quot;></i>'"></span>`
    : `<span class="thumb noimg ${cls || ''}" style="--c:${SP.esc(SP.catOf(it).color || '#94a3b8')}"><i class="bi bi-box-seam"></i></span>`);
  SP.packText = it => (it && it.pack_qty > 0 ? SP.fmt.num(it.pack_qty) + ' ' + (it.pack_unit || '') + '/' + (it.unit || '') : '-');
  SP.upsert = function (list, rec) {
    const arr = SP.state.boot[list];
    const i = arr.findIndex(x => x.id === rec.id);
    if (i >= 0) arr[i] = rec; else arr.push(rec);
    SP.index();
    SP.shell.update();
  };
  SP.removeRec = function (list, id) {
    SP.state.boot[list] = SP.state.boot[list].filter(x => x.id !== id);
    SP.index();
    SP.shell.update();
  };
  SP.applyLots = function (lots) {
    if (!lots) return;
    SP.state.boot.lots = lots;
    SP.state.stats = null;
    SP.index();
    SP.shell.update();
  };
  SP.opt = {
    items: filter => SP.state.boot.items.filter(it => it.status === 'active' && (!filter || filter(it))).slice().sort(SP.byName)
      .map(it => [it.id, it.name, it.code + ' · คงเหลือ ' + SP.fmt.num(it._bal) + ' ' + (it.unit || ''), (it.barcodes || []).join(' ') + ' ' + it.code]),
    suppliers: () => SP.state.boot.suppliers.slice().sort(SP.byName).map(s => [s.id, s.name, [s.contact, s.phone].filter(Boolean).join(' · ')]),
    requesters: () => SP.state.boot.requesters.slice().sort(SP.byName).map(r => [r.id, r.name, [r.position, r.section].filter(Boolean).join(' · ')]),
    cats: () => SP.state.boot.categories.map(c => [c.id, c.name]),
  };

  /* ---------- สีธีม (สร้างชุดสีจากสีเดียว) ---------- */
  SP.theme = {
    PRESETS: [['#0D9488', 'เขียวน้ำทะเล'], ['#0891B2', 'ฟ้าคราม'], ['#2563EB', 'น้ำเงิน'], ['#4F46E5', 'คราม'], ['#7C3AED', 'ม่วง'], ['#DB2777', 'ชมพู'],
      ['#DC2626', 'แดง'], ['#F26522', 'ส้ม'], ['#D97706', 'อำพัน'], ['#16A34A', 'เขียว'], ['#0F766E', 'เขียวหัวเป็ด'], ['#475569', 'เทาฟ้า']],
    rgb: h => [0, 2, 4].map(i => parseInt(h.replace('#', '').substr(i, 2), 16)),
    mix: (c, t, w) => c.map((v, i) => Math.round(v * (1 - w) + t[i] * w)),
    hex: c => '#' + c.map(v => ('0' + v.toString(16)).slice(-2)).join(''),
    apply(hex) {
      if (!/^#[0-9a-f]{6}$/i.test(String(hex || ''))) hex = '#0D9488';
      const c = this.rgb(hex), W = [255, 255, 255], K = [0, 0, 0];
      const v = {
        '--sb-primary': hex, '--sb-primary-rgb': c.join(','),
        '--sb-primary-600': this.hex(this.mix(c, K, 0.1)), '--sb-primary-700': this.hex(this.mix(c, K, 0.27)),
        '--sb-primary-50': this.hex(this.mix(c, W, 0.93)), '--sb-primary-100': this.hex(this.mix(c, W, 0.85)), '--sb-primary-200': this.hex(this.mix(c, W, 0.68)),
        '--sb-grad-from': this.hex(this.mix(c, W, 0.25)), '--sb-grad-to': this.hex(this.mix(c, K, 0.06)),
      };
      const st = SP.$('#theme-vars');
      if (st) st.textContent = ':root{' + Object.keys(v).map(k => k + ':' + v[k]).join(';') + '}';
      const m = SP.$('meta[name="theme-color"]');
      if (m) m.setAttribute('content', hex);
    },
  };
  SP.art = slot => { const a = (SP.state.boot && SP.state.boot.config.artwork) || {}; return a[slot] || 'img/labsupply-hero.png'; };
  SP.artImg = (slot, cls) => `<img class="${cls || 'hero-art'}" src="${SP.esc(SP.art(slot))}" alt="" onerror="this.remove()">`;

  /* ---------- เรียก API (POST text/plain, token อยู่ใน body) ---------- */
  SP.api = async function (action, data, opt) {
    opt = opt || {};
    const url = SP.apiUrl();
    if (!url) { const e = new Error('ยังไม่ได้ตั้งค่า URL ของ Web App (แก้ไฟล์ js/config.js)'); e.code = 'NO_API'; throw e; }
    const ctl = window.AbortController ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), opt.timeout || 90000) : 0;
    let text;
    try {
      const res = await fetch(url, {
        method: 'POST', redirect: 'follow', cache: 'no-store',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: action, token: SP.state.token, data: data || {} }),
        signal: ctl ? ctl.signal : undefined,
      });
      text = await res.text();
    } catch (e) {
      const er = new Error(e && e.name === 'AbortError' ? 'เซิร์ฟเวอร์ตอบช้าเกินไป กรุณาลองอีกครั้ง' : 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจอินเทอร์เน็ตหรือ URL ของ Web App');
      er.code = 'NET';
      throw er;
    } finally {
      if (timer) clearTimeout(timer);
    }
    let j;
    try { j = JSON.parse(text); } catch (e) {
      const er = new Error('เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง ตรวจว่า Deploy เป็นเว็บแอป สิทธิ์ "ทุกคน" แล้ว');
      er.code = 'BAD_RESPONSE';
      throw er;
    }
    if (!j.ok) {
      if (j.error === 'AUTH' && action !== 'auth.login') SP.auth.expired(j.message);
      const er = new Error(j.message || 'เกิดข้อผิดพลาด');
      er.code = j.error;
      throw er;
    }
    return j.data;
  };
  SP.loadStats = async function (force) {
    if (SP.state.stats && !force) return SP.state.stats;
    try { SP.state.stats = await SP.api('stats.get'); } catch (e) { if (e.code !== 'AUTH') console.warn(e); }
    return SP.state.stats;
  };
  SP.refresh = async function (render) {
    const b = await SP.api('app.boot');
    SP.state.boot = b; SP.state.user = b.user; SP.state.stats = null;
    SP.index();
    SP.theme.apply(b.config.theme && b.config.theme.primary);
    SP.shell.build();
    if (render) SP.route();
    return b;
  };

  /* ---------- toast / error ---------- */
  SP.toast = function (msg, type) {
    type = type || 'success';
    const box = SP.$('#spToasts');
    if (!box) return;
    const icon = { success: 'bi-check-circle-fill', danger: 'bi-x-octagon-fill', warning: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' }[type] || 'bi-info-circle-fill';
    const t = document.createElement('div');
    t.className = 'sp-toast sp-toast-' + type;
    t.innerHTML = `<i class="bi ${icon}"></i><div class="flex-grow-1">${SP.esc(msg)}</div>`;
    box.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    const kill = () => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); };
    t.addEventListener('click', kill);
    setTimeout(kill, type === 'danger' ? 6500 : 3200);
    while (box.children.length > 4) box.firstChild.remove();
  };
  SP.err = function (e) {
    if (e && e.code === 'AUTH') return;
    // ข้อผิดพลาดที่ server ตอบมาเป็นข้อความถึงผู้ใช้ (เช่น รหัสผิด คงเหลือไม่พอ) ไม่ต้องลง console
    if (!e || !e.code || ['NET', 'BAD_RESPONSE', 'SERVER', 'NO_ROUTE'].indexOf(e.code) >= 0) console.error(e);
    SP.toast((e && e.message) || String(e), 'danger');
  };
  window.addEventListener('error', ev => { if (ev && ev.error) SP.err(ev.error); });
  window.addEventListener('unhandledrejection', ev => { SP.err(ev.reason); });

  /* ---------- UI helpers ---------- */
  SP.ui = {};
  let bsModal = null;
  SP.ui._closing = false;
  SP.ui._seq = 0;
  let mShowing = false, mPendingClose = false;
  function ensureModal(el) {
    if (bsModal) return;
    bsModal = new bootstrap.Modal(el, { backdrop: 'static', focus: false });
    el.addEventListener('shown.bs.modal', () => {
      mShowing = false;
      if (mPendingClose) { mPendingClose = false; SP.ui.close(); }
    });
    el.addEventListener('hidden.bs.modal', () => {
      SP.ui._closing = false;
      SP.$('#spModalBody').innerHTML = '';
      SP.$('#spModalBody').onkeydown = null;
      const cb = SP.ui._onClose; SP.ui._onClose = null;
      if (cb) cb();
    });
  }
  /** เปิด popup กลาง คืน Promise ที่ได้ body เมื่อเปิดจริง (ถ้า popup เดิมกำลังปิดจะรอให้ปิดเสร็จก่อน) */
  SP.ui.modal = function (o) {
    return new Promise(resolve => {
      const el = SP.$('#spModal');
      ensureModal(el);
      if (SP.ui._closing) {
        let done = false;
        const go = () => { if (done) return; done = true; SP.ui._closing = false; resolve(SP.ui.modal(o)); };
        el.addEventListener('hidden.bs.modal', go, { once: true });
        setTimeout(go, 900);
        return;
      }
      mPendingClose = false;
      resolve(openModal(el, o));
    });
  };
  function openModal(el, o) {
    SP.ui._seq++;
    SP.ui._onClose = o.onClose || null;
    el.querySelector('.modal-dialog').className = 'modal-dialog modal-dialog-centered modal-dialog-scrollable' + (o.size ? ' modal-' + o.size : '') + ' modal-fullscreen-sm-down';
    SP.$('#spModalTitle').innerHTML = o.title || '';
    const holder = SP.$('#spModalBody');
    holder.onclick = null; holder.oninput = null; holder.onchange = null; holder.onkeydown = null;
    // กล่องเนื้อหาใหม่ทุกครั้ง: event ที่ผูกกับ root จะหายไปพร้อม popup ไม่ค้างไป popup ถัดไป
    const body = document.createElement('div');
    body.className = 'sp-mb';
    body.innerHTML = o.body || '';
    holder.innerHTML = '';
    holder.appendChild(body);
    const foot = SP.$('#spModalFoot');
    let fh = o.foot || '';
    if (!o.foot) {
      if (o.extra) fh += o.extra;
      fh += `<button type="button" class="btn btn-light" data-bs-dismiss="modal">${o.cancelText || (o.onSave ? 'ยกเลิก' : 'ปิด')}</button>`;
      if (o.onSave) fh += `<button type="button" class="btn btn-${o.danger ? 'danger' : 'primary'}" id="spModalSave">${o.saveText || '<i class="bi bi-check2"></i> บันทึก'}</button>`;
    }
    foot.innerHTML = fh;
    foot.onclick = null;
    foot.classList.toggle('d-none', !fh);
    const save = SP.$('#spModalSave');
    if (save) {
      const run = async () => {
        if (save.disabled) return;
        SP.ui.busy(save, true);
        try {
          const r = await o.onSave(body, save);
          if (r !== false) SP.ui.close();
        } catch (e) { SP.err(e); } finally { SP.ui.busy(save, false); }
      };
      save.addEventListener('click', run);
      body.addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.target.tagName === 'INPUT' && !e.target.closest('[data-no-enter]') && !e.target.classList.contains('sp-combo-input') && !e.target._scanBound) { e.preventDefault(); run(); }
      });
    }
    SP.ui.enhance(body);
    if (!el.classList.contains('show')) mShowing = true;
    bsModal.show();
    if (o.onOpen) setTimeout(() => { try { o.onOpen(body); } catch (e) { SP.err(e); } }, 20);
    return body;
  }
  SP.ui.setTitle = html => { SP.$('#spModalTitle').innerHTML = html; };
  SP.ui.setFoot = html => { const f = SP.$('#spModalFoot'); f.innerHTML = html || ''; f.classList.toggle('d-none', !html); };
  SP.ui.close = function () {
    if (!bsModal) return;
    if (mShowing) { mPendingClose = true; return; }
    const el = SP.$('#spModal');
    if (el.classList.contains('show')) { SP.ui._closing = true; bsModal.hide(); }
  };
  SP.ui.isOpen = () => SP.$('#spModal').classList.contains('show');
  SP.ui.busy = function (btn, on, text) {
    if (!btn) return;
    if (on) {
      if (btn.dataset.busy) return;
      btn.dataset.busy = '1'; btn.dataset.html = btn.innerHTML; btn.disabled = true;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status"></span>${text || 'กำลังทำรายการ...'}`;
    } else if (btn.dataset.busy) {
      btn.disabled = false; btn.innerHTML = btn.dataset.html; delete btn.dataset.busy;
    }
  };
  /** กล่องยืนยัน/ถาม (overlay แยกจาก popup จึงไม่ทับฟอร์มที่เปิดอยู่) */
  SP.ui.dialog = function (o) {
    return new Promise(resolve => {
      const d = document.createElement('div');
      d.className = 'sp-dialog';
      const tone = o.tone || 'primary';
      const btns = o.buttons || [
        o.cancelText === false ? null : { key: false, text: o.cancelText || 'ยกเลิก', cls: 'btn-light' },
        { key: true, text: o.okText || 'ตกลง', cls: tone === 'danger' ? 'btn-danger' : 'btn-primary' },
      ].filter(Boolean);
      d.innerHTML = `<div class="sp-dialog-box" role="dialog" aria-modal="true"><div class="ico tint-${tone}"><i class="bi ${o.icon || (tone === 'danger' ? 'bi-exclamation-triangle' : 'bi-question-lg')}"></i></div>
        <div class="t">${SP.esc(o.title || 'ยืนยันการทำรายการ')}</div><div class="m">${o.html || SP.esc(o.message || '')}</div>
        ${o.input ? `<input class="form-control mt-3" type="${o.input.type || 'text'}" placeholder="${SP.esc(o.input.placeholder || '')}" value="${SP.esc(o.input.value || '')}">` : ''}
        <div class="acts">${btns.map((b, i) => `<button type="button" class="btn ${b.cls || 'btn-light'}" data-i="${i}">${b.text}</button>`).join('')}</div></div>`;
      document.body.appendChild(d);
      const inp = d.querySelector('input');
      const done = v => { d.remove(); document.removeEventListener('keydown', onKey, true); resolve(v); };
      const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); done(o.input ? null : false); } };
      document.addEventListener('keydown', onKey, true);
      d.addEventListener('click', e => {
        const b = e.target.closest('[data-i]');
        if (!b) { if (e.target === d && o.cancelText !== false) done(o.input ? null : false); return; }
        const key = btns[+b.dataset.i].key;
        if (o.input && key === true) {
          const v = inp.value.trim();
          if (o.input.required && !v) { inp.classList.add('is-invalid'); inp.focus(); return; }
          return done(v);
        }
        done(o.input && key === false ? null : key);
      });
      if (inp) {
        setTimeout(() => inp.focus(), 60);
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); d.querySelector('.acts .btn:last-child').click(); } });
      }
    });
  };
  SP.ui.confirm = (message, o) => SP.ui.dialog(Object.assign({ message: message }, o || {}));
  SP.ui.prompt = (title, o) => SP.ui.dialog(Object.assign({ title: title, input: o || {}, icon: 'bi-pencil' }, o || {}));
  SP.ui.alert = (title, html, o) => SP.ui.dialog(Object.assign({ title: title, html: html, cancelText: false, icon: 'bi-info-lg', okText: 'ปิด' }, o || {}));

  SP.ui.f = (label, control, o) => {
    o = o || {};
    return `<div class="${o.col || 'col-12'}">${label ? `<label class="form-label">${label}${o.req ? ' <span class="text-danger">*</span>' : ''}</label>` : ''}${control}${o.hint ? `<div class="form-text">${o.hint}</div>` : ''}</div>`;
  };
  SP.ui.input = (name, val, attrs) => `<input class="form-control" name="${name}" value="${SP.esc(val === undefined || val === null ? '' : val)}" ${attrs || ''}>`;
  SP.ui.textarea = (name, val, attrs) => `<textarea class="form-control" name="${name}" rows="2" ${attrs || ''}>${SP.esc(val || '')}</textarea>`;
  SP.ui.select = (name, opts, val, attrs, placeholder) => `<select class="form-select" name="${name}" ${attrs || ''}>${placeholder !== undefined ? `<option value="">${SP.esc(placeholder)}</option>` : ''}${opts.map(o => `<option value="${SP.esc(o[0])}"${String(o[0]) === String(val === undefined || val === null ? '' : val) ? ' selected' : ''}${o[2] ? ` data-sub="${SP.esc(o[2])}"` : ''}${o[3] ? ` data-kw="${SP.esc(o[3])}"` : ''}>${SP.esc(o[1])}</option>`).join('')}</select>`;
  SP.ui.switch = (name, checked, label) => `<div class="form-check form-switch mt-1"><input class="form-check-input" type="checkbox" role="switch" name="${name}" id="sw_${name}" ${checked ? 'checked' : ''}><label class="form-check-label" for="sw_${name}">${label || ''}</label></div>`;
  SP.ui.form = root => {
    const o = {};
    SP.$$('[name]', root).forEach(el => {
      if (el.type === 'checkbox') o[el.name] = el.checked;
      else if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; }
      else o[el.name] = el.value;
    });
    return o;
  };
  SP.ui.empty = (icon, title, sub, action) => `<div class="empty"><div class="empty-ico"><i class="bi ${icon}"></i></div><div class="t">${title}</div>${sub ? `<div class="small mt-1">${sub}</div>` : ''}${action ? `<div class="mt-3">${action}</div>` : ''}</div>`;
  SP.ui.loading = (n) => `<div class="p-3">${Array.from({ length: n || 3 }, () => '<div class="skeleton mb-2" style="height:42px"></div>').join('')}</div>`;
  SP.ui.pager = function (total, page, size) {
    const pages = Math.max(1, Math.ceil(total / size));
    if (pages <= 1) return '';
    const btn = (p, label, dis, act) => `<li class="page-item${dis ? ' disabled' : ''}${act ? ' active' : ''}"><button type="button" class="page-link" data-page="${p}" ${dis ? 'disabled' : ''}>${label}</button></li>`;
    let h = '<nav aria-label="แบ่งหน้า"><ul class="pagination pagination-sm mb-0 flex-wrap">' + btn(page - 1, '<i class="bi bi-chevron-left"></i>', page <= 1);
    const set = Array.from(new Set([1, pages, page - 2, page - 1, page, page + 1, page + 2].filter(p => p >= 1 && p <= pages))).sort((a, b) => a - b);
    let last = 0;
    set.forEach(p => { if (p - last > 1) h += '<li class="page-item disabled"><span class="page-link">...</span></li>'; h += btn(p, p, false, p === page); last = p; });
    return h + btn(page + 1, '<i class="bi bi-chevron-right"></i>', page >= pages) + '</ul></nav>';
  };
  SP.ui.chips = (list, active, attr) => list.map(c => `<button type="button" class="chip${String(c[0]) === String(active) ? ' active' : ''}" ${attr || 'data-chip'}="${SP.esc(c[0])}">${c[2] ? `<span class="cat-dot" style="background:${SP.esc(c[2])}"></span>` : ''}${SP.esc(c[1])}${c[3] !== undefined ? ` <span class="n">${c[3]}</span>` : ''}</button>`).join('');

  /** อัปเกรด <select data-search> ให้ค้นหาได้ กดแล้วโชว์รายการทั้งหมดก่อนพิมพ์ */
  SP.ui.searchable = function (sel) {
    if (!sel || sel._sp) return;
    sel._sp = true;
    const wrap = document.createElement('div');
    wrap.className = 'sp-combo';
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    sel.style.display = 'none';
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'form-control sp-combo-input';
    inp.placeholder = sel.dataset.placeholder || 'แตะเพื่อเลือก หรือพิมพ์ค้นหา';
    inp.autocomplete = 'off';
    inp.setAttribute('autocapitalize', 'off');
    inp.disabled = sel.disabled;
    const list = document.createElement('div');
    list.className = 'sp-combo-list d-none';
    wrap.appendChild(inp);
    wrap.appendChild(list);
    const allowNew = sel.hasAttribute('data-allow-new');
    let shown = [], hi = -1;
    const opts = () => Array.from(sel.options).filter(o => o.value !== '');
    const plain = o => o.text.replace(/ \(ใหม่\)$/, '');
    const sync = () => { const o = sel.options[sel.selectedIndex]; inp.value = o && o.value ? plain(o) : ''; };
    const close = () => { list.classList.add('d-none'); hi = -1; };
    const hl = () => {
      SP.$$('.sp-combo-opt', list).forEach((d, i) => d.classList.toggle('hi', i === hi));
      const c = list.querySelector('.hi');
      if (c && c.scrollIntoView) c.scrollIntoView({ block: 'nearest' });
    };
    const draw = q => {
      q = (q || '').trim().toLowerCase();
      const all = opts();
      shown = all.filter(o => !q || (o.text + ' ' + (o.dataset.sub || '') + ' ' + (o.dataset.kw || '')).toLowerCase().indexOf(q) >= 0).slice(0, 150);
      let h = !q ? `<div class="sp-combo-hint">ทั้งหมด ${all.length} รายการ พิมพ์เพื่อค้นหา</div>` : '';
      h += shown.map((o, i) => `<div class="sp-combo-opt${o.value === sel.value ? ' sel' : ''}" data-i="${i}"><div class="t">${SP.esc(o.text)}</div>${o.dataset.sub ? `<div class="s">${SP.esc(o.dataset.sub)}</div>` : ''}</div>`).join('');
      if (!shown.length) h += `<div class="sp-combo-empty">ไม่พบรายการ${allowNew && q ? ' กด Enter เพื่อใช้ "' + SP.esc(inp.value.trim()) + '" เป็นชื่อใหม่' : ''}</div>`;
      list.innerHTML = h;
      list.classList.remove('d-none');
      hi = -1;
    };
    const pick = o => { sel.value = o.value; sync(); close(); sel.dispatchEvent(new Event('change', { bubbles: true })); };
    const useNew = text => {
      text = text.trim();
      if (!text) return;
      let o = Array.from(sel.options).find(x => plain(x).toLowerCase() === text.toLowerCase());
      if (!o) { o = new Option(text + ' (ใหม่)', 'new:' + text); sel.add(o); }
      pick(o);
    };
    inp.addEventListener('focus', () => { inp.select(); draw(''); });
    inp.addEventListener('click', () => { if (list.classList.contains('d-none')) draw(''); });
    inp.addEventListener('input', () => draw(inp.value));
    inp.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (list.classList.contains('d-none')) draw(''); hi = Math.min(shown.length - 1, hi + 1); hl(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); hi = Math.max(0, hi - 1); hl(); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (hi >= 0 && shown[hi]) pick(shown[hi]);
        else if (shown.length === 1) pick(shown[0]);
        else if (allowNew && inp.value.trim()) useNew(inp.value);
      } else if (e.key === 'Escape') { if (!list.classList.contains('d-none')) { e.stopPropagation(); close(); sync(); } }
      else if (e.key === 'Tab') close();
    });
    list.addEventListener('mousedown', e => {
      const d = e.target.closest('.sp-combo-opt');
      e.preventDefault();
      if (d) pick(shown[+d.dataset.i]);
    });
    inp.addEventListener('blur', () => setTimeout(() => {
      if (document.activeElement === inp) return;
      const wasOpen = !list.classList.contains('d-none');
      close();
      const t = inp.value.trim();
      const cur = sel.options[sel.selectedIndex];
      if (allowNew && t && (!cur || !cur.value || plain(cur) !== t)) {
        const ex = opts().find(o => plain(o) === t);
        if (ex) pick(ex); else useNew(t);
      } else if (wasOpen || inp.value !== (cur && cur.value ? plain(cur) : '')) sync();
    }, 160));
    sel.addEventListener('change', sync);
    sel._spRefresh = () => { inp.disabled = sel.disabled; sync(); };
    sync();
  };
  SP.ui.enhance = root => SP.$$('select[data-search]', root || document).forEach(SP.ui.searchable);
  SP.ui.setSelect = (sel, opts, val, placeholder) => {
    sel.innerHTML = (placeholder !== undefined ? `<option value="">${SP.esc(placeholder)}</option>` : '') + opts.map(o => `<option value="${SP.esc(o[0])}"${o[2] ? ` data-sub="${SP.esc(o[2])}"` : ''}${o[3] ? ` data-kw="${SP.esc(o[3])}"` : ''}>${SP.esc(o[1])}</option>`).join('');
    sel.value = val || '';
    if (sel._spRefresh) sel._spRefresh();
  };

  /** อ่านรูปแล้วย่อขนาดก่อนส่ง (ไม่เกิน maxSide px) */
  SP.readImage = function (file, maxSide) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('ยังไม่ได้เลือกไฟล์'));
      if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) return reject(new Error('รองรับเฉพาะไฟล์ JPG PNG WebP'));
      if (file.size > 8 * 1024 * 1024) return reject(new Error('ไฟล์ใหญ่เกิน 8 MB'));
      const fr = new FileReader();
      fr.onerror = () => reject(new Error('อ่านไฟล์ไม่สำเร็จ'));
      fr.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('ไฟล์ภาพเสียหรือไม่รองรับ'));
        img.onload = () => {
          const k = Math.min(1, (maxSide || 1600) / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          const png = file.type === 'image/png' || file.type === 'image/gif';
          const mime = png ? 'image/png' : 'image/jpeg';
          const dataUrl = c.toDataURL(mime, 0.9);
          resolve({ dataUrl: dataUrl, b64: dataUrl.split(',')[1], mime: mime, name: file.name });
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  };

  /** ส่งออก CSV (UTF-8 BOM เปิดใน Excel ภาษาไทยได้) */
  SP.csv = function (name, rows) {
    const s = '﻿' + rows.map(r => r.map(v => {
      v = v === undefined || v === null ? '' : String(v);
      return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    }).join(',')).join('\r\n');
    try {
      const blob = new Blob([s], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name.replace(/[\\/:*?"<>|]/g, '-') + '.csv';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    } catch (e) {
      SP.ui.modal({ title: 'คัดลอกข้อมูล CSV', size: 'lg', body: `<p class="small text-muted">เบราว์เซอร์ไม่อนุญาตให้ดาวน์โหลด คัดลอกข้อความด้านล่างไปวางใน Excel ได้</p><textarea class="form-control" rows="14" readonly>${SP.esc(s)}</textarea>` });
    }
  };

  /* ---------- เมนู (ขับด้วย array) ---------- */
  SP.MENU = [
    { key: 'dashboard', label: 'หน้าหลัก', icon: 'bi-grid-1x2', roles: '*', tile: '', desc: 'ภาพรวมคลังวัสดุ มูลค่า และอายุวัสดุ' },
    { key: 'receive', label: 'รับเข้า', icon: 'bi-box-arrow-in-down', roles: ['admin', 'staff'], tile: 'teal', desc: 'รับวัสดุเข้าคลัง สแกนบาร์โค้ด กรอก Lot และวันหมดอายุ' },
    { key: 'issue', label: 'จ่ายออก', icon: 'bi-box-arrow-up-right', roles: ['admin', 'staff'], tile: 'blue', desc: 'จ่ายวัสดุให้ผู้เบิก ระบบตัดล็อตที่หมดอายุก่อนให้อัตโนมัติ' },
    { key: 'stock', label: 'คงคลัง', icon: 'bi-boxes', roles: '*', tile: 'purple', desc: 'คงเหลือ มูลค่า รายล็อต และปรับปรุงยอด' },
    { key: 'items', label: 'วัสดุ', icon: 'bi-capsule', roles: '*', tile: 'amber', desc: 'ข้อมูลวัสดุ 3 ประเภท บาร์โค้ด และสติกเกอร์' },
    { key: 'alerts', label: 'แจ้งเตือน', icon: 'bi-bell', roles: '*', tile: 'rose', desc: 'วัสดุต่ำกว่าขั้นต่ำ และใกล้หมดอายุ' },
    { key: 'reports', label: 'รายงาน', icon: 'bi-bar-chart-line', roles: '*', tile: 'slate', desc: 'สรุปรับเข้า จ่ายออก คงเหลือ พิมพ์และส่งออก CSV' },
    { key: 'guide', label: 'คู่มือ', icon: 'bi-book', roles: '*', tile: 'teal', desc: 'วิธีใช้งานทุกเมนู ค้นหาได้' },
    { key: 'settings', label: 'ตั้งค่า', icon: 'bi-gear', roles: '*', tile: 'slate', desc: 'หน่วยงาน ผู้ใช้ ข้อมูลหลัก แจ้งเตือน หน้าตา', bottom: true },
  ];
  SP.menuDef = key => SP.MENU.find(m => m.key === key);
  SP.can = roles => roles === '*' || !!(SP.state.user && roles.indexOf(SP.state.user.role) >= 0);
  SP.canWrite = () => SP.can(['admin', 'staff']);
  SP.isAdmin = () => SP.can(['admin']);

  /* ---------- router (hash) ---------- */
  SP.parseHash = function (h) {
    h = String(h || '').replace(/^#\/?/, '');
    const i = h.indexOf('?');
    const page = (i >= 0 ? h.slice(0, i) : h) || 'dashboard';
    const param = {};
    if (i >= 0) new URLSearchParams(h.slice(i + 1)).forEach((v, k) => { param[k] = v; });
    return { page: page, param: param };
  };
  SP.go = function (path) {
    path = path || '#/dashboard';
    if (path.charAt(0) !== '#') path = '#/' + path.replace(/^\//, '');
    if (location.hash !== path) { SP._lastGoHash = path; location.hash = path; }
    SP.render(path);
  };
  SP.render = function (hash) {
    if (!SP.state.user || !SP.state.boot) return;
    const r = SP.parseHash(hash || location.hash);
    let page = r.page, param = r.param;
    let def = SP.menuDef(page);
    if (!def || !SP.can(def.roles) || !SP.pages[page]) { page = 'dashboard'; param = {}; def = SP.menuDef('dashboard'); }
    const changed = page !== SP.state.page;
    SP.state.page = page; SP.state.param = param;
    if (SP.cam && SP.cam.isOpen()) SP.cam.close();
    SP.shell.mark(page);
    document.title = def.label + ' · ' + ((SP.state.boot.config.org || {}).short || 'LabSupply');
    const el = SP.$('#spPage');
    el.onclick = null; el.oninput = null; el.onchange = null; el.onkeydown = null;
    if (changed) window.scrollTo(0, 0);
    try {
      const res = SP.pages[page].render(el, param);
      if (res && typeof res.catch === 'function') res.catch(SP.err);
    } catch (e) {
      SP.err(e);
      el.innerHTML = SP.ui.empty('bi-exclamation-triangle', 'เปิดหน้านี้ไม่สำเร็จ', SP.esc(e.message));
    }
  };
  SP.route = () => SP.render(location.hash);
  window.addEventListener('hashchange', () => {
    if (SP._lastGoHash && location.hash === SP._lastGoHash) { SP._lastGoHash = null; return; }
    SP._lastGoHash = null;
    SP.render(location.hash);
  });

  /* ---------- shell: rail / topbar / bottom nav / เมนูทั้งหมด ---------- */
  SP.shell = {
    show() {
      SP.$('#spBoot').classList.add('d-none');
      SP.$('#spLogin').classList.add('d-none');
      SP.$('#spApp').classList.remove('d-none');
      this.build();
    },
    build() {
      const u = SP.state.user, org = SP.state.boot.config.org;
      const menus = SP.MENU.filter(m => SP.can(m.roles));
      const logo = org.logo ? `<img src="${SP.esc(org.logo)}" alt="">` : '<i class="bi bi-box-seam"></i>';
      const item = m => `<a class="sb-item" href="#/${m.key}" data-page="${m.key}" title="${SP.esc(m.label)}"><span class="ico"><i class="bi ${m.icon}"></i></span><span class="lbl">${SP.esc(m.label)}</span>${m.key === 'alerts' ? '<span class="sb-badge d-none" data-badge="alerts"></span>' : ''}</a>`;
      SP.$('#spRail').innerHTML = `<a class="sb-logo" href="#/dashboard" title="${SP.esc(org.short || 'LabSupply')}">${logo}</a>
        <div class="sb-nav">${menus.filter(m => !m.bottom).map(item).join('')}</div>
        <div class="sb-rail-bottom">${menus.filter(m => m.bottom).map(item).join('')}
          <button class="sb-item" type="button" data-act="logout" title="ออกจากระบบ"><span class="ico"><i class="bi bi-box-arrow-right"></i></span><span class="lbl">ออกระบบ</span></button></div>`;
      SP.$('#spOrgT').textContent = org.dept || org.system;
      SP.$('#spOrgS').textContent = [org.group, org.hospital].filter(Boolean).join(' · ');
      SP.$('#spFootOrg').textContent = (org.short || 'LabSupply') + ' ' + (org.system || '') + ' v' + SP.VERSION;
      SP.$('#spAvatar').textContent = (u.name || u.username || '?').trim().charAt(0).toUpperCase();
      SP.$('#spUserName').textContent = u.name || u.username;
      SP.$('#spUserRole').textContent = SP.ROLE[u.role] || u.role;
      SP.$('#spProfileMenu').innerHTML = `<li class="px-3 py-2"><div class="fw-bold">${SP.esc(u.name)}</div><div class="small text-muted">${SP.esc(u.username)} · ${SP.esc(SP.ROLE[u.role] || u.role)}</div></li>
        <li><hr class="dropdown-divider"></li>
        <li><a class="dropdown-item" href="#/settings?s=profile"><i class="bi bi-person-circle"></i> บัญชีของฉัน</a></li>
        <li><a class="dropdown-item" href="#/guide"><i class="bi bi-book"></i> คู่มือการใช้งาน</a></li>
        <li class="sp-install d-none"><button class="dropdown-item" type="button" data-act="install"><i class="bi bi-download"></i> ติดตั้งเป็นแอป</button></li>
        <li><hr class="dropdown-divider"></li>
        <li><button class="dropdown-item text-danger" type="button" data-act="logout"><i class="bi bi-box-arrow-right"></i> ออกจากระบบ</button></li>`;
      const slots = SP.canWrite() ? ['dashboard', 'receive', '_menu', 'issue', 'alerts'] : ['dashboard', 'stock', '_menu', 'reports', 'alerts'];
      SP.$('#spBottom').innerHTML = slots.map(k => {
        if (k === '_menu') return '<button class="bn bn-center" type="button" data-act="menu" aria-label="เมนูทั้งหมด"><span class="circle"><i class="bi bi-grid-3x3-gap-fill"></i></span>เมนู</button>';
        const m = SP.menuDef(k);
        return `<a class="bn" href="#/${k}" data-page="${k}"><i class="bi ${m.icon}"></i>${SP.esc(m.label)}${k === 'alerts' ? '<span class="sb-badge d-none" data-badge="alerts"></span>' : ''}</a>`;
      }).join('');
      const tiles = menus.map(m => `<a class="app-tile" href="#/${m.key}" data-sheet-close><span class="app-ico ${m.tile || ''}"><i class="bi ${m.icon}"></i>${m.key === 'alerts' ? '<span class="b d-none" data-badge="alerts"></span>' : ''}</span><span class="lbl">${SP.esc(m.label)}</span></a>`).join('');
      const quick = SP.canWrite() ? `<div class="small-muted fw-600 mb-2 mt-1">สแกนด่วน</div><div class="app-grid mb-3">
          <a class="app-tile" href="#/receive?scan=1" data-sheet-close><span class="app-ico teal"><i class="bi bi-upc-scan"></i></span><span class="lbl">สแกนรับเข้า</span></a>
          <a class="app-tile" href="#/issue?scan=1" data-sheet-close><span class="app-ico blue"><i class="bi bi-qr-code-scan"></i></span><span class="lbl">สแกนจ่ายออก</span></a></div>` : '';
      SP.$('#spMenuSheetBody').innerHTML = quick + `<div class="small-muted fw-600 mb-2">ทุกเมนู</div><div class="app-grid">${tiles}
        <button class="app-tile" type="button" data-act="logout"><span class="app-ico slate"><i class="bi bi-box-arrow-right"></i></span><span class="lbl">ออกจากระบบ</span></button></div>`;
      this.mark(SP.state.page);
      this.update();
      if (SP.install) SP.install.refresh();
    },
    mark(page) { SP.$$('[data-page]').forEach(a => a.classList.toggle('active', a.dataset.page === page)); },
    update() {
      const n = SP.alertCount();
      SP.$$('[data-badge="alerts"]').forEach(b => { b.textContent = n > 99 ? '99+' : n; b.classList.toggle('d-none', !n); });
      const dot = SP.$('#spBellBtn .dot');
      if (dot) dot.classList.toggle('d-none', !n);
    },
    bindGlobal() {
      if (this._bound) return;
      this._bound = true;
      document.addEventListener('click', e => {
        const a = e.target.closest('[data-act]');
        if (a) {
          const act = a.dataset.act;
          if (act === 'logout') { e.preventDefault(); SP.auth.logout(); }
          else if (act === 'menu') { e.preventDefault(); bootstrap.Offcanvas.getOrCreateInstance(SP.$('#spMenuSheet')).show(); }
          else if (act === 'install') { e.preventDefault(); if (SP.install) SP.install.prompt(); }
        }
        if (e.target.closest('[data-sheet-close]')) { const oc = bootstrap.Offcanvas.getInstance(SP.$('#spMenuSheet')); if (oc) oc.hide(); }
      });
      SP.$('#spSearchBtn').addEventListener('click', () => SP.search.open());
      SP.$('#spHelpBtn').addEventListener('click', () => SP.go('#/guide?t=' + (SP.guidePageTopic ? SP.guidePageTopic(SP.state.page, SP.state.param) : 'start')));
      document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 'k' && SP.state.user) { e.preventDefault(); SP.search.open(); }
      });
      const si = SP.$('#spSearchInput');
      si.addEventListener('input', SP.debounce(() => SP.search.draw(si.value), 120));
      si.addEventListener('keydown', e => SP.search.key(e));
      SP.$('#spSearchBody').addEventListener('click', e => { const r = e.target.closest('[data-sr]'); if (r) SP.search.pick(+r.dataset.sr); });
    },
  };

  /* ---------- ค้นหา Ctrl K ---------- */
  SP.search = {
    rows: [], hi: 0,
    open() {
      bootstrap.Modal.getOrCreateInstance(SP.$('#spSearch')).show();
      const i = SP.$('#spSearchInput');
      i.value = '';
      this.draw('');
      setTimeout(() => i.focus(), 180);
    },
    draw(q) {
      q = String(q || '').trim().toLowerCase();
      const rows = [];
      SP.MENU.filter(m => SP.can(m.roles) && (!q || (m.label + ' ' + m.desc).toLowerCase().indexOf(q) >= 0)).forEach(m => rows.push({ g: 'เมนู', icon: m.icon, t: m.label, s: m.desc, go: '#/' + m.key }));
      if (q) {
        const nq = SP.normBc(q);
        SP.state.boot.items.filter(it => it.status !== 'deleted' && ((it.name + ' ' + it.code).toLowerCase().indexOf(q) >= 0 || (it.barcodes || []).some(b => SP.normBc(b) === nq || String(b).toLowerCase().indexOf(q) >= 0)))
          .slice(0, 8).forEach(it => rows.push({ g: 'วัสดุ', icon: 'bi-capsule', thumb: SP.thumb(it), t: it.name, s: it.code + ' · คงเหลือ ' + SP.fmt.num(it._bal) + ' ' + it.unit, item: it.id }));
        if (SP.guide) SP.guide.search(q).slice(0, 6).forEach(tp => rows.push({ g: 'คู่มือ', icon: tp.icon, t: tp.title, s: tp.sum, go: '#/guide?t=' + tp.key }));
      }
      this.rows = rows; this.hi = 0;
      let h = '', g = '';
      rows.forEach((r, i) => {
        if (r.g !== g) { g = r.g; h += `<div class="sr-group">${g}</div>`; }
        h += `<div class="sr-item${i === 0 ? ' hi' : ''}" data-sr="${i}">${r.thumb || `<span class="list-ico tint-primary"><i class="bi ${r.icon}"></i></span>`}<div class="min-w-0"><div class="fw-600 ellipsis">${SP.esc(r.t)}</div><div class="small-muted ellipsis">${SP.esc(r.s || '')}</div></div></div>`;
      });
      SP.$('#spSearchBody').innerHTML = h || SP.ui.empty('bi-search', 'ไม่พบผลลัพธ์', 'ลองพิมพ์ชื่อวัสดุ รหัส หรือบาร์โค้ด');
    },
    key(e) {
      const n = this.rows.length;
      if (!n) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        this.hi = (this.hi + (e.key === 'ArrowDown' ? 1 : -1) + n) % n;
        SP.$$('.sr-item').forEach((d, i) => d.classList.toggle('hi', i === this.hi));
        const c = SP.$('.sr-item.hi');
        if (c && c.scrollIntoView) c.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') { e.preventDefault(); this.pick(this.hi); }
    },
    pick(i) {
      const r = this.rows[i];
      if (!r) return;
      bootstrap.Modal.getOrCreateInstance(SP.$('#spSearch')).hide();
      if (r.item) {
        SP.go('#/items');
        setTimeout(() => SP.pages.items.view(r.item), 80);
      } else SP.go(r.go);
    },
  };

  /* ---------- เข้าสู่ระบบ ---------- */
  SP.auth = {
    async login(username, password) {
      const r = await SP.api('auth.login', { username: username, password: password });
      SP.state.token = r.token;
      SP.store.set('token', r.token);
      await SP.boot();
    },
    async logout() {
      const ok = await SP.ui.confirm('ต้องการออกจากระบบตอนนี้หรือไม่', { title: 'ออกจากระบบ', okText: 'ออกจากระบบ', icon: 'bi-box-arrow-right' });
      if (!ok) return;
      try { await SP.api('auth.logout'); } catch (e) { /* ไม่เป็นไร */ }
      this.clear();
      SP.login.show('login');
    },
    clear() {
      if (SP.cam && SP.cam.isOpen()) SP.cam.close();
      SP.ui.close();
      SP.state.token = ''; SP.state.user = null; SP.state.boot = null; SP.state.stats = null; SP.state.page = '';
      SP.store.del('token');
    },
    expired(msg) {
      if (!SP.state.token) return;
      this.clear();
      SP.login.show('login');
      SP.toast(msg || 'หมดเวลาการใช้งาน กรุณาเข้าสู่ระบบใหม่', 'warning');
    },
  };

  SP.login = {
    show(mode) {
      SP.$('#spBoot').classList.add('d-none');
      SP.$('#spApp').classList.add('d-none');
      SP.$('#spLogin').classList.remove('d-none');
      this.bind();
      this.mode(mode || (SP.apiUrl() ? 'login' : 'setup'));
      if (SP.apiUrl()) this.loadPublic();
      document.title = 'เข้าสู่ระบบ · LabSupply';
    },
    mode(m) {
      SP.$('#lgMain').classList.toggle('d-none', m === 'setup');
      SP.$('#lgSetup').classList.toggle('d-none', m !== 'setup');
      if (m === 'setup') { SP.$('#lgApi').value = SP.apiUrl(); SP.$('#lgBack').classList.toggle('d-none', !SP.apiUrl()); }
      else setTimeout(() => { const u = SP.$('#lgUser'); if (u && !u.value) u.focus(); }, 50);
    },
    async loadPublic() {
      try {
        const p = await SP.api('ping');
        const o = p.org || {};
        SP.$('#lgDept').textContent = o.dept || '';
        SP.$('#lgGroup').textContent = o.group || '';
        SP.$('#lgHosp').textContent = o.hospital || '';
        SP.$('#lgTitle').textContent = o.system || 'ระบบบริหารวัสดุคงคลัง';
        SP.$('#lgSys').textContent = o.system || '';
        SP.$('#lgShort').textContent = o.short || 'LabSupply';
        if (o.logo) SP.$('#lgLogo').innerHTML = `<img src="${SP.esc(o.logo)}" alt="">`;
        if (p.artwork) { const a = SP.$('#lgArt'); a.style.display = ''; a.src = p.artwork; }
        SP.theme.apply(p.theme);
      } catch (e) {
        SP.toast(e.message, 'warning');
      }
    },
    bind() {
      if (this._bound) return;
      this._bound = true;
      SP.$('#lgForm').addEventListener('submit', async e => {
        e.preventDefault();
        const btn = SP.$('#lgBtn');
        SP.ui.busy(btn, true, 'กำลังเข้าสู่ระบบ...');
        try {
          await SP.auth.login(SP.$('#lgUser').value.trim(), SP.$('#lgPass').value);
          SP.$('#lgPass').value = '';
        } catch (er) { SP.err(er); } finally { SP.ui.busy(btn, false); }
      });
      SP.$('#lgEye').addEventListener('click', () => {
        const p = SP.$('#lgPass');
        p.type = p.type === 'password' ? 'text' : 'password';
        SP.$('#lgEye').innerHTML = `<i class="bi ${p.type === 'password' ? 'bi-eye' : 'bi-eye-slash'}"></i>`;
      });
      SP.$('#lgConn').addEventListener('click', () => this.mode('setup'));
      SP.$('#lgBack').addEventListener('click', () => this.mode('login'));
      const msg = (t, ok) => { const m = SP.$('#lgApiMsg'); m.className = 'small mt-2 ' + (ok ? 'text-success' : 'text-danger'); m.textContent = t; };
      SP.$('#lgApiTest').addEventListener('click', async () => {
        const v = SP.$('#lgApi').value.trim();
        if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(v)) return msg('URL ต้องขึ้นต้น https://script.google.com/ และลงท้าย /exec', false);
        const old = SP.store.get('api_url', '');
        SP.store.set('api_url', v);
        try { const p = await SP.api('ping'); msg('เชื่อมต่อสำเร็จ ' + (p.org ? p.org.dept : '') + ' (v' + p.version + ')', true); } catch (e) { msg(e.message, false); }
        if (old) SP.store.set('api_url', old); else SP.store.del('api_url');
      });
      SP.$('#lgApiSave').addEventListener('click', () => {
        const v = SP.$('#lgApi').value.trim();
        if (v && !/^https:\/\/script\.google\.com\/.+\/exec$/.test(v)) return msg('URL ต้องขึ้นต้น https://script.google.com/ และลงท้าย /exec', false);
        if (v) SP.store.set('api_url', v); else SP.store.del('api_url');
        msg(v ? 'บันทึกแล้ว' : 'ล้างค่าแล้ว ใช้ค่าจาก config.js', true);
        if (SP.apiUrl()) { this.mode('login'); this.loadPublic(); }
      });
    },
  };

  SP.boot = async function () {
    const b = await SP.api('app.boot');
    SP.state.boot = b; SP.state.user = b.user; SP.state.stats = null; SP.state.page = '';
    SP.index();
    SP.theme.apply(b.config.theme && b.config.theme.primary);
    SP.shell.show();
    SP.render(location.hash && location.hash.length > 2 ? location.hash : '#/dashboard');
  };
})();
