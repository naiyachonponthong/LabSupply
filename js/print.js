/**
 * LabSupply print: หัวรายงานหน่วยงาน, ใบรับ/ใบเบิกจ่าย A4, สลิป 80 มม., สติกเกอร์บาร์โค้ด
 * ทุกงานพิมพ์เรนเดอร์ลง #printArea เดียวแล้วสั่ง window.print()
 */
(function () {
  'use strict';
  const SP = window.SP;
  const JSBARCODE = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js';
  const e = s => SP.esc(s);
  const m = n => SP.fmt.money(n);
  const q = n => SP.fmt.num(n);

  SP.print = {
    org() { return (SP.state.boot && SP.state.boot.config.org) || {}; },
    head(title, sub) {
      const o = this.org();
      return `<div class="pr-head">${o.logo ? `<img src="${e(o.logo)}" alt="">` : ''}
        <div class="o"><div class="o1">${e(o.hospital)}</div><div>${e(o.group)}</div><div>${e(o.dept)}</div></div>
        <div class="meta">${e(o.short || 'LabSupply')}<br>พิมพ์ ${e(SP.fmt.dateTime(new Date()))}<br>โดย ${e(SP.state.user ? SP.state.user.name : '')}</div></div>
        <div class="pr-title">${e(title)}</div>${sub ? `<div class="pr-sub">${sub}</div>` : ''}`;
    },
    foot() { return `<div class="pr-foot"><span>${e(this.org().system || '')}</span><span>LabSupply</span></div>`; },
    go(html, cls) {
      const pa = SP.$('#printArea');
      pa.className = cls || '';
      pa.innerHTML = html;
      document.body.classList.add('printing');
      let done = false;
      const end = () => {
        if (done) return;
        done = true;
        document.body.classList.remove('printing');
        pa.innerHTML = '';
        window.removeEventListener('afterprint', end);
      };
      window.addEventListener('afterprint', end);
      const imgs = SP.$$('img', pa);
      Promise.all(imgs.map(i => (i.complete ? 1 : new Promise(r => { i.onload = r; i.onerror = r; setTimeout(r, 4000); }))))
        .then(() => setTimeout(() => { window.print(); setTimeout(end, 1500); }, 120));
    },
    report(title, sub, body, opt) {
      opt = opt || {};
      this.go(`<div class="pr-doc ${opt.landscape ? 'pr-land' : ''}">${this.head(title, sub)}${body}${this.foot()}</div>`);
    },
    lineRows(doc) {
      return (doc.lines || []).map((l, i) => `<tr><td class="c">${i + 1}</td><td>${e(l.code || '')}</td><td>${e(l.name)}${l.note ? `<br><small>${e(l.note)}</small>` : ''}</td>
        <td class="c">${e(l.lot_no || '-')}</td><td class="c">${l.exp ? e(SP.fmt.date(l.exp)) : '-'}</td><td class="r">${q(l.qty)}</td><td class="c">${e(l.unit || '')}</td>
        <td class="r">${m(l.price)}</td><td class="r">${m(l.value)}</td></tr>`).join('');
    },
    doc(doc) {
      const T = { RC: 'ใบรับวัสดุเข้าคลัง', IS: 'ใบเบิกจ่ายวัสดุ', AJ: 'ใบปรับปรุงยอดวัสดุ' };
      const voided = doc.status === 'void';
      let info = `<div><b>เลขที่</b> ${e(doc.doc_no)}</div><div><b>วันที่</b> ${e(SP.fmt.dateLong(doc.date))}</div>`;
      if (doc.type === 'RC') {
        info += `<div><b>บริษัทผู้จำหน่าย</b> ${e(doc.supplier_name || '-')}</div><div><b>เลขที่ใบส่งของ/อ้างอิง</b> ${e(doc.ref_no || '-')}</div>
          <div><b>ประเภทการรับ</b> ${doc.source === 'opening' ? 'ยอดยกมา (เริ่มใช้ระบบ)' : 'รับจากการจัดซื้อ'}</div>`;
      } else if (doc.type === 'IS') {
        info += `<div><b>ผู้เบิก</b> ${e(doc.requester_name || doc.party)}</div><div><b>หน่วยงาน/จุดบริการ</b> ${e(doc.requester_section || '-')}</div>`;
      } else {
        info += `<div><b>เหตุผล</b> ${e(doc.reason_label || doc.party)}</div>`;
      }
      info += `<div><b>ผู้บันทึก</b> ${e(doc.created_by_name || doc.created_by || '')}</div>`;
      if (doc.note) info += `<div style="grid-column:1/-1"><b>หมายเหตุ</b> ${e(doc.note)}</div>`;
      if (voided) info += `<div style="grid-column:1/-1"><b>ยกเลิกแล้ว</b> ${e(doc.void_reason || '')} (${e(doc.void_by || '')})</div>`;
      const signs = doc.type === 'RC' ? ['ผู้ตรวจรับ', 'ผู้บันทึก', 'หัวหน้างาน'] : (doc.type === 'IS' ? ['ผู้เบิก', 'ผู้จ่ายวัสดุ', 'หัวหน้างาน'] : ['ผู้บันทึก', 'ผู้ตรวจสอบ', 'หัวหน้างาน']);
      const body = `<div class="pr-info">${info}</div>
        <table class="pr-table"><thead><tr><th style="width:34px">ลำดับ</th><th style="width:70px">รหัส</th><th>รายการ</th><th style="width:80px">Lot No.</th><th style="width:78px">วันหมดอายุ</th><th style="width:56px">จำนวน</th><th style="width:48px">หน่วย</th><th style="width:72px">ราคา/หน่วย</th><th style="width:84px">จำนวนเงิน</th></tr></thead>
        <tbody>${this.lineRows(doc)}</tbody><tfoot><tr><td colspan="8" class="r">รวม ${(doc.lines || []).length} รายการ มูลค่า</td><td class="r">${m(doc.total)}</td></tr></tfoot></table>
        <div class="pr-sign">${signs.map(s => `<div><div class="ln"></div>(${'.'.repeat(36)})<br>${s}<br>วันที่ ....../....../......</div>`).join('')}</div>`;
      this.report((voided ? '[ยกเลิกแล้ว] ' : '') + T[doc.type], '', body);
    },
    slip(doc) {
      const o = this.org();
      const lines = (doc.lines || []).map((l, i) => `<tr><td colspan="2">${i + 1}. ${e(l.name)}</td></tr>
        <tr><td style="padding-left:10px">Lot ${e(l.lot_no || '-')}${l.exp ? ' หมดอายุ ' + e(SP.fmt.dateShort(l.exp)) : ''}</td><td style="text-align:right;white-space:nowrap">${q(l.qty)} ${e(l.unit || '')}</td></tr>`).join('');
      const h = `<div class="pr-doc pr-slip"><div class="c"><b>${e(o.dept)}</b><br>${e(o.hospital)}</div><hr>
        <div class="c"><b>${doc.type === 'IS' ? 'ใบจ่ายวัสดุ' : (doc.type === 'RC' ? 'ใบรับวัสดุ' : 'ใบปรับยอด')}</b>${doc.status === 'void' ? ' (ยกเลิกแล้ว)' : ''}</div>
        <table><tr><td>เลขที่</td><td style="text-align:right">${e(doc.doc_no)}</td></tr><tr><td>วันที่</td><td style="text-align:right">${e(SP.fmt.date(doc.date))}</td></tr>
        <tr><td>${doc.type === 'IS' ? 'ผู้เบิก' : (doc.type === 'RC' ? 'บริษัท' : 'เหตุผล')}</td><td style="text-align:right">${e(doc.party || '-')}</td></tr></table><hr>
        <table>${lines}</table><hr>
        <table><tr><td>รวม</td><td style="text-align:right">${(doc.lines || []).length} รายการ</td></tr><tr><td>ผู้บันทึก</td><td style="text-align:right">${e(doc.created_by_name || doc.created_by || '')}</td></tr></table>
        <br><div>ลงชื่อผู้รับ ..................................</div><br><div class="c" style="font-size:10px">${e(SP.fmt.dateTime(new Date()))}</div></div>`;
      this.go(h);
    },
    async stickers(list) {
      if (!list.length) return SP.toast('ยังไม่ได้เลือกวัสดุ', 'warning');
      try { await SP.loadScript(JSBARCODE); } catch (er) { return SP.err(er); }
      const o = this.org();
      let h = '<div class="pr-doc"><div class="pr-labels">';
      const vals = [];
      list.forEach(x => {
        for (let i = 0; i < Math.max(1, Math.min(200, x.copies || 1)); i++) {
          vals.push(String(x.it.code));
          h += `<div class="pr-label"><div class="n">${e(x.it.name)}</div><svg data-bc="${vals.length - 1}"></svg>
            <div class="c">${e(x.it.code)} · ${e(x.it.unit || '')}${x.it.pack_qty > 0 ? ' (' + q(x.it.pack_qty) + ' ' + e(x.it.pack_unit || '') + ')' : ''}</div>
            <div class="c" style="font-family:inherit">${e(o.short || '')}</div></div>`;
        }
      });
      h += '</div></div>';
      const pa = SP.$('#printArea');
      pa.innerHTML = h;
      SP.$$('svg[data-bc]', pa).forEach(svg => {
        try { window.JsBarcode(svg, vals[+svg.dataset.bc], { format: 'CODE128', displayValue: false, margin: 0, height: 44, width: 1.6 }); } catch (er) { svg.outerHTML = '<div class="c">(พิมพ์บาร์โค้ดจากรหัสนี้ไม่ได้)</div>'; }
      });
      this.go(pa.innerHTML);
    },
  };
})();
