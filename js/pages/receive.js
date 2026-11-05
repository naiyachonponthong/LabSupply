/**
 * รับเข้า: สแกนบาร์โค้ด (กล้อง/เครื่องยิง) อ่าน GS1 กรอก Lot และวันหมดอายุ รายการค้างไว้ในเครื่องจนกว่าจะบันทึก
 */
(function () {
  'use strict';
  const SP = window.SP;
  const e = s => SP.esc(s);
  const KEY = 'cart_rc';

  SP.pages.receive = {
    tab: 'form',
    cart: null,
    unknown: null,

    load() {
      const c = SP.store.get(KEY, null);
      this.cart = c && Array.isArray(c.lines) ? c : { lines: [], head: {}, rid: '' };
      const h = this.cart.head = this.cart.head || {};
      this.cart.lines = this.cart.lines.filter(l => SP.idx.item[l.item_id]);
      if (!h.date || h.date > SP.today() || !this.cart.lines.length) h.date = SP.today();
      if (!h.source) h.source = 'purchase';
      if (h.supplier_id && !SP.idx.sup[h.supplier_id]) h.supplier_id = '';
    },
    persist() { SP.store.set(KEY, this.cart); },
    persistLater: SP.debounce(() => SP.pages.receive.persist(), 300),

    render(el, param) {
      this.load();
      if (param.item || param.scan) this.tab = 'form';
      el.innerHTML = `<div class="page-head"><div><h1>รับเข้าวัสดุ</h1><div class="sub">สแกนบาร์โค้ดหรือเลือกวัสดุ กรอก Lot และวันหมดอายุ แล้วกดบันทึก</div></div>
        <div class="actions"><div class="nav nav-pills" id="rcTabs">
          <button class="nav-link ${this.tab === 'form' ? 'active' : ''}" type="button" data-tab="form"><i class="bi bi-pencil-square"></i> บันทึกรับเข้า</button>
          <button class="nav-link ${this.tab === 'hist' ? 'active' : ''}" type="button" data-tab="hist"><i class="bi bi-clock-history"></i> ประวัติรับเข้า</button></div></div></div>
        <div id="rcBody"></div>`;
      el.onclick = ev => this.click(ev);
      this.drawTab();
      if (param.item && SP.idx.item[param.item]) this.add(SP.idx.item[param.item]);
      if (param.scan) setTimeout(() => this.openCam(), 200);
      if (param.item || param.scan) history.replaceState(null, '', '#/receive');
    },

    drawTab() {
      const box = SP.$('#rcBody');
      if (!box) return;
      if (this.tab === 'hist') { box.innerHTML = '<div id="rcHist"></div>'; SP.docs.history(SP.$('#rcHist'), 'RC'); return; }
      const h = this.cart.head;
      box.innerHTML = `<div class="row g-3">
        <div class="col-xl-8">
          <div class="card mb-3"><div class="card-body">
            <div class="scanbar">
              <div class="input-ico"><i class="bi bi-upc-scan"></i><input class="form-control" id="rcScan" placeholder="ยิงบาร์โค้ด หรือพิมพ์ชื่อ/รหัสวัสดุแล้วกด Enter" autocomplete="off" enterkeyhint="go"></div>
              <button class="btn btn-primary" type="button" data-a="cam"><i class="bi bi-camera"></i><span class="d-none d-sm-inline"> เปิดกล้อง</span></button>
              <button class="btn btn-soft" type="button" data-a="pick"><i class="bi bi-list-ul"></i><span class="d-none d-sm-inline"> เลือกวัสดุ</span></button>
            </div>
            <div class="small-muted mt-2"><i class="bi bi-lightbulb"></i> บาร์โค้ด GS1 บนกล่องน้ำยา (มี Lot และวันหมดอายุในตัว) ระบบกรอกให้อัตโนมัติ ยิงชิ้นเดิมซ้ำเพื่อเพิ่มจำนวน</div>
          </div></div>
          <div class="card"><div class="card-header"><i class="bi bi-cart3"></i> รายการรับเข้า <span class="b-soft b-primary" id="rcCount">0</span>
            <div class="ms-auto d-flex gap-1"><button class="btn btn-sm btn-light" type="button" data-a="paste"><i class="bi bi-clipboard"></i> วางจาก Excel</button>
            <button class="btn btn-sm btn-light" type="button" data-a="clear"><i class="bi bi-trash"></i> ล้าง</button></div></div>
            <div id="rcLines"></div></div>
        </div>
        <div class="col-xl-4"><div class="card sticky-side"><div class="card-header"><i class="bi bi-clipboard-check"></i> ข้อมูลการรับ</div><div class="card-body">
          <div class="mb-3"><label class="form-label" for="rcDate">วันที่รับ <span class="text-danger">*</span></label><input class="form-control" type="date" id="rcDate" value="${h.date}" max="${SP.today()}"></div>
          <div class="mb-3"><label class="form-label">ประเภทการรับ</label><div class="d-flex gap-3 flex-wrap">
            <div class="form-check"><input class="form-check-input" type="radio" name="rcSrc" id="rcSrc1" value="purchase" ${h.source !== 'opening' ? 'checked' : ''}><label class="form-check-label" for="rcSrc1">รับจากการจัดซื้อ</label></div>
            <div class="form-check"><input class="form-check-input" type="radio" name="rcSrc" id="rcSrc2" value="opening" ${h.source === 'opening' ? 'checked' : ''}><label class="form-check-label" for="rcSrc2">ยอดยกมา (เริ่มใช้ระบบ)</label></div></div></div>
          <div class="mb-3"><label class="form-label">บริษัทผู้จำหน่าย</label><div class="d-flex gap-2"><div class="flex-grow-1 min-w-0">${SP.ui.select('rcSup', SP.opt.suppliers(), h.supplier_id, 'id="rcSup" data-search data-placeholder="แตะเพื่อเลือกบริษัท หรือพิมพ์ค้นหา"', 'ไม่ระบุ')}</div>
            <button class="btn btn-light" type="button" data-a="supadd" title="เพิ่มบริษัทใหม่" aria-label="เพิ่มบริษัทใหม่"><i class="bi bi-plus-lg"></i></button></div></div>
          <div class="mb-3"><label class="form-label" for="rcRef">เลขที่ใบส่งของ/อ้างอิง</label><input class="form-control" id="rcRef" value="${e(h.ref_no || '')}" maxlength="60" placeholder="เช่น INV-6901234"></div>
          <div class="mb-3"><label class="form-label" for="rcNote">หมายเหตุ</label><textarea class="form-control" id="rcNote" rows="2" maxlength="300">${e(h.note || '')}</textarea></div>
          <div class="border-top pt-3"><div class="sum-line"><span>จำนวนรายการ</span><b id="rcSumN">0</b></div><div class="sum-line total"><span>มูลค่ารวม</span><b id="rcSumV">0.00</b></div></div>
          <button class="btn btn-primary btn-lg w-100 mt-3" type="button" data-a="save"><i class="bi bi-check2-circle"></i> บันทึกรับเข้า</button>
        </div></div></div></div>`;
      SP.ui.enhance(box);
      SP.scan.bind(SP.$('#rcScan'), code => this.onCode(code, false));
      const head = () => {
        h.date = SP.$('#rcDate').value;
        h.source = (SP.$('input[name="rcSrc"]:checked') || {}).value || 'purchase';
        h.supplier_id = SP.$('#rcSup').value;
        h.ref_no = SP.$('#rcRef').value.trim();
        h.note = SP.$('#rcNote').value.trim();
        this.persistLater();
      };
      ['#rcDate', '#rcSup', '#rcSrc1', '#rcSrc2'].forEach(s => SP.$(s).addEventListener('change', head));
      ['#rcRef', '#rcNote'].forEach(s => SP.$(s).addEventListener('input', head));
      const lines = SP.$('#rcLines');
      lines.addEventListener('input', ev => this.lineInput(ev));
      lines.addEventListener('change', ev => this.lineInput(ev));
      this.drawLines();
      if (window.innerWidth >= 992) SP.$('#rcScan').focus();
    },

    click(ev) {
      const t = ev.target.closest('[data-tab]');
      if (t) { this.tab = t.dataset.tab; SP.$$('#rcTabs .nav-link').forEach(x => x.classList.toggle('active', x === t)); this.drawTab(); return; }
      const d = ev.target.closest('[data-del]');
      if (d) { this.cart.lines = this.cart.lines.filter(x => x.k !== d.dataset.del); this.persist(); this.drawLines(); return; }
      const a = ev.target.closest('[data-a]');
      if (!a) return;
      const act = a.dataset.a;
      if (act === 'cam') this.openCam();
      else if (act === 'pick') SP.pick.item({ title: 'เลือกวัสดุที่รับเข้า', multi: true, onPick: it => { this.add(it); } });
      else if (act === 'paste') this.pasteDialog();
      else if (act === 'supadd') this.addSupplier();
      else if (act === 'save') this.save(a);
      else if (act === 'clear') {
        if (!this.cart.lines.length) return;
        SP.ui.confirm('ล้างรายการรับเข้าที่ยังไม่บันทึกทั้งหมด ' + this.cart.lines.length + ' รายการ', { title: 'ล้างรายการ', tone: 'danger', okText: 'ล้างรายการ', icon: 'bi-trash' })
          .then(ok => { if (ok) { this.cart.lines = []; this.cart.rid = ''; this.persist(); this.drawLines(); } });
      }
    },

    lineInput(ev) {
      const f = ev.target.dataset.f;
      if (!f) return;
      const row = ev.target.closest('[data-k]');
      const l = this.cart.lines.find(x => x.k === row.dataset.k);
      if (!l) return;
      l[f] = f === 'qty' || f === 'price' ? SP.num(ev.target.value) : ev.target.value.trim();
      if (f === 'qty' || f === 'price') row.querySelector('[data-val]').textContent = SP.fmt.money(l.qty * l.price);
      if (f === 'exp') row.querySelector('[data-bk]').innerHTML = l.exp ? SP.expPill(l.exp) : '';
      const it = SP.idx.item[l.item_id];
      row.classList.toggle('need', !!(it && it.has_expiry && (!l.lot_no || !l.exp)));
      this.sum();
      this.persistLater();
    },

    drawLines(flashK) {
      const box = SP.$('#rcLines');
      if (!box) return;
      const L = this.cart.lines;
      box.innerHTML = L.length ? L.map(l => this.lineHtml(l)).join('')
        : '<div class="cart-empty"><i class="bi bi-upc-scan fs-1 d-block mb-2"></i><div class="fw-600 text-body">ยังไม่มีรายการ</div><div class="small">ยิงบาร์โค้ด เปิดกล้อง หรือกด เลือกวัสดุ</div></div>';
      this.sum();
      if (flashK) {
        const r = box.querySelector(`[data-k="${flashK}"]`);
        if (r) { r.classList.add('flash'); setTimeout(() => r.classList.remove('flash'), 900); }
      }
    },
    lineHtml(l) {
      const it = SP.idx.item[l.item_id];
      const need = it.has_expiry && (!l.lot_no || !l.exp);
      const req = it.has_expiry ? ' *' : '';
      return `<div class="cart-line${need ? ' need' : ''}" data-k="${l.k}">
        <div class="cl-head">${SP.thumb(it)}<div class="cl-name">${SP.catDot(it)}${e(it.name)}<div class="sub">${e(it.code)} · คงเหลือเดิม ${SP.fmt.num(it._bal)} ${e(it.unit)}${SP.packText(it) !== '-' ? ' · ' + e(SP.packText(it)) : ''}</div></div>
          <button class="btn btn-sm btn-light" type="button" data-del="${l.k}" aria-label="ลบรายการ"><i class="bi bi-x-lg"></i></button></div>
        <div class="cl-grid">
          <div><label>Lot number${req}</label><input class="form-control" data-f="lot_no" value="${e(l.lot_no)}" placeholder="${it.has_expiry ? 'เลขการผลิต' : 'ไม่บังคับ'}" maxlength="40" autocapitalize="characters"></div>
          <div><label>วันหมดอายุ${req}</label><input class="form-control" type="date" data-f="exp" value="${e(l.exp)}"><div class="cl-note" data-bk>${l.exp ? SP.expPill(l.exp) : ''}</div></div>
          <div><label>จำนวน (${e(it.unit)})</label><input class="form-control" type="number" min="0" step="any" inputmode="decimal" data-f="qty" value="${l.qty}"></div>
          <div><label>ราคา/หน่วย</label><input class="form-control" type="number" min="0" step="0.01" inputmode="decimal" data-f="price" value="${l.price}"></div>
          <div class="cl-val"><label class="text-end">มูลค่า</label><span data-val>${SP.fmt.money(l.qty * l.price)}</span></div>
        </div></div>`;
    },
    sum() {
      const L = this.cart.lines;
      const v = L.reduce((s, l) => s + (+l.qty || 0) * (+l.price || 0), 0);
      const set = (id, t) => { const x = SP.$(id); if (x) x.textContent = t; };
      set('#rcCount', L.length);
      set('#rcSumN', L.length + ' รายการ');
      set('#rcSumV', SP.fmt.money(v) + ' บาท');
    },

    onCode(code, fromCam) {
      const r = SP.scan.resolve(code);
      if (!r.item) {
        if (fromCam) { this.unknown = code; return { ok: false, msg: 'ไม่พบบาร์โค้ด ' + code + ' จัดการได้หลังปิดกล้อง' }; }
        const found = SP.scan.find(code);
        if (found.length === 1) { this.add(found[0]); return { ok: true }; }
        if (found.length > 1) { SP.pick.item({ title: 'เลือกวัสดุที่รับเข้า', q: code, multi: true, onPick: it => { this.add(it); } }); return { ok: true }; }
        SP.scan.unknown(code, it => this.add(it));
        return { ok: false };
      }
      if (r.item.status !== 'active') { const m = r.item.name + ' ตั้งเป็นไม่ใช้งานอยู่'; if (!fromCam) SP.toast(m, 'warning'); return { ok: false, msg: m }; }
      const l = this.add(r.item, r.gs1);
      return { ok: true, msg: r.item.name + (l.lot_no ? ' Lot ' + l.lot_no : '') + ' รวม ' + SP.fmt.num(l.qty) + ' ' + r.item.unit };
    },
    add(it, gs1) {
      const lot = (gs1 && gs1.lot) || '', exp = (gs1 && gs1.exp) || '';
      const L = this.cart.lines;
      let l = L.find(x => x.item_id === it.id && (lot ? (x.lot_no === lot || !x.lot_no) : true));
      if (l) {
        l.qty = SP.r2((+l.qty || 0) + 1);
        if (lot && !l.lot_no) l.lot_no = lot;
        if (exp && !l.exp) l.exp = exp;
        L.splice(L.indexOf(l), 1);
        L.unshift(l);
      } else {
        l = { k: SP.uid(), item_id: it.id, lot_no: lot, exp: exp, qty: 1, price: it.price || 0 };
        L.unshift(l);
      }
      if (L.length > 100) SP.toast('ใบรับเข้า 1 ใบบันทึกได้ไม่เกิน 100 รายการ', 'warning');
      this.persist();
      this.drawLines(l.k);
      return l;
    },
    openCam() {
      this.unknown = null;
      SP.cam.open({
        title: 'สแกนรับเข้าวัสดุ', hint: 'ยิงทีละชิ้น ชิ้นเดิมซ้ำ = เพิ่มจำนวน',
        onScan: code => this.onCode(code, true),
        onClose: () => { if (this.unknown) { const c = this.unknown; this.unknown = null; SP.scan.unknown(c, it => this.add(it)); } },
      });
    },
    async addSupplier() {
      const name = await SP.ui.prompt('เพิ่มบริษัทผู้จำหน่าย', { placeholder: 'ชื่อบริษัท', required: true, okText: 'เพิ่ม' });
      if (!name) return;
      try {
        const s = await SP.api('master.save', { kind: 'supplier', rec: { name: name } });
        SP.upsert('suppliers', s);
        const sel = SP.$('#rcSup');
        SP.ui.setSelect(sel, SP.opt.suppliers(), s.id, 'ไม่ระบุ');
        this.cart.head.supplier_id = s.id;
        this.persist();
        SP.toast('เพิ่มบริษัท ' + s.name + ' แล้ว');
      } catch (er) { SP.err(er); }
    },

    /** วางรายการจาก Excel: รหัสหรือชื่อ | Lot | วันหมดอายุ | จำนวน | ราคา */
    pasteDialog() {
      let ready = [];
      SP.ui.modal({
        title: '<i class="bi bi-clipboard"></i> วางรายการรับเข้าจาก Excel', size: 'lg',
        body: `<ol class="guide-steps small"><li>เรียงคอลัมน์: <span class="code-chip">รหัสวัสดุ หรือชื่อวัสดุ</span> <span class="code-chip">Lot</span> <span class="code-chip">วันหมดอายุ</span> <span class="code-chip">จำนวน</span> <span class="code-chip">ราคา/หน่วย</span></li>
          <li>วันที่ใช้ได้ทั้ง 31/12/2569, 31/12/2026 และ 2026-12-31 ถ้าไม่ใส่ราคา ระบบใช้ราคาในข้อมูลวัสดุ</li>
          <li>เหมาะกับการบันทึก "ยอดยกมา" ตอนเริ่มใช้ระบบ (เลือกประเภทการรับเป็น ยอดยกมา ก่อนบันทึก)</li></ol>
          <div data-no-enter><textarea class="form-control" id="psText" rows="8" placeholder="วางข้อมูลที่นี่" style="font-family:ui-monospace,Consolas,monospace;font-size:.82rem"></textarea></div><div id="psPrev" class="mt-2 small"></div>`,
        saveText: '<i class="bi bi-plus-lg"></i> เพิ่มลงรายการ',
        onOpen: root => {
          SP.$('#psText', root).addEventListener('input', SP.debounce(() => {
            const t = SP.parseTable(SP.$('#psText', root).value);
            if (t.length && /รหัส|ชื่อ|code|name/i.test(t[0][0] || '') && !SP.idx.code[String(t[0][0]).toUpperCase()]) t.shift();
            const bad = [];
            ready = [];
            t.forEach((r, i) => {
              const key = String(r[0] || '').trim();
              const it = SP.idx.code[key.toUpperCase()] || SP.idx.bc[SP.normBc(key)] || SP.state.boot.items.find(x => x.status === 'active' && x.name.trim().toLowerCase() === key.toLowerCase());
              const exp = r[2] ? SP.parseDate(r[2]) : '';
              const qty = SP.num(r[3]);
              if (!it) return bad.push('แถว ' + (i + 1) + ': ไม่พบวัสดุ "' + key + '"');
              if (exp === null) return bad.push('แถว ' + (i + 1) + ': วันหมดอายุ "' + r[2] + '" ไม่ถูกต้อง');
              if (!(qty > 0)) return bad.push('แถว ' + (i + 1) + ': จำนวนต้องมากกว่า 0');
              ready.push({ k: SP.uid(), item_id: it.id, lot_no: String(r[1] || '').trim(), exp: exp, qty: qty, price: r[4] !== undefined && r[4] !== '' ? SP.num(r[4]) : (it.price || 0) });
            });
            SP.$('#psPrev', root).innerHTML = (ready.length ? `<div class="text-success fw-600">พร้อมเพิ่ม ${ready.length} รายการ</div>` : '') + (bad.length ? `<div class="text-danger mt-1">${bad.slice(0, 20).map(e).join('<br>')}${bad.length > 20 ? '<br>...' : ''}</div>` : '');
          }, 250));
        },
        onSave: () => {
          if (!ready.length) { SP.toast('ยังไม่มีรายการที่ถูกต้อง', 'warning'); return false; }
          const room = Math.max(0, 100 - this.cart.lines.length);
          if (ready.length > room) SP.toast('ใบรับเข้า 1 ใบได้ไม่เกิน 100 รายการ เพิ่มเฉพาะ ' + room + ' รายการแรก', 'warning');
          this.cart.lines = this.cart.lines.concat(ready.slice(0, room));
          this.persist();
          this.drawLines();
          SP.toast('เพิ่ม ' + Math.min(ready.length, room) + ' รายการแล้ว ตรวจสอบก่อนกดบันทึก');
        },
      });
    },

    async save(btn) {
      const L = this.cart.lines, h = this.cart.head;
      if (!L.length) return SP.toast('ยังไม่มีรายการรับเข้า', 'warning');
      if (L.length > 100) return SP.toast('บันทึกได้ครั้งละไม่เกิน 100 รายการ ให้แบ่งเป็นหลายใบ', 'warning');
      if (!h.date) return SP.toast('กรุณาเลือกวันที่รับ', 'warning');
      for (const l of L) {
        const it = SP.idx.item[l.item_id];
        const row = SP.$(`#rcLines [data-k="${l.k}"]`);
        if (!(+l.qty > 0) || (it.has_expiry && (!l.lot_no || !l.exp))) {
          if (row) { row.classList.add('need'); row.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
          return SP.toast(it.name + ': ' + (!(+l.qty > 0) ? 'จำนวนต้องมากกว่า 0' : 'กรุณากรอก Lot และวันหมดอายุ'), 'warning');
        }
      }
      const expired = L.filter(l => l.exp && SP.daysTo(l.exp) < 0);
      if (expired.length && !(await SP.ui.confirm('มี ' + expired.length + ' รายการที่วันหมดอายุผ่านไปแล้ว ยืนยันบันทึกรับเข้าหรือไม่', { tone: 'warning', okText: 'บันทึกต่อ', icon: 'bi-exclamation-triangle' }))) return;
      if (h.source === 'purchase' && !h.supplier_id && !(await SP.ui.confirm('ยังไม่ได้เลือกบริษัทผู้จำหน่าย บันทึกต่อหรือไม่', { okText: 'บันทึกต่อ', icon: 'bi-truck' }))) return;
      if (!this.cart.rid) { this.cart.rid = SP.uid(); this.persist(); }
      SP.ui.busy(btn, true, 'กำลังบันทึก...');
      try {
        const res = await SP.api('receive.save', {
          date: h.date, source: h.source, supplier_id: h.supplier_id || '', ref_no: h.ref_no || '', note: h.note || '', rid: this.cart.rid,
          lines: L.map(l => ({ item_id: l.item_id, lot_no: l.lot_no, exp: l.exp, qty: +l.qty, price: +l.price })),
        });
        SP.applyLots(res.lots);
        this.cart = { lines: [], head: { date: SP.today(), source: h.source, supplier_id: '' }, rid: '' };
        this.persist();
        if (SP.state.page === 'receive') this.drawTab();
        if (res.duplicate) SP.toast('เอกสารนี้ถูกบันทึกไว้แล้ว ระบบไม่บันทึกซ้ำ', 'info');
        SP.docs.done(res.doc);
      } catch (er) { SP.err(er); } finally { SP.ui.busy(btn, false); }
    },
  };
})();
