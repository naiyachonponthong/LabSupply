/**
 * หน้าหลัก: มูลค่าคงคลัง อายุวัสดุ (5 กลุ่ม) มูลค่าตามประเภท รับเข้า-จ่ายออก 6 เดือน รายการแจ้งเตือน
 */
(function () {
  'use strict';
  const SP = window.SP;
  const e = s => SP.esc(s);

  SP.pages.dashboard = {
    render(el) {
      const b = SP.state.boot, u = SP.state.user, org = b.config.org, k = SP.kpi();
      const canW = SP.canWrite();
      const hour = +new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', hour12: false }).format(new Date()) % 24;
      const greet = hour < 12 ? 'สวัสดีตอนเช้า' : (hour < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น');
      const t1 = SP.thr()[0];
      const expSoon = k.bk.expired.n + k.bk.d1.n;
      const stats = [
        ['bi-cash-stack', 'tint-primary', SP.fmt.money(k.value), 'มูลค่าคงคลังรวม (บาท)', '#/stock'],
        ['bi-capsule', 'tint-blue', SP.fmt.num(k.items), 'รายการวัสดุที่ใช้งาน', '#/items'],
        ['bi-arrow-down-circle', k.low ? 'tint-warning' : 'tint-success', SP.fmt.num(k.low), 'ต่ำกว่าจำนวนขั้นต่ำ', '#/alerts?tab=low'],
        ['bi-hourglass-bottom', expSoon ? 'tint-danger' : 'tint-success', SP.fmt.num(expSoon), 'ล็อตหมดอายุ/ใกล้หมด ' + t1 + ' วัน', '#/alerts?tab=exp'],
      ];
      const stat = s => `<a class="stat text-decoration-none text-body" href="${s[4]}"><div class="stat-ico ${s[1]}"><i class="bi ${s[0]}"></i></div><div class="min-w-0"><div class="num">${s[2]}</div><div class="lbl">${e(s[3])}</div></div></a>`;
      const tiles = [
        canW && ['#/receive?scan=1', 'สแกนรับเข้า', 'bi-upc-scan', 'teal'],
        canW && ['#/issue?scan=1', 'สแกนจ่ายออก', 'bi-qr-code-scan', 'blue'],
        ['#/items', 'วัสดุ', 'bi-capsule', 'amber'],
        ['#/stock', 'คงคลัง', 'bi-boxes', 'purple'],
        ['#/alerts', 'แจ้งเตือน', 'bi-bell', 'rose', SP.alertCount()],
        ['#/reports', 'รายงาน', 'bi-bar-chart-line', 'slate'],
      ].filter(Boolean);
      const tileHtml = `<div class="app-grid">${tiles.map(t => `<a class="app-tile" href="${t[0]}"><span class="app-ico ${t[3]}"><i class="bi ${t[2]}"></i>${t[4] ? `<span class="b">${t[4] > 99 ? '99+' : t[4]}</span>` : ''}</span><span class="lbl">${t[1]}</span></a>`).join('')}</div>`;

      const bkTotal = SP.BK_KEYS.reduce((s, x) => s + k.bk[x].n, 0);
      const bar = bkTotal ? SP.BK_KEYS.filter(x => k.bk[x].n).map(x => `<span style="width:${(k.bk[x].n / bkTotal * 100).toFixed(2)}%;background:${SP.bkColor(x)}" title="${e(SP.bkLabel(x))} ${k.bk[x].n} ล็อต"></span>`).join('') : '';
      const legend = SP.BK_KEYS.map(x => `<button type="button" class="lg bk-${x}" data-go="#/alerts?tab=exp&b=${x}"><b>${k.bk[x].n}</b><span>${e(SP.bkLabel(x))}</span><div class="small" style="opacity:.85">${SP.fmt.short(k.bk[x].v)} บาท</div></button>`).join('');

      const maxV = Math.max(1, ...b.categories.map(c => (k.byCat[c.id] || {}).v || 0));
      const catBars = b.categories.map(c => {
        const x = k.byCat[c.id] || { n: 0, v: 0 };
        return `<div class="hbar"><div class="top"><span class="min-w-0 ellipsis"><span class="cat-dot" style="background:${e(c.color)}"></span>${e(c.name)} <span class="small-muted">${x.n} รายการ</span></span><b>${SP.fmt.money(x.v)}</b></div>
          <div class="track"><div class="fill" style="width:${(x.v / maxV * 100).toFixed(1)}%;background:${e(c.color)}"></div></div></div>`;
      }).join('');

      const lowHtml = k.lowList.length ? k.lowList.slice(0, 6).map(it => `<div class="list-row" data-item="${it.id}"><span class="list-ico tint-warning"><i class="bi bi-arrow-down"></i></span>
        <div class="meta"><div class="t">${e(it.name)}</div><div class="s">คงเหลือ ${SP.fmt.num(it._bal)} จากขั้นต่ำ ${SP.fmt.num(it.min_qty)} ${e(it.unit)}</div></div></div>`).join('')
        : SP.ui.empty('bi-check2-circle', 'ทุกรายการยังเกินขั้นต่ำ', '');
      const soon = k.expList.filter(l => ['expired', 'd1', 'd2', 'd3'].indexOf(SP.bucket(l.exp)) >= 0).slice(0, 6);
      const expHtml = soon.length ? soon.map(l => {
        const it = SP.idx.item[l.item_id];
        const bk = SP.bucket(l.exp);
        return `<div class="list-row" data-item="${l.item_id}"><span class="list-ico bk-${bk}"><i class="bi bi-hourglass-split"></i></span>
          <div class="meta"><div class="t">${e(it ? it.name : '-')}</div><div class="s">Lot ${e(l.lot_no)} · ${SP.fmt.num(l.balance)} ${e(it ? it.unit : '')} · <b class="bk-${bk}" style="background:none">${e(SP.daysText(l.exp))}</b></div></div></div>`;
      }).join('') : SP.ui.empty('bi-check2-circle', 'ไม่มีล็อตใกล้หมดอายุ', 'ภายใน ' + SP.thr()[2] + ' วัน');

      el.innerHTML = `
        <div class="m-hero">
          <div class="small" style="opacity:.85">${greet}</div>
          <div class="fs-5 fw-bold">${e(u.name)}</div>
          <div class="small" style="opacity:.85">${e(org.dept)} · ${e(SP.fmt.date(SP.today()))}</div>
        </div>
        <div class="m-float d-lg-none mb-3"><div class="hscroll">${stats.map(stat).join('')}</div></div>
        <div class="page-head d-none d-lg-flex">
          <div><h1>${greet} ${e(u.name)}</h1><div class="sub">ภาพรวมคลังวัสดุ ${e(org.dept)} ประจำวันที่ ${e(SP.fmt.dateLong(SP.today()))}</div></div>
          ${canW ? `<div class="actions"><a class="btn btn-primary" href="#/receive?scan=1"><i class="bi bi-upc-scan"></i> สแกนรับเข้า</a><a class="btn btn-soft" href="#/issue?scan=1"><i class="bi bi-qr-code-scan"></i> สแกนจ่ายออก</a></div>` : ''}
        </div>
        <div class="dash-grid">
          <aside class="dash-side dash-left">
            <div class="card org-card"><div class="card-body d-flex gap-3 align-items-center">
              <div class="logo">${org.logo ? `<img src="${e(org.logo)}" alt="">` : '<i class="bi bi-hospital"></i>'}</div>
              <div class="min-w-0"><div class="fw-bold">${e(org.dept)}</div><div class="small-muted">${e(org.group)}</div><div class="small-muted">${e(org.hospital)}</div></div>
            </div></div>
            <div class="card"><div class="card-header"><i class="bi bi-lightning-charge"></i> เมนูด่วน</div><div class="card-body">${tileHtml}</div></div>
            <div class="card"><div class="card-body small">
              <div class="d-flex justify-content-between py-1"><span class="text-muted">ล็อตที่มีคงเหลือ</span><b>${SP.fmt.num(k.lots)}</b></div>
              <div class="d-flex justify-content-between py-1"><span class="text-muted">บริษัทผู้จำหน่าย</span><b>${SP.fmt.num(b.suppliers.length)}</b></div>
              <div class="d-flex justify-content-between py-1"><span class="text-muted">รายชื่อผู้เบิก</span><b>${SP.fmt.num(b.requesters.length)}</b></div>
            </div></div>
          </aside>
          <section class="dash-mid">
            <div class="stat-grid mb-3 d-none d-lg-grid">${stats.map(stat).join('')}</div>
            <div class="card mb-3 d-xxl-none"><div class="card-body">${tileHtml}</div></div>
            <div class="card mb-3">
              <div class="card-header"><i class="bi bi-hourglass-split"></i> อายุวัสดุคงคลัง <span class="ms-auto small-muted fw-normal">${k.lots} ล็อตที่มีคงเหลือ แตะกลุ่มเพื่อดูรายการ</span></div>
              <div class="card-body">${bkTotal ? `<div class="bk-bar">${bar}</div>` : '<div class="bk-bar"></div><div class="small-muted mt-2">ยังไม่มีล็อตที่มีวันหมดอายุ</div>'}<div class="bk-legend">${legend}</div>
                ${k.bk.none.n ? `<div class="small-muted mt-2"><i class="bi bi-info-circle"></i> ไม่มีวันหมดอายุ ${k.bk.none.n} ล็อต (เช่น วัสดุสำนักงาน) มูลค่า ${SP.fmt.money(k.bk.none.v)} บาท</div>` : ''}</div>
            </div>
            <div class="row g-3 mb-3">
              <div class="col-xl-6"><div class="card h-100"><div class="card-header"><i class="bi bi-pie-chart"></i> มูลค่าคงคลังตามประเภท</div><div class="card-body">${catBars}
                <div class="d-flex justify-content-between border-top pt-2 mt-3"><span class="fw-600">รวมทั้งหมด</span><b class="fs-5">${SP.fmt.money(k.value)} บาท</b></div></div></div></div>
              <div class="col-xl-6"><div class="card h-100"><div class="card-header"><i class="bi bi-bar-chart"></i> มูลค่ารับเข้า-จ่ายออก 6 เดือน
                <span class="ms-auto d-flex gap-3"><span class="legend-dot"><i style="background:var(--sb-primary)"></i>รับเข้า</span><span class="legend-dot"><i style="background:#f59e0b"></i>จ่ายออก</span></span></div>
                <div class="card-body" id="dbMonths"><div class="skeleton" style="height:170px"></div></div></div></div>
            </div>
            <div class="card"><div class="card-header"><i class="bi bi-clock-history"></i> เอกสารล่าสุด<a class="ms-auto small fw-normal" href="#/reports">ดูรายงาน</a></div><div id="dbRecent">${SP.ui.loading(3)}</div></div>
          </section>
          <aside class="dash-side dash-right">
            <div class="card"><div class="card-header"><i class="bi bi-arrow-down-circle"></i> ต่ำกว่าขั้นต่ำ <span class="b-soft b-warning ms-1">${k.low}</span><a class="ms-auto small fw-normal" href="#/alerts?tab=low">ทั้งหมด</a></div><div class="card-body py-1">${lowHtml}</div></div>
            <div class="card"><div class="card-header"><i class="bi bi-hourglass-split"></i> ใกล้หมดอายุ<a class="ms-auto small fw-normal" href="#/alerts?tab=exp">ทั้งหมด</a></div><div class="card-body py-1">${expHtml}</div></div>
          </aside>
        </div>`;

      el.onclick = ev => {
        const g = ev.target.closest('[data-go]');
        if (g) { SP.go(g.dataset.go); return; }
        const it = ev.target.closest('[data-item]');
        if (it) SP.pages.items.view(it.dataset.item);
        const d = ev.target.closest('[data-doc]');
        if (d) SP.docs.view(d.dataset.doc);
      };
      this.loadStats(el);
    },
    async loadStats(el) {
      const st = await SP.loadStats();
      if (SP.state.page !== 'dashboard' || !el.isConnected) return;
      const mb = SP.$('#dbMonths', el), rc = SP.$('#dbRecent', el);
      if (!st) {
        if (mb) mb.innerHTML = SP.ui.empty('bi-wifi-off', 'โหลดสถิติไม่สำเร็จ', '');
        if (rc) rc.innerHTML = '';
        return;
      }
      const max = Math.max(1, ...st.months.map(x => Math.max(x.in, x.out)));
      mb.innerHTML = `<div class="mbars">${st.months.map(x => `<div class="mbar" title="${SP.fmt.month(x.ym)} รับเข้า ${SP.fmt.money(x.in)} จ่ายออก ${SP.fmt.money(x.out)}">
        <div class="small-muted" style="font-size:.68rem">${SP.fmt.short(x.in)}</div>
        <div class="cols"><div class="c in" style="height:${(x.in / max * 100).toFixed(1)}%"></div><div class="c out" style="height:${(x.out / max * 100).toFixed(1)}%"></div></div>
        <div class="m">${SP.fmt.month(x.ym)}</div></div>`).join('')}</div>`;
      rc.innerHTML = st.recent.length ? `<div class="m-list">${st.recent.map(d => `<div class="m-card" data-doc="${d.id}"><div class="d-flex justify-content-between gap-2 align-items-center">
          <div class="d-flex gap-2 align-items-center min-w-0">${SP.docs.badge(d.type)}<span class="code-chip">${e(d.doc_no)}</span></div>${d.status === 'void' ? SP.docs.status('void') : `<b>${SP.fmt.money(d.total)}</b>`}</div>
          <div class="row2"><span class="ellipsis">${e(d.party || '-')}</span><span>${e(SP.fmt.date(d.date))} · ${d.nlines} รายการ</span></div></div>`).join('')}</div>`
        : SP.ui.empty('bi-inbox', 'ยังไม่มีเอกสาร', SP.canWrite() ? 'เริ่มจากเมนู รับเข้า เพื่อบันทึกวัสดุเข้าคลัง' : '');
    },
  };
})();
