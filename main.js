
// main.js: PWA卓管理システム（5機能追加）

class Table {
  constructor(number, maxGuests, isCounter = false) {
    this.number = number;
    this.maxGuests = maxGuests;
    this.status = '空席';
    this.isCounter = isCounter;
    this.currentGuests = 0;
    this.startTime = null;
    this.history = [];
    this.timerStart = null;
    this.timerDuration = null;
    this.lastOrderDuration = null;
    this.timerInterval = null;
  }

  setStatus(status, guests = 0) {
    if (!['利用中', '空席', '予約席'].includes(status)) return;
    if (status === '利用中') {
      this.startTime = new Date();
      this.currentGuests = guests;
    } else if (this.status === '利用中' && status === '空席') {
      const endTime = new Date();
      if (confirm(`卓${this.number} の利用履歴を保存しますか？`)) {
        this.history.push({ guests: this.currentGuests, start: this.startTime, end: endTime });
        saveHistory(); // 永続保存
      }
      this.currentGuests = 0;
      this.startTime = null;
      this.timerStart = null;
      this.timerDuration = null;
      this.lastOrderDuration = null;
      clearInterval(this.timerInterval);
    }
    this.status = status;
  }

  getTimerText() {
    if (!this.timerStart || !this.timerDuration) return "";
    const now = new Date();
    const end = this.timerStart.getTime() + this.timerDuration;
    const lo = this.lastOrderDuration ? this.timerStart.getTime() + this.lastOrderDuration : null;
    const rFull = Math.floor((end - now.getTime()) / 60000);
    const rLO = lo ? Math.floor((lo - now.getTime()) / 60000) : null;
    const loText = rLO !== null ? `LO: ${rLO}分` : "";
    return rFull > 0 ? `残り: ${rFull}分 ${loText}` : "時間超過";
  }
}

let tables = [];

function renderTables() {
  const container = document.getElementById('table-container');
  container.innerHTML = '';
  tables.forEach((table, index) => {
    const div = document.createElement('div');
    div.className = 'table';
    div.style.background = table.status === '利用中' ? 'tomato' : table.status === '予約席' ? 'lightgreen' : 'lightblue';
    div.style.padding = '10px';
    div.style.margin = '5px';
    div.style.border = '1px solid #ccc';
    div.innerHTML = `<strong>${table.isCounter ? 'カ' : 'テ'}${table.number}</strong><br>${table.status}<br>${table.getTimerText()}
    <br><button onclick="setTimer(${index})">⏱</button>
    <button onclick="clearTimer(${index})">🛑</button>`;
    div.onclick = () => showTableMenu(index);
    container.appendChild(div);
  });
}

function setTimer(index) {
  const table = tables[index];
  const duration = parseInt(prompt('席時間（分）', 120));
  const lo = parseInt(prompt('ラストオーダー（分）', 90));
  table.timerStart = new Date();
  table.timerDuration = duration * 60000;
  table.lastOrderDuration = lo * 60000;

  table.timerInterval = setInterval(() => {
    const now = new Date().getTime();
    const end = table.timerStart.getTime() + table.timerDuration;
    const loTime = table.timerStart.getTime() + table.lastOrderDuration;
    if (Math.abs(end - now) < 1100 || Math.abs(loTime - now) < 1100) {
      const beep = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
      beep.play();
    }
    renderTables();
  }, 1000);

  saveTables();
}

function clearTimer(index) {
  const table = tables[index];
  table.timerStart = null;
  table.timerDuration = null;
  table.lastOrderDuration = null;
  clearInterval(table.timerInterval);
  renderTables();
  saveTables();
}

function showTableMenu(index) {
  const t = tables[index];
  const modal = document.createElement('div');
  modal.style = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:20px;z-index:1000';
  modal.innerHTML = `
    <h3>卓${t.number}</h3>
    <button onclick="applyStatus(${index}, '利用中')">利用中</button>
    <button onclick="applyStatus(${index}, '予約席')">予約席</button>
    <button onclick="applyStatus(${index}, '空席')">空席</button>
    <button onclick="deleteTable(${index})">削除</button>
    <br><button onclick="this.parentElement.remove()">閉じる</button>
  `;
  document.body.appendChild(modal);
}

function applyStatus(index, status) {
  const guests = status === '利用中' ? parseInt(prompt('人数を入力')) || 1 : 0;
  tables[index].setStatus(status, guests);
  saveTables();
  renderTables();
  document.querySelectorAll('div[style*="z-index"]')?.forEach(e => e.remove());
}

