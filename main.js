
// main.js – PWA卓管理システム v2.2 (2025‑05‑13)
// --------------------------------------------------
// Core & UI fully implemented – fixed missing references causing blank screen.
// --------------------------------------------------

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const beep = new Audio('beep_short.ogg');
const now = () => Date.now();
const playBeep = () => { beep.currentTime = 0; beep.play().catch(()=>{}); };

// -------------------- Data --------------------
class Table {
  constructor(obj = {}) {
    const { number, maxGuests, isCounter=false, status='空席', currentGuests=0,
            timerStart=null, timerDuration=null, lastOrderDuration=null, history=[] } = obj;
    Object.assign(this, { number, maxGuests, isCounter, status, currentGuests,
                          timerStart, timerDuration, lastOrderDuration, history });
    this.timerInterval = null;
  }

  setStatus(status, guests = 0) {
    if (!['利用中','空席','予約席'].includes(status)) return;
    if (status === '利用中') {
      this.currentGuests = guests;
      this.timerStart ??= new Date();
    }
    if (this.status === '利用中' && status === '空席') {
      const end = new Date();
      if (confirm(`卓${this.number} の利用履歴を保存しますか？`)) {
        this.history.push({ guests:this.currentGuests, start:this.timerStart, end });
        Storage.saveHistory();
      }
      clearInterval(this.timerInterval);
      Object.assign(this, { currentGuests:0, timerStart:null, timerDuration:null, lastOrderDuration:null });
    }
    this.status = status;
  }

  startTimer(durationMin=120, loMin=90) {
    this.timerStart = new Date();
    this.timerDuration = durationMin*60000;
    this.lastOrderDuration = loMin*60000;
    this._initInterval();
  }
  adjustRemaining(min) {
    this.timerStart = new Date();
    this.timerDuration = min*60000;
  }
  clearTimer() {
    clearInterval(this.timerInterval);
    Object.assign(this,{timerStart:null,timerDuration:null,lastOrderDuration:null});
  }
  _initInterval(){
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(()=>this._tick(),1000);
  }
  _tick(){
    if(!this.timerStart) return;
    const diffLO=(this.timerStart.getTime()+this.lastOrderDuration)-now();
    const diffEnd=(this.timerStart.getTime()+this.timerDuration)-now();
    if(Math.abs(diffLO)<900) playBeep();
    if(Math.abs(diffEnd)<900) playBeep();
    UI.render();
  }
  get timerText(){
    if(!this.timerStart||!this.timerDuration) return '';
    const remain=Math.ceil((this.timerStart.getTime()+this.timerDuration-now())/60000);
    const remainLO=Math.ceil((this.timerStart.getTime()+this.lastOrderDuration-now())/60000);
    return remain>0?`残り:${remain}分 / LO:${remainLO}分`:'時間超過';
  }
}

class Storage{
  static KEY='tableData_v2';
  static HISTORY='tableHistory_v2';
  static loadTables(){
    const raw=localStorage.getItem(Storage.KEY);
    return raw?JSON.parse(raw).map(o=>new Table(o)):[];
  }
  static saveTables(){localStorage.setItem(Storage.KEY,JSON.stringify(tables));}
  static saveHistory(){localStorage.setItem(Storage.HISTORY,JSON.stringify(tables.map(t=>t.history))); }
  static loadHistory(){
    const raw=localStorage.getItem(Storage.HISTORY); if(!raw) return;
    const arr=JSON.parse(raw); tables.forEach((t,i)=>t.history=arr[i]||[]);
  }
}

// -------------------- Core --------------------
let tables = Storage.loadTables(); Storage.loadHistory();

const Core={
  allocateGuests(){
    const g=parseInt(prompt('来店人数を入力')); if(!g) return;
    const cand=tables.filter(t=>t.status==='空席'&&t.maxGuests>=g)
      .sort((a,b)=>(a.maxGuests-b.maxGuests)||(a.number-b.number));
    if(!cand.length) return alert('該当する空席がありません');
    cand[0].setStatus('利用中',g); UI.render();
  },
  setStatus(idx,status){
    const guests=status==='利用中'?(parseInt(prompt('人数を入力'))||1):0;
    tables[idx].setStatus(status,guests); UI.render(); document.getElementById('modal')?.remove();
  },
  setCustomTimer(idx){
    const remain=parseInt(prompt('新しい残り時間（分）を入力')); if(!remain) return;
    tables[idx].adjustRemaining(remain); UI.render(); document.getElementById('modal')?.remove();
  },
  deleteTable(idx){
    if(!confirm('卓を削除しますか？')) return;
    tables.splice(idx,1); UI.render(); document.getElementById('modal')?.remove();
  }
};

// -------------------- UI --------------------
const UI={
  init(){
    this.container=document.getElementById('table-container');
    if(!this.container){
      this.container=document.createElement('div');
      this.container.id='table-container';
      this.container.style.padding='10px';
      document.body.appendChild(this.container);
    }
    this._createGlobalButtons();
    this.render();
  },
  _createGlobalButtons(){
    if($('#add-table-btn')) return;
    const addBtn=document.createElement('button');
    addBtn.id='add-table-btn';
    addBtn.textContent='＋ 卓追加';
    addBtn.onclick=()=>{
      const number=parseInt(prompt('卓番（数字）'));
      if(!number||tables.some(t=>t.number===number)) return alert('卓番不正 or 重複');
      const cap=parseInt(prompt('利用可能人数')); if(!cap) return;
      const isCounter=confirm('カウンター席ですか？');
      tables.push(new Table({number,maxGuests:cap,isCounter}));
      Storage.saveTables(); this.render();
    };
    const allocBtn=document.createElement('button');
    allocBtn.id='allocate-btn'; allocBtn.textContent='➕ 入店';
    allocBtn.style.marginLeft='8px'; allocBtn.onclick=Core.allocateGuests;
    document.body.prepend(allocBtn); document.body.prepend(addBtn);
  },
  render(){
    this.container.innerHTML='';
    tables.sort((a,b)=>a.number-b.number).forEach((t,idx)=>{
      const card=document.createElement('div');
      card.className='table';
      card.style.cssText=`background:${t.status==='利用中'?'tomato':t.status==='予約席'?'lightgreen':'lightblue'};padding:8px;margin:5px;border-radius:6px;cursor:pointer`;
      card.innerHTML=`<strong>${t.isCounter?'カ':'テ'}${t.number}</strong><br>${t.status}<br>${t.timerText}`;
      card.onclick=()=>UI.showMenu(idx); this.container.appendChild(card);
    });
    Storage.saveTables();
  },
  showMenu(idx){
    const t=tables[idx]; document.getElementById('modal')?.remove();
    const modal=document.createElement('div'); modal.id='modal';
    modal.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:16px;z-index:2000;border:1px solid #aaa;border-radius:6px;max-width:260px;text-align:center;';
    modal.innerHTML=`<h3>卓${t.number}</h3>
      <button onclick="Core.setStatus(${idx},'利用中')">利用中</button>
      <button onclick="Core.setStatus(${idx},'予約席')">予約席</button>
      <button onclick="Core.setStatus(${idx},'空席')">空席</button><br>
      <button onclick="Core.setCustomTimer(${idx})">タイマー変更</button>
      <button onclick="Core.deleteTable(${idx})">卓を削除</button><br><br>
      <button onclick="document.getElementById('modal').remove()">閉じる</button>`;
    document.body.appendChild(modal);
  }
};

window.addEventListener('load', UI.init);
