// main.js – PWA卓管理システム v2.0 (2025‑05‑13)
// --------------------------------------------------
// 主要変更点
// 1. "入店人数→自動割り当て" 機能を復活（最適フィット: 空席かつ人数以上で最小収容人数の卓）
// 2. コードをモジュール化し可読性を向上（Storage / UI / Core Logic に分離）
// 3. 冗長ロジックを整理、ユーティリティ追加。
// --------------------------------------------------

/* =============================
  Utility helpers
============================= */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const beep = new Audio('beep_short.ogg');
const now = () => Date.now();

function playBeep() {
  beep.currentTime = 0;
  beep.play().catch(() => {});
}

/* =============================
  Data classes & persistence
============================= */
class Table {
  constructor({ number, maxGuests, isCounter = false, status = '空席', currentGuests = 0, timerStart = null, timerDuration = null, lastOrderDuration = null, history = [] } = {}) {
    Object.assign(this, { number, maxGuests, isCounter, status, currentGuests, timerStart, timerDuration, lastOrderDuration, history });
    this.timerInterval = null;
  }

  /* 状態更新関連 */
  setStatus(status, guests = 0) {
    if (!['利用中', '空席', '予約席'].includes(status)) return;
    if (status === '利用中') {
      this.currentGuests = guests;
      this.timerStart = new Date();
    }
    // 席を空にする場合履歴保存
    if (this.status === '利用中' && status === '空席') {
      const end = new Date();
      if (confirm(`卓${this.number} の利用履歴を保存しますか？`)) {
        this.history.push({ guests: this.currentGuests, start: this.timerStart, end });
        Storage.saveHistory();
      }
      clearInterval(this.timerInterval);
      Object.assign(this, { timerStart: null, timerDuration: null, lastOrderDuration: null, currentGuests: 0 });
    }
    this.status = status;
  }

  /* タイマー関連 */
  startTimer(durationMin = 120, loMin = 90) {
    this.timerStart = new Date();
    this.timerDuration = durationMin * 60000;
    this.lastOrderDuration = loMin * 60000;
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => this._tick(), 1000);
  }
  adjustRemaining(min) {
    this.timerStart = new Date();
    this.timerDuration = min * 60000;
  }
  clearTimer() {
    clearInterval(this.timerInterval);
    Object.assign(this, { timerStart: null, timerDuration: null, lastOrderDuration: null });
  }
  _tick() {
    const diffLO = (this.timerStart.getTime() + this.lastOrderDuration) - now();
    const diffEnd = (this.timerStart.getTime() + this.timerDuration) - now();
    if (Math.abs(diffLO) < 900) playBeep();
    if (Math.abs(diffEnd) < 900) playBeep();
    UI.render();
  }
  /* 表示用 */
  get timerText() {
    if (!this.timerStart || !this.timerDuration) return '';
    const remain = Math.ceil((this.timerStart.getTime() + this.timerDuration - now()) / 60000);
    const remainLO = Math.ceil((this.timerStart.getTime() + this.lastOrderDuration - now()) / 60000);
    return remain > 0 ? `残り: ${remain}分 / LO:${remainLO}分` : '時間超過';
  }
}

class Storage {
  static KEY = 'tableData_v2';
  static HISTORY = 'tableHistory_v2';
  static loadTables() {
    const raw = localStorage.getItem(this.KEY);
    return raw ? JSON.parse(raw).map(obj => new Table(obj)) : [];
  }
  static saveTables() {
    localStorage.setItem(this.KEY, JSON.stringify(tables));
  }
  static saveHistory() {
    localStorage.setItem(this.HISTORY, JSON.stringify(tables.map(t => t.history)));
  }
  static loadHistory() {
    const raw = localStorage.getItem(this.HISTORY);
    if (!raw) return;
    const all = JSON.parse(raw);
    tables.forEach((t, i) => t.history = all[i] || []);
  }
}

/* ========== Core state ========= */
let tables = Storage.loadTables();
Storage.loadHistory();

