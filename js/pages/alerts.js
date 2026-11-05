/**
 * แจ้งเตือน: วัสดุต่ำกว่าจำนวนขั้นต่ำ และล็อตใกล้หมดอายุ 5 กลุ่ม (หมดอายุแล้ว / 30 / 60 / 120 / มากกว่า 120 วัน)
 */
(function () {
  'use strict';
  const SP = window.SP;
  const e = s => SP.esc(s);

  SP.pages.alerts = {
    tab: 'low',
    bk: '',

    render(el, param) {
      if (param.tab) this.tab = param.tab === 'exp' ? 'exp' : 'low';
      if (param.b) { this.tab = 'exp'; this.bk = param.b; }
      const k = SP.kpi(), cfg = SP.state.boot.config;
      if (!this.bk) this.bk = k.bk.expired.n ? 'expired' : 'd1';
      const n = cfg.notify || {};
      const ch = [n.telegram ? 'Telegram' : '', n.email ? 'อีเมล' : ''].filter(Boolean).join(' และ ');
      const mini = (icon, tint, val, lbl, go) => `<div class="col-6 col-md-4 col-xl-2"><a class="stat text-decoration-none text-body" href="${go}"><div class="stat-ico ${tint}"><i class="bi ${icon}"></i></div><div class="min-w-0"><div class="num" style="font-size:1.25rem">${val}</div><div class="lbl">${e(lbl)}</div></div></a></div>`;
      el.innerHTML = `<div class="page-head"><div><h1>แจ้งเตือน</h1><div class="sub">วัสดุที่ต่ำกว่าจำนวนขั้นต่ำ และล็อตที่ใกล้หมดอายุ ตรวจทุกวันก่อนเริ่มงาน</div></div>
          <div class="actions"><button class="btn btn-soft" type="button" data-a="print"><i class="bi bi-printer"></i> พิมพ์</button><button class="btn btn-light" type="button" data-a="csv"><i class="bi bi-download"></i> CSV</button>
          ${SP.isAdmin() ? '<a class="btn btn-light" href="#/settings?s=notify"><i class="bi bi-gear"></i> ตั้งค่าแจ้งเตือน</a>' : ''}</div></div>
        <div class="row g-3 mb-3">
          ${mini('bi-arrow-down-circle', 'tint-warning', k.low, 'ต่ำกว่าขั้นต่ำ', '#/alerts?tab=low')}
          ${SP.BK_KEYS.map(x => mini('bi-hourglass-split', 'bk-' + x, k.bk[x].n, SP.bkLabel(x) + ' (ล็อต)', '#/alerts?tab=exp&b=' + x)).join('')}
        </div>
        <div class="alert ${n.daily ? 'alert-success' : 'alert-secondary'} py-2"><i class="bi ${n.daily ? 'bi-send-check' : 'bi-send-slash'}"></i><div class="small">${n.daily ? 'ส่งสรุปแจ้งเตือนอัตโนมัติทุกวันเวลา ' + String(n.hour).padStart(2, '0') + ':00 น.' + (ch ? ' ทาง ' + ch : ' (ยังไม่ได้ตั้งช่องทาง)') : 'ยังไม่ได้เปิดส่งสรุปแจ้งเตือนอัตโนมัติทาง Telegram หรืออีเมล' + (SP.isAdmin() ? ' เปิดได้ที่ ตั้งค่า > ช่องทางแจ้งเตือน' : '')}</div></div>
        <div class="nav nav-pills mb-3" id="alTabs">
          <button class="nav-link ${this.tab === 'low' ? 'active' : ''}" type="button" data-tab="low"><i class="bi bi-arrow-down-circle"></i> ต่ำกว่าขั้นต่ำ <span class="badge rounded-pill text-bg-light">${k.low}</span></button>
          <button class="nav-link ${this.tab === 'exp' ? 'active' : ''}" type="button" data-tab="exp"><i class="bi bi-hourglass-split"></i> วันหมดอายุ <span class="badge rounded-pill text-bg-light">${k.bk.expired.n + k.bk.d1.n}</span></button></div>
        <div id="alBody"></div>`;
      el.onclick = ev => this.click(ev);
      this.draw();
      if (param.tab || param.b) history.replaceState(null, '', '#/alerts');
    },

    lowRows() {
      const st = SP.state.stats;
      return SP.kpi().lowList.map(it => {
        const avg = st && st.usage90 ? SP.r2((st.usage90[it.id] || 0) / 3) : 0;
        const rate = it.rate || avg;
        return { it: it, short: SP.r2(Math.max(0, it.min_qty - it._bal)), rate: rate, months: rate > 0 ? SP.r2(it._bal / rate) : null };
      });
    },
    expRows() {
      return SP.kpi().expList.filter(l => SP.bucket(l.exp) === this.bk);
    },

    draw() {
      const box = SP.$('#alBody');
      if (!box) return;
      const canW = SP.canWrite();
      if (this.tab === 'low') {
        const rows = this.lowRows();
        if (!rows.length) { box.innerHTML = `<div class="card">${SP.ui.empty('bi-check2-circle', 'ไม่มีวัสดุต่ำกว่าขั้นต่ำ', 'วัสดุที่ยังไม่ได้กำหนดจำนวนขั้นต่ำจะไม่ถูกแจ้งเตือน กำหนดได้ในหน้าแก้ไขวัสดุ')}</div>`; return; }
        box.innerHTML = `<div class="card"><div class="table-wrap"><table class="table table-hover"><thead><tr><th>วัสดุ</th><th>ประเภท</th><th class="num">คงเหลือ</th><th class="num">ขั้นต่ำ</th><th class="num">ขาด</th><th class="num">อัตราใช้/เดือน</th><th class="num">พอใช้อีก</th><th></th></tr></thead><tbody>
          ${rows.map(r => `<tr class="tr-click" data-item="${r.it.id}"><td><div class="fw-600">${e(r.it.name)}</div><div class="small-muted">${e(r.it.code)} · ${e((SP.idx.sup[r.it.supplier_id] || {}).name || 'ไม่ระบุบริษัท')}</div></td>
            <td class="small">${SP.catDot(r.it)}${e(SP.catOf(r.it).name)}</td><td class="num"><b class="${r.it._bal <= 0 ? 'text-danger' : 'text-warning'}">${SP.fmt.num(r.it._bal)}</b> ${e(r.it.unit)}</td><td class="num">${SP.fmt.num(r.it.min_qty)}</td>
            <td class="num">${r.short ? SP.fmt.num(r.short) : '-'}</td><td class="num">${r.rate ? SP.fmt.num(r.rate) : '-'}</td><td class="num">${r.months === null ? '-' : SP.fmt.num(r.months) + ' เดือน'}</td>
            <td class="text-end">${canW ? `<a class="btn btn-sm btn-soft" href="#/receive?item=${r.it.id}"><i class="bi bi-box-arrow-in-down"></i> รับเข้า</a>` : ''}</td></tr>`).join('')}
          </tbody></table></div></div>`;
        if (!SP.state.stats) SP.loadStats().then(() => { if (SP.state.page === 'alerts' && this.tab === 'low') this.draw(); });
        return;
      }
      const chips = SP.BK_KEYS.map(x => [x, SP.bkLabel(x), SP.bkColor(x), SP.kpi().bk[x].n]);
      const rows = this.expRows();
      const total = rows.reduce((s, l) => s + l.balance * l.price, 0);
      box.innerHTML = `<div class="pill-tabs mb-3" id="alBk">${SP.ui.chips(chips, this.bk)}</div>
        ${this.bk === 'expired' && rows.length && canW ? `<div class="alert alert-danger"><i class="bi bi-exclamation-octagon"></i><div class="flex-grow-1">ล็อตที่หมดอายุแล้วระบบไม่ให้จ่ายออก ควรตัดจำหน่ายเพื่อให้ยอดคงคลังถูกต้อง</div><a class="btn btn-sm btn-danger" href="#/stock?b=expired">ไปที่คงคลัง</a></div>` : ''}
        <div class="card">${rows.length ? `<div class="table-wrap"><table class="table table-hover"><thead><tr><th>วัสดุ</th><th>Lot No.</th><th>วันหมดอายุ</th><th>แถบอายุ</th><th class="num">คงเหลือ</th><th class="num">มูลค่า</th></tr></thead><tbody>
          ${rows.map(l => { const it = SP.idx.item[l.item_id]; return `<tr class="tr-click" data-item="${it.id}"><td><div class="fw-600">${SP.catDot(it)}${e(it.name)}</div><div class="small-muted">${e(it.code)}</div></td><td class="fw-600">${e(l.lot_no)}</td>
            <td>${SP.expPill(l.exp)}</td><td style="min-width:140px">${SP.lifeBar(l.exp)}</td><td class="num"><b>${SP.fmt.num(l.balance)}</b> ${e(it.unit)}</td><td class="num">${SP.fmt.money(l.balance * l.price)}</td></tr>`; }).join('')}
          </tbody><tfoot><tr><td colspan="5" class="num">รวม ${rows.length} ล็อต</td><td class="num">${SP.fmt.money(total)}</td></tr></tfoot></table></div>`
          : SP.ui.empty('bi-check2-circle', 'ไม่มีล็อตในกลุ่ม ' + e(SP.bkLabel(this.bk)), '')}</div>`;
    },

    click(ev) {
      const t = ev.target.closest('[data-tab]');
      if (t) { this.tab = t.dataset.tab; SP.$$('#alTabs .nav-link').forEach(x => x.classList.toggle('active', x === t)); this.draw(); return; }
      const c = ev.target.closest('#alBk [data-chip]');
      if (c) { this.bk = c.dataset.chip; this.draw(); return; }
      const a = ev.target.closest('[data-a]');
      if (a) { if (a.dataset.a === 'csv') this.csv(); else if (a.dataset.a === 'print') this.print(); return; }
      if (ev.target.closest('a,button')) return;
      const it = ev.target.closest('[data-item]');
      if (it) SP.pages.items.view(it.dataset.item);
    },

    csv() {
      if (this.tab === 'low') {
        SP.csv('วัสดุต่ำกว่าขั้นต่ำ-' + SP.today(), [['ประเภท', 'รหัส', 'วัสดุ', 'บริษัทผู้จำหน่าย', 'คงเหลือ', 'หน่วย', 'ขั้นต่ำ', 'ขาด', 'อัตราใช้/เดือน', 'พอใช้อีก (เดือน)']]
          .concat(this.lowRows().map(r => [SP.catOf(r.it).name, r.it.code, r.it.name, (SP.idx.sup[r.it.supplier_id] || {}).name || '', r.it._bal, r.it.unit, r.it.min_qty, r.short, r.rate, r.months === null ? '' : r.months])));
      } else {
        SP.csv('ใกล้หมดอายุ-' + this.bk + '-' + SP.today(), [['ประเภท', 'รหัส', 'วัสดุ', 'Lot', 'วันหมดอายุ', 'เหลืออีก (วัน)', 'คงเหลือ', 'หน่วย', 'มูลค่า']]
          .concat(this.expRows().map(l => { const it = SP.idx.item[l.item_id]; return [SP.catOf(it).name, it.code, it.name, l.lot_no, l.exp, SP.daysTo(l.exp), l.balance, it.unit, SP.r2(l.balance * l.price)]; })));
      }
    },
    print() {
      if (this.tab === 'low') {
        const tr = this.lowRows().map((r, i) => `<tr><td class="c">${i + 1}</td><td>${e(r.it.name)}<br><small>${e(r.it.code)}</small></td><td>${e((SP.idx.sup[r.it.supplier_id] || {}).name || '-')}</td><td class="r">${SP.fmt.num(r.it._bal)} ${e(r.it.unit)}</td><td class="r">${SP.fmt.num(r.it.min_qty)}</td><td class="r">${SP.fmt.num(r.short)}</td><td class="r">${r.rate ? SP.fmt.num(r.rate) : '-'}</td></tr>`).join('');
        SP.print.report('รายการวัสดุต่ำกว่าจำนวนขั้นต่ำ', 'ณ วันที่ ' + e(SP.fmt.dateLong(SP.today())), `<table class="pr-table"><thead><tr><th>ลำดับ</th><th>วัสดุ</th><th>บริษัทผู้จำหน่าย</th><th>คงเหลือ</th><th>ขั้นต่ำ</th><th>ขาด</th><th>อัตราใช้/เดือน</th></tr></thead><tbody>${tr}</tbody></table>`);
        return;
      }
      const rows = this.expRows();
      const tr = rows.map((l, i) => { const it = SP.idx.item[l.item_id]; return `<tr><td class="c">${i + 1}</td><td>${e(it.name)}<br><small>${e(it.code)}</small></td><td class="c">${e(l.lot_no)}</td><td class="c">${e(SP.fmt.date(l.exp))}</td><td class="c">${e(SP.daysText(l.exp))}</td><td class="r">${SP.fmt.num(l.balance)} ${e(it.unit)}</td><td class="r">${SP.fmt.money(l.balance * l.price)}</td></tr>`; }).join('');
      SP.print.report('รายการวัสดุ ' + SP.bkLabel(this.bk), 'ณ วันที่ ' + e(SP.fmt.dateLong(SP.today())), `<table class="pr-table"><thead><tr><th>ลำดับ</th><th>วัสดุ</th><th>Lot</th><th>วันหมดอายุ</th><th>สถานะ</th><th>คงเหลือ</th><th>มูลค่า</th></tr></thead><tbody>${tr}</tbody><tfoot><tr><td colspan="6" class="r">รวม</td><td class="r">${SP.fmt.money(rows.reduce((s, l) => s + l.balance * l.price, 0))}</td></tr></tfoot></table>`);
    },
  };
})();
