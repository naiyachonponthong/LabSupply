/**
 * ตั้งค่า: หน้าเดียวแบบหมวด (hero > ค้นหา > การ์ดหมวด > พื้นที่จัดการ) ตามมาตรฐาน Super App UI
 * หมวด: หน่วยงานและผู้ใช้ / ข้อมูลหลัก / คลังและแจ้งเตือน / หน้าตาและระบบ
 */
(function () {
  'use strict';
  const SP = window.SP;
  const e = s => SP.esc(s);
  const A = ['admin'], W = ['admin', 'staff'], ALL = '*';
  const GROUPS = [
    { key: 'org', name: 'หน่วยงานและผู้ใช้', desc: 'ชื่อหน่วยงานบนหัวระบบและใบพิมพ์ ผู้ใช้งาน และบัญชีของฉัน', icon: 'bi-building',
      items: [['org', 'ข้อมูลหน่วยงาน', 'bi-building', A, 'โรงพยาบาล กลุ่มงาน โลโก้ ปีงบประมาณ'], ['users', 'ผู้ใช้งาน', 'bi-people', A, 'เพิ่มผู้ใช้ สิทธิ์ รหัสผ่าน'], ['profile', 'บัญชีของฉัน', 'bi-person-circle', ALL, 'เปลี่ยนชื่อ เปลี่ยนรหัสผ่าน']] },
    { key: 'master', name: 'ข้อมูลหลัก', desc: 'หมวดวัสดุ บริษัทผู้จำหน่าย และรายชื่อผู้เบิก', icon: 'bi-database',
      items: [['categories', 'หมวดวัสดุ', 'bi-tags', A, 'ประเภทวัสดุ รหัสนำหน้า สี'], ['suppliers', 'บริษัทผู้จำหน่าย', 'bi-truck', W, 'ชื่อบริษัท ผู้ติดต่อ โทรศัพท์'], ['requesters', 'ผู้เบิก', 'bi-person-badge', W, 'ชื่อผู้เบิก ตำแหน่ง จุดบริการ']] },
    { key: 'stock', name: 'คลังและแจ้งเตือน', desc: 'เกณฑ์วันหมดอายุ และการส่งแจ้งเตือนทาง LINE Telegram หรืออีเมล', icon: 'bi-bell',
      items: [['expiry', 'เกณฑ์แจ้งเตือน', 'bi-hourglass-split', A, '30 60 120 วัน หมดเวลาเข้าระบบ'], ['notify', 'ช่องทางแจ้งเตือน', 'bi-send', A, 'LINE Telegram อีเมล สรุปรายวัน']] },
    { key: 'system', name: 'หน้าตาและระบบ', desc: 'สีระบบ รูปภาพ สำรองข้อมูล และเครื่องมือดูแลระบบ', icon: 'bi-palette',
      items: [['theme', 'หน้าตาระบบ', 'bi-palette', A, 'สีหลัก'], ['artwork', 'รูปภาพระบบ', 'bi-image', A, 'ภาพหน้าเข้าสู่ระบบ หน้าตั้งค่า คู่มือ'], ['tools', 'เครื่องมือระบบ', 'bi-tools', A, 'คำนวณยอดใหม่ สำรองข้อมูล ข้อมูลตัวอย่าง ล้างข้อมูล'], ['connect', 'การเชื่อมต่อ', 'bi-plug', ALL, 'URL ของ Web App']] },
  ];
  const ART = [['login', 'หน้าเข้าสู่ระบบ', 'ภาพใหญ่ด้านซ้ายของหน้าเข้าสู่ระบบ'], ['settings', 'หน้าตั้งค่า', 'ภาพในแบนเนอร์หน้าตั้งค่า'], ['guide', 'หน้าคู่มือ', 'ภาพในแบนเนอร์หน้าคู่มือ']];
  const ART_PROMPT = 'A cute 3D clay miniature scene of a hospital clinical laboratory supply room: a smiling medical technologist in a white coat scanning a barcode on a reagent box with a handheld scanner, small shelves with colorful reagent bottles, test tube racks, glove boxes and labeled supply bins, a tablet showing a simple stock chart, soft studio lighting, teal (#0D9488) and navy color palette with warm accents, isometric view, transparent background, no text, high detail';

  SP.pages.settings = {
    cur: '',
    cfg: null,

    groups() {
      return GROUPS.map(g => Object.assign({}, g, { items: g.items.filter(i => SP.can(i[3])) })).filter(g => g.items.length);
    },
    find(key) {
      for (const g of this.groups()) { const it = g.items.find(i => i[0] === key); if (it) return { g: g, it: it }; }
      return null;
    },
    async loadCfg(force) {
      if (!this.cfg || force) this.cfg = await SP.api('config.get');
      return this.cfg;
    },
    applyPublic(pub) {
      if (!pub) return;
      SP.state.boot.config = pub;
      SP.theme.apply(pub.theme && pub.theme.primary);
      SP.shell.build();
    },

    render(el, param) {
      const groups = this.groups();
      if (param.s) this.cur = param.s;
      if (!this.cur || !this.find(this.cur)) this.cur = groups[0].items[0][0];
      el.innerHTML = `<div class="settings-hero"><div class="eyebrow">LabSupply / Settings</div><h1>ตั้งค่าคลังวัสดุ<br>ให้พร้อมใช้งาน</h1>
          <p>หน่วยงาน ผู้ใช้ ข้อมูลหลัก เกณฑ์แจ้งเตือน และหน้าตาระบบ รวมไว้ในที่เดียว</p>${SP.artImg('settings', '')}</div>
        <div class="settings-head"><h2>เลือกหมวดการตั้งค่า</h2><div class="settings-search"><i class="bi bi-search"></i><input class="form-control" id="setQ" placeholder="ค้นหาการตั้งค่า เช่น Telegram โลโก้ ผู้ใช้" autocomplete="off"></div></div>
        <div id="setRes" class="settings-results d-none"></div>
        <div class="settings-groups">${groups.map(g => `<button type="button" class="settings-group" data-group="${g.key}"><span class="gi"><i class="bi ${g.icon}"></i></span><span class="gn">${e(g.name)}</span><span class="gd">${e(g.desc)}</span><span class="gc"><span>${g.items.length} รายการ</span><i class="bi bi-arrow-up-right"></i></span></button>`).join('')}</div>
        <div class="settings-workspace" id="setWork"></div>`;
      el.onclick = ev => {
        const g = ev.target.closest('[data-group]');
        if (g) { const gg = groups.find(x => x.key === g.dataset.group); this.open(gg.items[0][0]); SP.$('#setWork').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
        const s = ev.target.closest('[data-sec]');
        if (s) { this.open(s.dataset.sec); if (s.closest('#setRes')) { SP.$('#setQ').value = ''; SP.$('#setRes').classList.add('d-none'); SP.$('#setWork').scrollIntoView({ behavior: 'smooth', block: 'start' }); } }
      };
      el.oninput = ev => { if (ev.target.id === 'setQ') this.search(ev.target.value); };
      this.open(this.cur);
      if (param.s) history.replaceState(null, '', '#/settings');
    },
    search(q) {
      const box = SP.$('#setRes');
      q = q.trim().toLowerCase();
      if (!q) { box.classList.add('d-none'); return; }
      const hits = [];
      this.groups().forEach(g => g.items.forEach(i => { if ((i[1] + ' ' + i[4] + ' ' + g.name).toLowerCase().indexOf(q) >= 0) hits.push(i); }));
      box.classList.remove('d-none');
      box.innerHTML = hits.length ? hits.map(i => `<button type="button" class="btn btn-soft" data-sec="${i[0]}"><i class="bi ${i[2]}"></i> ${e(i[1])}</button>`).join('') : '<span class="small-muted">ไม่พบการตั้งค่าที่ค้นหา</span>';
    },
    open(key) {
      const f = this.find(key);
      if (!f) return;
      this.cur = key;
      SP.$$('.settings-group').forEach(x => x.classList.toggle('active', x.dataset.group === f.g.key));
      const w = SP.$('#setWork');
      w.innerHTML = `<div class="eyebrow">กำลังจัดการ</div><h3>${e(f.g.name)}</h3>
        <div class="settings-subnav">${f.g.items.map(i => `<button type="button" class="chip${i[0] === key ? ' active' : ''}" data-sec="${i[0]}"><i class="bi ${i[2]}"></i> ${e(i[1])}</button>`).join('')}</div>
        <div id="setBox">${SP.ui.loading(3)}</div>`;
      const box = SP.$('#setBox');
      Promise.resolve(this['sec_' + key](box)).catch(er => { box.innerHTML = SP.ui.empty('bi-exclamation-triangle', 'เปิดการตั้งค่าไม่สำเร็จ', e(er.message)); });
    },
    saveBtn(text) { return `<div class="col-12"><button class="btn btn-primary" type="button" data-save><i class="bi bi-check2"></i> ${text || 'บันทึก'}</button></div>`; },
    bindSave(box, fn) {
      const b = SP.$('[data-save]', box);
      if (!b) return;
      b.addEventListener('click', async () => {
        SP.ui.busy(b, true, 'กำลังบันทึก...');
        try { await fn(); } catch (er) { SP.err(er); } finally { SP.ui.busy(b, false); }
      });
    },
    async saveCfg(section, data) {
      const r = await SP.api('config.save', { section: section, data: data });
      this.cfg = null;
      this.applyPublic(r.public);
      SP.toast('บันทึกการตั้งค่าแล้ว');
      return r;
    },

    /* ---------- หน่วยงาน ---------- */
    async sec_org(box) {
      const c = (await this.loadCfg()).config, o = c.org;
      box.innerHTML = `<form class="row g-3" onsubmit="return false">
        <div class="col-12 d-flex gap-3 align-items-center flex-wrap"><div class="logo-box" id="orgLogo">${o.logo ? `<img src="${e(o.logo)}" alt="">` : '<i class="bi bi-hospital"></i>'}</div>
          <div class="flex-grow-1" style="min-width:220px"><label class="form-label" for="orgFile">โลโก้หน่วยงาน</label><input type="file" class="form-control" id="orgFile" accept="image/png,image/jpeg,image/webp">
          <div class="form-text">แนะนำ PNG พื้นใส ไม่เกิน 8 MB ระบบย่อเหลือ 512 px และเก็บไว้ใน Google Drive ของระบบ</div>
          ${o.logo ? '<div class="form-check mt-1"><input class="form-check-input" type="checkbox" id="orgDel"><label class="form-check-label small" for="orgDel">ลบโลโก้</label></div>' : ''}</div></div>
        ${SP.ui.f('โรงพยาบาล', SP.ui.input('hospital', o.hospital), { col: 'col-md-6' })}
        ${SP.ui.f('กลุ่มงาน', SP.ui.input('group', o.group), { col: 'col-md-6' })}
        ${SP.ui.f('หน่วยงาน/งาน', SP.ui.input('dept', o.dept), { col: 'col-md-6', hint: 'แสดงเป็นบรรทัดแรกบนหัวระบบ' })}
        ${SP.ui.f('ชื่อระบบ', SP.ui.input('system', o.system), { col: 'col-md-6' })}
        ${SP.ui.f('ชื่อย่อ', SP.ui.input('short', o.short, 'maxlength="30"'), { col: 'col-md-4', hint: 'ใช้บนสติกเกอร์และชื่อแท็บ' })}
        ${SP.ui.f('เดือนเริ่มปีงบประมาณ', SP.ui.select('fiscalStartMonth', SP.TH_MF.map((m, i) => [i + 1, m]), c.fiscalStartMonth || 10), { col: 'col-md-4', hint: 'ใช้ตั้งเลขที่เอกสาร เช่น RC-2570-0001' })}
        ${this.saveBtn()}</form>`;
      const file = SP.$('#orgFile', box);
      file.addEventListener('change', async () => {
        try { const img = await SP.readImage(file.files[0], 512); SP.$('#orgLogo', box).innerHTML = `<img src="${img.dataUrl}" alt="">`; } catch (er) { file.value = ''; SP.err(er); }
      });
      this.bindSave(box, async () => {
        const f = SP.ui.form(box);
        const data = { hospital: f.hospital, group: f.group, dept: f.dept, system: f.system, short: f.short, fiscalStartMonth: +f.fiscalStartMonth };
        if (file.files[0]) {
          const img = await SP.readImage(file.files[0], 512);
          const up = await SP.api('file.upload', { b64: img.b64, mime: img.mime, name: 'logo-' + Date.now() + (img.mime === 'image/png' ? '.png' : '.jpg'), purpose: 'logo' });
          data.logo = up.url;
        } else if (SP.$('#orgDel', box) && SP.$('#orgDel', box).checked) data.logo = '';
        await this.saveCfg('org', data);
        this.open('org');
      });
    },

    /* ---------- ผู้ใช้ ---------- */
    async sec_users(box) {
      const list = await SP.api('user.list');
      const me = SP.state.user.id;
      box.innerHTML = `<div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3"><div class="small-muted">ผู้ดูแลระบบ: ทุกเมนู · เจ้าหน้าที่คลัง: รับเข้า จ่ายออก ปรับยอด ข้อมูลวัสดุ · ผู้บริหาร: ดูอย่างเดียว</div>
          <button class="btn btn-primary" type="button" data-u="add"><i class="bi bi-person-plus"></i> เพิ่มผู้ใช้</button></div>
        <div class="table-wrap"><table class="table table-hover"><thead><tr><th>ชื่อผู้ใช้</th><th>ชื่อ-สกุล</th><th>บทบาท</th><th>สถานะ</th><th>เข้าใช้ล่าสุด</th><th></th></tr></thead><tbody>
        ${list.map(u => `<tr><td><span class="code-chip">${e(u.username)}</span>${u.id === me ? ' <span class="b-soft b-primary">คุณ</span>' : ''}</td><td>${e(u.name)}</td><td>${e(SP.ROLE[u.role] || u.role)}</td>
          <td>${u.status === 'active' ? '<span class="b-soft b-success">ใช้งาน</span>' : '<span class="b-soft b-mute">ระงับ</span>'}</td><td class="small">${u.last_login ? e(SP.fmt.dateTime(u.last_login)) : '-'}</td>
          <td class="text-end text-nowrap"><button class="btn btn-sm btn-light" type="button" data-u="edit" data-id="${u.id}" title="แก้ไข"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-light" type="button" data-u="reset" data-id="${u.id}" title="รีเซ็ตรหัสผ่าน"><i class="bi bi-key"></i></button>
          ${u.id !== me ? `<button class="btn btn-sm btn-danger-soft" type="button" data-u="del" data-id="${u.id}" title="ลบ"><i class="bi bi-trash"></i></button>` : ''}</td></tr>`).join('')}
        </tbody></table></div>`;
      box.onclick = async ev => {
        const b = ev.target.closest('[data-u]');
        if (!b) return;
        const u = list.find(x => x.id === b.dataset.id);
        const act = b.dataset.u;
        try {
          if (act === 'add' || act === 'edit') this.userForm(u);
          else if (act === 'reset') {
            if (!(await SP.ui.confirm('ตั้งรหัสผ่านใหม่แบบสุ่มให้ ' + u.name, { title: 'รีเซ็ตรหัสผ่าน', okText: 'รีเซ็ต', icon: 'bi-key' }))) return;
            const r = await SP.api('user.reset', { id: u.id });
            SP.ui.alert('รหัสผ่านใหม่', `ชื่อผู้ใช้ <span class="code-chip">${e(r.username)}</span><br>รหัสผ่าน <span class="code-chip fs-6">${e(r.password)}</span><div class="small-muted mt-2">แจ้งผู้ใช้ และให้เปลี่ยนรหัสผ่านที่ บัญชีของฉัน หลังเข้าระบบ</div>`, { icon: 'bi-key', tone: 'success' });
          } else if (act === 'del') {
            if (!(await SP.ui.confirm('ลบผู้ใช้ ' + u.name + ' ผู้ใช้นี้จะเข้าระบบไม่ได้อีก', { title: 'ลบผู้ใช้', tone: 'danger', okText: 'ลบผู้ใช้', icon: 'bi-trash' }))) return;
            await SP.api('user.delete', { id: u.id });
            SP.toast('ลบผู้ใช้แล้ว');
            this.open('users');
          }
        } catch (er) { SP.err(er); }
      };
    },
    userForm(u) {
      const isNew = !u;
      u = u || { username: '', name: '', role: 'staff', status: 'active' };
      SP.ui.modal({
        title: isNew ? '<i class="bi bi-person-plus"></i> เพิ่มผู้ใช้' : '<i class="bi bi-person-gear"></i> แก้ไขผู้ใช้',
        body: `<form class="row g-3" onsubmit="return false">
          ${SP.ui.f('ชื่อผู้ใช้ (ภาษาอังกฤษ)', SP.ui.input('username', u.username, 'autocapitalize="none" autocomplete="off" placeholder="เช่น nattiya"'), { col: 'col-md-6', req: true, hint: 'a-z 0-9 . _ - ยาว 3-30 ตัว' })}
          ${SP.ui.f('ชื่อ-สกุล', SP.ui.input('name', u.name), { col: 'col-md-6', req: true })}
          ${SP.ui.f('บทบาท', SP.ui.select('role', [['admin', SP.ROLE.admin], ['staff', SP.ROLE.staff], ['viewer', SP.ROLE.viewer]], u.role), { col: 'col-md-6' })}
          ${SP.ui.f('สถานะ', SP.ui.select('status', [['active', 'ใช้งาน'], ['inactive', 'ระงับการใช้งาน']], u.status), { col: 'col-md-6' })}
          ${SP.ui.f(isNew ? 'รหัสผ่าน' : 'ตั้งรหัสผ่านใหม่', SP.ui.input('password', '', 'type="text" autocomplete="new-password" placeholder="' + (isNew ? 'เว้นว่างให้ระบบสุ่มให้' : 'เว้นว่างถ้าไม่เปลี่ยน') + '"'), { hint: 'อย่างน้อย 6 ตัวอักษร' })}
        </form>`,
        onSave: async root => {
          const f = SP.ui.form(root);
          if (u.id) f.id = u.id;
          const r = await SP.api('user.save', f);
          SP.toast((isNew ? 'เพิ่ม' : 'บันทึก') + 'ผู้ใช้ ' + r.user.name + ' แล้ว');
          if (r.password) setTimeout(() => SP.ui.alert('รหัสผ่านเริ่มต้น', `ชื่อผู้ใช้ <span class="code-chip">${e(r.user.username)}</span><br>รหัสผ่าน <span class="code-chip fs-6">${e(r.password)}</span><div class="small-muted mt-2">คัดลอกเก็บไว้ ระบบจะไม่แสดงรหัสนี้อีก</div>`, { icon: 'bi-key', tone: 'success' }), 300);
          if (this.cur === 'users') this.open('users');
          if (u.id === SP.state.user.id) SP.refresh();
        },
      });
    },

    /* ---------- บัญชีของฉัน ---------- */
    sec_profile(box) {
      const u = SP.state.user;
      box.innerHTML = `<div class="row g-4"><div class="col-lg-6"><h6 class="fw-bold">ข้อมูลบัญชี</h6><form class="row g-3" id="pfA" onsubmit="return false">
          ${SP.ui.f('ชื่อผู้ใช้', `<input class="form-control" value="${e(u.username)}" disabled>`, { col: 'col-md-6' })}
          ${SP.ui.f('บทบาท', `<input class="form-control" value="${e(SP.ROLE[u.role] || u.role)}" disabled>`, { col: 'col-md-6' })}
          ${SP.ui.f('ชื่อ-สกุล', SP.ui.input('name', u.name), {})}
          <div class="col-12"><button class="btn btn-primary" type="button" id="pfSave"><i class="bi bi-check2"></i> บันทึกชื่อ</button></div></form></div>
        <div class="col-lg-6"><h6 class="fw-bold">เปลี่ยนรหัสผ่าน</h6><form class="row g-3" id="pfB" onsubmit="return false">
          ${SP.ui.f('รหัสผ่านเดิม', SP.ui.input('old', '', 'type="password" autocomplete="current-password"'), {})}
          ${SP.ui.f('รหัสผ่านใหม่', SP.ui.input('password', '', 'type="password" autocomplete="new-password"'), { col: 'col-md-6', hint: 'อย่างน้อย 6 ตัวอักษร' })}
          ${SP.ui.f('ยืนยันรหัสผ่านใหม่', SP.ui.input('password2', '', 'type="password" autocomplete="new-password"'), { col: 'col-md-6' })}
          <div class="col-12"><button class="btn btn-primary" type="button" id="pfPass"><i class="bi bi-key"></i> เปลี่ยนรหัสผ่าน</button></div></form></div></div>`;
      const run = async (btn, fn) => { SP.ui.busy(btn, true); try { await fn(); } catch (er) { SP.err(er); } finally { SP.ui.busy(btn, false); } };
      SP.$('#pfSave', box).addEventListener('click', ev => run(ev.currentTarget, async () => {
        const r = await SP.api('auth.profile', { name: SP.ui.form(SP.$('#pfA', box)).name });
        SP.state.user = r; SP.shell.build(); SP.toast('บันทึกชื่อแล้ว');
      }));
      SP.$('#pfPass', box).addEventListener('click', ev => run(ev.currentTarget, async () => {
        const f = SP.ui.form(SP.$('#pfB', box));
        if (f.password !== f.password2) throw new Error('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน');
        await SP.api('auth.password', { old: f.old, password: f.password });
        SP.$('#pfB', box).reset();
        SP.toast('เปลี่ยนรหัสผ่านแล้ว');
      }));
    },

    /* ---------- ข้อมูลหลัก ---------- */
    MASTER: {
      category: { list: 'categories', name: 'หมวดวัสดุ', fields: [['name', 'ชื่อหมวด', 'col-md-8', 1], ['prefix', 'รหัสนำหน้า', 'col-md-4', 0, 'เช่น MS ใช้ตั้งรหัสวัสดุอัตโนมัติ'], ['color', 'สี', 'col-md-4'], ['sort', 'ลำดับ', 'col-md-4'], ['has_expiry', 'วัสดุในหมวดนี้มีวันหมดอายุ', 'col-md-4'], ['note', 'หมายเหตุ', 'col-12']] },
      supplier: { list: 'suppliers', name: 'บริษัทผู้จำหน่าย', fields: [['name', 'ชื่อบริษัท', 'col-12', 1], ['contact', 'ผู้ติดต่อ', 'col-md-6'], ['phone', 'โทรศัพท์', 'col-md-6'], ['email', 'อีเมล', 'col-md-6'], ['note', 'หมายเหตุ', 'col-md-6']] },
      requester: { list: 'requesters', name: 'ผู้เบิก', fields: [['name', 'ชื่อ-สกุล', 'col-12', 1], ['position', 'ตำแหน่ง', 'col-md-6'], ['section', 'หน่วยงาน/จุดบริการ', 'col-md-6'], ['phone', 'โทรศัพท์', 'col-md-6'], ['note', 'หมายเหตุ', 'col-md-6']] },
    },
    sec_categories(box) { this.masterList(box, 'category'); },
    sec_suppliers(box) { this.masterList(box, 'supplier'); },
    sec_requesters(box) { this.masterList(box, 'requester'); },
    masterList(box, kind) {
      const conf = this.MASTER[kind];
      let q = '';
      const usage = {};
      SP.state.boot.items.forEach(it => {
        const k = kind === 'category' ? it.category_id : (kind === 'supplier' ? it.supplier_id : '');
        if (k) usage[k] = (usage[k] || 0) + 1;
      });
      const canDel = kind === 'category' ? SP.isAdmin() : SP.canWrite();
      const draw = () => {
        let rows = SP.state.boot[conf.list].slice();
        if (kind !== 'category') rows.sort(SP.byName);
        if (q) rows = rows.filter(r => JSON.stringify([r.name, r.contact, r.phone, r.position, r.section, r.prefix]).toLowerCase().indexOf(q) >= 0);
        const cols = kind === 'category' ? ['ชื่อหมวด', 'รหัสนำหน้า', 'วันหมดอายุ', 'วัสดุ'] : (kind === 'supplier' ? ['ชื่อบริษัท', 'ผู้ติดต่อ', 'โทรศัพท์', 'วัสดุ'] : ['ชื่อ-สกุล', 'ตำแหน่ง', 'หน่วยงาน/จุดบริการ', 'โทรศัพท์']);
        const cell = r => kind === 'category' ? [`<span class="cat-dot" style="background:${e(r.color)}"></span><b>${e(r.name)}</b>`, `<span class="code-chip">${e(r.prefix)}</span>`, r.has_expiry ? 'มี' : 'ไม่มี', (usage[r.id] || 0) + ' รายการ']
          : (kind === 'supplier' ? [`<b>${e(r.name)}</b>`, e(r.contact || '-'), e(r.phone || '-'), (usage[r.id] || 0) + ' รายการ'] : [`<b>${e(r.name)}</b>`, e(r.position || '-'), e(r.section || '-'), e(r.phone || '-')]);
        SP.$('#msList', box).innerHTML = rows.length ? `<div class="table-wrap"><table class="table table-hover"><thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}<th></th></tr></thead><tbody>
          ${rows.map(r => `<tr>${cell(r).map(c => `<td>${c}</td>`).join('')}<td class="text-end text-nowrap"><button class="btn btn-sm btn-light" type="button" data-m="edit" data-id="${r.id}" aria-label="แก้ไข"><i class="bi bi-pencil"></i></button>
            ${canDel ? `<button class="btn btn-sm btn-danger-soft" type="button" data-m="del" data-id="${r.id}" aria-label="ลบ"><i class="bi bi-trash"></i></button>` : ''}</td></tr>`).join('')}</tbody></table></div>`
          : SP.ui.empty('bi-inbox', 'ยังไม่มีข้อมูล' + conf.name, '');
      };
      box.innerHTML = `<div class="toolbar mb-3"><div class="input-ico grow"><i class="bi bi-search"></i><input class="form-control" id="msQ" placeholder="ค้นหา${conf.name}"></div>
        <button class="btn btn-primary" type="button" data-m="add"><i class="bi bi-plus-lg"></i> เพิ่ม${conf.name}</button></div><div id="msList"></div>`;
      SP.$('#msQ', box).addEventListener('input', SP.debounce(ev => { q = ev.target.value.trim().toLowerCase(); draw(); }, 150));
      box.onclick = async ev => {
        const b = ev.target.closest('[data-m]');
        if (!b) return;
        const rec = SP.state.boot[conf.list].find(x => x.id === b.dataset.id);
        if (b.dataset.m === 'add' || b.dataset.m === 'edit') return this.masterForm(kind, rec, () => { if (SP.$('#msList', box)) draw(); });
        if (!(await SP.ui.confirm('ลบ "' + rec.name + '" ออกจาก' + conf.name, { title: 'ลบข้อมูล', tone: 'danger', okText: 'ลบ', icon: 'bi-trash' }))) return;
        try {
          await SP.api('master.delete', { kind: kind, id: rec.id });
          SP.removeRec(conf.list, rec.id);
          SP.toast('ลบแล้ว');
          draw();
        } catch (er) { SP.err(er); }
      };
      draw();
    },
    masterForm(kind, rec, after) {
      const conf = this.MASTER[kind], isNew = !rec;
      rec = rec || { color: '#0D9488', sort: SP.state.boot.categories.length + 1, has_expiry: true };
      const field = f => {
        const k = f[0];
        let ctl;
        if (k === 'color') ctl = `<input class="form-control form-control-color w-100" type="color" name="color" value="${e(rec.color || '#0D9488')}">`;
        else if (k === 'has_expiry') ctl = SP.ui.switch('has_expiry', !!rec.has_expiry, 'บังคับกรอก Lot และวันหมดอายุ');
        else if (k === 'sort') ctl = SP.ui.input('sort', rec.sort, 'type="number" min="0" max="999"');
        else if (k === 'note') ctl = SP.ui.textarea('note', rec.note);
        else ctl = SP.ui.input(k, rec[k], k === 'prefix' ? 'maxlength="4" autocapitalize="characters"' : (k === 'email' ? 'type="email"' : (k === 'phone' ? 'inputmode="tel"' : '')));
        return SP.ui.f(f[1], ctl, { col: f[2], req: f[3], hint: f[4] || '' });
      };
      SP.ui.modal({
        title: (isNew ? '<i class="bi bi-plus-circle"></i> เพิ่ม' : '<i class="bi bi-pencil-square"></i> แก้ไข') + conf.name,
        body: `<form class="row g-3" onsubmit="return false">${conf.fields.map(field).join('')}</form>`,
        onSave: async root => {
          const f = SP.ui.form(root);
          if (!String(f.name || '').trim()) { SP.toast('กรุณากรอกชื่อ', 'warning'); return false; }
          if (rec.id) f.id = rec.id;
          const saved = await SP.api('master.save', { kind: kind, rec: f });
          SP.upsert(conf.list, saved);
          if (kind === 'category') SP.state.boot.categories.sort((a, b) => (a.sort || 0) - (b.sort || 0));
          SP.toast('บันทึก' + conf.name + 'แล้ว');
          if (after) after(saved);
        },
      });
    },

    /* ---------- เกณฑ์แจ้งเตือน ---------- */
    async sec_expiry(box) {
      const c = (await this.loadCfg()).config;
      const t = c.expiry;
      box.innerHTML = `<form class="row g-3" onsubmit="return false">
        <div class="col-12"><div class="alert alert-info mb-0"><i class="bi bi-info-circle"></i><div>ระบบแบ่งล็อตเป็น 5 กลุ่มตามวันหมดอายุ ค่าเริ่มต้นตามที่หน่วยงานกำหนด 30 / 60 / 120 วัน ปรับได้ด้านล่าง ส่วนการเตือน "ต่ำกว่าขั้นต่ำ" กำหนดจำนวนขั้นต่ำที่ตัววัสดุแต่ละรายการ</div></div></div>
        ${SP.ui.f('กลุ่มที่ 1 (ใกล้หมดมาก) ไม่เกิน', SP.ui.input('d1', t.d1, 'type="number" min="1" max="3650"') , { col: 'col-md-4', hint: 'วัน' })}
        ${SP.ui.f('กลุ่มที่ 2 ไม่เกิน', SP.ui.input('d2', t.d2, 'type="number" min="1" max="3650"'), { col: 'col-md-4', hint: 'วัน' })}
        ${SP.ui.f('กลุ่มที่ 3 ไม่เกิน', SP.ui.input('d3', t.d3, 'type="number" min="1" max="3650"'), { col: 'col-md-4', hint: 'วัน (เกินกว่านี้คือกลุ่ม มากกว่า)' })}
        <div class="col-12"><div class="d-flex flex-wrap gap-2" id="exPrev"></div></div>
        ${SP.ui.f('เข้าระบบค้างไว้ได้นาน (ชั่วโมง)', SP.ui.input('sessionHours', c.sessionHours || 12, 'type="number" min="1" max="72"'), { col: 'col-md-4', hint: 'ครบเวลาแล้วต้องเข้าสู่ระบบใหม่' })}
        ${this.saveBtn()}</form>`;
      const prev = () => {
        const f = SP.ui.form(box), a = +f.d1, b = +f.d2, c3 = +f.d3;
        const ok = a > 0 && a < b && b < c3;
        SP.$('#exPrev', box).innerHTML = ok ? [['expired', 'หมดอายุแล้ว'], ['d1', 'ไม่เกิน ' + a + ' วัน'], ['d2', (a + 1) + '-' + b + ' วัน'], ['d3', (b + 1) + '-' + c3 + ' วัน'], ['over', 'มากกว่า ' + c3 + ' วัน']].map(x => `<span class="exp-pill bk-${x[0]}"><span class="dot"></span>${x[1]}</span>`).join('')
          : '<span class="text-danger small">ตัวเลขต้องเรียงจากน้อยไปมาก เช่น 30 &lt; 60 &lt; 120</span>';
      };
      box.addEventListener('input', prev);
      prev();
      this.bindSave(box, async () => {
        const f = SP.ui.form(box);
        await this.saveCfg('expiry', { d1: +f.d1, d2: +f.d2, d3: +f.d3, sessionHours: +f.sessionHours });
        SP.index(); SP.shell.update();
      });
    },

    /* ---------- ช่องทางแจ้งเตือน ---------- */
    async sec_notify(box) {
      const cg = await this.loadCfg(true), c = cg.config, n = c.notify;
      let targets = (n.lineTargets || []).map(t => Object.assign({}, t));
      box.innerHTML = `<form class="row g-3" onsubmit="return false">
        <div class="col-md-6"><label class="form-label">สรุปแจ้งเตือนอัตโนมัติรายวัน</label>${SP.ui.switch('daily', n.daily, 'ส่งสรุปวัสดุต่ำกว่าขั้นต่ำ หมดอายุ และใกล้หมดอายุทุกวัน')}</div>
        ${SP.ui.f('เวลาส่ง', SP.ui.select('hour', Array.from({ length: 24 }, (x, i) => [i, String(i).padStart(2, '0') + ':00 น.']), n.hour), { col: 'col-md-3' })}
        <div class="col-md-3"><label class="form-label">แจ้งทันที</label>${SP.ui.switch('instant', n.instant, 'เมื่อจ่ายแล้วต่ำกว่าขั้นต่ำ')}</div>
        <div class="col-12"><hr class="my-1"><h6 class="fw-bold mt-2"><i class="bi bi-line" style="color:#06C755"></i> LINE (LINE Official Account)</h6></div>
        ${SP.ui.f('Channel access token', SP.ui.input('lineToken', '', 'type="password" autocomplete="off" placeholder="' + (n.lineTokenSet ? 'ตั้งค่าแล้ว เว้นว่างถ้าไม่เปลี่ยน' : 'วาง Channel access token (long-lived)') + '"'), { hint: n.lineTokenSet ? '<label class="form-check-label"><input class="form-check-input me-1" type="checkbox" name="lineTokenClear">ลบ Token เดิม</label>' : 'ได้จาก LINE Developers Console > Messaging API ของบัญชี LINE OA' })}
        <div class="col-12" data-no-enter><label class="form-label">Webhook URL (วางใน LINE Developers Console)</label>
          <div class="input-group"><input class="form-control" id="lnHook" value="${e(cg.line_webhook || '')}" readonly><button class="btn btn-light border" type="button" id="lnCopy"><i class="bi bi-clipboard"></i> คัดลอก</button></div>
          <div class="form-text">เปิด Use webhook ด้วย เมื่อเพิ่มบอทเข้ากลุ่มหรือมีคนแอดบอทเป็นเพื่อน ระบบจะเห็นกลุ่ม/ผู้ใช้นั้นในรายการด้านล่าง</div></div>
        <div class="col-lg-6"><div class="fw-600 small mb-2">ผู้รับแจ้งเตือน LINE</div><div id="lnTargets"></div></div>
        <div class="col-lg-6"><div class="d-flex align-items-center mb-2"><span class="fw-600 small">กลุ่ม/ผู้ใช้ที่บอทพบล่าสุด</span><button class="btn btn-sm btn-light ms-auto" type="button" id="lnReload"><i class="bi bi-arrow-repeat"></i> โหลดใหม่</button></div><div id="lnSources"></div>
          <div class="input-group input-group-sm mt-2" data-no-enter><input class="form-control" id="lnManual" placeholder="หรือวางรหัส U... / C... เอง"><button class="btn btn-light border" type="button" id="lnAdd">เพิ่ม</button></div></div>
        <div class="col-12"><hr class="my-1"><h6 class="fw-bold mt-2"><i class="bi bi-telegram text-info"></i> Telegram</h6></div>
        ${SP.ui.f('Bot Token', SP.ui.input('tgToken', '', 'type="password" autocomplete="off" placeholder="' + (n.tgTokenSet ? 'ตั้งค่าแล้ว เว้นว่างถ้าไม่เปลี่ยน' : 'เช่น 123456789:AA...') + '"'), { col: 'col-md-7', hint: n.tgTokenSet ? '<label class="form-check-label"><input class="form-check-input me-1" type="checkbox" name="tgTokenClear">ลบ Token เดิม</label>' : 'สร้างบอทที่ @BotFather แล้วนำ Token มาวาง' })}
        ${SP.ui.f('Chat ID', SP.ui.input('tgChat', n.tgChat, 'placeholder="เช่น -1001234567890"'), { col: 'col-md-5', hint: 'เพิ่มบอทเข้ากลุ่ม แล้วดู Chat ID จาก getUpdates' })}
        <div class="col-12"><hr class="my-1"><h6 class="fw-bold mt-2"><i class="bi bi-envelope text-primary"></i> อีเมล</h6></div>
        ${SP.ui.f('อีเมลผู้รับ', SP.ui.input('email', n.email, 'placeholder="คั่นหลายอีเมลด้วยจุลภาค"'), { hint: 'ส่งจากบัญชี Google ที่ติดตั้งระบบ' })}
        <div class="col-12 d-flex gap-2 flex-wrap"><button class="btn btn-primary" type="button" data-save><i class="bi bi-check2"></i> บันทึก</button>
          <button class="btn btn-soft" type="button" id="ntTest"><i class="bi bi-send"></i> ทดสอบส่ง</button><button class="btn btn-light" type="button" id="ntNow"><i class="bi bi-lightning"></i> ส่งสรุปตอนนี้</button></div>
        <div class="col-12"><div class="g-note info"><i class="bi bi-lightbulb"></i><div class="small">วิธีหา Chat ID: เพิ่มบอทเข้ากลุ่ม Telegram ของหน่วยงาน พิมพ์ข้อความใดก็ได้ในกลุ่ม แล้วเปิด https://api.telegram.org/bot&lt;Token&gt;/getUpdates ในเบราว์เซอร์ ตัวเลขหลัง "chat":{"id": คือ Chat ID (ของกลุ่มจะขึ้นต้นด้วยเครื่องหมายลบ)</div></div></div>
      </form>`;
      const typeName = t => (t === 'user' ? 'ผู้ใช้' : (t === 'room' ? 'ห้องแชต' : 'กลุ่ม'));
      const drawTargets = () => {
        SP.$('#lnTargets', box).innerHTML = targets.length ? targets.map((t, i) => `<div class="list-row" style="cursor:default"><span class="list-ico" style="background:#e8f9ef;color:#06C755"><i class="bi ${t.type === 'user' ? 'bi-person' : 'bi-people'}"></i></span>
          <div class="meta"><input class="form-control form-control-sm" data-tn="${i}" value="${e(t.name)}" aria-label="ชื่อเรียก"><div class="s">${typeName(t.type)} · ${e(t.id.slice(0, 10))}...</div></div>
          <button class="btn btn-sm btn-danger-soft" type="button" data-trm="${i}" aria-label="เอาออก"><i class="bi bi-x-lg"></i></button></div>`).join('')
          : '<div class="small-muted p-2">ยังไม่มีผู้รับ เลือกจากรายการด้านขวา</div>';
      };
      const drawSources = list => {
        const src = (list || []).filter(s => s.type !== 'room');
        SP.$('#lnSources', box).innerHTML = src.length ? src.map(s => {
          const added = targets.some(t => t.id === s.id);
          return `<div class="list-row" style="cursor:default"><span class="list-ico tint-primary"><i class="bi ${s.type === 'user' ? 'bi-person' : 'bi-people'}"></i></span>
            <div class="meta"><div class="t">${e(s.name || (typeName(s.type) + ' ไม่ทราบชื่อ'))}</div><div class="s">${typeName(s.type)} · ${e(SP.fmt.dateTime(s.ts))}</div></div>
            ${added ? '<span class="b-soft b-success">เป็นผู้รับแล้ว</span>' : `<button class="btn btn-sm btn-soft" type="button" data-sadd="${e(s.id)}" data-sname="${e(s.name || '')}" data-stype="${e(s.type)}"><i class="bi bi-plus-lg"></i> เพิ่มเป็นผู้รับ</button>`}</div>`;
        }).join('') : '<div class="small-muted p-2">ยังไม่พบ ตั้ง Webhook แล้วเชิญบอทเข้ากลุ่ม LINE (หรือพิมพ์ id ในกลุ่ม) แล้วกด โหลดใหม่</div>';
      };
      let sources = cg.line_sources || [];
      drawTargets(); drawSources(sources);
      box.addEventListener('input', ev => { if (ev.target.dataset.tn !== undefined) targets[+ev.target.dataset.tn].name = ev.target.value; });
      box.addEventListener('click', ev => {
        const rm = ev.target.closest('[data-trm]');
        if (rm) { targets.splice(+rm.dataset.trm, 1); drawTargets(); drawSources(sources); return; }
        const ad = ev.target.closest('[data-sadd]');
        if (ad) { targets.push({ id: ad.dataset.sadd, name: ad.dataset.sname || (ad.dataset.stype === 'user' ? 'ผู้ใช้' : 'กลุ่มแจ้งเตือน'), type: ad.dataset.stype }); drawTargets(); drawSources(sources); SP.toast('เพิ่มแล้ว กดบันทึกเพื่อยืนยัน', 'info'); }
      });
      SP.$('#lnAdd', box).addEventListener('click', () => {
        const v = SP.$('#lnManual', box).value.trim();
        if (!/^[UCR][0-9a-f]{32}$/.test(v)) return SP.toast('รหัสต้องขึ้นต้น U (ผู้ใช้) หรือ C (กลุ่ม) ตามด้วยตัวอักษร 32 ตัว', 'warning');
        if (!targets.some(t => t.id === v)) targets.push({ id: v, name: v.charAt(0) === 'U' ? 'ผู้ใช้' : 'กลุ่มแจ้งเตือน', type: v.charAt(0) === 'U' ? 'user' : 'group' });
        SP.$('#lnManual', box).value = '';
        drawTargets(); drawSources(sources);
      });
      SP.$('#lnReload', box).addEventListener('click', async ev => {
        SP.ui.busy(ev.currentTarget, true, 'กำลังโหลด...');
        try { const r = await this.loadCfg(true); sources = r.line_sources || []; drawSources(sources); } catch (er) { SP.err(er); } finally { SP.ui.busy(ev.currentTarget, false); }
      });
      SP.$('#lnCopy', box).addEventListener('click', () => {
        const i = SP.$('#lnHook', box);
        try { navigator.clipboard.writeText(i.value).then(() => SP.toast('คัดลอก Webhook URL แล้ว')); } catch (er) { i.select(); SP.toast('กด Ctrl+C เพื่อคัดลอก', 'info'); }
      });
      this.bindSave(box, async () => {
        const f = SP.ui.form(box);
        f.lineTargets = targets;
        await this.saveCfg('notify', f);
        this.open('notify');
      });
      const run = async (btn, fn) => { SP.ui.busy(btn, true, 'กำลังส่ง...'); try { await fn(); } catch (er) { SP.err(er); } finally { SP.ui.busy(btn, false); } };
      SP.$('#ntTest', box).addEventListener('click', ev => run(ev.currentTarget, async () => {
        const r = await SP.api('notify.test');
        SP.ui.alert('ผลการทดสอบ', `LINE: <b>${e(r.line)}</b><br>Telegram: <b>${e(r.telegram)}</b><br>อีเมล: <b>${e(r.email)}</b><div class="small-muted mt-2">ถ้าเพิ่งแก้ค่า ให้กดบันทึกก่อนทดสอบ</div>`, { icon: 'bi-send' });
      }));
      SP.$('#ntNow', box).addEventListener('click', ev => run(ev.currentTarget, async () => {
        const r = await SP.api('tools.run', { op: 'alert' });
        SP.toast(r.result === 'sent' ? 'ส่งสรุปแจ้งเตือนแล้ว' : (r.result === 'nothing' ? 'ไม่มีรายการที่ต้องแจ้งเตือนวันนี้' : 'ส่งไม่สำเร็จ ดูชีต Errors'), r.result === 'error' ? 'danger' : 'success');
      }));
    },

    /* ---------- หน้าตา ---------- */
    async sec_theme(box) {
      const c = (await this.loadCfg()).config;
      let cur = (c.theme && c.theme.primary) || '#0D9488';
      box.innerHTML = `<div class="mb-3 small-muted">เลือกสีหลักของระบบ ระบบสร้างโทนอ่อน-เข้มให้อัตโนมัติ เห็นผลทันทีก่อนบันทึก</div>
        <div class="swatches mb-3">${SP.theme.PRESETS.map(p => `<button type="button" class="swatch${p[0].toLowerCase() === cur.toLowerCase() ? ' active' : ''}" style="background:${p[0]}" data-c="${p[0]}" title="${e(p[1])}" aria-label="${e(p[1])}"></button>`).join('')}</div>
        <div class="d-flex gap-2 align-items-center mb-3"><label class="form-label m-0" for="thC">กำหนดเอง</label><input type="color" class="form-control form-control-color" id="thC" value="${e(cur)}"><span class="code-chip" id="thHex">${e(cur)}</span></div>
        <div class="d-flex gap-2 flex-wrap mb-3"><button class="btn btn-primary" type="button">ปุ่มหลัก</button><button class="btn btn-soft" type="button">ปุ่มรอง</button><span class="chip active">แท็บที่เลือก</span><span class="app-ico" style="width:44px;height:44px;font-size:1.1rem"><i class="bi bi-box-seam"></i></span></div>
        <button class="btn btn-primary" type="button" data-save><i class="bi bi-check2"></i> บันทึกสี</button>`;
      const pick = hex => { cur = hex; SP.theme.apply(hex); SP.$('#thHex', box).textContent = hex; SP.$('#thC', box).value = hex; SP.$$('.swatch', box).forEach(s => s.classList.toggle('active', s.dataset.c.toLowerCase() === hex.toLowerCase())); };
      box.onclick = ev => { const s = ev.target.closest('[data-c]'); if (s) pick(s.dataset.c); };
      SP.$('#thC', box).addEventListener('input', ev => pick(ev.target.value));
      this.bindSave(box, () => this.saveCfg('theme', { primary: cur }));
    },

    /* ---------- รูปภาพระบบ ---------- */
    async sec_artwork(box) {
      const c = (await this.loadCfg()).config, art = c.artwork || {};
      box.innerHTML = `<div class="row g-3">${ART.map(s => `<div class="col-md-6 col-xl-4"><div class="card h-100"><div class="card-body">
          <div class="fw-bold">${e(s[1])}</div><div class="small-muted mb-2">${e(s[2])}</div>
          <div class="art-box mb-2" id="artPrev_${s[0]}"><img src="${e(art[s[0]] || 'img/labsupply-hero.png')}" alt="" onerror="this.replaceWith(document.createTextNode('ยังไม่มีรูป ใช้แบนเนอร์สีแทน'))"></div>
          <input type="file" class="form-control form-control-sm" accept="image/png,image/jpeg,image/webp" data-art="${s[0]}">
          <div class="form-check mt-2"><input class="form-check-input" type="checkbox" id="artReset_${s[0]}" data-reset="${s[0]}"><label class="form-check-label small" for="artReset_${s[0]}">กลับไปใช้รูปเริ่มต้น</label></div>
        </div></div></div>`).join('')}</div>
        <div class="d-flex gap-2 flex-wrap mt-3"><button class="btn btn-primary" type="button" data-save><i class="bi bi-check2"></i> บันทึกรูปภาพ</button></div>
        <div class="g-note info mt-3"><i class="bi bi-magic"></i><div class="small">รูปเริ่มต้นของระบบคือไฟล์ <span class="code-chip">img/labsupply-hero.png</span> บน GitHub (ภาพ 3D พื้นใส) ถ้ายังไม่มี สร้างด้วย AI สร้างภาพจากคำสั่งนี้ แล้วอัปโหลดในหน้านี้หรือวางไฟล์ไว้ในโฟลเดอร์ img
          <div class="mt-2 p-2 bg-white rounded-3" style="font-family:ui-monospace,Consolas,monospace;font-size:.78rem" id="artPrompt">${e(ART_PROMPT)}</div>
          <button class="btn btn-sm btn-light mt-2" type="button" id="artCopy"><i class="bi bi-clipboard"></i> คัดลอกคำสั่งสร้างภาพ</button></div></div>
        <div class="small-muted mt-2">โลโก้หน่วยงานตั้งที่ ข้อมูลหน่วยงาน · รูปแบบไฟล์ JPG PNG WebP ไม่เกิน 8 MB ระบบย่อเหลือด้านยาว 1600 px</div>`;
      SP.$$('[data-art]', box).forEach(inp => inp.addEventListener('change', async () => {
        try { const img = await SP.readImage(inp.files[0], 1600); SP.$('#artPrev_' + inp.dataset.art, box).innerHTML = `<img src="${img.dataUrl}" alt="">`; } catch (er) { inp.value = ''; SP.err(er); }
      }));
      SP.$('#artCopy', box).addEventListener('click', () => {
        try { navigator.clipboard.writeText(ART_PROMPT).then(() => SP.toast('คัดลอกแล้ว')); } catch (er) { SP.toast('คัดลอกไม่ได้ ให้ลากคลุมข้อความแทน', 'warning'); }
      });
      this.bindSave(box, async () => {
        const data = {};
        for (const s of ART) {
          const inp = SP.$(`[data-art="${s[0]}"]`, box);
          if (SP.$(`[data-reset="${s[0]}"]`, box).checked) data[s[0]] = '';
          else if (inp.files[0]) {
            const img = await SP.readImage(inp.files[0], 1600);
            const up = await SP.api('file.upload', { b64: img.b64, mime: img.mime, name: 'art-' + s[0] + '-' + Date.now() + (img.mime === 'image/png' ? '.png' : '.jpg'), purpose: 'artwork ' + s[0] });
            data[s[0]] = up.url;
          }
        }
        if (!Object.keys(data).length) return SP.toast('ยังไม่ได้เลือกรูปหรือรีเซ็ตรายการใด', 'info');
        await this.saveCfg('artwork', data);
        this.open('artwork');
      });
    },

    /* ---------- เครื่องมือระบบ ---------- */
    async sec_tools(box) {
      const info = await SP.api('tools.run', { op: 'info' });
      const noItems = !SP.state.boot.items.length;
      box.innerHTML = `<div class="row g-3">
        <div class="col-lg-6"><div class="card h-100"><div class="card-header"><i class="bi bi-info-circle"></i> ข้อมูลระบบ</div><div class="card-body small">
          <div class="d-flex justify-content-between py-1"><span class="text-muted">เวอร์ชัน</span><b>${e(info.version)} (หน้าเว็บ ${e(SP.VERSION)})</b></div>
          <div class="d-flex justify-content-between py-1"><span class="text-muted">ฐานข้อมูล</span><a href="${e(info.spreadsheet_url)}" target="_blank" rel="noopener">เปิด Google Sheets <i class="bi bi-box-arrow-up-right"></i></a></div>
          ${Object.keys(info.rows).map(k => `<div class="d-flex justify-content-between py-1"><span class="text-muted">ชีต ${e(k)}</span><b>${SP.fmt.num(info.rows[k])} แถว</b></div>`).join('')}
          <div class="d-flex justify-content-between py-1"><span class="text-muted">ตั้งเวลาอัตโนมัติ</span><b>${info.triggers.length ? e(info.triggers.join(', ')) : 'ยังไม่มี'}</b></div>
          ${info.journal ? '<div class="text-danger mt-2"><i class="bi bi-exclamation-triangle"></i> มีรายการบันทึกค้างไม่ครบ ระบบจะกู้คืนเมื่อมีการบันทึกครั้งถัดไป หรือกด คำนวณยอดคงเหลือใหม่</div>' : ''}
        </div></div></div>
        <div class="col-lg-6"><div class="card h-100"><div class="card-header"><i class="bi bi-tools"></i> เครื่องมือ</div><div class="card-body d-grid gap-2">
          <button class="btn btn-light text-start" type="button" data-t="rebuild"><i class="bi bi-arrow-repeat"></i> คำนวณยอดคงเหลือใหม่จากประวัติทั้งหมด</button>
          <button class="btn btn-light text-start" type="button" data-t="backup"><i class="bi bi-cloud-arrow-up"></i> สำรองข้อมูลตอนนี้ (สำเนา Google Sheets ใน Drive)</button>
          <button class="btn btn-light text-start" type="button" data-t="triggers"><i class="bi bi-alarm"></i> ติดตั้งตั้งเวลาอัตโนมัติใหม่ (สำรองรายสัปดาห์ ล้าง session แจ้งเตือนรายวัน)</button>
          ${noItems ? '<button class="btn btn-soft text-start" type="button" data-t="demo"><i class="bi bi-magic"></i> สร้างข้อมูลตัวอย่างสำหรับทดลองใช้</button>' : ''}
        </div></div></div>
        <div class="col-12"><div class="danger-zone"><div class="fw-bold text-danger"><i class="bi bi-exclamation-octagon"></i> ล้างข้อมูลรายการเพื่อเริ่มใช้งานจริง</div>
          <div class="small my-2">ลบวัสดุ ล็อต เอกสาร ประวัติ บริษัท และผู้เบิกทั้งหมด (ผู้ใช้ หมวดวัสดุ และการตั้งค่ายังอยู่) ระบบสำรองข้อมูลก่อนล้างให้อัตโนมัติ ใช้หลังทดลองด้วยข้อมูลตัวอย่าง</div>
          <button class="btn btn-danger btn-sm" type="button" data-t="reset"><i class="bi bi-trash3"></i> ล้างข้อมูลรายการ</button></div></div></div>`;
      box.onclick = async ev => {
        const b = ev.target.closest('[data-t]');
        if (!b) return;
        const op = b.dataset.t;
        let confirmText = '';
        if (op === 'reset') {
          confirmText = await SP.ui.prompt('ยืนยันล้างข้อมูลรายการ', { tone: 'danger', icon: 'bi-exclamation-octagon', okText: 'ล้างข้อมูล', required: true, placeholder: 'พิมพ์ ยืนยันล้างข้อมูล', html: 'พิมพ์คำว่า <b>ยืนยันล้างข้อมูล</b> เพื่อยืนยัน การล้างนี้ย้อนกลับในระบบไม่ได้ (เปิดไฟล์สำรองใน Drive ได้)' });
          if (!confirmText) return;
        } else if (op === 'demo' && !(await SP.ui.confirm('สร้างวัสดุตัวอย่าง 15 รายการ บริษัท ผู้เบิก และเอกสารรับเข้า-จ่ายออก เพื่อทดลองใช้ ลบทิ้งได้ภายหลังด้วยปุ่มล้างข้อมูลรายการ', { title: 'สร้างข้อมูลตัวอย่าง', okText: 'สร้าง', icon: 'bi-magic' }))) return;
        SP.ui.busy(b, true, 'กำลังทำงาน...');
        try {
          const r = await SP.api('tools.run', { op: op, confirm: confirmText }, { timeout: 300000 });
          if (op === 'rebuild') { SP.applyLots(r.lots_active); SP.toast('คำนวณยอดใหม่แล้ว ' + r.lots + ' ล็อต จาก ' + r.movements + ' รายการเคลื่อนไหว'); }
          else if (op === 'backup') SP.ui.alert('สำรองข้อมูลแล้ว', `ไฟล์ <b>${e(r.file.name)}</b><br><a href="${e(r.file.url)}" target="_blank" rel="noopener">เปิดไฟล์สำรอง</a>`, { icon: 'bi-cloud-check', tone: 'success' });
          else if (op === 'triggers') SP.toast('ติดตั้งแล้ว: ' + r.triggers.join(', '));
          else if (op === 'demo') { await SP.refresh(); SP.toast('สร้างข้อมูลตัวอย่างแล้ว ' + r.items + ' รายการ'); }
          else if (op === 'reset') { await SP.refresh(); SP.ui.alert('ล้างข้อมูลแล้ว', 'สำรองข้อมูลก่อนล้างไว้ที่ <b>' + e(r.backup.name) + '</b> ใน Google Drive', { icon: 'bi-check2-circle', tone: 'success' }); }
          if (SP.state.page === 'settings' && this.cur === 'tools') this.open('tools');
        } catch (er) { SP.err(er); } finally { SP.ui.busy(b, false); }
      };
    },

    /* ---------- การเชื่อมต่อ ---------- */
    sec_connect(box) {
      const local = SP.store.get('api_url', '');
      const cfgUrl = (window.LABSUPPLY_CONFIG || {}).API_URL || '';
      box.innerHTML = `<div class="small mb-3">หน้าเว็บนี้คุยกับ Google Apps Script ผ่าน URL ด้านล่าง ${local ? '<span class="b-soft b-warning">กำลังใช้ค่าที่ตั้งเฉพาะเครื่องนี้</span>' : '<span class="b-soft b-success">ใช้ค่าจาก js/config.js</span>'}</div>
        <div class="mb-3"><label class="form-label">URL ที่ใช้อยู่</label><input class="form-control" value="${e(SP.apiUrl())}" readonly></div>
        ${SP.isAdmin() ? `<div class="mb-2"><label class="form-label" for="cnUrl">ตั้ง URL เฉพาะเครื่องนี้</label><input class="form-control" id="cnUrl" value="${e(local)}" placeholder="${e(cfgUrl || 'https://script.google.com/macros/s/.../exec')}"></div>
        <div class="d-flex gap-2 flex-wrap"><button class="btn btn-primary" type="button" id="cnSave"><i class="bi bi-check2"></i> บันทึกเฉพาะเครื่องนี้</button><button class="btn btn-light" type="button" id="cnClear">ใช้ค่าจาก config.js</button></div>
        <div class="g-note info mt-3"><i class="bi bi-info-circle"></i><div class="small">เมื่อแก้ Code.gs ให้ Deploy แบบ "จัดการการทำให้ใช้งานได้ > แก้ไข > เวอร์ชันใหม่" URL จะเหมือนเดิม ถ้าสร้างการทำให้ใช้งานได้รายการใหม่ URL จะเปลี่ยน ต้องแก้ js/config.js บน GitHub</div></div>` : ''}`;
      if (!SP.isAdmin()) return;
      SP.$('#cnSave', box).addEventListener('click', () => {
        const v = SP.$('#cnUrl', box).value.trim();
        if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(v)) return SP.toast('URL ต้องขึ้นต้น https://script.google.com/ และลงท้าย /exec', 'warning');
        SP.store.set('api_url', v);
        SP.toast('บันทึกแล้ว ระบบจะโหลดใหม่');
        setTimeout(() => location.reload(), 800);
      });
      SP.$('#cnClear', box).addEventListener('click', () => { SP.store.del('api_url'); SP.toast('ใช้ค่าจาก config.js แล้ว'); setTimeout(() => location.reload(), 800); });
    },
  };
})();
