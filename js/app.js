/**
 * LabSupply app: เริ่มระบบ, ติดตั้ง PWA, service worker
 * โหลดเป็นไฟล์สุดท้าย หลังไฟล์หน้าเว็บทุกไฟล์ลงทะเบียน SP.pages ครบแล้ว
 */
(function () {
  'use strict';
  const SP = window.SP;

  SP.install = {
    evt: null,
    refresh() { SP.$$('.sp-install').forEach(x => x.classList.toggle('d-none', !this.evt)); },
    async prompt() {
      if (!this.evt) return SP.ui.alert('ติดตั้งเป็นแอป', 'iPhone: แตะปุ่มแชร์ของ Safari แล้วเลือก <b>เพิ่มไปยังหน้าจอโฮม</b><br>Android: เมนูจุดสามจุดของ Chrome แล้วเลือก <b>ติดตั้งแอป</b>', { icon: 'bi-phone' });
      this.evt.prompt();
      try { await this.evt.userChoice; } catch (e) { /* ignore */ }
      this.evt = null;
      this.refresh();
    },
  };
  window.addEventListener('beforeinstallprompt', ev => { ev.preventDefault(); SP.install.evt = ev; SP.install.refresh(); });
  window.addEventListener('appinstalled', () => { SP.install.evt = null; SP.install.refresh(); SP.toast('ติดตั้งแอปแล้ว'); });

  SP.start = async function () {
    SP.shell.bindGlobal();
    if (!SP.apiUrl()) { SP.login.show('setup'); return; }
    const t = SP.store.get('token', '');
    if (!t) { SP.login.show('login'); return; }
    SP.state.token = t;
    try {
      await SP.boot();
    } catch (er) {
      if (er.code === 'AUTH') return;
      SP.login.show('login');
      SP.toast(er.message, 'danger');
    }
  };

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { /* ไม่มี sw ก็ใช้งานได้ */ }); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => SP.start());
  else SP.start();
})();
