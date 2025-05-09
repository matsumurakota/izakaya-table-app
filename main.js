class Table {
  constructor(number, maxGuests, isCounter = false) {
    this.number = number;
    this.maxGuests = maxGuests;
    this.status = '空席';
    this.isCounter = isCounter;
    this.currentGuests = 0;
    this.startTime = null;
    this.timerStart = null;
    this.timerDuration = null;
    this.history = [];
  }

  setStatus(status, guests = 0) {
    const now = new Date();
    if (status === '利用中') {
      this.startTime = now;
      this.currentGuests = guests;
      this.timerStart = now;
      this.timerDuration = 90 * 60000;
    } else if (this.status === '利用中' && status === '空席') {
      const endTime = now;
      const duration = (endTime - this.startTime) / 60000;
      if (duration > 5) {
        this.history.push({ guests: this.currentGuests, start: this.startTime, end: endTime });
      }
      this.startTime = null;
      this.timerStart = null;
      this.timerDuration = null;
      this.currentGuests = 0;
    }
    this.status = status;
  }

  getTimerText() {
    if (this.timerStart && this.timerDuration) {
      const now = new Date();
      const remaining = this.timerStart.getTime() + this.timerDuration - now.getTime();
      if (remaining > 0) {
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        return `残り ${minutes}:${seconds.toString().padStart(2, '0')}`;
      } else {
        return "時間超過";
      }
    }
    return "";
  }
}

let tables = [];

function renderTables() {
  const container = document.getElementById('table-container');
  container.innerHTML = '';
  tables.forEach((t, index) => {
    const div = document.createElement('div');
    div.className = `table ${t.status}`;
    div.innerHTML = `<strong>${t.isCounter ? 'カ' : 'テ'}${t.number}</strong><br>${t.status}<br>${t.getTimerText()}`;
    div.onclick = () => editTable(index);
    container.appendChild(div);
  });
}

function editTable(index) {
  const t = tables[index];
  const guests = parseInt(prompt('人数を入力', '2')) || 0;
  const status = prompt('状態を入力（利用中, 空席, 予約席）', t.status);
  if (['利用中', '空席', '予約席'].includes(status)) {
    t.setStatus(status, guests);
    saveTables();
    renderTables();
  }
}

function addTable() {
  const number = parseInt(prompt('卓番号')) || tables.length + 1;
  const size = parseInt(prompt('最大人数')) || 4;
  const isCounter = confirm('カウンター席ですか？');
  tables.push(new Table(number, size, isCounter));
  saveTables();
  renderTables();
}

function saveTables() {
  localStorage.setItem('tableData', JSON.stringify(tables));
}

function loadTables() {
  const saved = JSON.parse(localStorage.getItem('tableData') || '[]');
  tables = saved.map(obj => Object.assign(new Table(), obj));
  renderTables();
}

window.addTable = addTable;
window.saveTables = saveTables;
window.loadTables = loadTables;

setInterval(renderTables, 1000);
window.onload = loadTables;
