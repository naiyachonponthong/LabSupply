/**
 * วัสดุ: รายการแยก 3 ประเภท, เพิ่ม/แก้ไข (popup) พร้อมช่องบาร์โค้ด, บัตรวัสดุ, สติกเกอร์, นำเข้าจาก Excel
 */
(function () {
  'use strict';
  const SP = window.SP;
  const e = s => SP.esc(s);
  const UNITS = ['กล่อง', 'ขวด', 'ชิ้น', 'ชุด', 'แพ็ค', 'ห่อ', 'ถุง', 'ม้วน', 'รีม', 'ด้าม', 'อัน', 'แผ่น', 'แกลลอน', 'ลิตร', 'หลอด', 'กระปุก', 'ถัง', 'คู่', 'เทสต์', 'Kit'];
  const IMPORT_COLS = [['category', 'ประเภท'], ['name', 'ชื่อวัสดุ'], ['supplier', 'บริษัทผู้จำหน่าย'], ['price', 'ราคา/หน่วย'], ['unit', 'หน่วยนับ'], ['pack_qty', 'จำนวน/หน่วย'], ['pack_unit', 'หน่วยย่อย'], ['rate', 'อัตราการใช้/เดือน'], ['min_qty', 'จำนวนขั้นต่ำ'], ['barcode', 'บาร์โค้ด'], ['code', 'รหัสวัสดุ'], ['has_expiry', 'มีวันหมดอายุ']];

  SP.pages.items = {
    st: { cat: '', q: '', flt: '', page: 1, size: 25, sel: {} },

    render(el, param) {
      const st = this.st, b = SP.state.boot, canW = SP.canWrite();
      if (param.cat !== undefined) st.cat = param.cat;
      if (param.flt !== undefined) st.flt = param.flt;
      const counts = {};
      let total = 0;
      b.items.forEach(it => { if (it.status === 'active') { counts[it.category_id] = (counts[it.category_id] || 0) + 1; total++; } });
      el.innerHTML = `
        <div class="page-head"><div><h1>วัสดุ</h1><div class="sub">ข้อมูลวัสดุแยกตามประเภท ราคา ขนาดบรรจุ อัตราการใช้ คงเหลือ และมูลค่ารวม</div></div>
          <div class="actions">
            ${canW ? '<button class="btn btn-primary" type="button" data-a="add"><i class="bi bi-plus-lg"></i> เพิ่มวัสดุ</button><button class="btn btn-soft" type="button" data-a="import"><i class="bi bi-file-earmark-spreadsheet"></i> นำเข้าจาก Excel</button>' : ''}
            <button class="btn btn-soft" type="button" data-a="stickers"><i class="bi bi-upc"></i> พิมพ์สติกเกอร์</button>
            <button class="btn btn-light" type="button" data-a="csv"><i class="bi bi-download"></i> CSV</button>
          </div></div>
        <div class="pill-tabs mb-3" id="itCats">${SP.ui.chips([['', 'ทั้งหมด', '', total]].concat(b.categories.map(c => [c.id, c.name, c.color, counts[c.id] || 0])), st.cat)}</div>
        <div class="card">
          <div class="card-body pb-2"><div class="toolbar">
            <div class="input-ico grow"><i class="bi bi-search"></i><input class="form-control" id="itQ" placeholder="ค้นหาชื่อ รหัส บาร์โค้ด หรือบริษัท (ยิงบาร์โค้ดได้)" value="${e(st.q)}" autocomplete="off"></div>
            <button class="btn btn-light" type="button" data-a="scan" title="สแกนเพื่อค้นหา" aria-label="สแกนเพื่อค้นหา"><i class="bi bi-upc-scan"></i></button>
            <select class="form-select w-auto" id="itFlt" aria-label="กรองสถานะ">
              ${[['', 'ใช้งานอยู่ทั้งหมด'], ['low', 'ต่ำกว่าขั้นต่ำ'], ['zero', 'หมดสต๊อก'], ['expsoon', 'มีล็อตใกล้หมดอายุ'], ['inactive', 'ไม่ใช้งาน'], ['all', 'ทุกสถานะ']].map(o => `<option value="${o[0]}"${o[0] === st.flt ? ' selected' : ''}>${o[1]}</option>`).join('')}
            </select>
          </div></div>
          <div id="itTable"></div>
        </div>`;
      el.onclick = ev => this.click(ev);
      el.oninput = SP.debounce(ev => { if (ev.target.id === 'itQ') { st.q = ev.target.value.trim(); st.page = 1; this.draw(); } }, 200);
      el.onchange = ev => { if (ev.target.id === 'itFlt') { st.flt = ev.target.value; st.page = 1; this.draw(); } };
      el.onkeydown = ev => {
        if (ev.target.id === 'itQ' && ev.key === 'Enter') {
          ev.preventDefault();
          const r = SP.scan.resolve(ev.target.value);
          if (r.item) this.view(r.item.id);
        }
      };
      this.draw();
      if (param.add && canW) this.form(null, { barcode: param.barcode || '' });
      if (param.view) this.view(param.view);
    },

    list() {
      const st = this.st, q = st.q.toLowerCase(), nq = SP.normBc(st.q);
      return SP.state.boot.items.filter(it => {
        if (st.cat && it.category_id !== st.cat) return false;
        if (st.flt === 'inactive') { if (it.status !== 'inactive') return false; } else if (st.flt !== 'all' && it.status !== 'active') return false;
        if (st.flt === 'low' && !it._low) return false;
        if (st.flt === 'zero' && it._bal > 0) return false;
        if (st.flt === 'expsoon' && !(it._near && ['expired', 'd1', 'd2'].indexOf(SP.bucket(it._near)) >= 0)) return false;
        if (q) {
          const sup = SP.idx.sup[it.supplier_id];
          const hay = (it.name + ' ' + it.code + ' ' + (sup ? sup.name : '') + ' ' + (it.barcodes || []).join(' ')).toLowerCase();
          if (hay.indexOf(q) < 0 && !(it.barcodes || []).some(x => SP.normBc(x) === nq)) return false;
        }
        return true;
      }).sort((a, c) => ((SP.idx.cat[a.category_id] || {}).sort || 0) - ((SP.idx.cat[c.category_id] || {}).sort || 0) || SP.byName(a, c));
    },

    draw() {
      const box = SP.$('#itTable');
      if (!box) return;
      const st = this.st, rows = this.list(), canW = SP.canWrite();
      const pages = Math.max(1, Math.ceil(rows.length / st.size));
      if (st.page > pages) st.page = pages;
      const view = rows.slice((st.page - 1) * st.size, st.page * st.size);
      const sumV = rows.reduce((s, it) => s + it._val, 0);
      const nsel = Object.keys(st.sel).length;
      if (!rows.length) {
        const none = !SP.state.boot.items.length;
        box.innerHTML = SP.ui.empty('bi-capsule', none ? 'ยังไม่มีข้อมูลวัสดุ' : 'ไม่พบวัสดุตามเงื่อนไข', none ? 'เพิ่มวัสดุทีละรายการ หรือนำเข้าจาก Excel ได้ทีเดียวหลายรายการ' : 'ลองเปลี่ยนคำค้นหรือตัวกรอง',
          none && canW ? '<button class="btn btn-primary" type="button" data-a="add"><i class="bi bi-plus-lg"></i> เพิ่มวัสดุ</button> <button class="btn btn-soft" type="button" data-a="import">นำเข้าจาก Excel</button>' : '');
        return;
      }
      const status = it => it.status === 'inactive' ? '<span class="b-soft b-mute">ไม่ใช้งาน</span>'
        : (it._bal <= 0 ? '<span class="b-soft b-danger">หมดสต๊อก</span>' : (it._low ? '<span class="b-soft b-warning">ต่ำกว่าขั้นต่ำ</span>' : '<span class="b-soft b-success">ปกติ</span>'));
      const tr = it => {
        const sup = SP.idx.sup[it.supplier_id];
        return `<tr class="tr-click" data-view="${it.id}">
          <td data-stop><input class="form-check-input" type="checkbox" data-sel="${it.id}" ${st.sel[it.id] ? 'checked' : ''} aria-label="เลือก"></td>
          <td><span class="code-chip">${e(it.code)}</span></td>
          <td style="min-width:250px"><div class="d-flex gap-2 align-items-center">${SP.thumb(it)}<div class="min-w-0"><div class="fw-600">${SP.catDot(it)}${e(it.name)}</div><div class="small-muted">${(it.barcodes || []).length ? '<i class="bi bi-upc"></i> ' + e(it.barcodes.join(', ')) : 'ยังไม่มีบาร์โค้ด'}</div></div></div></td>
          <td class="small" style="min-width:140px">${e(sup ? sup.name : '-')}</td>
          <td class="num">${SP.fmt.money(it.price)}</td>
          <td class="num small">${e(SP.packText(it))}</td>
          <td class="num">${it.rate ? SP.fmt.num(it.rate) + ' ' + e(it.unit) : '<span class="text-muted">-</span>'}</td>
          <td class="num"><b>${SP.fmt.num(it._bal)}</b> ${e(it.unit)}<div class="small-muted">ขั้นต่ำ ${SP.fmt.num(it.min_qty)}</div></td>
          <td class="num fw-600">${SP.fmt.money(it._val)}</td>
          <td>${status(it)}${it._near ? '<div class="mt-1">' + SP.expPill(it._near) + '</div>' : ''}</td>
          <td class="text-end" data-stop>${canW ? `<button class="btn btn-sm btn-light" type="button" data-edit="${it.id}" title="แก้ไข" aria-label="แก้ไข"><i class="bi bi-pencil"></i></button>` : ''}</td></tr>`;
      };
      const card = it => {
        const sup = SP.idx.sup[it.supplier_id];
        return `<div class="m-card" data-view="${it.id}"><div class="d-flex justify-content-between gap-2"><div class="fw-600 min-w-0 d-flex gap-2 align-items-center">${SP.thumb(it, 'sm')}<span>${SP.catDot(it)}${e(it.name)}</span></div><b class="text-nowrap">${SP.fmt.num(it._bal)} ${e(it.unit)}</b></div>
          <div class="row2"><span><span class="code-chip">${e(it.code)}</span> ${e(sup ? sup.name : '')}</span><span>${SP.fmt.money(it.price)} บาท/${e(it.unit)}</span></div>
          <div class="row2"><span>${status(it)} ${it._near ? SP.expPill(it._near) : ''}</span><span>มูลค่า <b class="text-body">${SP.fmt.money(it._val)}</b></span></div></div>`;
      };
      const from = (st.page - 1) * st.size + 1, to = Math.min(rows.length, st.page * st.size);
      box.innerHTML = `<div class="table-wrap d-none d-lg-block"><table class="table table-hover"><thead><tr>
          <th style="width:36px"><input class="form-check-input" type="checkbox" data-selall aria-label="เลือกทั้งหมด" ${rows.every(it => st.sel[it.id]) ? 'checked' : ''}></th>
          <th>รหัส</th><th>ชื่อวัสดุ</th><th>บริษัทผู้จำหน่าย</th><th class="num">ราคา/หน่วย</th><th class="num">จำนวน/หน่วย</th><th class="num">อัตราใช้/เดือน</th><th class="num">คงเหลือ</th><th class="num">มูลค่ารวม</th><th>สถานะ</th><th></th></tr></thead>
          <tbody>${view.map(tr).join('')}</tbody></table></div>
        <div class="m-list d-lg-none">${view.map(card).join('')}</div>
        <div class="card-footer d-flex justify-content-between align-items-center flex-wrap gap-2">
          <span class="small-muted">แสดง ${from}-${to} จาก ${rows.length} รายการ · มูลค่ารวม <b class="text-body">${SP.fmt.money(sumV)}</b> บาท${nsel ? ` · เลือกไว้ ${nsel} รายการ <button type="button" class="btn btn-link btn-sm p-0 align-baseline" data-a="clearsel">ล้างที่เลือก</button>` : ''}</span>
          ${SP.ui.pager(rows.length, st.page, st.size)}</div>`;
    },

    click(ev) {
      const st = this.st;
      const a = ev.target.closest('[data-a]');
      if (a) {
        const act = a.dataset.a;
        if (act === 'add') this.form(null);
        else if (act === 'import') this.importDialog();
        else if (act === 'stickers') this.stickersFromSel();
        else if (act === 'csv') this.csv();
        else if (act === 'scan') this.scanSearch();
        else if (act === 'clearsel') { st.sel = {}; this.draw(); }
        return;
      }
      const chip = ev.target.closest('[data-chip]');
      if (chip) {
        st.cat = chip.dataset.chip; st.page = 1;
        SP.$$('#itCats .chip').forEach(c => c.classList.toggle('active', c === chip));
        this.draw();
        return;
      }
      const pg = ev.target.closest('[data-page]');
      if (pg) { if (!pg.disabled) { st.page = +pg.dataset.page; this.draw(); } return; }
      const sel = ev.target.closest('[data-sel]');
      if (sel) { if (sel.checked) st.sel[sel.dataset.sel] = 1; else delete st.sel[sel.dataset.sel]; this.draw(); return; }
      const all = ev.target.closest('[data-selall]');
      if (all) { this.list().forEach(it => { if (all.checked) st.sel[it.id] = 1; else delete st.sel[it.id]; }); this.draw(); return; }
      const ed = ev.target.closest('[data-edit]');
      if (ed) { this.form(SP.idx.item[ed.dataset.edit]); return; }
      if (ev.target.closest('[data-stop]')) return;
      const v = ev.target.closest('[data-view]');
      if (v) this.view(v.dataset.view);
    },

    /** ฟอร์มเพิ่ม/แก้ไขวัสดุ (popup) opt: {barcode, name, onSaved} */
    form(it, opt) {
      opt = opt || {};
      const b = SP.state.boot, isNew = !it;
      if (!SP.canWrite()) return SP.toast('ไม่มีสิทธิ์แก้ไขข้อมูลวัสดุ', 'warning');
      if (!b.categories.length) return SP.toast('ยังไม่มีหมวดวัสดุ ให้ผู้ดูแลระบบเพิ่มที่ ตั้งค่า > หมวดวัสดุ', 'warning');
      const cur = it ? Object.assign({}, it) : { category_id: this.st.cat || b.categories[0].id, status: 'active', barcodes: [], name: opt.name || '', code: '', supplier_id: '', price: '', unit: '', pack_qty: '', pack_unit: '', rate: '', min_qty: '', note: '' };
      const cat0 = SP.idx.cat[cur.category_id] || b.categories[0];
      const hasExp = cur.has_expiry !== undefined ? !!cur.has_expiry : !!cat0.has_expiry;
      const bcs = (cur.barcodes || []).slice();
      if (opt.barcode && bcs.indexOf(opt.barcode) < 0) bcs.push(opt.barcode);
      const z = v => (v === 0 || v === '0' ? '' : v);
      let photo = null, photoDel = false;
      const body = `<form class="row g-3" onsubmit="return false">
        ${SP.ui.f('ประเภทวัสดุ', SP.ui.select('category_id', SP.opt.cats(), cur.category_id), { col: 'col-md-7', req: true })}
        ${SP.ui.f('รหัสวัสดุ', SP.ui.input('code', cur.code, 'placeholder="เว้นว่างให้ระบบตั้งให้" autocapitalize="characters"'), { col: 'col-md-5', hint: isNew ? 'ระบบตั้งรหัสตามประเภท เช่น MS-0001' : '' })}
        ${SP.ui.f('ชื่อวัสดุ', SP.ui.input('name', cur.name, 'placeholder="เช่น น้ำยาตรวจน้ำตาลในเลือด (Glucose)" maxlength="160"'), { req: true })}
        <div class="col-12" data-no-enter><label class="form-label">บาร์โค้ด</label>
          <div class="input-group"><span class="input-group-text"><i class="bi bi-upc"></i></span><input class="form-control" id="ifBc" placeholder="ยิงด้วยเครื่องอ่านบาร์โค้ด หรือพิมพ์แล้วกด Enter" autocomplete="off">
          <button class="btn btn-soft" type="button" id="ifBcCam"><i class="bi bi-camera"></i> กล้อง</button></div>
          <div class="bc-chips" id="ifBcs"></div>
          <div class="form-text">เพิ่มได้หลายค่า (เช่น บาร์โค้ดของแต่ละบริษัท) ถ้าวัสดุไม่มีบาร์โค้ด ให้พิมพ์สติกเกอร์จากรหัสวัสดุแทน</div></div>
        <div class="col-12" data-no-enter><label class="form-label">รูปวัสดุ</label>
          <div class="d-flex gap-3 align-items-center flex-wrap"><div class="photo-box" id="ifPhoto">${cur.image ? `<img src="${e(cur.image)}" alt="">` : '<i class="bi bi-image"></i>'}</div>
          <div class="d-flex flex-column gap-2"><div class="d-flex gap-2 flex-wrap">
            <label class="btn btn-soft mb-0"><i class="bi bi-camera"></i> ถ่ายรูป<input type="file" accept="image/*" capture="environment" hidden data-photo></label>
            <label class="btn btn-light mb-0"><i class="bi bi-folder2-open"></i> เลือกรูป<input type="file" accept="image/png,image/jpeg,image/webp" hidden data-photo></label>
            <button class="btn btn-light" type="button" id="ifPhotoDel"${cur.image ? '' : ' hidden'}><i class="bi bi-trash"></i> ลบรูป</button></div>
          <div class="form-text">ถ่ายให้เห็นฉลากและสีกล่องชัด ช่วยให้หยิบของถูก ระบบย่อรูปให้อัตโนมัติ (JPG PNG WebP ไม่เกิน 8 MB)</div></div></div></div>
        <div class="col-md-8"><label class="form-label">บริษัทผู้จำหน่าย</label><div class="d-flex gap-2"><div class="flex-grow-1 min-w-0">${SP.ui.select('supplier_id', SP.opt.suppliers(), cur.supplier_id, 'data-search data-placeholder="แตะเพื่อเลือกบริษัท หรือพิมพ์ค้นหา"', 'ไม่ระบุ')}</div>
          <button class="btn btn-light" type="button" id="ifSupAdd" title="เพิ่มบริษัทใหม่" aria-label="เพิ่มบริษัทใหม่"><i class="bi bi-plus-lg"></i></button></div></div>
        ${SP.ui.f('ราคา/หน่วย (บาท)', SP.ui.input('price', z(cur.price), 'type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00"'), { col: 'col-md-4' })}
        ${SP.ui.f('หน่วยนับ', SP.ui.input('unit', cur.unit, 'list="ifUnits" placeholder="เช่น กล่อง"') + `<datalist id="ifUnits">${UNITS.map(u => `<option value="${u}">`).join('')}</datalist>`, { col: 'col-6 col-md-4', req: true })}
        <div class="col-6 col-md-4"><label class="form-label">จำนวน/หน่วย (ขนาดบรรจุ)</label><div class="input-group">
          <input class="form-control" name="pack_qty" type="number" min="0" step="any" inputmode="decimal" value="${e(z(cur.pack_qty))}" placeholder="100">
          <input class="form-control" name="pack_unit" value="${e(cur.pack_unit)}" placeholder="ชิ้น" list="ifUnits"></div><div class="form-text" id="ifPackHint"></div></div>
        ${SP.ui.f('อัตราการใช้/เดือน', SP.ui.input('rate', z(cur.rate), 'type="number" min="0" step="any" inputmode="decimal" placeholder="0"'), { col: 'col-6 col-md-4', hint: 'นับเป็นหน่วยนับ ใช้คำนวณว่าพอใช้อีกกี่เดือน' })}
        ${SP.ui.f('จำนวนขั้นต่ำ', SP.ui.input('min_qty', z(cur.min_qty), 'type="number" min="0" step="any" inputmode="decimal" placeholder="0"'), { col: 'col-6 col-md-4', hint: 'คงเหลือเท่านี้หรือน้อยกว่าจะแจ้งเตือน' })}
        <div class="col-md-4"><label class="form-label">วันหมดอายุ</label>${SP.ui.switch('has_expiry', hasExp, 'บังคับกรอก Lot และวันหมดอายุ')}</div>
        ${SP.ui.f('สถานะ', SP.ui.select('status', [['active', 'ใช้งาน'], ['inactive', 'ไม่ใช้งาน (ซ่อนจากการรับ/จ่าย)']], cur.status), { col: 'col-md-6' })}
        ${SP.ui.f('หมายเหตุ', SP.ui.textarea('note', cur.note, 'maxlength="300"'), { col: 'col-md-6' })}
      </form>`;
      SP.ui.modal({
        title: isNew ? '<i class="bi bi-plus-circle"></i> เพิ่มวัสดุ' : '<i class="bi bi-pencil-square"></i> แก้ไขวัสดุ',
        size: 'lg', body: body,
        onOpen: root => {
          const chips = SP.$('#ifBcs', root);
          const drawChips = () => {
            chips.innerHTML = bcs.length ? bcs.map((x, i) => `<span class="bc-chip">${e(x)}<button type="button" data-rm="${i}" aria-label="ลบบาร์โค้ด"><i class="bi bi-x-lg"></i></button></span>`).join('') : '<span class="small-muted">ยังไม่มีบาร์โค้ด</span>';
          };
          const addBc = raw => {
            let code = String(raw || '').trim();
            if (!code) return false;
            const g = SP.gs1.parse(code);
            if (g && g.gtin) code = g.gtin;
            const n = SP.normBc(code);
            if (bcs.some(x => SP.normBc(x) === n)) { SP.toast('มีบาร์โค้ดนี้อยู่แล้ว', 'info'); return false; }
            const other = SP.idx.bc[n] || SP.idx.code[code.toUpperCase()];
            if (other && (!it || other.id !== it.id)) { SP.toast('บาร์โค้ด ' + code + ' ใช้กับ "' + other.name + '" แล้ว', 'warning'); return false; }
            bcs.push(code);
            drawChips();
            return true;
          };
          drawChips();
          const pbox = SP.$('#ifPhoto', root), pdel = SP.$('#ifPhotoDel', root);
          SP.$$('[data-photo]', root).forEach(inp => inp.addEventListener('change', async () => {
            const file = inp.files[0];
            inp.value = '';
            if (!file) return;
            try {
              photo = await SP.readImage(file, 800);
              photoDel = false;
              pbox.innerHTML = `<img src="${photo.dataUrl}" alt="">`;
              pdel.hidden = false;
            } catch (er) { SP.err(er); }
          }));
          pdel.addEventListener('click', () => { photo = null; photoDel = true; pbox.innerHTML = '<i class="bi bi-image"></i>'; pdel.hidden = true; });
          chips.addEventListener('click', ev => { const r = ev.target.closest('[data-rm]'); if (r) { bcs.splice(+r.dataset.rm, 1); drawChips(); } });
          SP.scan.bind(SP.$('#ifBc', root), code => addBc(code));
          SP.$('#ifBcCam', root).addEventListener('click', () => SP.cam.open({
            title: 'สแกนบาร์โค้ดของวัสดุ', continuous: false,
            onScan: code => (addBc(code) ? { ok: true, msg: 'เพิ่มบาร์โค้ด ' + code } : { ok: false, msg: 'ไม่ได้เพิ่ม ' + code }),
          }));
          const catSel = SP.$('[name="category_id"]', root);
          catSel.addEventListener('change', () => {
            const c = SP.idx.cat[catSel.value];
            if (isNew && c) SP.$('[name="has_expiry"]', root).checked = !!c.has_expiry;
          });
          const packHint = () => {
            const pq = SP.$('[name="pack_qty"]', root).value, pu = SP.$('[name="pack_unit"]', root).value, u = SP.$('[name="unit"]', root).value;
            SP.$('#ifPackHint', root).textContent = pq ? '1 ' + (u || 'หน่วย') + ' = ' + pq + ' ' + (pu || '') : 'เช่น 100 ชิ้น ต่อ 1 กล่อง';
          };
          root.addEventListener('input', ev => { if (['pack_qty', 'pack_unit', 'unit'].indexOf(ev.target.name) >= 0) packHint(); });
          packHint();
          SP.$('#ifSupAdd', root).addEventListener('click', async () => {
            const name = await SP.ui.prompt('เพิ่มบริษัทผู้จำหน่าย', { placeholder: 'ชื่อบริษัท', required: true, okText: 'เพิ่ม' });
            if (!name) return;
            try {
              const s = await SP.api('master.save', { kind: 'supplier', rec: { name: name } });
              SP.upsert('suppliers', s);
              SP.ui.setSelect(SP.$('[name="supplier_id"]', root), SP.opt.suppliers(), s.id, 'ไม่ระบุ');
              SP.toast('เพิ่มบริษัท ' + s.name + ' แล้ว');
            } catch (er) { SP.err(er); }
          });
          if (isNew && window.innerWidth >= 992) SP.$('[name="name"]', root).focus();
        },
        onSave: async root => {
          const f = SP.ui.form(root);
          if (!f.name.trim()) { SP.toast('กรุณากรอกชื่อวัสดุ', 'warning'); SP.$('[name="name"]', root).focus(); return false; }
          if (!f.unit.trim()) { SP.toast('กรุณากรอกหน่วยนับ', 'warning'); SP.$('[name="unit"]', root).focus(); return false; }
          const pending = SP.$('#ifBc', root).value.trim();
          if (pending) bcs.push(pending);
          f.barcodes = bcs;
          if (it) f.id = it.id;
          f.image = photoDel ? '' : (cur.image || '');
          if (photo) {
            const up = await SP.api('file.upload', { b64: photo.b64, mime: photo.mime, name: 'item-' + Date.now() + (photo.mime === 'image/png' ? '.png' : '.jpg'), purpose: 'item ' + f.name });
            f.image = up.url.replace(/sz=w\d+/, 'sz=w800');
            photo = null;
          }
          const saved = await SP.api('item.save', f);
          SP.upsert('items', saved);
          SP.toast((isNew ? 'เพิ่ม' : 'บันทึก') + 'วัสดุ ' + saved.name + ' แล้ว');
          if (SP.state.page === 'items') this.draw();
          if (opt.onSaved) setTimeout(() => opt.onSaved(SP.idx.item[saved.id]), 60);
        },
      });
    },

    /** บัตรวัสดุ: คงเหลือ มูลค่า อัตราการใช้ ล็อต และความเคลื่อนไหวล่าสุด */
    async view(id) {
      const it = SP.idx.item[id];
      if (!it) return SP.toast('ไม่พบวัสดุ', 'warning');
      await SP.ui.modal({ title: `<i class="bi bi-capsule"></i> ${e(it.name)}`, size: 'xl', body: SP.ui.loading(5) });
      const seq = SP.ui._seq;
      let d;
      try { d = await SP.api('item.get', { id: id }); } catch (er) { SP.ui.close(); SP.err(er); return; }
      if (seq !== SP.ui._seq) return;
      const x = SP.idx.item[id] || it;
      const sup = SP.idx.sup[x.supplier_id], cat = SP.catOf(x);
      const rate = x.rate || d.avg;
      const months = rate > 0 ? SP.r2(x._bal / rate) : null;
      const mini = (icon, tint, val, lbl) => `<div class="col-6 col-lg-3"><div class="stat"><div class="stat-ico ${tint}"><i class="bi ${icon}"></i></div><div class="min-w-0"><div class="num" style="font-size:1.2rem">${val}</div><div class="lbl">${lbl}</div></div></div></div>`;
      const lots = d.lots.map(l => `<tr><td><span class="fw-600">${e(l.lot_no)}</span><div class="small-muted">รับ ${e(SP.fmt.dateShort(l.received_at))} · ${e(l.first_doc || '')}</div></td><td>${l.exp ? SP.expPill(l.exp) : '<span class="small-muted">-</span>'}</td>
        <td style="min-width:140px">${SP.lifeBar(l.exp)}</td><td class="num"><b>${SP.fmt.num(l.balance)}</b> ${e(x.unit)}</td><td class="num">${SP.fmt.money(l.price)}</td><td class="num">${SP.fmt.money(l.balance * l.price)}</td></tr>`).join('');
      const mv = d.recent.map(m => `<tr class="tr-click" data-doc="${m.doc_id}"><td>${e(SP.fmt.dateShort(m.date))}</td><td>${SP.docs.badge(m.type)}</td><td><span class="code-chip">${e(m.doc_no)}</span></td><td>${e(m.lot_no || '-')}</td>
        <td class="num fw-600 ${m.qty < 0 ? 'text-danger' : 'text-success'}">${m.qty > 0 ? '+' : ''}${SP.fmt.num(m.qty)}</td><td class="small">${e(m.party || '')}</td></tr>`).join('');
      SP.ui.setTitle(`<i class="bi bi-capsule"></i> ${e(x.name)}`);
      SP.$('#spModalBody').innerHTML = `
        ${x.image ? `<a href="${e(x.image)}" target="_blank" rel="noopener" class="d-inline-block mb-3" title="เปิดรูปขนาดใหญ่">${SP.thumb(x, 'xl')}</a>` : ''}
        <div class="d-flex flex-wrap gap-2 align-items-center mb-3"><span class="b-soft" style="background:${e(cat.color)}1a;color:${e(cat.color)}"><span class="cat-dot" style="background:${e(cat.color)}"></span>${e(cat.name)}</span>
          <span class="code-chip">${e(x.code)}</span>${x.status === 'inactive' ? '<span class="b-soft b-mute">ไม่ใช้งาน</span>' : ''}${x._low ? '<span class="b-soft b-warning">ต่ำกว่าขั้นต่ำ</span>' : ''}</div>
        <div class="row g-2 mb-3">
          ${mini('bi-box-seam', 'tint-primary', SP.fmt.num(x._bal) + ' ' + e(x.unit), x.pack_qty > 0 ? 'คงเหลือ (' + SP.fmt.num(x._bal * x.pack_qty) + ' ' + e(x.pack_unit) + ')' : 'คงเหลือ')}
          ${mini('bi-cash-stack', 'tint-blue', SP.fmt.money(x._val), 'มูลค่ารวม (บาท)')}
          ${mini('bi-graph-down', 'tint-purple', (x.rate ? SP.fmt.num(x.rate) : '-') + ' / ' + SP.fmt.num(d.avg), 'อัตราใช้/เดือน ตั้งไว้ / ใช้จริงเฉลี่ย 90 วัน')}
          ${mini('bi-calendar-check', months !== null && months < 1 ? 'tint-danger' : 'tint-success', months === null ? '-' : SP.fmt.num(months) + ' เดือน', 'พอใช้อีกประมาณ')}
        </div>
        <div class="info-grid mb-3">
          <div><div class="k">บริษัทผู้จำหน่าย</div><div class="v">${e(sup ? sup.name : '-')}</div></div>
          <div><div class="k">ราคา/หน่วย</div><div class="v">${SP.fmt.money(x.price)} บาท</div></div>
          <div><div class="k">จำนวน/หน่วย</div><div class="v">${e(SP.packText(x))}</div></div>
          <div><div class="k">จำนวนขั้นต่ำ</div><div class="v">${SP.fmt.num(x.min_qty)} ${e(x.unit)}</div></div>
          <div><div class="k">บาร์โค้ด</div><div class="v">${(x.barcodes || []).length ? x.barcodes.map(v => `<span class="code-chip">${e(v)}</span>`).join(' ') : '-'}</div></div>
          <div><div class="k">วันหมดอายุ</div><div class="v">${x.has_expiry ? 'ต้องกรอก Lot/วันหมดอายุ' : 'ไม่บังคับ'}</div></div>
          ${x.note ? `<div><div class="k">หมายเหตุ</div><div class="v">${e(x.note)}</div></div>` : ''}
        </div>
        <h6 class="fw-bold mt-2"><i class="bi bi-layers text-primary"></i> ล็อตที่มีคงเหลือ (เรียงตามวันหมดอายุ)</h6>
        ${d.lots.length ? `<div class="table-wrap mb-3"><table class="table"><thead><tr><th>Lot No.</th><th>วันหมดอายุ</th><th>แถบอายุ</th><th class="num">คงเหลือ</th><th class="num">ราคา/หน่วย</th><th class="num">มูลค่า</th></tr></thead><tbody>${lots}</tbody></table></div>` : '<div class="small-muted mb-3">ไม่มีล็อตที่มีคงเหลือ</div>'}
        <h6 class="fw-bold"><i class="bi bi-clock-history text-primary"></i> ความเคลื่อนไหวล่าสุด</h6>
        ${d.recent.length ? `<div class="table-wrap"><table class="table table-hover"><thead><tr><th>วันที่</th><th>ประเภท</th><th>เลขที่</th><th>Lot</th><th class="num">จำนวน</th><th>ผู้เกี่ยวข้อง</th></tr></thead><tbody>${mv}</tbody></table></div>` : '<div class="small-muted">ยังไม่มีความเคลื่อนไหว</div>'}`;
      const canW = SP.canWrite();
      SP.ui.setFoot(`${SP.isAdmin() ? '<button class="btn btn-danger-soft me-auto" type="button" data-v="del"><i class="bi bi-trash"></i> ลบ</button>' : ''}
        <button class="btn btn-light" type="button" data-v="card"><i class="bi bi-journal-text"></i> บัญชีวัสดุ</button>
        <button class="btn btn-light" type="button" data-v="sticker"><i class="bi bi-upc"></i> สติกเกอร์</button>
        ${canW ? '<button class="btn btn-soft" type="button" data-v="rc"><i class="bi bi-box-arrow-in-down"></i> รับเข้า</button><button class="btn btn-soft" type="button" data-v="is"><i class="bi bi-box-arrow-up-right"></i> จ่ายออก</button><button class="btn btn-primary" type="button" data-v="edit"><i class="bi bi-pencil"></i> แก้ไข</button>' : '<button class="btn btn-primary" type="button" data-bs-dismiss="modal">ปิด</button>'}`);
      SP.$('#spModalBody').onclick = ev => { const r = ev.target.closest('[data-doc]'); if (r) SP.docs.view(r.dataset.doc); };
      SP.$('#spModalFoot').onclick = async ev => {
        const btn = ev.target.closest('[data-v]');
        if (!btn) return;
        const a = btn.dataset.v;
        if (a === 'edit') this.form(SP.idx.item[id]);
        else if (a === 'sticker') this.stickerDialog([{ it: x, copies: 1 }]);
        else if (a === 'card') { SP.ui.close(); SP.go('#/reports?k=card&item=' + id); }
        else if (a === 'rc') { SP.ui.close(); SP.go('#/receive?item=' + id); }
        else if (a === 'is') { SP.ui.close(); SP.go('#/issue?item=' + id); }
        else if (a === 'del') {
          const ok = await SP.ui.confirm('ลบวัสดุ "' + x.name + '" ออกจากระบบ ลบได้เฉพาะวัสดุที่ไม่มีคงเหลือ ประวัติเอกสารเดิมยังอยู่ครบ', { title: 'ลบวัสดุ', tone: 'danger', okText: 'ลบวัสดุ', icon: 'bi-trash' });
          if (!ok) return;
          try {
            await SP.api('item.delete', { id: id });
            SP.removeRec('items', id);
            SP.ui.close();
            SP.toast('ลบวัสดุแล้ว');
            if (SP.state.page === 'items') this.draw();
          } catch (er) { SP.err(er); }
        }
      };
    },

    stickersFromSel() {
      const ids = Object.keys(this.st.sel);
      const list = (ids.length ? ids.map(i => SP.idx.item[i]).filter(Boolean) : this.list()).map(it => ({ it: it, copies: 1 }));
      if (!list.length) return SP.toast('ไม่มีวัสดุให้พิมพ์', 'warning');
      this.stickerDialog(list, !ids.length);
    },
    stickerDialog(list, fromFilter) {
      const rows = list.map((x, i) => `<tr><td><div class="fw-600">${e(x.it.name)}</div><div class="small-muted">${e(x.it.code)}</div></td><td style="width:120px"><input class="form-control form-control-sm" type="number" min="0" max="200" value="${x.copies}" data-cp="${i}" aria-label="จำนวนดวง"></td></tr>`).join('');
      SP.ui.modal({
        title: '<i class="bi bi-upc"></i> พิมพ์สติกเกอร์บาร์โค้ด', size: 'lg',
        body: `<div class="alert alert-info"><i class="bi bi-info-circle"></i><div>สติกเกอร์ใช้ <b>รหัสวัสดุ</b> เป็นบาร์โค้ด (Code128) สแกนรับเข้าและจ่ายออกได้ทันที กระดาษ A4 แถวละ 4 ดวง${fromFilter ? '<br>ยังไม่ได้ติ๊กเลือก จึงแสดงทุกรายการตามตัวกรองปัจจุบัน' : ''}</div></div>
          <div class="d-flex gap-2 mb-2"><button class="btn btn-sm btn-light" type="button" data-all="1">ทุกรายการ 1 ดวง</button><button class="btn btn-sm btn-light" type="button" data-all="0">ล้างเป็น 0</button></div>
          <div class="table-wrap" style="max-height:50vh"><table class="table"><thead><tr><th>วัสดุ</th><th>จำนวนดวง</th></tr></thead><tbody>${rows}</tbody></table></div>`,
        saveText: '<i class="bi bi-printer"></i> พิมพ์',
        onOpen: root => root.addEventListener('click', ev => { const b = ev.target.closest('[data-all]'); if (b) SP.$$('[data-cp]', root).forEach(i => { i.value = b.dataset.all; }); }),
        onSave: root => {
          SP.$$('[data-cp]', root).forEach(inp => { list[+inp.dataset.cp].copies = Math.max(0, Math.min(200, Math.round(+inp.value || 0))); });
          const pick = list.filter(x => x.copies > 0);
          if (!pick.length) { SP.toast('ระบุจำนวนดวงอย่างน้อย 1 รายการ', 'warning'); return false; }
          setTimeout(() => SP.print.stickers(pick), 350);
        },
      });
    },

    scanSearch() {
      let unknown = null;
      SP.cam.open({
        title: 'สแกนเพื่อค้นหาวัสดุ', continuous: false,
        onScan: code => {
          const r = SP.scan.resolve(code);
          if (r.item) { const id = r.item.id; setTimeout(() => this.view(id), 250); return { ok: true, msg: r.item.name, close: true }; }
          unknown = code;
          return { ok: false, msg: 'ไม่พบ ' + code, close: true };
        },
        onClose: () => { if (unknown) { const c = unknown; unknown = null; SP.scan.unknown(c, it => this.view(it.id)); } },
      });
    },

    csv() {
      const rows = this.list();
      const head = ['ประเภท', 'รหัสวัสดุ', 'ชื่อวัสดุ', 'บริษัทผู้จำหน่าย', 'ราคา/หน่วย', 'หน่วยนับ', 'จำนวน/หน่วย', 'หน่วยย่อย', 'อัตราการใช้/เดือน', 'จำนวนขั้นต่ำ', 'คงเหลือ', 'มูลค่ารวม', 'บาร์โค้ด', 'วันหมดอายุใกล้สุด', 'สถานะ'];
      SP.csv('วัสดุ-' + SP.today(), [head].concat(rows.map(it => {
        const sup = SP.idx.sup[it.supplier_id];
        return [SP.catOf(it).name, it.code, it.name, sup ? sup.name : '', it.price, it.unit, it.pack_qty || '', it.pack_unit || '', it.rate || '', it.min_qty || '', it._bal, it._val, (it.barcodes || []).join(' '), it._near || '', it.status === 'active' ? 'ใช้งาน' : 'ไม่ใช้งาน'];
      })));
    },

    /** นำเข้าวัสดุจาก Excel: คัดลอกคอลัมน์ตามลำดับแล้ววาง */
    importDialog() {
      const cats = SP.state.boot.categories;
      let rows = [];
      SP.ui.modal({
        title: '<i class="bi bi-file-earmark-spreadsheet"></i> นำเข้าวัสดุจาก Excel', size: 'xl',
        body: `<ol class="guide-steps small mb-2">
            <li>เรียงคอลัมน์ใน Excel ตามนี้ (คอลัมน์ท้าย ๆ เว้นว่างได้): ${IMPORT_COLS.map(c => `<span class="code-chip">${c[1]}</span>`).join(' ')}</li>
            <li>ประเภทพิมพ์ชื่อหมวด หรือเลขลำดับ ${cats.map((c, i) => `<b>${i + 1}</b>=${e(c.name)}`).join(' ')}</li>
            <li>ลากคลุมข้อมูลใน Excel กด Ctrl+C แล้ววางในช่องด้านล่าง (มีแถวหัวตารางก็ได้ ระบบข้ามให้)</li></ol>
          <div class="d-flex gap-2 mb-2"><button class="btn btn-sm btn-light" type="button" id="imTpl"><i class="bi bi-download"></i> ดาวน์โหลดแม่แบบ CSV</button><span class="small-muted align-self-center">ชื่อซ้ำในประเภทเดียวกันจะถูกข้าม บริษัทที่ยังไม่มีจะถูกเพิ่มให้อัตโนมัติ</span></div>
          <div data-no-enter><textarea class="form-control" id="imText" rows="7" placeholder="วางข้อมูลจาก Excel ที่นี่" style="font-family:ui-monospace,Consolas,monospace;font-size:.82rem"></textarea></div>
          <div id="imPrev" class="mt-3"></div>`,
        saveText: '<i class="bi bi-upload"></i> นำเข้า',
        onOpen: root => {
          SP.$('#imTpl', root).addEventListener('click', () => SP.csv('แม่แบบนำเข้าวัสดุ', [IMPORT_COLS.map(c => c[1]),
            ['1', 'น้ำยาตรวจน้ำตาลในเลือด (Glucose)', 'บริษัท ตัวอย่าง จำกัด', '1850', 'กล่อง', '4', 'ขวด', '2', '2', '8850000000011', '', 'มี'],
            ['3', 'กระดาษ A4 80 แกรม', 'ร้านตัวอย่าง', '125', 'รีม', '500', 'แผ่น', '10', '5', '', '', 'ไม่มี']]));
          const prev = () => {
            const t = SP.parseTable(SP.$('#imText', root).value);
            if (t.length && /ประเภท|category/i.test(t[0][0] || '') && /ชื่อ|name/i.test(t[0][1] || '')) t.shift();
            rows = t.map(r => { const o = {}; IMPORT_COLS.forEach((c, i) => { o[c[0]] = r[i] === undefined ? '' : r[i]; }); return o; }).filter(o => o.name);
            if (!rows.length) { SP.$('#imPrev', root).innerHTML = ''; return; }
            const dupNames = {};
            SP.state.boot.items.forEach(it => { dupNames[it.name.trim().toLowerCase() + '|' + it.category_id] = 1; });
            const catOf = v => {
              const s = String(v || '').trim().toLowerCase();
              if (/^\d+$/.test(s)) return cats[+s - 1];
              return cats.find(c => c.name.toLowerCase() === s || String(c.prefix).toLowerCase() === s || c.name.toLowerCase().indexOf(s) >= 0 || (s && s.indexOf(c.name.toLowerCase()) >= 0));
            };
            let bad = 0, dup = 0;
            const tr = rows.slice(0, 200).map((o, i) => {
              const c = catOf(o.category);
              const isDup = c && dupNames[o.name.trim().toLowerCase() + '|' + c.id];
              if (!c) bad++; if (isDup) dup++;
              return `<tr class="${!c ? 'table-danger' : (isDup ? 'table-warning' : '')}"><td>${i + 1}</td><td>${c ? e(c.name) : '<span class="text-danger">ไม่รู้จัก "' + e(o.category) + '"</span>'}</td><td>${e(o.name)}${isDup ? ' <span class="b-soft b-warning">ซ้ำ ข้าม</span>' : ''}</td><td>${e(o.supplier)}</td><td class="num">${e(o.price)}</td><td>${e(o.unit)}</td><td class="num">${e(o.pack_qty)} ${e(o.pack_unit)}</td><td class="num">${e(o.rate)}</td><td class="num">${e(o.min_qty)}</td><td>${e(o.barcode)}</td></tr>`;
            }).join('');
            SP.$('#imPrev', root).innerHTML = `<div class="small mb-2">พบ <b>${rows.length}</b> รายการ${bad ? ` · <span class="text-danger">ประเภทไม่ถูกต้อง ${bad}</span>` : ''}${dup ? ` · <span class="text-warning">ซ้ำ ${dup}</span>` : ''}</div>
              <div class="table-wrap" style="max-height:38vh"><table class="table table-sm"><thead><tr><th>#</th><th>ประเภท</th><th>ชื่อวัสดุ</th><th>บริษัท</th><th class="num">ราคา</th><th>หน่วย</th><th class="num">จำนวน/หน่วย</th><th class="num">อัตราใช้</th><th class="num">ขั้นต่ำ</th><th>บาร์โค้ด</th></tr></thead><tbody>${tr}</tbody></table></div>`;
          };
          SP.$('#imText', root).addEventListener('input', SP.debounce(prev, 250));
        },
        onSave: async () => {
          if (!rows.length) { SP.toast('ยังไม่มีข้อมูลสำหรับนำเข้า', 'warning'); return false; }
          let added = 0, sups = 0, skipped = 0, errors = [];
          for (let i = 0; i < rows.length; i += 500) {
            const r = await SP.api('item.import', { rows: rows.slice(i, i + 500) });
            added += r.added; sups += r.suppliers; skipped += r.skipped; errors = errors.concat(r.errors);
          }
          await SP.refresh();
          if (SP.state.page === 'items') this.render(SP.$('#spPage'), {});
          SP.ui.alert('นำเข้าเสร็จแล้ว', `เพิ่มวัสดุ <b>${added}</b> รายการ · เพิ่มบริษัทใหม่ ${sups} · ข้ามรายการซ้ำ ${skipped}${errors.length ? '<div class="mt-2 small text-danger">' + errors.map(e).join('<br>') + '</div>' : ''}`, { icon: 'bi-check2-circle', tone: 'success' });
        },
      });
    },
  };
})();
