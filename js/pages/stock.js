/**
 * คงคลัง: คงเหลือและมูลค่ารายวัสดุ (แยกประเภท), รายล็อตพร้อมแถบอายุ, ปรับปรุงยอด/ตัดจำหน่ายของหมดอายุ
 */
(function () {
  'use strict';
  const SP = window.SP;
  const e = s => SP.esc(s);
  const REASONS = [['expired', 'ตัดจำหน่ายหมดอายุ'], ['damaged', 'ชำรุด/เสียหาย'], ['count', 'ปรับยอดตามการตรวจนับ'], ['other', 'อื่น ๆ']];

  SP.pages.stock = {
    tab: 'items',
    st: { cat: '', q: '', bk: '', zero: false },

    render(el, param) {
      if (param.tab) { this.tab = param.tab; if (!param.b) this.st.bk = ''; }
      if (param.b) { this.tab = 'lots'; this.st.bk = param.b; }
      const b = SP.state.boot, k = SP.kpi(), canW = SP.canWrite();
      const cards = b.categories.map(c => { const x = k.byCat[c.id] || { n: 0, v: 0 }; return `<div class="col-6 col-xl"><div class="stat"><div class="stat-ico" style="background:${e(c.color)}1a;color:${e(c.color)}"><i class="bi bi-box-seam"></i></div><div class="min-w-0"><div class="num" style="font-size:1.2rem">${SP.fmt.money(x.v)}</div><div class="lbl ellipsis">${e(c.name)}</div></div></div></div>`; }).join('');
      el.innerHTML = `<div class="page-head"><div><h1>คงคลัง</h1><div class="sub">คงเหลือ มูลค่ารวมแต่ละวัสดุ และอายุของแต่ละล็อต ณ วันที่ ${e(SP.fmt.dateLong(SP.today()))}</div></div>
          <div class="actions">${canW ? '<button class="btn btn-primary" type="button" data-a="adjust"><i class="bi bi-sliders"></i> ปรับปรุงยอด</button>' : ''}
            <button class="btn btn-soft" type="button" data-a="print"><i class="bi bi-printer"></i> พิมพ์</button><button class="btn btn-light" type="button" data-a="csv"><i class="bi bi-download"></i> CSV</button></div></div>
        <div class="row g-3 mb-3">${cards}<div class="col-12 col-xl"><div class="stat"><div class="stat-ico tint-primary"><i class="bi bi-cash-stack"></i></div><div class="min-w-0"><div class="num" style="font-size:1.2rem">${SP.fmt.money(k.value)}</div><div class="lbl">มูลค่าคงคลังรวม (บาท)</div></div></div></div></div>
        <div class="d-flex flex-wrap gap-2 align-items-center mb-3">
          <div class="nav nav-pills" id="stTabs">
            <button class="nav-link ${this.tab === 'items' ? 'active' : ''}" type="button" data-tab="items"><i class="bi bi-capsule"></i> รายวัสดุ</button>
            <button class="nav-link ${this.tab === 'lots' ? 'active' : ''}" type="button" data-tab="lots"><i class="bi bi-layers"></i> รายล็อต</button>
            <button class="nav-link ${this.tab === 'adj' ? 'active' : ''}" type="button" data-tab="adj"><i class="bi bi-sliders"></i> ประวัติปรับปรุงยอด</button>
          </div></div>
        <div id="stBody"></div>`;
      el.onclick = ev => this.click(ev);
      el.oninput = SP.debounce(ev => { if (ev.target.id === 'stQ') { this.st.q = ev.target.value.trim().toLowerCase(); this.drawList(); } }, 200);
      el.onchange = ev => {
        if (ev.target.id === 'stCat') { this.st.cat = ev.target.value; this.drawList(); }
        if (ev.target.id === 'stZero') { this.st.zero = ev.target.checked; this.drawList(); }
      };
      this.drawTab();
      if (param.adjust && canW) this.adjust(param.adjust);
      if (param.tab || param.b || param.adjust) history.replaceState(null, '', '#/stock');
    },

    drawTab() {
      const box = SP.$('#stBody');
      if (!box) return;
      if (this.tab === 'adj') { box.innerHTML = '<div id="stAdj"></div>'; SP.docs.history(SP.$('#stAdj'), 'AJ'); return; }
      const st = this.st;
      const catSel = `<select class="form-select w-auto" id="stCat" aria-label="ประเภท"><option value="">ทุกประเภท</option>${SP.state.boot.categories.map(c => `<option value="${c.id}"${c.id === st.cat ? ' selected' : ''}>${e(c.name)}</option>`).join('')}</select>`;
      if (this.tab === 'items') {
        box.innerHTML = `<div class="card"><div class="card-body pb-2"><div class="toolbar">${catSel}
          <div class="input-ico grow"><i class="bi bi-search"></i><input class="form-control" id="stQ" placeholder="ค้นหาชื่อหรือรหัสวัสดุ" value="${e(st.q)}"></div>
          <div class="form-check form-switch m-0"><input class="form-check-input" type="checkbox" id="stZero" ${st.zero ? 'checked' : ''}><label class="form-check-label small" for="stZero">แสดงรายการที่หมดสต๊อก</label></div></div></div>
          <div id="stList"></div></div>`;
      } else {
        const counts = {};
        ['expired', 'd1', 'd2', 'd3', 'over', 'none'].forEach(x => { counts[x] = 0; });
        SP.state.boot.lots.forEach(l => { counts[SP.bucket(l.exp)]++; });
        const chips = [['', 'ทั้งหมด', '', SP.state.boot.lots.length]].concat(['expired', 'd1', 'd2', 'd3', 'over', 'none'].map(x => [x, SP.bkLabel(x), SP.bkColor(x), counts[x]]));
        box.innerHTML = `<div class="pill-tabs mb-3" id="stBk">${SP.ui.chips(chips, st.bk)}</div>
          ${counts.expired && SP.canWrite() ? `<div class="alert alert-danger"><i class="bi bi-exclamation-octagon"></i><div class="flex-grow-1">มีล็อตที่หมดอายุแล้ว ${counts.expired} ล็อต ระบบไม่ให้จ่ายออก ควรตัดจำหน่ายเพื่อให้ยอดคงคลังและมูลค่าถูกต้อง</div><button class="btn btn-sm btn-danger" type="button" data-a="writeoff">ตัดจำหน่ายทั้งหมด</button></div>` : ''}
          <div class="card"><div class="card-body pb-2"><div class="toolbar">${catSel}<div class="input-ico grow"><i class="bi bi-search"></i><input class="form-control" id="stQ" placeholder="ค้นหาชื่อวัสดุ รหัส หรือ Lot" value="${e(st.q)}"></div></div></div>
          <div id="stList"></div></div>`;
      }
      this.drawList();
    },

    itemRows() {
      const st = this.st;
      return SP.state.boot.items.filter(it => it.status !== 'deleted' && (!st.cat || it.category_id === st.cat) && (st.zero ? it.status === 'active' || it._bal > 0 : it._bal > 0)
        && (!st.q || (it.name + ' ' + it.code).toLowerCase().indexOf(st.q) >= 0))
        .sort((a, c) => ((SP.idx.cat[a.category_id] || {}).sort || 0) - ((SP.idx.cat[c.category_id] || {}).sort || 0) || SP.byName(a, c));
    },
    lotRows() {
      const st = this.st;
      return SP.state.boot.lots.filter(l => {
        const it = SP.idx.item[l.item_id];
        if (!it || (st.cat && it.category_id !== st.cat)) return false;
        if (st.bk && SP.bucket(l.exp) !== st.bk) return false;
        return !st.q || (it.name + ' ' + it.code + ' ' + l.lot_no).toLowerCase().indexOf(st.q) >= 0;
      }).sort(SP.fefo);
    },

    drawList() {
      const box = SP.$('#stList');
      if (!box) return;
      const canW = SP.canWrite();
      if (this.tab === 'items') {
        const rows = this.itemRows();
        if (!rows.length) { box.innerHTML = SP.ui.empty('bi-boxes', 'ไม่มีวัสดุคงเหลือตามเงื่อนไข', SP.canWrite() ? 'รับวัสดุเข้าคลังที่เมนู รับเข้า' : ''); return; }
        let h = '', cat = null, sub = 0, total = 0;
        const flush = () => { if (cat) h += `<tr class="group-row"><td colspan="5" class="num">รวม ${e(cat.name)}</td><td class="num">${SP.fmt.money(sub)}</td><td></td></tr>`; };
        rows.forEach(it => {
          const c = SP.catOf(it);
          if (!cat || cat.id !== c.id) { flush(); cat = c; sub = 0; h += `<tr class="group-row"><td colspan="7"><span class="cat-dot" style="background:${e(c.color)}"></span>${e(c.name)}</td></tr>`; }
          sub += it._val; total += it._val;
          h += `<tr class="tr-click${it._low ? ' row-low' : ''}" data-item="${it.id}"><td><div class="fw-600">${e(it.name)}</div><div class="small-muted">${e(it.code)}${it._low ? ' · <span class="text-warning fw-600">ต่ำกว่าขั้นต่ำ</span>' : ''}</div></td>
            <td class="num"><b>${SP.fmt.num(it._bal)}</b> ${e(it.unit)}</td><td class="num small">${it.pack_qty > 0 ? SP.fmt.num(it._bal * it.pack_qty) + ' ' + e(it.pack_unit) : '-'}</td>
            <td class="num">${it._lots}</td><td>${it._near ? SP.expPill(it._near) : '<span class="small-muted">-</span>'}</td><td class="num fw-600">${SP.fmt.money(it._val)}</td>
            <td class="text-end">${canW && it._lots ? `<button class="btn btn-sm btn-light" type="button" data-adjitem="${it.id}" title="ปรับปรุงยอด" aria-label="ปรับปรุงยอด"><i class="bi bi-sliders"></i></button>` : ''}</td></tr>`;
        });
        flush();
        box.innerHTML = `<div class="table-wrap"><table class="table table-hover"><thead><tr><th>วัสดุ</th><th class="num">คงเหลือ</th><th class="num">เป็นหน่วยย่อย</th><th class="num">ล็อต</th><th>หมดอายุใกล้สุด</th><th class="num">มูลค่ารวม (บาท)</th><th></th></tr></thead>
          <tbody>${h}</tbody><tfoot><tr><td colspan="5" class="num">รวมทั้งหมด ${rows.length} รายการ</td><td class="num">${SP.fmt.money(total)}</td><td></td></tr></tfoot></table></div>`;
        return;
      }
      const rows = this.lotRows();
      if (!rows.length) { box.innerHTML = SP.ui.empty('bi-layers', 'ไม่มีล็อตตามเงื่อนไข', ''); return; }
      const total = rows.reduce((s, l) => s + l.balance * l.price, 0);
      box.innerHTML = `<div class="table-wrap"><table class="table table-hover"><thead><tr><th>วัสดุ</th><th>Lot No.</th><th>วันหมดอายุ</th><th>แถบอายุ</th><th class="num">คงเหลือ</th><th class="num">ราคา/หน่วย</th><th class="num">มูลค่า</th><th></th></tr></thead><tbody>
        ${rows.map(l => { const it = SP.idx.item[l.item_id]; return `<tr class="tr-click" data-item="${it.id}"><td style="min-width:200px"><div class="fw-600">${SP.catDot(it)}${e(it.name)}</div><div class="small-muted">${e(it.code)} · รับ ${e(SP.fmt.dateShort(l.received_at))}</div></td>
          <td class="fw-600">${e(l.lot_no)}</td><td>${SP.expPill(l.exp)}</td><td style="min-width:140px">${SP.lifeBar(l.exp)}</td><td class="num"><b>${SP.fmt.num(l.balance)}</b> ${e(it.unit)}</td>
          <td class="num">${SP.fmt.money(l.price)}</td><td class="num fw-600">${SP.fmt.money(l.balance * l.price)}</td>
          <td class="text-end">${canW ? `<button class="btn btn-sm btn-light" type="button" data-adj="${l.id}" title="ปรับปรุงยอด" aria-label="ปรับปรุงยอด"><i class="bi bi-sliders"></i></button>` : ''}</td></tr>`; }).join('')}
        </tbody><tfoot><tr><td colspan="6" class="num">รวม ${rows.length} ล็อต</td><td class="num">${SP.fmt.money(total)}</td><td></td></tr></tfoot></table></div>`;
    },

    click(ev) {
      const t = ev.target.closest('[data-tab]');
      if (t) { this.tab = t.dataset.tab; SP.$$('#stTabs .nav-link').forEach(x => x.classList.toggle('active', x === t)); this.drawTab(); return; }
      const chip = ev.target.closest('#stBk [data-chip]');
      if (chip) { this.st.bk = chip.dataset.chip; SP.$$('#stBk .chip').forEach(c => c.classList.toggle('active', c === chip)); this.drawList(); return; }
      const adj = ev.target.closest('[data-adj]');
      if (adj) { this.adjust(adj.dataset.adj); return; }
      const ai = ev.target.closest('[data-adjitem]');
      if (ai) { const l = (SP.idx.lotsByItem[ai.dataset.adjitem] || [])[0]; this.adjust(l ? l.id : ''); return; }
      const a = ev.target.closest('[data-a]');
      if (a) {
        if (a.dataset.a === 'adjust') this.adjust('');
        else if (a.dataset.a === 'writeoff') this.writeOff();
        else if (a.dataset.a === 'csv') this.csv();
        else if (a.dataset.a === 'print') this.print();
        return;
      }
      const it = ev.target.closest('[data-item]');
      if (it && !ev.target.closest('button')) SP.pages.items.view(it.dataset.item);
    },

    /** ปรับปรุงยอดรายล็อต (ลด/เพิ่ม) พร้อมเหตุผล */
    adjust(lotId) {
      if (!SP.canWrite()) return;
      const lots = SP.state.boot.lots.slice().sort((a, b) => SP.byName(SP.idx.item[a.item_id] || {}, SP.idx.item[b.item_id] || {}) || SP.fefo(a, b));
      if (!lots.length) return SP.toast('ยังไม่มีล็อตที่มีคงเหลือ', 'info');
      const opts = lots.map(l => { const it = SP.idx.item[l.item_id] || {}; return [l.id, (it.name || '-') + ' · Lot ' + l.lot_no, 'คงเหลือ ' + SP.fmt.num(l.balance) + ' ' + (it.unit || '') + (l.exp ? ' · หมดอายุ ' + SP.fmt.dateShort(l.exp) : ''), it.code]; });
      const info = id => {
        const l = SP.idx.lot[id];
        if (!l) return '<span class="small-muted">เลือกล็อตที่ต้องการปรับยอด</span>';
        const it = SP.idx.item[l.item_id];
        return `<div class="d-flex justify-content-between flex-wrap gap-2"><div><div class="fw-600">${e(it.name)}</div><div class="small-muted">Lot ${e(l.lot_no)} · ราคา ${SP.fmt.money(l.price)} บาท</div></div><div class="text-end"><div class="fw-bold fs-5">${SP.fmt.num(l.balance)} ${e(it.unit)}</div>${SP.expPill(l.exp)}</div></div>`;
      };
      const first = SP.idx.lot[lotId] ? lotId : '';
      const defReason = first && SP.idx.lot[first].exp && SP.daysTo(SP.idx.lot[first].exp) < 0 ? 'expired' : 'count';
      SP.ui.modal({
        title: '<i class="bi bi-sliders"></i> ปรับปรุงยอดวัสดุ', size: 'lg',
        body: `<div class="row g-3">
          ${SP.ui.f('ล็อตที่ปรับยอด', SP.ui.select('lot_id', opts, first, 'data-search data-placeholder="แตะเพื่อเลือก หรือพิมพ์ชื่อวัสดุ/Lot"', ''), { req: true })}
          <div class="col-12"><div class="p-3 rounded-4" style="background:#f8f9fb" id="ajInfo">${info(first)}</div></div>
          <div class="col-md-6"><label class="form-label">การปรับยอด</label><div class="d-flex gap-3">
            <div class="form-check"><input class="form-check-input" type="radio" name="dir" id="ajDn" value="-1" checked><label class="form-check-label" for="ajDn">ลดยอด (ตัดออก)</label></div>
            <div class="form-check"><input class="form-check-input" type="radio" name="dir" id="ajUp" value="1"><label class="form-check-label" for="ajUp">เพิ่มยอด</label></div></div></div>
          ${SP.ui.f('จำนวน', SP.ui.input('qty', '', 'type="number" min="0" step="any" inputmode="decimal" placeholder="0"'), { col: 'col-md-6', req: true, hint: 'กรอกจำนวนที่ต่างจากเดิม เช่น ตรวจนับได้น้อยกว่า 2 ให้เลือก ลดยอด แล้วกรอก 2' })}
          ${SP.ui.f('เหตุผล', SP.ui.select('reason', REASONS, defReason), { col: 'col-md-6' })}
          ${SP.ui.f('วันที่', SP.ui.input('date', SP.today(), 'type="date" max="' + SP.today() + '"'), { col: 'col-md-6' })}
          ${SP.ui.f('หมายเหตุ', SP.ui.textarea('note', ''), {})}
        </div>`,
        saveText: '<i class="bi bi-check2"></i> บันทึกปรับยอด',
        onOpen: root => {
          const sel = SP.$('[name="lot_id"]', root);
          sel.addEventListener('change', () => {
            SP.$('#ajInfo', root).innerHTML = info(sel.value);
            const l = SP.idx.lot[sel.value];
            if (l && l.exp && SP.daysTo(l.exp) < 0) { SP.$('[name="reason"]', root).value = 'expired'; SP.$('[name="qty"]', root).value = l.balance; }
          });
          if (first && defReason === 'expired') SP.$('[name="qty"]', root).value = SP.idx.lot[first].balance;
        },
        onSave: async root => {
          const f = SP.ui.form(root);
          const l = SP.idx.lot[f.lot_id];
          const q = SP.num(f.qty), dir = +f.dir;
          if (!l) { SP.toast('กรุณาเลือกล็อต', 'warning'); return false; }
          if (!(q > 0)) { SP.toast('กรุณากรอกจำนวนที่ปรับ', 'warning'); return false; }
          if (dir < 0 && q > l.balance) { SP.toast('ลดได้ไม่เกินคงเหลือ ' + SP.fmt.num(l.balance), 'warning'); return false; }
          const res = await SP.api('adjust.save', { date: f.date, reason: f.reason, note: f.note, rid: SP.uid(), lines: [{ lot_id: l.id, qty: dir * q }] });
          SP.applyLots(res.lots);
          if (SP.state.page === 'stock') this.render(SP.$('#spPage'), {});
          setTimeout(() => SP.docs.done(res.doc), 0);
        },
      });
    },

    async writeOff() {
      const today = SP.today();
      const lots = SP.state.boot.lots.filter(l => l.exp && l.exp < today);
      if (!lots.length) return SP.toast('ไม่มีล็อตที่หมดอายุ', 'info');
      const val = lots.reduce((s, l) => s + l.balance * l.price, 0);
      const ok = await SP.ui.confirm(`ตัดจำหน่ายล็อตที่หมดอายุแล้วทั้งหมด ${lots.length} ล็อต มูลค่า ${SP.fmt.money(val)} บาท คงเหลือของล็อตเหล่านี้จะเป็น 0 และออกใบปรับปรุงยอดให้`, { title: 'ตัดจำหน่ายของหมดอายุ', tone: 'danger', okText: 'ตัดจำหน่าย', icon: 'bi-trash3' });
      if (!ok) return;
      try {
        let last = null;
        for (let i = 0; i < lots.length; i += 200) {
          const part = lots.slice(i, i + 200);
          last = await SP.api('adjust.save', { date: today, reason: 'expired', note: 'ตัดจำหน่ายล็อตหมดอายุทั้งหมด', rid: SP.uid(), lines: part.map(l => ({ lot_id: l.id, qty: -l.balance })) });
          SP.applyLots(last.lots);
        }
        if (SP.state.page === 'stock') this.render(SP.$('#spPage'), {});
        if (last) SP.docs.done(last.doc);
      } catch (er) { SP.err(er); }
    },

    csv() {
      if (this.tab === 'lots') {
        SP.csv('คงคลังรายล็อต-' + SP.today(), [['ประเภท', 'รหัส', 'วัสดุ', 'Lot', 'วันหมดอายุ', 'เหลืออีก (วัน)', 'กลุ่มอายุ', 'คงเหลือ', 'หน่วย', 'ราคา/หน่วย', 'มูลค่า']]
          .concat(this.lotRows().map(l => { const it = SP.idx.item[l.item_id]; return [SP.catOf(it).name, it.code, it.name, l.lot_no, l.exp, l.exp ? SP.daysTo(l.exp) : '', SP.bkLabel(SP.bucket(l.exp)), l.balance, it.unit, l.price, SP.r2(l.balance * l.price)]; })));
      } else {
        SP.csv('คงคลังรายวัสดุ-' + SP.today(), [['ประเภท', 'รหัส', 'วัสดุ', 'คงเหลือ', 'หน่วย', 'จำนวน/หน่วย', 'หน่วยย่อย', 'จำนวนล็อต', 'หมดอายุใกล้สุด', 'มูลค่ารวม']]
          .concat(this.itemRows().map(it => [SP.catOf(it).name, it.code, it.name, it._bal, it.unit, it.pack_qty || '', it.pack_unit || '', it._lots, it._near || '', it._val])));
      }
    },
    print() {
      if (this.tab === 'lots') {
        const rows = this.lotRows();
        const tr = rows.map((l, i) => { const it = SP.idx.item[l.item_id]; return `<tr><td class="c">${i + 1}</td><td>${e(it.name)}<br><small>${e(it.code)}</small></td><td class="c">${e(l.lot_no)}</td><td class="c">${l.exp ? e(SP.fmt.date(l.exp)) : '-'}</td><td class="c">${e(SP.bkLabel(SP.bucket(l.exp)))}</td><td class="r">${SP.fmt.num(l.balance)} ${e(it.unit)}</td><td class="r">${SP.fmt.money(l.price)}</td><td class="r">${SP.fmt.money(l.balance * l.price)}</td></tr>`; }).join('');
        SP.print.report('รายงานคงคลังรายล็อต', 'ณ วันที่ ' + e(SP.fmt.dateLong(SP.today())), `<table class="pr-table"><thead><tr><th>ลำดับ</th><th>วัสดุ</th><th>Lot</th><th>วันหมดอายุ</th><th>กลุ่มอายุ</th><th>คงเหลือ</th><th>ราคา/หน่วย</th><th>มูลค่า</th></tr></thead><tbody>${tr}</tbody><tfoot><tr><td colspan="7" class="r">รวม</td><td class="r">${SP.fmt.money(rows.reduce((s, l) => s + l.balance * l.price, 0))}</td></tr></tfoot></table>`);
        return;
      }
      const rows = this.itemRows();
      let h = '', cat = null, sub = 0, n = 0;
      const flush = () => { if (cat) h += `<tr class="g"><td colspan="5" class="r">รวม ${e(cat.name)}</td><td class="r">${SP.fmt.money(sub)}</td></tr>`; };
      rows.forEach(it => {
        const c = SP.catOf(it);
        if (!cat || cat.id !== c.id) { flush(); cat = c; sub = 0; h += `<tr class="g"><td colspan="6">${e(c.name)}</td></tr>`; }
        sub += it._val; n++;
        h += `<tr><td class="c">${n}</td><td>${e(it.code)}</td><td>${e(it.name)}</td><td class="r">${SP.fmt.num(it._bal)} ${e(it.unit)}</td><td class="c">${it._near ? e(SP.fmt.date(it._near)) : '-'}</td><td class="r">${SP.fmt.money(it._val)}</td></tr>`;
      });
      flush();
      SP.print.report('รายงานวัสดุคงคลังและมูลค่า', 'ณ วันที่ ' + e(SP.fmt.dateLong(SP.today())), `<table class="pr-table"><thead><tr><th>ลำดับ</th><th>รหัส</th><th>วัสดุ</th><th>คงเหลือ</th><th>หมดอายุใกล้สุด</th><th>มูลค่ารวม</th></tr></thead><tbody>${h}</tbody><tfoot><tr><td colspan="5" class="r">รวมทั้งหมด</td><td class="r">${SP.fmt.money(rows.reduce((s, it) => s + it._val, 0))}</td></tr></tfoot></table>`);
    },
  };
})();
