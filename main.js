
// main.js: 一から再構築された卓管理システム（PWA対応）

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
      }
      this.currentGuests = 0;
      this.startTime = null;
      this.timerStart = null;
      this.timerDuration = null;
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
  container.style.display = 'flex';
  container.style.flexWrap = 'wrap';
  container.style.gap = '10px';
  container.innerHTML = '';
  tables.forEach((table, index) => {
    const div = document.createElement('div');
    div.className = 'table';
    div.style.padding = '10px';
    div.style.border = '1px solid #999';
    div.style.width = '100px';
    div.style.textAlign = 'center';
    div.style.background = table.status === '利用中' ? 'tomato' : table.status === '予約席' ? 'lightgreen' : 'lightblue';
    div.innerHTML = `<strong>${table.isCounter ? 'カ' : 'テ'}${table.number}</strong><br>${table.status}<br>${table.getTimerText()}`;
    div.onclick = () => showTableMenu(index);
    container.appendChild(div);
  });
}

function showTableMenu(index) {
  const t = tables[index];
  const modal = document.createElement('div');
  modal.style = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:20px;z-index:1000';
  modal.innerHTML = `
    <h3>卓${t.number}</h3>
    <button onclick="setTimer(${index})">タイマー設定</button><br>
    <button onclick="applyStatus(${index}, '利用中')">利用中</button>
    <button onclick="applyStatus(${index}, '予約席')">予約席</button>
    <button onclick="applyStatus(${index}, '空席')">空席</button>
    <button onclick="deleteTable(${index})">削除</button>
    <br><button onclick="this.parentElement.remove()">閉じる</button>
  `;
  document.body.appendChild(modal);

  const menuBtn = document.createElement('button');
  menuBtn.textContent = '☰ メニュー';
  menuBtn.style.position = 'fixed';
  menuBtn.style.top = '10px';
  menuBtn.style.left = '10px';
  menuBtn.onclick = () => {
    const menu = document.createElement('div');
    menu.style = 'position:fixed;top:50px;left:10px;background:white;border:1px solid #ccc;padding:10px;z-index:1000;';
    menu.innerHTML = `
      <button onclick="saveSet()">卓セットを保存</button><br>
      <button onclick="loadSet()">保存したセットを読み込む</button><br>
      <button onclick="showHistory()">利用履歴を見る</button><br>
      <button onclick="resetApp()">初期化</button><br>
      <button onclick="this.parentElement.remove()">閉じる</button>
    `;
    document.body.appendChild(menu);
  };
  document.body.appendChild(menuBtn);
}

function applyStatus(index, status) {
  const guests = status === '利用中' ? parseInt(prompt('人数を入力')) || 1 : 0;
  tables[index].setStatus(status, guests);
  saveTables();
  renderTables();
  document.querySelectorAll('div[style*="z-index"]')?.forEach(e => e.remove());
}

function deleteTable(index) {
  if (confirm('削除しますか？')) {
    tables.splice(index, 1);
    document.querySelectorAll('div[style*="z-index"]')?.forEach(e => e.remove());
    saveTables();
    renderTables();
  }
}

function autoAssignTable(guests) {
  let candidate = null;
  if (guests === 1) {
    candidate = tables.find(t => t.status === '空席' && t.isCounter);
  } else if (guests === 2) {
    candidate = tables.find(t => t.status === '空席' && t.maxGuests === 4);
    if (!candidate) candidate = tables.find(t => t.status === '空席' && t.isCounter);
  } else if (guests >= 3 && guests <= 4) {
    candidate = tables.find(t => t.status === '空席' && t.maxGuests === 4);
    if (!candidate) candidate = tables.find(t => t.status === '空席' && t.maxGuests === 6);
    if (!candidate) candidate = tables.find(t => t.status === '空席' && t.maxGuests === 5);
  } else if (guests === 5 || guests === 6) {
    candidate = tables.find(t => t.status === '空席' && t.maxGuests === 6);
  } else {
    alert('対応できる席がありません');
    return;
  }

  if (candidate) {
    candidate.setStatus('利用中', guests);
    alert(`卓${candidate.number} を割り当てました`);
    saveTables();
    renderTables();
  } else {
    alert('空席がありません');
  }
}

function saveTables() {
  localStorage.setItem('tableData', JSON.stringify(tables));
}

function setTimer(index) {
  const table = tables[index];
  const duration = parseInt(prompt('席時間（分）を入力', 120));
  const lo = parseInt(prompt('ラストオーダー時間（分）を入力', 90));
  if (!isNaN(duration)) table.timerDuration = duration * 60000;
  if (!isNaN(lo)) table.lastOrderDuration = lo * 60000;
  table.timerStart = new Date();
  saveTables();
  renderTables();
}

function resetApp() {
  if (confirm('すべてのテーブルと履歴を削除しますか？')) {
    localStorage.removeItem('tableData');
    location.reload();
  }
}

function loadTables() {
  const data = localStorage.getItem('tableData');
  if (data) {
    tables = JSON.parse(data).map(obj => Object.assign(new Table(), obj));
  }
}

function showHistory() {
  const modal = document.createElement('div');
  modal.style = 'position:fixed;top:10%;left:50%;transform:translateX(-50%);background:white;padding:20px;z-index:1000;max-height:80vh;overflow-y:auto;width:90%;';
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

window.onload = () => {
  loadTables();
  renderTables();
};
