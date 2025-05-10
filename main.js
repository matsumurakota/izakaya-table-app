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

// 以下略（本番では完全なコードを再展開）
