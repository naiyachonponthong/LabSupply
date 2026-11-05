/**
 * คู่มือในระบบ: หน้ารวม (hero + ค้นหาถึงเนื้อหา + แนะนำตามบทบาท + หมวด) และหน้าหัวข้อ (สารบัญ ก่อนหน้า/ถัดไป พิมพ์)
 */
(function () {
  'use strict';
  const SP = window.SP;
  const e = s => SP.esc(s);

  SP.pages.guide = {
    render(el, param) {
      const G = SP.guide;
      if (param.t && G.get(param.t)) return this.show(el, param.t);
      const role = SP.state.user.role;
      const path = (G.ROLE_PATHS[role] || G.ROLE_PATHS.staff).map(k => G.get(k)).filter(Boolean);
      el.innerHTML = `<div class="section-hero"><div class="eyebrow">LabSupply / คู่มือ</div><h1>คู่มือการใช้งาน</h1>
          <p>ทุกขั้นตอนของงานคลังวัสดุ ตั้งแต่เริ่มใช้ระบบ สแกนบาร์โค้ด รับเข้า จ่ายออก จนถึงรายงานและการตั้งค่า</p>${SP.artImg('guide')}</div>
        <div class="row g-3 mb-3"><div class="col-lg-7"><div class="input-ico"><i class="bi bi-search"></i><input class="form-control form-control-lg" id="gdQ" placeholder="ค้นหาในคู่มือ เช่น ยอดยกมา Telegram ตัดจำหน่าย" autocomplete="off" style="border-radius:14px"></div></div></div>
        <div id="gdRes" class="mb-3"></div>
        <div class="row g-3">
          <div class="col-xl-4"><div class="card g-path-card h-100"><div class="card-header"><i class="bi bi-signpost-split"></i> แนะนำสำหรับ${e(SP.ROLE[role] || '')}</div><div class="card-body py-2">
            ${path.map((t, i) => `<div class="step" data-t="${t.key}"><span class="no">${i + 1}</span><div class="min-w-0"><div class="fw-600">${e(t.title)}</div><div class="small-muted ellipsis">${e(t.sum)}</div></div></div>`).join('')}
          </div></div></div>
          <div class="col-xl-8">${G.grouped().map(([g, keys]) => `<div class="fw-bold mb-2 mt-1">${e(g)}</div><div class="row g-2 mb-3">${keys.map(k => { const t = G.get(k); return `<div class="col-md-6"><div class="card topic-card" data-t="${k}"><div class="card-body d-flex gap-3"><span class="list-ico tint-primary"><i class="bi ${t.icon}"></i></span><div class="min-w-0"><div class="fw-600">${e(t.title)}</div><div class="small-muted">${e(t.sum)}</div></div></div></div></div>`; }).join('')}</div>`).join('')}</div>
        </div>`;
      el.onclick = ev => { const t = ev.target.closest('[data-t]'); if (t) SP.go('#/guide?t=' + t.dataset.t); };
      el.oninput = SP.debounce(ev => {
        if (ev.target.id !== 'gdQ') return;
        const res = G.search(ev.target.value);
        SP.$('#gdRes').innerHTML = !ev.target.value.trim() ? '' : (res.length ? `<div class="card"><div class="card-body py-2">${res.map(t => `<div class="list-row" data-t="${t.key}"><span class="list-ico tint-primary"><i class="bi ${t.icon}"></i></span><div class="meta"><div class="t">${e(t.title)}</div><div class="s">${e(t.g)} · ${e(t.sum)}</div></div></div>`).join('')}</div></div>`
          : '<div class="card"><div class="card-body small-muted">ไม่พบหัวข้อที่ตรงกับคำค้น ลองใช้คำอื่น เช่น รับเข้า หรือ สติกเกอร์</div></div>');
      }, 150);
    },

    show(el, key) {
      const G = SP.guide, t = G.get(key);
      const nb = G.neighbours(key).map(k => k && G.get(k));
      const nav = G.grouped().map(([g, keys]) => `<div class="g">${e(g)}</div>${keys.map(k => { const x = G.get(k); return `<a href="#/guide?t=${k}" class="${k === key ? 'active' : ''}"><i class="bi ${x.icon}"></i>${e(x.title)}</a>`; }).join('')}`).join('');
      el.innerHTML = `<div class="d-flex align-items-center gap-2 mb-3"><a class="btn btn-light btn-sm" href="#/guide"><i class="bi bi-arrow-left"></i> คู่มือทั้งหมด</a>
          <select class="form-select form-select-sm d-lg-none" id="gdSel" aria-label="เลือกหัวข้อ">${G.keys().map(k => `<option value="${k}"${k === key ? ' selected' : ''}>${e(G.get(k).title)}</option>`).join('')}</select></div>
        <div class="guide-layout"><nav class="guide-nav" aria-label="หัวข้อคู่มือ">${nav}</nav>
          <div class="card guide-card min-w-0"><div class="card-header"><span class="list-ico tint-primary"><i class="bi ${t.icon}"></i></span><div class="min-w-0 flex-grow-1"><div class="fs-5 fw-bold">${e(t.title)}</div><div class="small-muted fw-normal">${e(t.g)} · ${e(t.sum)}</div></div>
            <button class="btn btn-sm btn-soft" type="button" id="gdPrint"><i class="bi bi-printer"></i> พิมพ์</button></div>
            <div class="guide-body" id="gdBody"></div>
            <div class="card-footer d-flex justify-content-between gap-2 flex-wrap">
              ${nb[0] ? `<a class="btn btn-light" href="#/guide?t=${nb[0].key}"><i class="bi bi-chevron-left"></i> ${e(nb[0].title)}</a>` : '<span></span>'}
              ${nb[1] ? `<a class="btn btn-soft" href="#/guide?t=${nb[1].key}">${e(nb[1].title)} <i class="bi bi-chevron-right"></i></a>` : ''}</div></div></div>`;
      const body = SP.$('#gdBody');
      body.innerHTML = t.html;
      const hs = SP.$$('h2', body);
      if (hs.length >= 3) {
        hs.forEach((h, i) => { h.id = 'gh' + i; });
        body.insertAdjacentHTML('afterbegin', `<div class="g-toc"><div class="small fw-bold mb-1">ในหัวข้อนี้</div>${hs.map((h, i) => `<a href="#" data-toc="gh${i}">${e(h.textContent)}</a>`).join('')}</div>`);
      }
      el.onclick = ev => {
        const a = ev.target.closest('[data-toc]');
        if (a) { ev.preventDefault(); const h = SP.$('#' + a.dataset.toc); if (h) h.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
        if (ev.target.closest('#gdPrint')) SP.print.report('คู่มือการใช้งาน: ' + t.title, e(t.sum), `<div class="guide-body" style="padding:0">${t.html}</div>`);
      };
      el.onchange = ev => { if (ev.target.id === 'gdSel') SP.go('#/guide?t=' + ev.target.value); };
    },
  };
})();
