/**
 * LabSupply docs: ประวัติเอกสาร (แบ่งหน้าฝั่ง server), ดูเอกสาร, พิมพ์, ยกเลิก, หน้าต่างบันทึกสำเร็จ
 */
(function () {
  'use strict';
  const SP = window.SP;
  const e = s => SP.esc(s);

  SP.docs = {
    TYPE: { RC: ['รับเข้า', 'bi-box-arrow-in-down', 'b-teal'], IS: ['จ่ายออก', 'bi-box-arrow-up-right', 'b-blue'], AJ: ['ปรับปรุงยอด', 'bi-sliders', 'b-purple'] },
    badge(t) { const x = this.TYPE[t] || [t, 'bi-file-earmark', 'b-mute']; return `<span class="b-soft ${x[2]}"><i class="bi ${x[1]}"></i>${x[0]}</span>`; },
    status(s) { return s === 'void' ? '<span class="b-soft b-danger">ยกเลิกแล้ว</span>' : '<span class="b-soft b-success">ปกติ</span>'; },
    partyLabel(t) { return t === 'RC' ? 'บริษัท/แหล่งที่มา' : (t === 'IS' ? 'ผู้เบิก' : (t === 'AJ' ? 'เหตุผล' : 'ผู้เกี่ยวข้อง')); },

    /** รายการเอกสารพร้อมตัวกรอง */
    history(el, type) {
      const st = { type: type || '', from: SP.addDays(SP.today(), -90), to: SP.today(), q: '', status: '', page: 1, size: 20 };
      el.innerHTML = `<div class="card"><div class="card-body pb-2"><div class="toolbar">
          ${!type ? '<select class="form-select w-auto" data-k="type"><option value="">ทุกประเภท</option><option value="RC">รับเข้า</option><option value="IS">จ่ายออก</option><option value="AJ">ปรับปรุงยอด</option></select>' : ''}
          <input type="date" class="form-control w-auto" data-k="from" value="${st.from}" aria-label="ตั้งแต่วันที่"><span class="small-muted">ถึง</span>
          <input type="date" class="form-control w-auto" data-k="to" value="${st.to}" aria-label="ถึงวันที่">
          <select class="form-select w-auto" data-k="status"><option value="">ทุกสถานะ</option><option value="active">ปกติ</option><option value="void">ยกเลิกแล้ว</option></select>
          <div class="input-ico grow"><i class="bi bi-search"></i><input class="form-control" data-k="q" placeholder="ค้นหาเลขที่เอกสาร หรือ${this.partyLabel(type)}"></div>
        </div></div><div data-list>${SP.ui.loading(4)}</div></div>`;
      const box = SP.$('[data-list]', el);
      const load = async () => {
        box.innerHTML = SP.ui.loading(4);
        let r;
        try { r = await SP.api('doc.list', st); } catch (er) { box.innerHTML = SP.ui.empty('bi-wifi-off', 'โหลดรายการไม่สำเร็จ', e(er.message)); return; }
        if (!r.rows.length) { box.innerHTML = SP.ui.empty('bi-folder2-open', 'ไม่พบเอกสารในช่วงนี้', 'ลองขยายช่วงวันที่หรือเปลี่ยนคำค้นหา'); return; }
        const rows = r.rows.map(d => `<tr class="tr-click" data-id="${d.id}"><td><span class="code-chip">${e(d.doc_no)}</span></td><td>${e(SP.fmt.date(d.date))}</td>
          ${!type ? `<td>${this.badge(d.type)}</td>` : ''}<td class="min-w-0">${e(d.party || '-')}</td><td class="num">${d.nlines}</td><td class="num">${SP.fmt.money(d.total)}</td><td>${this.status(d.status)}</td></tr>`).join('');
        const cards = r.rows.map(d => `<div class="m-card" data-id="${d.id}"><div class="d-flex justify-content-between gap-2"><span class="code-chip">${e(d.doc_no)}</span>${this.status(d.status)}</div>
          <div class="fw-600 mt-1 ellipsis">${e(d.party || '-')}</div><div class="row2"><span>${e(SP.fmt.date(d.date))} · ${d.nlines} รายการ</span><b class="text-body">${SP.fmt.money(d.total)} บาท</b></div></div>`).join('');
        box.innerHTML = `<div class="table-wrap d-none d-md-block"><table class="table table-hover"><thead><tr><th>เลขที่</th><th>วันที่</th>${!type ? '<th>ประเภท</th>' : ''}<th>${this.partyLabel(type)}</th><th class="num">รายการ</th><th class="num">มูลค่า (บาท)</th><th>สถานะ</th></tr></thead><tbody>${rows}</tbody></table></div>
          <div class="m-list d-md-none">${cards}</div>
          <div class="card-footer d-flex justify-content-between align-items-center flex-wrap gap-2"><span class="small-muted">ทั้งหมด ${r.total} ฉบับ · มูลค่ารวม (ไม่รวมที่ยกเลิก) ${SP.fmt.money(r.sum)} บาท</span>${SP.ui.pager(r.total, r.page, r.size)}</div>`;
      };
      el.addEventListener('change', ev => { const k = ev.target.dataset.k; if (k && k !== 'q') { st[k] = ev.target.value; st.page = 1; load(); } });
      el.addEventListener('input', SP.debounce(ev => { if (ev.target.dataset.k === 'q') { st.q = ev.target.value.trim(); st.page = 1; load(); } }, 400));
      el.addEventListener('click', ev => {
        const p = ev.target.closest('[data-page]');
        if (p && !p.disabled) { st.page = +p.dataset.page; load(); return; }
        const row = ev.target.closest('[data-id]');
        if (row) this.view(row.dataset.id, { onChange: load });
      });
      load();
      return { reload: load };
    },

    async view(id, opt) {
      opt = opt || {};
      await SP.ui.modal({ title: '<i class="bi bi-file-earmark-text"></i> กำลังเปิดเอกสาร...', size: 'lg', body: SP.ui.loading(5) });
      const seq = SP.ui._seq;
      let d;
      try { d = await SP.api('doc.get', { id: id }); } catch (er) { SP.ui.close(); SP.err(er); return; }
      if (seq !== SP.ui._seq) return;
      this.render(d, opt);
    },
    render(d, opt) {
      const T = this.TYPE[d.type] || ['เอกสาร'];
      const info = [
        ['วันที่', SP.fmt.dateLong(d.date)],
        [this.partyLabel(d.type), d.party || '-'],
        d.type === 'RC' ? ['เลขที่ใบส่งของ/อ้างอิง', d.ref_no || '-'] : null,
        d.type === 'RC' ? ['ประเภทการรับ', d.source === 'opening' ? 'ยอดยกมา (เริ่มใช้ระบบ)' : 'รับจากการจัดซื้อ'] : null,
        d.type === 'IS' ? ['หน่วยงาน/จุดบริการ', d.requester_section || '-'] : null,
        ['ผู้บันทึก', (d.created_by_name || d.created_by || '') + ' · ' + SP.fmt.dateTime(d.created_at)],
        d.note ? ['หมายเหตุ', d.note] : null,
        d.status === 'void' ? ['ยกเลิกโดย', (d.void_by || '') + ' · ' + SP.fmt.dateTime(d.void_at) + ' · ' + (d.void_reason || '')] : null,
      ].filter(Boolean);
      const lines = (d.lines || []).map((l, i) => `<tr><td class="text-muted">${i + 1}</td><td><div class="fw-600">${e(l.name)}</div><div class="small-muted">${e(l.code || '')}${l.note ? ' · ' + e(l.note) : ''}</div></td>
        <td>${e(l.lot_no || '-')}</td><td>${l.exp ? SP.expPill(l.exp) : '<span class="small-muted">-</span>'}</td><td class="num">${SP.fmt.num(l.qty)} ${e(l.unit || '')}</td><td class="num">${SP.fmt.money(l.price)}</td><td class="num">${SP.fmt.money(l.value)}</td></tr>`).join('');
      SP.ui.setTitle(`<i class="bi ${T[1] || 'bi-file-earmark'}"></i> ${e(T[0])} <span class="code-chip ms-1">${e(d.doc_no)}</span>`);
      SP.$('#spModalBody').innerHTML = `<div class="d-flex gap-2 mb-3 flex-wrap">${this.badge(d.type)}${this.status(d.status)}</div>
        <div class="info-grid mb-3">${info.map(x => `<div><div class="k">${e(x[0])}</div><div class="v">${e(x[1])}</div></div>`).join('')}</div>
        <div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>วัสดุ</th><th>Lot No.</th><th>วันหมดอายุ</th><th class="num">จำนวน</th><th class="num">ราคา/หน่วย</th><th class="num">มูลค่า</th></tr></thead><tbody>${lines}</tbody>
        <tfoot><tr><td colspan="6" class="num">รวม ${(d.lines || []).length} รายการ</td><td class="num">${SP.fmt.money(d.total)}</td></tr></tfoot></table></div>`;
      const canCancel = SP.isAdmin() && d.status === 'active';
      SP.ui.setFoot(`${canCancel ? '<button type="button" class="btn btn-danger-soft me-auto" data-d="cancel"><i class="bi bi-x-octagon"></i> ยกเลิกเอกสาร</button>' : ''}
        ${d.type === 'IS' ? '<button type="button" class="btn btn-light" data-d="slip"><i class="bi bi-receipt"></i> สลิป 80 มม.</button>' : ''}
        ${d.type === 'RC' && d.status === 'active' ? '<button type="button" class="btn btn-light" data-d="sticker"><i class="bi bi-upc"></i> สติกเกอร์</button>' : ''}
        <button type="button" class="btn btn-soft" data-d="print"><i class="bi bi-printer"></i> พิมพ์ A4</button>
        <button type="button" class="btn btn-light" data-bs-dismiss="modal">ปิด</button>`);
      SP.$('#spModalFoot').onclick = async ev => {
        const b = ev.target.closest('[data-d]');
        if (!b) return;
        const a = b.dataset.d;
        if (a === 'print') SP.print.doc(d);
        else if (a === 'slip') SP.print.slip(d);
        else if (a === 'sticker') this.stickersOf(d);
        else if (a === 'cancel') {
          try {
            const nd = await this.cancel(d);
            if (nd) { this.render(nd, opt); if (opt.onChange) opt.onChange(); }
          } catch (er) { SP.err(er); }
        }
      };
    },
    stickersOf(d) {
      const map = {};
      (d.lines || []).forEach(l => { const it = SP.idx.item[l.item_id]; if (it) map[it.id] = { it: it, copies: (map[it.id] ? map[it.id].copies : 0) + Math.max(1, Math.round(l.qty)) }; });
      SP.pages.items.stickerDialog(Object.values(map));
    },
    async cancel(d) {
      const reason = await SP.ui.prompt('ยกเลิกเอกสาร ' + d.doc_no, {
        tone: 'danger', icon: 'bi-x-octagon', okText: 'ยืนยันยกเลิก', required: true, placeholder: 'ระบุเหตุผลการยกเลิก',
        html: d.type === 'RC' ? 'ยอดวัสดุของใบนี้จะถูกหักออกจากคลัง ยกเลิกได้เมื่อล็อตในใบนี้ยังไม่ถูกจ่ายออก' : (d.type === 'IS' ? 'ยอดวัสดุที่จ่ายไปจะถูกคืนกลับล็อตเดิม' : 'ยอดที่ปรับไว้จะถูกย้อนกลับ'),
      });
      if (!reason) return null;
      const r = await SP.api('doc.cancel', { id: d.id, reason: reason });
      SP.applyLots(r.lots);
      SP.toast('ยกเลิกเอกสาร ' + d.doc_no + ' แล้ว');
      return r.doc;
    },

    /** หน้าต่างหลังบันทึกสำเร็จ พร้อมปุ่มพิมพ์ */
    done(d) {
      const T = this.TYPE[d.type] || ['เอกสาร'];
      SP.ui.modal({
        title: '<i class="bi bi-check2-circle text-success"></i> บันทึก' + T[0] + 'เรียบร้อย',
        body: `<div class="text-center py-2"><div class="empty-ico" style="background:#ecfdf3;color:#16a34a"><i class="bi bi-check2-circle"></i></div>
          <div class="code-chip fs-6">${e(d.doc_no)}</div><div class="fw-600 mt-2">${e(d.party || '')}</div>
          <div class="small-muted mt-1">${(d.lines || []).length} รายการ · มูลค่า ${SP.fmt.money(d.total)} บาท · ${e(SP.fmt.date(d.date))}</div></div>`,
        foot: `${d.type === 'IS' ? '<button type="button" class="btn btn-light" data-d="slip"><i class="bi bi-receipt"></i> สลิป 80 มม.</button>' : ''}
          ${d.type === 'RC' ? '<button type="button" class="btn btn-light" data-d="sticker"><i class="bi bi-upc"></i> สติกเกอร์</button>' : ''}
          <button type="button" class="btn btn-soft" data-d="print"><i class="bi bi-printer"></i> พิมพ์ A4</button>
          <button type="button" class="btn btn-primary" data-bs-dismiss="modal">เสร็จสิ้น</button>`,
        onOpen: () => {
          SP.$('#spModalFoot').onclick = ev => {
            const b = ev.target.closest('[data-d]');
            if (!b) return;
            if (b.dataset.d === 'print') SP.print.doc(d);
            else if (b.dataset.d === 'slip') SP.print.slip(d);
            else if (b.dataset.d === 'sticker') this.stickersOf(d);
          };
        },
      });
    },
  };
})();
