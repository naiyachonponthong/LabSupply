/**
 * LabSupply scan: กล้องสแกนบาร์โค้ด (html5-qrcode), อ่าน GS1, เครื่องยิงบาร์โค้ด, เลือกวัสดุ
 */
(function () {
  'use strict';
  const SP = window.SP;
  const LIB = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';

  /* ---------- GS1: (01) GTIN, (17) วันหมดอายุ, (10) Lot, (11) วันผลิต, (21) Serial ---------- */
  const GS = '\u001d';
  const FIXED = { '00': 18, '01': 14, '02': 14, '11': 6, '12': 6, '13': 6, '15': 6, '16': 6, '17': 6, '20': 2 };
  const VAR2 = ['10', '21', '22', '30', '37', '90', '91', '92', '93', '94', '95', '96', '97', '98', '99'];
  const VAR3 = ['240', '241', '242', '250', '251', '253', '254', '400', '401', '402', '403', '410', '411', '412', '413', '414', '420', '421', '422'];
  function yymmdd(v) {
    if (!/^\d{6}$/.test(v)) return '';
    const yy = +v.slice(0, 2), mm = +v.slice(2, 4);
    let dd = +v.slice(4, 6);
    if (mm < 1 || mm > 12 || dd > 31) return '';
    const y = 2000 + yy;
    if (dd === 0) dd = new Date(Date.UTC(y, mm, 0)).getUTCDate();
    return y + '-' + String(mm).padStart(2, '0') + '-' + String(dd).padStart(2, '0');
  }
  function put(out, ai, v) {
    v = String(v || '').replace(/\u001d/g, '').trim();
    if (ai === '01' || ai === '02') out.gtin = v;
    else if (ai === '10') out.lot = v.slice(0, 20);
    else if (ai === '17') out.exp = yymmdd(v);
    else if (ai === '11') out.prod = yymmdd(v);
    else if (ai === '21') out.serial = v.slice(0, 20);
  }
  SP.gs1 = {
    parse(raw) {
      let s = String(raw || '').trim().replace(/^\][A-Za-z]\d/, '').replace(/^\u001d+/, '');
      if (!s) return null;
      const out = {};
      if (/^\(\d{2,4}\)/.test(s)) {
        const re = /\((\d{2,4})\)([^(]*)/g;
        let m;
        while ((m = re.exec(s))) put(out, m[1], m[2]);
      } else {
        if (!/^(01|02)\d{14}/.test(s)) return null;
        let i = 0, guard = 0;
        while (i < s.length && guard++ < 25) {
          if (s[i] === GS) { i++; continue; }
          const a2 = s.substr(i, 2), a3 = s.substr(i, 3), a4 = s.substr(i, 4);
          if (FIXED[a2]) { put(out, a2, s.substr(i + 2, FIXED[a2])); i += 2 + FIXED[a2]; continue; }
          if (/^3[1-6]\d\d$/.test(a4)) { i += 10; continue; }
          let ai, start;
          if (VAR2.indexOf(a2) >= 0) { ai = a2; start = i + 2; } else if (VAR3.indexOf(a3) >= 0) { ai = a3; start = i + 3; } else break;
          let j = s.indexOf(GS, start);
          const hasGS = j >= 0;
          if (j < 0) j = s.length;
          const val = s.substring(start, j);
          if (!hasGS && (ai === '10' || ai === '21')) {
            const mm = /^(.+?)17(\d{6})$/.exec(val);
            if (mm && yymmdd(mm[2])) { put(out, ai, mm[1]); put(out, '17', mm[2]); break; }
          }
          put(out, ai, val);
          i = j;
        }
      }
      if (!out.gtin && !out.lot && !out.exp) return null;
      return out;
    },
  };

  /* ---------- แปลงรหัสที่สแกนเป็นวัสดุ ---------- */
  SP.scan = {
    resolve(raw) {
      const code = String(raw || '').trim();
      const r = { code: code, item: null, gs1: null, lot: null };
      if (!code || !SP.idx) return r;
      const I = SP.idx;
      r.item = I.bc[SP.normBc(code)] || I.code[code.toUpperCase()] || null;
      if (!r.item) {
        const g = SP.gs1.parse(code);
        if (g) { r.gs1 = g; if (g.gtin) r.item = I.bc[SP.normBc(g.gtin)] || null; }
      }
      if (r.item && r.gs1 && r.gs1.lot) {
        const L = r.gs1.lot.toUpperCase();
        r.lot = (I.lotsByItem[r.item.id] || []).find(l => String(l.lot_no).toUpperCase() === L && (!r.gs1.exp || !l.exp || l.exp === r.gs1.exp)) || null;
      }
      return r;
    },
    find(q) {
      q = String(q || '').trim().toLowerCase();
      if (!q) return [];
      return SP.state.boot.items.filter(it => it.status === 'active' && (String(it.name).toLowerCase().indexOf(q) >= 0 || String(it.code).toLowerCase().indexOf(q) >= 0)).sort(SP.byName);
    },
    /** ช่องรับค่าจากเครื่องยิงบาร์โค้ด (ยิงแล้วเครื่องกด Enter ให้เอง) */
    bind(input, onCode) {
      if (!input || input._scanBound) return;
      input._scanBound = true;
      input.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const v = input.value.trim();
        input.value = '';
        if (v) onCode(v, 'wedge');
      });
    },
    /** บาร์โค้ดที่ยังไม่มีในระบบ: เพิ่มวัสดุใหม่ หรือผูกกับวัสดุที่มีอยู่ */
    async unknown(code, then) {
      const can = SP.canWrite();
      const k = await SP.ui.dialog({
        title: 'ไม่พบบาร์โค้ดนี้ในระบบ', icon: 'bi-upc', tone: 'warning',
        html: `บาร์โค้ด <span class="code-chip">${SP.esc(code)}</span> ยังไม่ได้ผูกกับวัสดุรายการใด${can ? ' ต้องการทำอะไรต่อ' : ''}`,
        buttons: can ? [
          { key: 'cancel', text: 'ยกเลิก', cls: 'btn-light' },
          { key: 'link', text: '<i class="bi bi-link-45deg"></i> ผูกกับวัสดุที่มี', cls: 'btn-soft' },
          { key: 'new', text: '<i class="bi bi-plus-lg"></i> เพิ่มวัสดุใหม่', cls: 'btn-primary' },
        ] : [{ key: 'cancel', text: 'ปิด', cls: 'btn-primary' }],
      });
      if (k === 'new') SP.pages.items.form(null, { barcode: code, onSaved: it => { if (then) then(it); } });
      else if (k === 'link') {
        SP.pick.item({
          title: 'เลือกวัสดุเพื่อผูกบาร์โค้ด ' + code,
          onPick: async it => {
            const rec = Object.assign({}, it, { barcodes: (it.barcodes || []).concat([code]) });
            const saved = await SP.api('item.save', rec);
            SP.upsert('items', saved);
            SP.toast('ผูกบาร์โค้ดกับ ' + saved.name + ' แล้ว');
            if (then) then(SP.idx.item[saved.id]);
          },
        });
      }
    },
  };

  /* ---------- กล้อง: overlay เต็มจอ ไม่แตะ DOM ของ popup ---------- */
  SP.cam = {
    qr: null, o: null, facing: 'environment', torchOn: false, lastTxt: '', lastAt: 0, busy: false,
    isOpen() { const el = SP.$('#spCam'); return !!el && !el.classList.contains('d-none'); },
    async open(o) {
      if (this.isOpen()) await this.close(true);
      this.o = o || {};
      this.bind();
      const el = SP.$('#spCam');
      el.classList.remove('d-none');
      el.setAttribute('aria-hidden', 'false');
      document.body.classList.add('cam-open');
      SP.$('#spCamTitle').textContent = this.o.title || 'สแกนบาร์โค้ด';
      SP.$('#spCamCont').checked = this.o.continuous !== false;
      this.last(this.o.hint || 'เล็งบาร์โค้ดให้อยู่ในกรอบ', '');
      this.msg('กำลังเปิดกล้อง...');
      try {
        const C = window.AudioContext || window.webkitAudioContext;
        if (C && !this._ac) this._ac = new C();
        if (this._ac && this._ac.state === 'suspended') this._ac.resume();
      } catch (e) { /* ไม่มีเสียงก็ได้ */ }
      if (!window.isSecureContext) { this.msg('ต้องเปิดระบบผ่าน https (เช่น GitHub Pages) จึงจะใช้กล้องได้ ระหว่างนี้พิมพ์รหัสด้านล่างแทนได้'); return; }
      try { await SP.loadScript(LIB); } catch (e) { this.msg('โหลดตัวอ่านบาร์โค้ดไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองใหม่'); return; }
      if (!this.isOpen()) return;
      await this.start();
    },
    async start() {
      const F = window.Html5QrcodeSupportedFormats;
      try {
        this.qr = new window.Html5Qrcode('spCamReader', {
          verbose: false,
          formatsToSupport: [F.QR_CODE, F.DATA_MATRIX, F.CODE_128, F.CODE_39, F.CODE_93, F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.ITF, F.CODABAR],
          experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        });
        await this.qr.start({ facingMode: this.facing }, {
          fps: 12,
          qrbox: (w, h) => {
            const bw = Math.floor(Math.min(w * 0.86, 560));
            return { width: bw, height: Math.max(90, Math.floor(Math.min(h * 0.6, bw * 0.6))) };
          },
        }, txt => this.hit(txt), () => {});
        this.msg('');
        this.torchCheck();
        if (!this.isOpen()) this.stopQr();
      } catch (e) {
        const m = String((e && (e.message || e)) || '');
        this.qr = null;
        this.msg(/NotAllowed|Permission/i.test(m) ? 'ไม่ได้รับอนุญาตให้ใช้กล้อง เปิดสิทธิ์กล้องให้เว็บนี้ในการตั้งค่าเบราว์เซอร์แล้วลองใหม่'
          : (/NotFound|Requested device|OverconstrainedError/i.test(m) ? 'ไม่พบกล้องที่ใช้ได้ในอุปกรณ์นี้ พิมพ์รหัสด้านล่างแทนได้' : 'เปิดกล้องไม่สำเร็จ: ' + m));
      }
    },
    torchCheck() {
      const b = SP.$('#spCamTorch');
      b.classList.add('d-none'); b.classList.remove('on'); this.torchOn = false;
      try {
        const cap = this.qr.getRunningTrackCameraCapabilities();
        if (cap && cap.torchFeature && cap.torchFeature().isSupported()) b.classList.remove('d-none');
      } catch (e) { /* ไม่รองรับไฟฉาย */ }
    },
    async torch() {
      try {
        const f = this.qr.getRunningTrackCameraCapabilities().torchFeature();
        this.torchOn = !this.torchOn;
        await f.apply(this.torchOn);
        SP.$('#spCamTorch').classList.toggle('on', this.torchOn);
      } catch (e) { SP.toast('อุปกรณ์นี้เปิดไฟฉายไม่ได้', 'warning'); }
    },
    async switchCam() {
      this.facing = this.facing === 'environment' ? 'user' : 'environment';
      await this.stopQr();
      this.msg('กำลังสลับกล้อง...');
      await this.start();
    },
    hit(txt) {
      const now = Date.now();
      if (this.busy || (txt === this.lastTxt && now - this.lastAt < 1800)) return;
      this.lastTxt = txt; this.lastAt = now;
      this.feedback();
      this.deliver(txt);
    },
    deliver(txt) {
      let r;
      try { r = this.o && this.o.onScan ? this.o.onScan(txt) : null; } catch (e) { r = { ok: false, msg: e.message }; }
      const fin = v => {
        v = v || {};
        if (!this.isOpen()) return;
        this.last(v.msg || txt, v.ok === false ? 'err' : 'ok');
        if (!SP.$('#spCamCont').checked || v.close) this.close();
      };
      if (r && typeof r.then === 'function') {
        this.busy = true;
        r.then(fin, e => fin({ ok: false, msg: e.message })).then(() => { this.busy = false; });
      } else fin(r);
    },
    feedback() {
      try { if (navigator.vibrate) navigator.vibrate(60); } catch (e) { /* ignore */ }
      try {
        const ac = this._ac;
        if (ac) {
          const o = ac.createOscillator(), g = ac.createGain();
          o.type = 'sine'; o.frequency.value = 1240;
          g.gain.setValueAtTime(0.18, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);
          o.connect(g); g.connect(ac.destination);
          o.start(); o.stop(ac.currentTime + 0.13);
        }
      } catch (e) { /* ignore */ }
      const v = SP.$('#spCamView');
      v.classList.remove('sp-cam-flash'); void v.offsetWidth; v.classList.add('sp-cam-flash');
    },
    last(t, cls) {
      const el = SP.$('#spCamLast');
      el.className = 'sp-cam-last' + (cls ? ' ' + cls : '');
      el.innerHTML = `<i class="bi ${cls === 'err' ? 'bi-exclamation-circle-fill' : (cls === 'ok' ? 'bi-check-circle-fill' : 'bi-upc-scan')}"></i><span class="ellipsis">${SP.esc(t)}</span>`;
    },
    msg(t) { SP.$('#spCamMsg').textContent = t || ''; },
    async stopQr() {
      const q = this.qr;
      this.qr = null;
      if (!q) return;
      try { await q.stop(); } catch (e) { /* ยังไม่ได้เริ่ม */ }
      try { q.clear(); } catch (e) { /* ignore */ }
    },
    async close(silent) {
      if (!this.isOpen()) return;
      const el = SP.$('#spCam');
      el.classList.add('d-none');
      el.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('cam-open');
      const o = this.o;
      this.o = null; this.lastTxt = ''; this.busy = false;
      await this.stopQr();
      if (o && o.onClose && !silent) { try { o.onClose(); } catch (e) { SP.err(e); } }
    },
    manual() {
      const i = SP.$('#spCamManual');
      const v = i.value.trim();
      i.value = '';
      if (v) { this.lastTxt = ''; this.deliver(v); }
    },
    bind() {
      if (this._bound) return;
      this._bound = true;
      SP.$('#spCam').addEventListener('click', e => {
        const b = e.target.closest('[data-cam]');
        if (!b) return;
        const a = b.dataset.cam;
        if (a === 'close') this.close();
        else if (a === 'torch') this.torch();
        else if (a === 'switch') this.switchCam();
        else if (a === 'manual') this.manual();
      });
      SP.$('#spCamManual').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); this.manual(); } });
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && this.isOpen() && !SP.$('.sp-dialog')) this.close(); });
      document.addEventListener('visibilitychange', () => { if (document.hidden && this.isOpen()) this.close(); });
    },
  };

  /* ---------- เลือกวัสดุจากรายการ ---------- */
  SP.pick = {
    item(o) {
      o = o || {};
      let cat = '', q = '';
      const picked = {};
      const rows = () => SP.state.boot.items.filter(it => it.status === 'active' && (!cat || it.category_id === cat) && (!o.filter || o.filter(it))
        && (!q || (it.name + ' ' + it.code + ' ' + (it.barcodes || []).join(' ')).toLowerCase().indexOf(q) >= 0)).sort(SP.byName);
      const draw = body => {
        const list = rows();
        SP.$('#pkList', body).innerHTML = list.length ? list.slice(0, 300).map(it => `<div class="pick-row${picked[it.id] ? ' picked' : ''}" data-id="${it.id}">${SP.thumb(it, 'sm')}
          <div class="min-w-0 flex-grow-1"><div class="fw-600 ellipsis">${SP.esc(it.name)}</div><div class="small-muted">${SP.esc(it.code)} · คงเหลือ ${SP.fmt.num(it._bal)} ${SP.esc(it.unit)}${it._near ? ' · หมดอายุใกล้สุด ' + SP.fmt.dateShort(it._near) : ''}</div></div>
          ${picked[it.id] ? `<span class="b-soft b-success">เพิ่มแล้ว ${picked[it.id]}</span>` : '<i class="bi bi-plus-circle text-muted fs-5"></i>'}</div>`).join('')
          : SP.ui.empty('bi-search', 'ไม่พบวัสดุ', 'ลองเปลี่ยนคำค้นหรือประเภทวัสดุ');
      };
      SP.ui.modal({
        title: o.title || 'เลือกวัสดุ', size: 'lg', cancelText: o.multi ? 'เสร็จสิ้น' : 'ยกเลิก',
        body: `<div class="input-ico mb-2"><i class="bi bi-search"></i><input class="form-control" id="pkQ" placeholder="ค้นหาชื่อ รหัส บาร์โค้ด" autocomplete="off" value="${SP.esc(o.q || '')}"></div>
          <div class="pill-tabs mb-2" id="pkCats">${SP.ui.chips([['', 'ทั้งหมด']].concat(SP.state.boot.categories.map(c => [c.id, c.name, c.color])), '')}</div>
          <div class="pick-list" id="pkList"></div>`,
        onOpen: body => {
          const qi = SP.$('#pkQ', body);
          q = qi.value.trim().toLowerCase();
          draw(body);
          qi.addEventListener('input', SP.debounce(() => { q = qi.value.trim().toLowerCase(); draw(body); }, 120));
          SP.$('#pkCats', body).addEventListener('click', e => {
            const c = e.target.closest('[data-chip]');
            if (!c) return;
            cat = c.dataset.chip;
            SP.$$('[data-chip]', body).forEach(x => x.classList.toggle('active', x === c));
            draw(body);
          });
          SP.$('#pkList', body).addEventListener('click', e => {
            const r = e.target.closest('[data-id]');
            if (!r) return;
            const it = SP.idx.item[r.dataset.id];
            picked[it.id] = (picked[it.id] || 0) + 1;
            if (!o.multi) SP.ui.close(); else draw(body);
            Promise.resolve(o.onPick(it)).catch(SP.err);
          });
          if (window.innerWidth >= 992) qi.focus();
        },
      });
    },
  };
})();