function saveTables() {
  localStorage.setItem('tableData', JSON.stringify(tables));
}

function saveHistory() {
  const historyData = tables.map(t => ({ number: t.number, history: t.history }));
  localStorage.setItem('tableHistory', JSON.stringify(historyData));
}

function loadHistory() {
  const raw = localStorage.getItem('tableHistory');
  if (raw) {
    const histMap = JSON.parse(raw);
    histMap.forEach(h => {
      const match = tables.find(t => t.number === h.number);
      if (match) match.history = h.history || [];
    });
  }
}

function showHistory() {
  const modal = document.createElement('div');
  modal.style = 'position:fixed;top:10%;left:50%;transform:translateX(-50%);background:white;padding:20px;z-index:1000;max-height:80vh;overflow:auto;width:90%;';
  let content = '<h3>利用履歴</h3>';
  tables.forEach(t => {
    if (t.history.length > 0) {
      content += `<strong>${t.isCounter ? 'カ' : 'テ'}${t.number}</strong><br>`;
      t.history.forEach(h => {
        const start = new Date(h.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const end = new Date(h.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        content += `・${start}〜${end}：${h.guests}名様<br>`;
      });
      content += '<br>';
    }
  });
  modal.innerHTML = content + '<button onclick="this.parentElement.remove()">閉じる</button>';
  document.body.appendChild(modal);
}

function resetApp() {
  if (confirm('すべてのテーブル・履歴・セットを削除しますか？')) {
    localStorage.clear();
    location.reload();
  }
}

function saveSet() {
  const name = prompt("保存するセット名を入力");
  if (!name) return;
  const sets = JSON.parse(localStorage.getItem("tableSets") || "{}");
  sets[name] = tables.map(t => ({
    number: t.number,
    maxGuests: t.maxGuests,
    isCounter: t.isCounter
  }));
  localStorage.setItem("tableSets", JSON.stringify(sets));
  alert(`「${name}」として保存しました`);
}

function loadSet() {
  const sets = JSON.parse(localStorage.getItem("tableSets") || "{}");
  const modal = document.createElement('div');
  modal.style = 'position:fixed;top:10%;left:50%;transform:translateX(-50%);background:white;padding:20px;z-index:1000';
  modal.innerHTML = '<h3>保存された卓セット</h3>';
  Object.entries(sets).forEach(([key, val]) => {
    const row = document.createElement('div');
    row.innerHTML = `${key} 
      <button onclick='applySet("${key}")'>読み込み</button>
      <button onclick='deleteSet("${key}")'>削除</button>`;
    modal.appendChild(row);
  });
  const close = document.createElement('button');
  close.textContent = "閉じる";
  close.onclick = () => modal.remove();
  modal.appendChild(close);
  document.body.appendChild(modal);
}

function applySet(name) {
  const sets = JSON.parse(localStorage.getItem("tableSets") || "{}");
  tables = sets[name].map(o => Object.assign(new Table(), o));
  saveTables();
  renderTables();
  alert(`「${name}」を読み込みました`);
  document.querySelectorAll('div[style*="z-index"]')?.forEach(e => e.remove());
}

function deleteSet(name) {
  const sets = JSON.parse(localStorage.getItem("tableSets") || "{}");
  delete sets[name];
  localStorage.setItem("tableSets", JSON.stringify(sets));
  alert(`「${name}」を削除しました`);
  document.querySelectorAll('div[style*="z-index"]')?.forEach(e => e.remove());
}

window.onload = () => {
  const raw = localStorage.getItem('tableData');
  tables = raw ? JSON.parse(raw).map(obj => Object.assign(new Table(), obj)) : [];
  if (tables.length === 0) tables = [new Table(1, 2, true), new Table(2, 4), new Table(3, 6)];
  loadHistory();
  renderTables();

  const menu = document.createElement('button');
  menu.textContent = '☰ メニュー';
  menu.style.position = 'fixed';
  menu.style.top = '10px';
  menu.style.left = '10px';
  menu.onclick = () => {
    const panel = document.createElement('div');
    panel.style = 'position:fixed;top:50px;left:10px;background:white;border:1px solid #ccc;padding:10px;z-index:1000;';
    panel.innerHTML = `
      <button onclick="saveSet()">卓セット保存</button><br>
      <button onclick="loadSet()">卓セット読込/削除</button><br>
      <button onclick="showHistory()">利用履歴</button><br>
      <button onclick="resetApp()">初期化</button><br>
      <button onclick="this.parentElement.remove()">閉じる</button>`;
    document.body.appendChild(panel);
  };
  document.body.appendChild(menu);
};
