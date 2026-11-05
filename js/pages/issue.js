/**
 * จ่ายออก: สแกนบาร์โค้ด ระบุผู้เบิก ระบบเลือกล็อตแบบหมดอายุก่อนจ่ายก่อน (FEFO) และแสดงล็อตที่จะตัดก่อนบันทึก
 */
(function () {
  'use strict';
  const SP = window.SP;
  const e = s => SP.esc(s);
  const KEY = 'cart_is';

  SP.pages.issue = {
    tab: 'form',
    cart: null,
    unknown: null,

    load() {
      const c = SP.store.get(KEY, null);
      this.cart = c && Array.isArray(c.lines) ? c : { lines: [], head: {}, rid: '' };
      const h = this.cart.head = this.cart.head || {};
      this.cart.lines = this.cart.lines.filter(l => SP.idx.item[l.item_id]);
      this.cart.lines.forEach(l => { if (l.lot_id && !SP.idx.lot[l.lot_id]) l.lot_id = ''; });
      if (!h.date || h.date > SP.today() || !this.cart.lines.length) h.date = SP.today();
      if (h.requester_id && !SP.idx.req[h.requester_id]) h.requester_id = '';
    },
    persist() { SP.store.set(KEY, this.cart); },
    persistLater: SP.debounce(() => SP.pages.issue.persist(), 300),

    render(el, param) {
      this.load();
      if (param.item || param.scan) this.tab = 'form';
      el.innerHTML = `<div class="page-head"><div><h1>จ่ายออกวัสดุ</h1><div class="sub">สแกนหรือเลือกวัสดุ ระบุผู้เบิก ระบบเลือกล็อตที่หมดอายุก่อนให้อัตโนมัติ</div></div>
        <div class="actions"><div class="nav nav-pills" id="isTabs">
          <button class="nav-link ${this.tab === 'form' ? 'active' : ''}" type="button" data-tab="form"><i class="bi bi-pencil-square"></i> บันทึกจ่ายออก</button>
          <button class="nav-link ${this.tab === 'hist' ? 'active' : ''}" type="button" data-tab="hist"><i class="bi bi-clock-history"></i> ประวัติจ่ายออก</button></div></div></div>
        <div id="isBody"></div>`;
      el.onclick = ev => this.click(ev);
      this.drawTab();
      if (param.item && SP.idx.item[param.item]) this.add(SP.idx.item[param.item], '');
      if (param.scan) setTimeout(() => this.openCam(), 200);
      if (param.item || param.scan) history.replaceState(null, '', '#/issue');
    },

    drawTab() {
      const box = SP.$('#isBody');
      if (!box) return;
      if (this.tab === 'hist') { box.innerHTML = '<div id="isHist"></div>'; SP.docs.history(SP.$('#isHist'), 'IS'); return; }
      const h = this.cart.head;
      const reqOpts = SP.opt.requesters();
      if (!h.requester_id && h.requester_name) reqOpts.push(['new:' + h.requester_name, h.requester_name + ' (ใหม่)']);
      box.innerHTML = `<div class="row g-3">
        <div class="col-xl-8">
          <div class="card mb-3"><div class="card-body">
            <div class="scanbar">
              <div class="input-ico"><i class="bi bi-upc-scan"></i><input class="form-control" id="isScan" placeholder="ยิงบาร์โค้ด หรือพิมพ์ชื่อ/รหัสวัสดุแล้วกด Enter" autocomplete="off" enterkeyhint="go"></div>
              <button class="btn btn-primary" type="button" data-a="cam"><i class="bi bi-camera"></i><span class="d-none d-sm-inline"> เปิดกล้อง</span></button>
              <button class="btn btn-soft" type="button" data-a="pick"><i class="bi bi-list-ul"></i><span class="d-none d-sm-inline"> เลือกวัสดุ</span></button>
            </div>
            <div class="small-muted mt-2"><i class="bi bi-shield-check"></i> ล็อตที่หมดอายุแล้วระบบไม่นำมาจ่าย ถ้าสแกนบาร์โค้ด GS1 ที่มี Lot ระบบจะเลือกล็อตนั้นให้</div>
          </div></div>
          <div class="card"><div class="card-header"><i class="bi bi-cart-check"></i> รายการจ่ายออก <span class="b-soft b-primary" id="isCount">0</span>
            <button class="btn btn-sm btn-light ms-auto" type="button" data-a="clear"><i class="bi bi-trash"></i> ล้าง</button></div>
            <div id="isLines"></div></div>
        </div>
        <div class="col-xl-4"><div class="card sticky-side"><div class="card-header"><i class="bi bi-person-check"></i> ข้อมูลการจ่าย</div><div class="card-body">
          <div class="mb-3"><label class="form-label" for="isDate">วันที่จ่าย <span class="text-danger">*</span></label><input class="form-control" type="date" id="isDate" value="${h.date}" max="${SP.today()}"></div>
          <div class="mb-3"><label class="form-label">ชื่อผู้เบิก <span class="text-danger">*</span></label>
            ${SP.ui.select('isReq', reqOpts, h.requester_id || (h.requester_name ? 'new:' + h.requester_name : ''), 'id="isReq" data-search data-allow-new data-placeholder="พิมพ์ชื่อผู้เบิก หรือแตะเพื่อเลือก"', '')}
            <div class="form-text">ชื่อที่ยังไม่มีในรายการ ระบบเพิ่มให้อัตโนมัติเมื่อบันทึก</div></div>
          <div class="mb-3"><label class="form-label" for="isNote">หมายเหตุ</label><textarea class="form-control" id="isNote" rows="2" maxlength="300" placeholder="เช่น ใช้ที่ห้องเจาะเลือด">${e(h.note || '')}</textarea></div>
          <div class="border-top pt-3"><div class="sum-line"><span>จำนวนรายการ</span><b id="isSumN">0</b></div><div class="sum-line total"><span>มูลค่ารวม</span><b id="isSumV">0.00</b></div></div>
          <button class="btn btn-primary btn-lg w-100 mt-3" type="button" data-a="save"><i class="bi bi-check2-circle"></i> บันทึกจ่ายออก</button>
        </div></div></div></div>`;
      SP.ui.enhance(box);
      SP.scan.bind(SP.$('#isScan'), code => this.onCode(code, false));
      SP.$('#isDate').addEventListener('change', () => { h.date = SP.$('#isDate').value; this.persistLater(); });
      SP.$('#isNote').addEventListener('input', () => { h.note = SP.$('#isNote').value.trim(); this.persistLater(); });
      SP.$('#isReq').addEventListener('change', () => {
        const v = SP.$('#isReq').value;
        if (v.indexOf('new:') === 0) { h.requester_id = ''; h.requester_name = v.slice(4); }
        else { h.requester_id = v; h.requester_name = v && SP.idx.req[v] ? SP.idx.req[v].name : ''; }
        this.persistLater();
      });
      const lines = SP.$('#isLines');
      lines.addEventListener('input', ev => this.lineInput(ev));
      lines.addEventListener('change', ev => this.lineInput(ev));
      this.drawLines();
      if (window.innerWidth >= 992) SP.$('#isScan').focus();
    },

    click(ev) {
      const t = ev.target.closest('[data-tab]');
      if (t) { this.tab = t.dataset.tab; SP.$$('#isTabs .nav-link').forEach(x => x.classList.toggle('active', x === t)); this.drawTab(); return; }
      const d = ev.target.closest('[data-del]');
      if (d) { this.cart.lines = this.cart.lines.filter(x => x.k !== d.dataset.del); this.persist(); this.drawLines(); return; }
      const s = ev.target.closest('[data-step]');
      if (s) {
        const row = s.closest('[data-k]');
        const l = this.cart.lines.find(x => x.k === row.dataset.k);
        if (!l) return;
        l.qty = Math.max(0, SP.r2((+l.qty || 0) + (+s.dataset.step)));
        row.querySelector('[data-f="qty"]').value = l.qty;
        this.refresh();
        this.persistLater();
        return;
      }
      const a = ev.target.closest('[data-a]');
      if (!a) return;
      const act = a.dataset.a;
      if (act === 'cam') this.openCam();
      else if (act === 'pick') SP.pick.item({ title: 'เลือกวัสดุที่จ่ายออก', multi: true, onPick: it => { this.add(it, ''); } });
      else if (act === 'save') this.save(a);
      else if (act === 'clear') {
        if (!this.cart.lines.length) return;
        SP.ui.confirm('ล้างรายการจ่ายออกที่ยังไม่บันทึกทั้งหมด ' + this.cart.lines.length + ' รายการ', { title: 'ล้างรายการ', tone: 'danger', okText: 'ล้างรายการ', icon: 'bi-trash' })
          .then(ok => { if (ok) { this.cart.lines = []; this.cart.rid = ''; this.persist(); this.drawLines(); } });
      }
    },

    lineInput(ev) {
      const f = ev.target.dataset.f;
      if (!f) return;
      const row = ev.target.closest('[data-k]');
      const l = this.cart.lines.find(x => x.k === row.dataset.k);
      if (!l) return;
      l[f] = f === 'qty' ? SP.num(ev.target.value) : ev.target.value;
      if (f !== 'note') this.refresh();
      this.persistLater();
    },

    /** จำลองการตัดล็อตแบบเดียวกับ server (ตามลำดับรายการ) */
    alloc() {
      const today = SP.today();
      const bal = {};
      SP.state.boot.lots.forEach(l => { bal[l.id] = l.balance; });
      const res = {};
      this.cart.lines.forEach(l => {
        let need = +l.qty || 0;
        const picks = [];
        if (l.lot_id) {
          const lot = SP.idx.lot[l.lot_id];
          if (!lot) { res[l.k] = { err: 'ไม่พบล็อตที่เลือก (อาจถูกจ่ายหมดแล้ว)', picks: picks, short: 0 }; return; }
          if (lot.exp && lot.exp < today) { res[l.k] = { err: 'ล็อตนี้หมดอายุแล้ว ห้ามจ่าย', picks: picks, short: 0 }; return; }
          const take = Math.min(bal[lot.id] || 0, need);
          if (take > 0) { picks.push([lot, SP.r2(take)]); bal[lot.id] = SP.r2(bal[lot.id] - take); need = SP.r2(need - take); }
        } else {
          (SP.idx.lotsByItem[l.item_id] || []).forEach(lot => {
            if (need <= 0 || (lot.exp && lot.exp < today)) return;
            const av = bal[lot.id] || 0;
            if (av <= 0) return;
            const take = Math.min(av, need);
            picks.push([lot, SP.r2(take)]);
            bal[lot.id] = SP.r2(av - take);
            need = SP.r2(need - take);
          });
        }
        res[l.k] = { picks: picks, short: need > 0 ? need : 0 };
      });
      return res;
    },
    pvHtml(l, a) {
      const it = SP.idx.item[l.item_id];
      if (!a) return '';
      if (a.err) return `<span class="text-danger"><i class="bi bi-exclamation-circle"></i> ${e(a.err)}</span>`;
      let h = a.picks.length ? '<i class="bi bi-arrow-return-right"></i> ตัดจาก ' + a.picks.map(p => `Lot <b>${e(p[0].lot_no)}</b> ${SP.fmt.num(p[1])}${p[0].exp ? ` <span class="exp-pill bk-${SP.bucket(p[0].exp)}">${SP.fmt.dateShort(p[0].exp)}</span>` : ''}`).join(' · ') : '';
      if (a.short) h += ` <span class="text-danger fw-600">คงเหลือไม่พอ ขาด ${SP.fmt.num(a.short)} ${e(it.unit)}</span>`;
      if (!(+l.qty > 0)) h = '<span class="text-danger">ระบุจำนวนที่จ่าย</span>';
      return h;
    },
    lineHtml(l, a) {
      const it = SP.idx.item[l.item_id];
      const today = SP.today();
      const lots = SP.idx.lotsByItem[l.item_id] || [];
      const usable = lots.filter(x => !(x.exp && x.exp < today));
      const avail = SP.r2(usable.reduce((s, x) => s + x.balance, 0));
      const nExp = lots.length - usable.length;
      const opts = '<option value="">อัตโนมัติ: หมดอายุก่อนจ่ายก่อน</option>' + lots.map(x => {
        const ex = x.exp && x.exp < today;
        return `<option value="${x.id}"${x.id === l.lot_id ? ' selected' : ''}${ex ? ' disabled' : ''}>Lot ${e(x.lot_no)} · ${x.exp ? SP.fmt.dateShort(x.exp) : 'ไม่มีวันหมดอายุ'} · เหลือ ${SP.fmt.num(x.balance)}${ex ? ' (หมดอายุ)' : ''}</option>`;
      }).join('');
      const bad = a && (a.err || a.short || !(+l.qty > 0));
      return `<div class="cart-line${bad ? ' need' : ''}" data-k="${l.k}">
        <div class="cl-head"><div class="cl-name">${SP.catDot(it)}${e(it.name)}<div class="sub">${e(it.code)} · จ่ายได้ ${SP.fmt.num(avail)} ${e(it.unit)}${nExp ? ' · มีล็อตหมดอายุ ' + nExp + ' ล็อต (ไม่นำมาจ่าย)' : ''}</div></div>
          <button class="btn btn-sm btn-light" type="button" data-del="${l.k}" aria-label="ลบรายการ"><i class="bi bi-x-lg"></i></button></div>
        <div class="cl-grid issue">
          <div><label>ล็อตที่จ่าย</label><select class="form-select" data-f="lot_id">${opts}</select></div>
          <div><label>จำนวนจ่าย (${e(it.unit)})</label><div class="qty-box"><button class="btn btn-light" type="button" data-step="-1" aria-label="ลด">-</button><input class="form-control" type="number" min="0" step="any" inputmode="decimal" data-f="qty" value="${l.qty}"><button class="btn btn-light" type="button" data-step="1" aria-label="เพิ่ม">+</button></div></div>
          <div><label>หมายเหตุ</label><input class="form-control" data-f="note" value="${e(l.note || '')}" maxlength="120" placeholder="ไม่บังคับ"></div>
        </div>
        <div class="cl-note" data-pv>${this.pvHtml(l, a)}</div></div>`;
    },
    drawLines(flashK) {
      const box = SP.$('#isLines');
      if (!box) return;
      const L = this.cart.lines;
      const A = this.alloc();
      box.innerHTML = L.length ? L.map(l => this.lineHtml(l, A[l.k])).join('')
        : '<div class="cart-empty"><i class="bi bi-qr-code-scan fs-1 d-block mb-2"></i><div class="fw-600 text-body">ยังไม่มีรายการ</div><div class="small">ยิงบาร์โค้ด เปิดกล้อง หรือกด เลือกวัสดุ</div></div>';
      this.sum(A);
      if (flashK) {
        const r = box.querySelector(`[data-k="${flashK}"]`);
        if (r) { r.classList.add('flash'); setTimeout(() => r.classList.remove('flash'), 900); }
      }
    },
    refresh() {
      const A = this.alloc();
      this.cart.lines.forEach(l => {
        const row = SP.$(`#isLines [data-k="${l.k}"]`);
        if (!row) return;
        const a = A[l.k];
        row.querySelector('[data-pv]').innerHTML = this.pvHtml(l, a);
        row.classList.toggle('need', !!(a && (a.err || a.short || !(+l.qty > 0))));
      });
      this.sum(A);
    },
    sum(A) {
      A = A || this.alloc();
      const L = this.cart.lines;
      let v = 0;
      L.forEach(l => { const a = A[l.k]; if (a) a.picks.forEach(p => { v += p[1] * p[0].price; }); });
      const set = (id, t) => { const x = SP.$(id); if (x) x.textContent = t; };
      set('#isCount', L.length);
      set('#isSumN', L.length + ' รายการ');
      set('#isSumV', SP.fmt.money(v) + ' บาท');
    },

    onCode(code, fromCam) {
      const r = SP.scan.resolve(code);
      if (!r.item) {
        if (fromCam) { this.unknown = code; return { ok: false, msg: 'ไม่พบบาร์โค้ด ' + code + ' จัดการได้หลังปิดกล้อง' }; }
        const found = SP.scan.find(code);
        if (found.length === 1) { this.add(found[0], ''); return { ok: true }; }
        if (found.length > 1) { SP.pick.item({ title: 'เลือกวัสดุที่จ่ายออก', q: code, multi: true, onPick: it => { this.add(it, ''); } }); return { ok: true }; }
        SP.scan.unknown(code, it => this.add(it, ''));
        return { ok: false };
      }
      const it = r.item;
      const warn = m => { if (!fromCam) SP.toast(m, 'warning'); return { ok: false, msg: m }; };
      if (it.status !== 'active') return warn(it.name + ' ตั้งเป็นไม่ใช้งานอยู่');
      if (r.gs1 && r.gs1.lot) {
        if (r.lot) {
          if (r.lot.exp && SP.daysTo(r.lot.exp) < 0) return warn(it.name + ' Lot ' + r.lot.lot_no + ' หมดอายุแล้ว ห้ามจ่าย');
          const l = this.add(it, r.lot.id);
          return { ok: true, msg: it.name + ' Lot ' + r.lot.lot_no + ' รวม ' + SP.fmt.num(l.qty) + ' ' + it.unit };
        }
        const l = this.add(it, '');
        const m = 'ไม่พบ Lot ' + r.gs1.lot + ' ในคลัง ใช้ล็อตอัตโนมัติแทน (รวม ' + SP.fmt.num(l.qty) + ')';
        if (!fromCam) SP.toast(m, 'info');
        return { ok: true, msg: m };
      }
      const today = SP.today();
      const avail = (SP.idx.lotsByItem[it.id] || []).filter(x => !(x.exp && x.exp < today)).reduce((s, x) => s + x.balance, 0);
      if (avail <= 0) return warn(it.name + ' ไม่มีคงเหลือที่จ่ายได้');
      const l = this.add(it, '');
      return { ok: true, msg: it.name + ' รวม ' + SP.fmt.num(l.qty) + ' ' + it.unit };
    },
    add(it, lotId) {
      const L = this.cart.lines;
      let l = L.find(x => x.item_id === it.id && (x.lot_id || '') === (lotId || ''));
      if (l) { l.qty = SP.r2((+l.qty || 0) + 1); L.splice(L.indexOf(l), 1); L.unshift(l); }
      else { l = { k: SP.uid(), item_id: it.id, lot_id: lotId || '', qty: 1, note: '' }; L.unshift(l); }
      if (L.length > 100) SP.toast('ใบจ่าย 1 ใบบันทึกได้ไม่เกิน 100 รายการ', 'warning');
      this.persist();
      this.drawLines(l.k);
      return l;
    },
    openCam() {
      this.unknown = null;
      SP.cam.open({
        title: 'สแกนจ่ายออกวัสดุ', hint: 'ยิงทีละชิ้น ชิ้นเดิมซ้ำ = เพิ่มจำนวน',
        onScan: code => this.onCode(code, true),
        onClose: () => { if (this.unknown) { const c = this.unknown; this.unknown = null; SP.scan.unknown(c, it => this.add(it, '')); } },
      });
    },

    async save(btn) {
      const L = this.cart.lines, h = this.cart.head;
      if (!L.length) return SP.toast('ยังไม่มีรายการจ่ายออก', 'warning');
      if (L.length > 100) return SP.toast('บันทึกได้ครั้งละไม่เกิน 100 รายการ ให้แบ่งเป็นหลายใบ', 'warning');
      if (!h.date) return SP.toast('กรุณาเลือกวันที่จ่าย', 'warning');
      if (!h.requester_id && !h.requester_name) {
        const inp = SP.$('#isReq') && SP.$('#isReq').parentNode.querySelector('.sp-combo-input');
        if (inp) inp.focus();
        return SP.toast('กรุณาระบุชื่อผู้เบิก', 'warning');
      }
      const A = this.alloc();
      for (const l of L) {
        const a = A[l.k], it = SP.idx.item[l.item_id];
        if (!(+l.qty > 0) || a.err || a.short) {
          const row = SP.$(`#isLines [data-k="${l.k}"]`);
          if (row) row.scrollIntoView({ block: 'center', behavior: 'smooth' });
          return SP.toast(it.name + ': ' + (!(+l.qty > 0) ? 'ระบุจำนวนที่จ่าย' : (a.err || 'คงเหลือไม่พอ ขาด ' + SP.fmt.num(a.short) + ' ' + it.unit)), 'warning');
        }
      }
      if (!this.cart.rid) { this.cart.rid = SP.uid(); this.persist(); }
      SP.ui.busy(btn, true, 'กำลังบันทึก...');
      try {
        const res = await SP.api('issue.save', {
          date: h.date, requester_id: h.requester_id || '', requester_name: h.requester_name || '', note: h.note || '', rid: this.cart.rid,
          lines: L.map(l => ({ item_id: l.item_id, lot_id: l.lot_id || '', qty: +l.qty, note: l.note || '' })),
        });
        SP.applyLots(res.lots);
        if (res.new_requester) SP.upsert('requesters', res.new_requester);
        this.cart = { lines: [], head: { date: SP.today() }, rid: '' };
        this.persist();
        if (SP.state.page === 'issue') this.drawTab();
        if (res.duplicate) SP.toast('เอกสารนี้ถูกบันทึกไว้แล้ว ระบบไม่บันทึกซ้ำ', 'info');
        SP.docs.done(res.doc);
      } catch (er) { SP.err(er); } finally { SP.ui.busy(btn, false); }
    },
  };
})();
