
// main.js – PWA卓管理システム v3.0 完全版 (2025‑05‑13)
// --------------------------------------------------
// ES5 (iOS 12 互換) / IIFE / PWA-ready
// --------------------------------------------------

(function () {
  "use strict";

  var STORAGE_KEY  = "tableData_v2";
  var STORAGE_HIST = "tableHistory_v2";
  var ONE_MIN = 60000;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function now() { return Date.now(); }
  function beep () {
    var a = new Audio("beep_short.wav");
    a.currentTime = 0;
    a.play().catch(function(){});
  }

  function Table(o) {
    o = o || {};
    this.number            = o.number;
    this.maxGuests         = o.maxGuests;
    this.isCounter         = !!o.isCounter;
    this.status            = o.status || "空席";
    this.currentGuests     = o.currentGuests || 0;
    this.timerStart        = o.timerStart ? new Date(o.timerStart) : null;
    this.timerDuration     = o.timerDuration || null;
    this.lastOrderDuration = o.lastOrderDuration || null;
    this.history           = o.history || [];
    this.timerInterval     = null;
  }

  Table.prototype._saveHistoryIfNeeded = function () {
    if (this.status !== "利用中" || !this.timerStart) return;
    var end = new Date();
    if (confirm("卓" + this.number + " の利用履歴を保存しますか？")) {
      this.history.push({ guests: this.currentGuests, start: this.timerStart, end: end });
      Storage.saveHistory();
    }
  };

  Table.prototype.setStatus = function (status, guests) {
    guests = guests || 0;
    if (['利用中','空席','予約席'].indexOf(status) === -1) return;

    if (status === '利用中') {
      this.currentGuests = guests;
      if (!this.timerStart) this.timerStart = new Date();
    }

    if (status === '空席' && this.status === '利用中') {
      this._saveHistoryIfNeeded();
      clearInterval(this.timerInterval);
      this.currentGuests = 0;
      this.timerStart = this.timerDuration = this.lastOrderDuration = null;
    }
    this.status = status;
  };

  Table.prototype.startTimer = function(durMin, loMin){
    this.timerStart = new Date();
    this.timerDuration = (durMin||120)*ONE_MIN;
    this.lastOrderDuration = (loMin||90)*ONE_MIN;
    this._startInterval();
  };
  Table.prototype.adjustRemaining = function(min){
    this.timerStart = new Date();
    this.timerDuration = min*ONE_MIN;
  };
  Table.prototype.clearTimer = function(){
    clearInterval(this.timerInterval);
    this.timerStart = this.timerDuration = this.lastOrderDuration = null;
  };
  Table.prototype._startInterval = function(){
    var self=this;
    clearInterval(self.timerInterval);
    self.timerInterval = setInterval(function(){self._tick();},1000);
  };
  Table.prototype._tick = function(){
    if(!this.timerStart) return;
    var diffLO = (this.timerStart.getTime()+this.lastOrderDuration) - now();
    var diffEnd= (this.timerStart.getTime()+this.timerDuration) - now();
    if(Math.abs(diffLO)<900) beep();
    if(Math.abs(diffEnd)<900) beep();
    UI.render();
  };
  Table.prototype.timerText = function(){
    if(!this.timerStart||!this.timerDuration) return "";
    var remain = Math.ceil((this.timerStart.getTime()+this.timerDuration-now())/ONE_MIN);
    var remainLO= Math.ceil((this.timerStart.getTime()+this.lastOrderDuration-now())/ONE_MIN);
    return remain>0?"残り:"+remain+"分 / LO:"+remainLO+"分":"時間超過";
  };

  var Storage = {
    loadTables:function(){
      var raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return [];
      return JSON.parse(raw).map(function(o){return new Table(o);});
    },
    saveTables:function(){
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
    },
    saveHistory:function(){
      localStorage.setItem(STORAGE_HIST, JSON.stringify(tables.map(function(t){return t.history;})));
    },
    loadHistory:function(){
      var raw = localStorage.getItem(STORAGE_HIST);
      if(!raw) return;
      var arr = JSON.parse(raw);
      tables.forEach(function(t,i){ t.history = arr[i] || [];});
    }
  };

  var tables = Storage.loadTables();
  Storage.loadHistory();

  var Core = {
    addTable:function(){
      var num = parseInt(prompt('卓番（数字）'));
      if(!num || tables.some(function(t){return t.number===num;})) return alert('卓番不正 or 重複');
      var cap = parseInt(prompt('利用可能人数')); if(!cap) return;
      var isC = confirm('カウンター席ですか？');
      tables.push(new Table({number:num,maxGuests:cap,isCounter:isC}));
      Storage.saveTables(); UI.render();
    },
    allocateGuests:function(){
      var g = parseInt(prompt('来店人数を入力')); if(!g) return;
      var cand = tables.filter(function(t){return t.status==='空席'&&t.maxGuests>=g;})
        .sort(function(a,b){return (a.maxGuests-b.maxGuests)||(a.number-b.number);});
      if(!cand.length) return alert('該当する空席がありません');
      cand[0].setStatus('利用中',g); UI.render();
    },
    setStatus:function(idx,status){
      var guests = status==='利用中'?(parseInt(prompt('人数を入力'))||1):0;
      tables[idx].setStatus(status,guests); UI.render(); UI.closeModal();
    },
    setCustomTimer:function(idx){
      var remain = parseInt(prompt('新しい残り時間（分）を入力')); if(!remain) return;
      tables[idx].adjustRemaining(remain); UI.render(); UI.closeModal();
    },
    deleteTable:function(idx){
      if(!confirm('卓を削除しますか？')) return;
      tables.splice(idx,1); UI.render(); UI.closeModal();
    }
  };

  var UI = {
    init:function(){
      this.container = $('#table-container');
      if(!this.container){
        this.container = document.createElement('div');
        this.container.id='table-container';
        this.container.style.padding='10px';
        document.body.appendChild(this.container);
      }
      this._createGlobalButtons();
      this.render();
    },
    _createGlobalButtons:function(){
      if($('#add-table-btn')) return;
      var add=document.createElement('button'); add.id='add-table-btn'; add.textContent='＋ 卓追加'; add.onclick=Core.addTable;
      var alloc=document.createElement('button'); alloc.id='allocate-btn'; alloc.textContent='➕ 入店'; alloc.style.marginLeft='8px'; alloc.onclick=Core.allocateGuests;
      document.body.insertBefore(alloc,document.body.firstChild);
      document.body.insertBefore(add,document.body.firstChild);
    },
    render:function(){
      this.container.innerHTML='';
      tables.sort(function(a,b){return a.number-b.number;}).forEach(function(t,idx){
        var card=document.createElement('div');
        card.className='table';
        card.style.cssText='background:'+ (t.status==='利用中'?'tomato':(t.status==='予約席'?'lightgreen':'lightblue'))+';padding:8px;margin:5px;border-radius:6px;cursor:pointer';
        card.innerHTML='<strong>'+ (t.isCounter?'カ':'テ')+t.number+'</strong><br>'+t.status+'<br>'+t.timerText();
        card.onclick=function(){ UI.showMenu(idx); };
        UI.container.appendChild(card);
      });
      Storage.saveTables();
    },
    showMenu:function(idx){
      var t = tables[idx]; this.closeModal();
      var m=document.createElement('div'); m.id='modal';
      m.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:16px;z-index:2000;border:1px solid #aaa;border-radius:6px;max-width:260px;text-align:center;';
      m.innerHTML = '<h3>卓'+t.number+'</h3>'+
        '<button onclick="Core.setStatus('+idx+',\'利用中\')">利用中</button>'+
        '<button onclick="Core.setStatus('+idx+',\'予約席\')">予約席</button>'+
        '<button onclick="Core.setStatus('+idx+',\'空席\')">空席</button><br>'+
        '<button onclick="Core.setCustomTimer('+idx+')">タイマー変更</button>'+
        '<button onclick="Core.deleteTable('+idx+')">卓を削除</button><br><br>'+
        '<button onclick="UI.closeModal()">閉じる</button>';
      document.body.appendChild(m);
    },
    closeModal:function(){
      var m = document.getElementById('modal');
      if(m) m.remove();
    }
  };

  window.addEventListener('load', function(){ UI.init(); });

})();