/* =============================
  UI Layer
============================= */
const UI = {
  init() {
    this.container = document.getElementById('table-container');
    this._createGlobalButtons();
    this.render();
  },
  _createGlobalButtons() {
    // 卓追加
    const addBtn = document.createElement('button');
    addBtn.textContent = '＋ 卓追加';
    addBtn.onclick = () => {
      const number = parseInt(prompt('卓番（数字）'));
      if (!number || tables.some(t => t.number === number)) return alert('卓番不正 or 重複');
      const cap = parseInt(prompt('利用可能人数'));
      if (!cap) return;
      const isCounter = confirm('カウンター席ですか？');
      tables.push(new Table({ number, maxGuests: cap, isCounter }));
      Storage.saveTables();
      this.render();
    };
    // 自動割り当て
    const allocBtn = document.createElement('button');
    allocBtn.textContent = '➕ 入店';
    allocBtn.style.marginLeft = '8px';
    allocBtn.onclick = Core.allocateGuests;

    document.body.prepend(allocBtn);
    document.body.prepend(addBtn);
  },
  render() {
    this.container.innerHTML = '';
    tables.sort((a, b) => a.number - b.number).forEach((t, idx) => {
      const card = document.createElement('div');
      card.className = 'table';
      card.style.cssText = `background:${t.status === '利用中' ? 'tomato' : t.status === '予約席' ? 'lightgreen' : 'lightblue'};padding:8px;margin:5px;border-radius:6px;cursor:pointer`;
      card.innerHTML = `<strong>${t.isCounter ? 'カ' : 'テ'}${t.number}</strong><br>${t.status}<br>${t.timerText}`;
      card.onclick = () => UI.showMenu(idx);
      this.container.appendChild(card);
    });
    Storage.saveTables();
  },
  showMenu(index) {
    const t = tables[index];
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:16px;z-index:2000;border:1px solid #aaa;border-radius:6px;';
    modal.innerHTML = `<h3>卓${t.number}</h3>
      <button onclick="Core.setStatus(${index}, '利用中')">利用中</button>
      <button onclick="Core.setStatus(${index}, '予約席')">予約席</button>
      <button onclick="Core.setStatus(${index}, '空席')">空席</button><br>
      <button onclick="Core.setCustomTimer(${index})">タイマー変更</button>
      <button onclick="Core.deleteTable(${index})">卓を削除</button><br><br>
      <button onclick="this.parentElement.remove()">閉じる</button>`;
    document.body.appendChild(modal);
  }
};

/* =============================
  Core business logic
============================= */
const Core = {
  allocateGuests() {
    const g = parseInt(prompt('来店人数を入力')); if (!g) return;
    // 空席かつ収容人数 >= g のテーブルを最小収容順 → 卓番号順でソート
    const candidate = tables.filter(t => t.status === '空席' && t.maxGuests >= g)
      .sort((a, b) => (a.maxGuests - b.maxGuests) || (a.number - b.number));
    if (!candidate.length) return alert('該当する空席がありません');
    const table = candidate[0];
    table.setStatus('利用中', g);
    UI.render();
  },
  setStatus(idx, status) {
    const guests = status === '利用中' ? (parseInt(prompt('人数を入力')) || 1) : 0;
    tables[idx].setStatus(status, guests);
    UI.render();
    $('div[style*="z-index:2000"]')?.remove();
  },
  setCustomTimer(idx) {
    const remain = parseInt(prompt('新しい残り時間（分）を入力')); if (!remain) return;
    tables[idx].adjustRemaining(remain);
    UI.render();
    $('div[style*="z-index:2000"]')?.remove();
  },
  deleteTable(idx) {
    if (!confirm('卓を削除しますか？')) return;
    tables.splice(idx, 1);
    UI.render();
    $('div[style*="z-index:2000"]')?.remove();
  }
};

/* =============================
  Init
============================= */
window.addEventListener('load', UI.init);
