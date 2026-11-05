/**
 * รายงาน 7 แบบ: สรุปรับเข้า, สรุปจ่ายออก, สรุปตามผู้เบิก, คงเหลือและมูลค่า, บัญชีวัสดุรายตัว, วันหมดอายุ, ปรับปรุงยอด
 * ทุกรายงานพิมพ์ A4 (หัวรายงานหน่วยงาน) และส่งออก CSV
 */
(function () {
  'use strict';
  const SP = window.SP;
  const e = s => SP.esc(s);
  const M = n => SP.fmt.money(n);
  const Q = n => SP.fmt.num(n);
  const KINDS = [
    ['receive', 'สรุปรับเข้า', 'bi-box-arrow-in-down', 1],
    ['issue', 'สรุปจ่ายออก', 'bi-box-arrow-up-right', 1],
    ['requester', 'สรุปตามผู้เบิก', 'bi-people', 1],
    ['balance', 'คงเหลือและมูลค่า', 'bi-cash-stack', 0],
    ['card', 'บัญชีวัสดุรายตัว', 'bi-journal-text', 1],
    ['expiry', 'วันหมดอายุ', 'bi-hourglass-split', 0],
    ['adjust', 'ปรับปรุงยอด/ตัดจำหน่าย', 'bi-sliders', 1],
  ];
  const kindDef = k => KINDS.find(x => x[0] === k) || KINDS[0];

  SP.pages.reports = {
    st: { kind: 'receive', from: '', to: '', cat: '', item: '', requester: '' },
    data: null,

    render(el, param) {
      const st = this.st, b = SP.state.boot;
      if (param.k && KINDS.some(x => x[0] === param.k)) st.kind = param.k;
      if (param.item) st.item = param.item;
      if (!st.from) this.range('month');
      el.innerHTML = `<div class="page-head"><div><h1>รายงาน</h1><div class="sub">สรุปรับเข้า จ่ายออก คงเหลือ มูลค่า และวันหมดอายุ พิมพ์หรือส่งออกเป็น CSV ได้ทุกรายงาน</div></div></div>
        <div class="pill-tabs mb-3" id="rpKinds">${KINDS.map(k => `<button type="button" class="chip${k[0] === st.kind ? ' active' : ''}" data-kind="${k[0]}"><i class="bi ${k[2]}"></i> ${k[1]}</button>`).join('')}</div>
        <div class="card mb-3"><div class="card-body"><div class="row g-2 align-items-end">
          <div class="col-6 col-md-3 col-xl-2" data-f="date"><label class="form-label" for="rpFrom">ตั้งแต่วันที่</label><input type="date" class="form-control" id="rpFrom" value="${st.from}"></div>
          <div class="col-6 col-md-3 col-xl-2" data-f="date"><label class="form-label" for="rpTo">ถึงวันที่</label><input type="date" class="form-control" id="rpTo" value="${st.to}"></div>
          <div class="col-12 col-md-6 col-xl-3" data-f="date"><label class="form-label">ช่วงเวลาด่วน</label><div class="d-flex gap-1 flex-wrap">
            <button class="btn btn-sm btn-light" type="button" data-range="month">เดือนนี้</button><button class="btn btn-sm btn-light" type="button" data-range="last">เดือนก่อน</button>
            <button class="btn btn-sm btn-light" type="button" data-range="fy">ปีงบประมาณนี้</button><button class="btn btn-sm btn-light" type="button" data-range="year">ปีนี้</button></div></div>
          <div class="col-md-4 col-xl-2" data-f="cat"><label class="form-label" for="rpCat">ประเภท</label><select class="form-select" id="rpCat"><option value="">ทุกประเภท</option>${b.categories.map(c => `<option value="${c.id}"${c.id === st.cat ? ' selected' : ''}>${e(c.name)}</option>`).join('')}</select></div>
          <div class="col-md-6 col-xl-3" data-f="item"><label class="form-label">วัสดุ</label>${SP.ui.select('rpItem', SP.state.boot.items.filter(it => it.status !== 'deleted').sort(SP.byName).map(it => [it.id, it.name, it.code, (it.barcodes || []).join(' ')]), st.item, 'id="rpItem" data-search data-placeholder="แตะเพื่อเลือกวัสดุ"', '')}</div>
          <div class="col-md-6 col-xl-3" data-f="req"><label class="form-label">ผู้เบิก</label>${SP.ui.select('rpReq', SP.state.boot.requesters.slice().sort(SP.byName).map(r => [r.name, r.name, r.section || '']), st.requester, 'id="rpReq" data-search data-placeholder="ทุกคน"', 'ทุกคน')}</div>
          <div class="col-auto"><button class="btn btn-primary" type="button" data-a="run"><i class="bi bi-search"></i> แสดงรายงาน</button></div>
        </div></div></div>
        <div class="card"><div class="card-header"><i class="bi bi-file-earmark-bar-graph"></i> <span id="rpTitle"></span>
          <div class="ms-auto d-flex gap-1"><button class="btn btn-sm btn-soft" type="button" data-a="print"><i class="bi bi-printer"></i> พิมพ์</button><button class="btn btn-sm btn-light" type="button" data-a="csv"><i class="bi bi-download"></i> CSV</button></div></div>
          <div id="rpBody">${SP.ui.loading(4)}</div></div>`;
      SP.ui.enhance(el);
      el.onclick = ev => this.click(ev);
      el.onchange = ev => {
        const id = ev.target.id;
        if (id === 'rpFrom') st.from = ev.target.value;
        else if (id === 'rpTo') st.to = ev.target.value;
        else if (id === 'rpCat') { st.cat = ev.target.value; this.run(); }
        else if (id === 'rpItem') { st.item = ev.target.value; if (st.kind === 'card') this.run(); }
        else if (id === 'rpReq') { st.requester = ev.target.value; if (st.kind === 'requester') this.run(); }
      };
      if (param.k || param.item) history.replaceState(null, '', '#/reports');
      this.filters();
      this.run();
    },

    range(which) {
      const t = SP.today(), y = +t.slice(0, 4), m = +t.slice(5, 7);
      const pad = n => String(n).padStart(2, '0');
      const st = this.st;
      if (which === 'month') { st.from = t.slice(0, 8) + '01'; st.to = t; }
      else if (which === 'last') {
        const ly = m === 1 ? y - 1 : y, lm = m === 1 ? 12 : m - 1;
        st.from = ly + '-' + pad(lm) + '-01';
        st.to = ly + '-' + pad(lm) + '-' + pad(new Date(Date.UTC(ly, lm, 0)).getUTCDate());
      } else if (which === 'fy') {
        const fs = SP.state.boot.config.fiscalStartMonth || 10;
        const fy = m >= fs && fs > 1 ? y : (fs > 1 ? y - 1 : y);
        st.from = fy + '-' + pad(fs) + '-01'; st.to = t;
      } else { st.from = y + '-01-01'; st.to = t; }
    },
    filters() {
      const k = this.st.kind;
      const show = (f, on) => SP.$$(`[data-f="${f}"]`).forEach(x => x.classList.toggle('d-none', !on));
      show('date', !!kindDef(k)[3]);
      show('cat', k !== 'card');
      show('item', k === 'card');
      show('req', k === 'requester');
    },

    click(ev) {
      const st = this.st;
      const kd = ev.target.closest('[data-kind]');
      if (kd) {
        st.kind = kd.dataset.kind;
        SP.$$('#rpKinds .chip').forEach(c => c.classList.toggle('active', c === kd));
        this.filters();
        this.run();
        return;
      }
      const rg = ev.target.closest('[data-range]');
      if (rg) { this.range(rg.dataset.range); SP.$('#rpFrom').value = st.from; SP.$('#rpTo').value = st.to; this.run(); return; }
      const a = ev.target.closest('[data-a]');
      if (a) {
        if (a.dataset.a === 'run') { st.from = SP.$('#rpFrom').value; st.to = SP.$('#rpTo').value; this.run(); }
        else if (a.dataset.a === 'print') this.print();
        else if (a.dataset.a === 'csv') this.csv();
        return;
      }
      const d = ev.target.closest('[data-doc]');
      if (d) { SP.docs.view(d.dataset.doc); return; }
      const it = ev.target.closest('[data-item]');
      if (it) SP.pages.items.view(it.dataset.item);
    },

    async run() {
      const st = this.st, box = SP.$('#rpBody');
      if (!box) return;
      const def = kindDef(st.kind);
      SP.$('#rpTitle').textContent = def[1] + (def[3] ? ' ' + SP.fmt.date(st.from) + ' ถึง ' + SP.fmt.date(st.to) : ' ณ วันที่ ' + SP.fmt.date(SP.today()));
      if (st.kind === 'card' && !st.item) { this.data = null; box.innerHTML = SP.ui.empty('bi-journal-text', 'เลือกวัสดุที่ต้องการดูบัญชี', 'บัญชีวัสดุแสดงยอดยกมา รับ จ่าย และคงเหลือทีละรายการ'); return; }
      if (def[3] && (!st.from || !st.to || st.from > st.to)) { box.innerHTML = SP.ui.empty('bi-calendar-x', 'ช่วงวันที่ไม่ถูกต้อง', 'วันที่เริ่มต้องไม่เกินวันที่สิ้นสุด'); return; }
      box.innerHTML = SP.ui.loading(5);
      const req = { kind: st.kind, from: st.from, to: st.to, category_id: st.kind === 'card' ? '' : st.cat, item_id: st.item, requester: st.requester };
      const my = this._run = (this._run || 0) + 1;
      try {
        const R = await SP.api('report.get', req);
        if (my !== this._run || SP.state.page !== 'reports') return;
        this.data = R;
        box.innerHTML = this.build(R, 'screen') || SP.ui.empty('bi-inbox', 'ไม่มีข้อมูลในช่วงนี้', 'ลองเปลี่ยนช่วงวันที่หรือประเภท');
      } catch (er) { if (my === this._run) box.innerHTML = SP.ui.empty('bi-exclamation-triangle', 'แสดงรายงานไม่สำเร็จ', e(er.message)); }
    },

    /** สร้างตารางรายงาน mode: screen | print */
    build(R, mode) {
      const P = mode === 'print';
      const n = P ? 'r' : 'num', g = P ? 'g' : 'group-row', c = P ? 'c' : 'text-center';
      const table = (head, body, foot) => {
        const h = `<thead><tr>${head.map(x => `<th${x[1] ? ` class="${n}"` : ''}>${x[0]}</th>`).join('')}</tr></thead><tbody>${body}</tbody>${foot ? `<tfoot>${foot}</tfoot>` : ''}`;
        return P ? `<table class="pr-table">${h}</table>` : `<div class="table-wrap"><table class="table table-hover">${h}</table></div>`;
      };
      const catName = id => (SP.idx.cat[id] || { name: 'ไม่ระบุประเภท' }).name;
      const grouped = (rows, cols, rowFn, sumKey) => {
        let h = '', cur = null, sub = 0, i = 0, tot = 0;
        const flush = () => { if (cur !== null && sumKey) h += `<tr class="${g}"><td colspan="${cols - 1}" class="${n}">รวม ${e(catName(cur))}</td><td class="${n}">${M(sub)}</td></tr>`; };
        rows.forEach(r => {
          if (r.category_id !== cur) { flush(); cur = r.category_id; sub = 0; h += `<tr class="${g}"><td colspan="${cols}">${e(catName(cur))}</td></tr>`; }
          i++; sub += r[sumKey] || 0; tot += r[sumKey] || 0;
          h += rowFn(r, i);
        });
        flush();
        return { h: h, tot: tot };
      };
      const k = R.kind;
      if (k === 'receive' || k === 'issue' || k === 'adjust') {
        if (!R.rows.length) return '';
        const lbl = k === 'receive' ? 'รับเข้า' : (k === 'issue' ? 'จ่ายออก' : 'ปรับยอดสุทธิ');
        const gr = grouped(R.rows, 6, (r, i) => `<tr${P ? '' : ` class="tr-click" data-item="${r.item_id}"`}><td class="${c}">${i}</td><td>${e(r.code)}</td><td>${e(r.name)}</td><td class="${n}">${Q(r.qty)}</td><td>${e(r.unit)}</td><td class="${n}">${M(r.value)}</td></tr>`, 'value');
        const party = k === 'receive' ? 'บริษัท/แหล่งที่มา' : (k === 'issue' ? 'ผู้เบิก' : 'เหตุผล');
        const docs = R.docs.map((d, i) => `<tr${P ? '' : ` class="tr-click" data-doc="${d.doc_id}"`}><td class="${c}">${i + 1}</td><td>${e(d.doc_no)}</td><td>${e(SP.fmt.date(d.date))}</td><td>${e(d.party || '-')}</td><td class="${n}">${d.lines}</td><td class="${n}">${M(d.value)}</td></tr>`).join('');
        return `${P ? '' : '<div class="p-3 pb-0"><div class="row g-2 mb-1">' + this.miniSum([['รายการวัสดุ', R.rows.length], ['เอกสาร', R.docs.length], ['มูลค่า' + lbl + ' (บาท)', M(gr.tot)]]) + '</div></div>'}
          ${P ? '' : '<div class="px-3 pt-3 fw-bold">สรุปรายวัสดุ</div>'}
          ${table([['ลำดับ'], ['รหัส'], ['วัสดุ'], ['จำนวน' + lbl, 1], ['หน่วย'], ['มูลค่า (บาท)', 1]], gr.h, `<tr><td colspan="5" class="${n}">รวมทั้งหมด</td><td class="${n}">${M(gr.tot)}</td></tr>`)}
          <div class="${P ? '' : 'px-3 pt-3 '}fw-bold" style="${P ? 'margin-top:12px' : ''}">รายการเอกสาร</div>
          ${table([['ลำดับ'], ['เลขที่'], ['วันที่'], [party], ['รายการ', 1], ['มูลค่า (บาท)', 1]], docs, '')}`;
      }
      if (k === 'requester') {
        if (!R.rows.length) return '';
        const tot = R.rows.reduce((s, r) => s + r.value, 0);
        const body = R.rows.map((r, i) => `<tr><td class="${c}">${i + 1}</td><td><b>${e(r.party)}</b><div class="small${P ? '' : '-muted'}">${r.items.slice(0, P ? 50 : 8).map(x => e(x.name) + ' ' + Q(x.qty) + ' ' + e(x.unit)).join(', ')}${!P && r.items.length > 8 ? ' และอีก ' + (r.items.length - 8) + ' รายการ' : ''}</div></td>
          <td class="${n}">${r.docs}</td><td class="${n}">${r.lines}</td><td class="${n}">${M(r.value)}</td></tr>`).join('');
        return `${P ? '' : '<div class="p-3 pb-0"><div class="row g-2 mb-1">' + this.miniSum([['ผู้เบิก', R.rows.length], ['ใบเบิก', R.rows.reduce((s, r) => s + r.docs, 0)], ['มูลค่ารวม (บาท)', M(tot)]]) + '</div></div>'}
          ${table([['ลำดับ'], ['ผู้เบิก / วัสดุที่เบิก'], ['ใบเบิก', 1], ['รายการ', 1], ['มูลค่า (บาท)', 1]], body, `<tr><td colspan="4" class="${n}">รวมทั้งหมด</td><td class="${n}">${M(tot)}</td></tr>`)}`;
      }
      if (k === 'balance') {
        if (!R.rows.length) return '';
        const gr = grouped(R.rows, 10, (r, i) => `<tr class="${!P && r.low ? 'row-low ' : ''}${P ? '' : 'tr-click'}"${P ? '' : ` data-item="${r.item_id}"`}><td class="${c}">${i}</td><td>${e(r.name)}<div class="small${P ? '' : '-muted'}">${e(r.code)}${r.low ? ' · ต่ำกว่าขั้นต่ำ' : ''}</div></td>
          <td class="${n}">${Q(r.balance)} ${e(r.unit)}</td><td class="${n}">${r.pack_qty > 0 ? Q(r.pack_qty) + ' ' + e(r.pack_unit) : '-'}</td><td class="${n}">${M(r.price)}</td><td class="${n}">${r.rate ? Q(r.rate) : '-'}</td><td class="${n}">${Q(r.avg90)}</td>
          <td class="${n}">${r.months === null ? '-' : Q(r.months)}</td><td>${r.near_exp ? e(SP.fmt.dateShort(r.near_exp)) : '-'}</td><td class="${n}">${M(r.value)}</td></tr>`, 'value');
        return `${P ? '' : '<div class="p-3 pb-0"><div class="row g-2 mb-1">' + this.miniSum([['รายการวัสดุ', R.rows.length], ['ต่ำกว่าขั้นต่ำ', R.rows.filter(r => r.low).length], ['มูลค่าคงคลัง (บาท)', M(gr.tot)]]) + '</div></div>'}
          ${table([['ลำดับ'], ['วัสดุ'], ['คงเหลือ', 1], ['จำนวน/หน่วย', 1], ['ราคา/หน่วย', 1], ['อัตราใช้/เดือน', 1], ['ใช้จริง/เดือน', 1], ['พอใช้ (เดือน)', 1], ['หมดอายุใกล้สุด'], ['มูลค่ารวม', 1]], gr.h, `<tr><td colspan="9" class="${n}">รวมทั้งหมด</td><td class="${n}">${M(gr.tot)}</td></tr>`)}
          <div class="small ${P ? '' : 'p-3 text-muted'}">ใช้จริง/เดือน = ปริมาณจ่ายออกเฉลี่ย 90 วันล่าสุด · พอใช้ = คงเหลือ ÷ อัตราการใช้ (ถ้าไม่ได้ตั้งอัตรา ใช้ค่าใช้จริง)</div>`;
      }
      if (k === 'card') {
        const it = R.item;
        const desc = m => (m.type === 'RC' ? 'รับจาก ' : (m.type === 'IS' ? 'จ่ายให้ ' : 'ปรับยอด: ')) + (m.party || '-');
        const body = `<tr><td>${e(SP.fmt.date(R.from))}</td><td></td><td>ยอดยกมา</td><td></td><td></td><td class="${n}"></td><td class="${n}"></td><td class="${n}"><b>${Q(R.open)}</b></td></tr>`
          + R.rows.map(m => `<tr${P ? '' : ` class="tr-click" data-doc="${m.doc_id}"`}><td>${e(SP.fmt.date(m.date))}</td><td>${e(m.doc_no)}</td><td>${e(desc(m))}</td><td>${e(m.lot_no || '-')}</td><td>${m.exp ? e(SP.fmt.dateShort(m.exp)) : '-'}</td>
            <td class="${n}">${m.qin ? Q(m.qin) : ''}</td><td class="${n}">${m.qout ? Q(m.qout) : ''}</td><td class="${n}">${Q(m.balance)}</td></tr>`).join('');
        return `<div class="${P ? 'pr-info' : 'p-3 info-grid'}">
            <div><${P ? 'b' : 'div class="k"'}>วัสดุ</${P ? 'b' : 'div'}> ${P ? '' : '<div class="v">'}${e(it.name)} (${e(it.code)})${P ? '' : '</div>'}</div>
            <div><${P ? 'b' : 'div class="k"'}>หน่วยนับ</${P ? 'b' : 'div'}> ${P ? '' : '<div class="v">'}${e(it.unit)}${it.pack_qty > 0 ? ' (' + Q(it.pack_qty) + ' ' + e(it.pack_unit) + ')' : ''}${P ? '' : '</div>'}</div>
            <div><${P ? 'b' : 'div class="k"'}>ยอดยกมา / รับ / จ่าย / คงเหลือ</${P ? 'b' : 'div'}> ${P ? '' : '<div class="v">'}${Q(R.open)} / ${Q(R.total_in)} / ${Q(R.total_out)} / ${Q(R.close)}${P ? '' : '</div>'}</div>
            <div><${P ? 'b' : 'div class="k"'}>มูลค่าคงเหลือ ณ วันสิ้นสุด</${P ? 'b' : 'div'}> ${P ? '' : '<div class="v">'}${M(R.close_value)} บาท${P ? '' : '</div>'}</div></div>
          ${table([['วันที่'], ['เลขที่'], ['รายการ'], ['Lot'], ['วันหมดอายุ'], ['รับ', 1], ['จ่าย', 1], ['คงเหลือ', 1]], body, `<tr><td colspan="5" class="${n}">รวม</td><td class="${n}">${Q(R.total_in)}</td><td class="${n}">${Q(R.total_out)}</td><td class="${n}">${Q(R.close)}</td></tr>`)}`;
      }
      if (k === 'expiry') {
        if (!R.rows.length) return '';
        const order = ['expired', 'd1', 'd2', 'd3', 'over'];
        let h = '', i = 0, tot = 0;
        order.forEach(bk => {
          const rows = R.rows.filter(r => r.bucket === bk);
          if (!rows.length) return;
          const sub = rows.reduce((s, r) => s + r.value, 0);
          tot += sub;
          h += `<tr class="${g}"><td colspan="7">${e(SP.bkLabel(bk))} (${rows.length} ล็อต)</td></tr>` + rows.map(r => { i++; return `<tr${P ? '' : ` class="tr-click" data-item="${r.item_id}"`}><td class="${c}">${i}</td><td>${e(r.name)}<div class="small${P ? '' : '-muted'}">${e(r.code)}</div></td><td>${e(r.lot_no)}</td><td>${e(SP.fmt.date(r.exp))}</td><td class="${n}">${r.days < 0 ? 'เลย ' + (-r.days) : r.days}</td><td class="${n}">${Q(r.balance)} ${e(r.unit)}</td><td class="${n}">${M(r.value)}</td></tr>`; }).join('')
            + `<tr class="${g}"><td colspan="6" class="${n}">รวม ${e(SP.bkLabel(bk))}</td><td class="${n}">${M(sub)}</td></tr>`;
        });
        return `${P ? '' : '<div class="p-3 pb-0"><div class="row g-2 mb-1">' + this.miniSum(order.map(bk => [SP.bkLabel(bk), R.rows.filter(r => r.bucket === bk).length])) + '</div></div>'}
          ${table([['ลำดับ'], ['วัสดุ'], ['Lot'], ['วันหมดอายุ'], ['อีก (วัน)', 1], ['คงเหลือ', 1], ['มูลค่า (บาท)', 1]], h, `<tr><td colspan="6" class="${n}">รวมทั้งหมด</td><td class="${n}">${M(tot)}</td></tr>`)}`;
      }
      return '';
    },
    miniSum(list) {
      return list.map(x => `<div class="col"><div class="p-2 px-3 rounded-4" style="background:#f8f9fb"><div class="small-muted">${e(x[0])}</div><div class="fw-bold fs-5">${x[1]}</div></div></div>`).join('');
    },

    title() {
      const st = this.st, def = kindDef(st.kind);
      let t = 'รายงาน' + def[1];
      if (st.kind === 'card' && this.data && this.data.item) t = 'บัญชีวัสดุ ' + this.data.item.name;
      const parts = [];
      if (def[3]) parts.push('ระหว่างวันที่ ' + SP.fmt.dateLong(st.from) + ' ถึง ' + SP.fmt.dateLong(st.to));
      else parts.push('ณ วันที่ ' + SP.fmt.dateLong(SP.today()));
      if (st.cat && st.kind !== 'card') parts.push('ประเภท ' + (SP.idx.cat[st.cat] || {}).name);
      if (st.kind === 'requester' && st.requester) parts.push('ผู้เบิก ' + st.requester);
      return { t: t, s: parts.join(' · ') };
    },
    print() {
      if (!this.data) return SP.toast('ยังไม่มีข้อมูลรายงาน', 'warning');
      const body = this.build(this.data, 'print');
      if (!body) return SP.toast('ไม่มีข้อมูลสำหรับพิมพ์', 'warning');
      const t = this.title();
      SP.print.report(t.t, e(t.s), body, { landscape: this.data.kind === 'balance' || this.data.kind === 'card' });
    },
    csv() {
      const R = this.data;
      if (!R) return SP.toast('ยังไม่มีข้อมูลรายงาน', 'warning');
      const cat = id => (SP.idx.cat[id] || {}).name || '';
      const t = this.title();
      let rows = [];
      if (R.kind === 'receive' || R.kind === 'issue' || R.kind === 'adjust') {
        rows = [['ประเภท', 'รหัส', 'วัสดุ', 'จำนวน', 'หน่วย', 'มูลค่า']].concat(R.rows.map(r => [cat(r.category_id), r.code, r.name, r.qty, r.unit, r.value]));
        rows.push([]); rows.push(['เลขที่', 'วันที่', 'ผู้เกี่ยวข้อง', 'รายการ', 'มูลค่า']);
        R.docs.forEach(d => rows.push([d.doc_no, d.date, d.party, d.lines, d.value]));
      } else if (R.kind === 'requester') {
        rows = [['ผู้เบิก', 'จำนวนใบเบิก', 'รายการ', 'มูลค่า', 'รหัสวัสดุ', 'วัสดุ', 'จำนวน', 'หน่วย']];
        R.rows.forEach(r => r.items.forEach((x, i) => rows.push(i === 0 ? [r.party, r.docs, r.lines, r.value, x.code, x.name, x.qty, x.unit] : ['', '', '', '', x.code, x.name, x.qty, x.unit])));
      } else if (R.kind === 'balance') {
        rows = [['ประเภท', 'รหัส', 'วัสดุ', 'คงเหลือ', 'หน่วย', 'จำนวน/หน่วย', 'หน่วยย่อย', 'ราคา/หน่วย', 'อัตราใช้/เดือน', 'ใช้จริง/เดือน (90 วัน)', 'พอใช้ (เดือน)', 'หมดอายุใกล้สุด', 'มูลค่ารวม', 'ต่ำกว่าขั้นต่ำ']]
          .concat(R.rows.map(r => [cat(r.category_id), r.code, r.name, r.balance, r.unit, r.pack_qty || '', r.pack_unit || '', r.price, r.rate || '', r.avg90, r.months === null ? '' : r.months, r.near_exp || '', r.value, r.low ? 'ใช่' : '']));
      } else if (R.kind === 'card') {
        rows = [['วันที่', 'เลขที่', 'ประเภท', 'ผู้เกี่ยวข้อง', 'Lot', 'วันหมดอายุ', 'รับ', 'จ่าย', 'คงเหลือ'], [R.from, '', 'ยอดยกมา', '', '', '', '', '', R.open]]
          .concat(R.rows.map(m => [m.date, m.doc_no, m.type, m.party, m.lot_no, m.exp, m.qin || '', m.qout || '', m.balance]));
      } else if (R.kind === 'expiry') {
        rows = [['กลุ่มอายุ', 'ประเภท', 'รหัส', 'วัสดุ', 'Lot', 'วันหมดอายุ', 'อีก (วัน)', 'คงเหลือ', 'หน่วย', 'มูลค่า']]
          .concat(R.rows.map(r => [SP.bkLabel(r.bucket), cat(r.category_id), r.code, r.name, r.lot_no, r.exp, r.days, r.balance, r.unit, r.value]));
      }
      SP.csv(t.t + '-' + SP.today(), [[t.t], [t.s], []].concat(rows));
    },
  };
})();
