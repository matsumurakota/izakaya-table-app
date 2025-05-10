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
  }

  setStatus(status, guests = 0) {
    if (!['利用中', '空席', '予約席'].includes(status)) return;
    if (status === '利用中') {
      this.startTime = new Date();
      this.currentGuests = guests;
      this.timerStart = new Date();
      this.timerDuration = 90 * 60000;
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
    const remaining = this.timerStart.getTime() + this.timerDuration - now.getTime();
    if (remaining > 0) {
      const m = Math.floor(remaining / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      return `残り ${m}:${s.toString().padStart(2, '0')}`;
    } else {
      return "時間超過";
    }
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
    div.innerHTML = `<strong>${table.isCounter ? 'カ' : 'テ'}${table.number}</strong><br>${table.status}<br>${table.getTimerText()}`;
    div.onclick = () => showTableMenu(index);
    container.appendChild(div);
  });
}

function showTableMenu(index) {
  const modal = document.createElement('div');
  modal.style = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:20px;z-index:1000';
  modal.innerHTML = `
    <h3>卓${tables[index].number}</h3>
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

function deleteTable(index) {
  if (confirm('削除しますか？')) {
    tables.splice(index, 1);
    saveTables();
    renderTables();
  }
}

function autoAssignTable(guests) {
  const candidate = tables.find(t => t.status === '空席' && t.maxGuests >= guests);
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
  const controls = document.createElement('div');
  controls.id = 'controls';
  controls.innerHTML = `
    <button id="add-btn">卓を追加</button>
    <button id="assign-btn">人数で割当</button>
    <button id="history-btn">利用履歴を見る</button>
  `;
  document.body.insertBefore(controls, document.getElementById('table-container'));

  loadTables();
  if (tables.length === 0) {
    tables = [new Table(1, 2, true), new Table(2, 4), new Table(3, 6)];
  }
  renderTables();
  document.getElementById('add-btn').onclick = () => {
    const n = parseInt(prompt('卓番号'));
    const g = parseInt(prompt('最大人数'));
    const c = confirm('カウンターですか？');
    tables.push(new Table(n, g, c));
    saveTables();
    renderTables();
  };
  document.getElementById('assign-btn').onclick = () => {
    const guests = parseInt(prompt('人数を入力'));
    if (!isNaN(guests)) autoAssignTable(guests);
  };
  document.getElementById('history-btn').onclick = showHistory;
};
