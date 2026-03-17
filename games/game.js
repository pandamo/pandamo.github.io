import { getDisplayNameFromEmail, supabase } from './supabase.js'

class Game {
  constructor(user) {
    this.user = user;
    this.maxFaceValue = 1;
    this.maxRecord = 1;
    this.bottleCount = this.maxFaceValue + 1;
    this.bottles = [];
    this.history = [];
    this.selectedBottleIndex = null;
    this.maxCapacity = 10;
    this.storageKey = 'coinGameSave';
    this.isGameOver = false;
    this.pendingAnimation = null;
    this.debugCounter = 0;
    this.syncStatusEl = document.getElementById('sync-status');
    this.playerNameEl = document.getElementById('player-name');
    this.isSavingRemote = false;
    this.pendingRemoteSave = false;
    this.eventsBound = false;

    this.setPlayerName();
    this.bindAuthActions();
    this.init();
  }

  async init() {
    await this.ensureProfile();

    const loaded = await this.loadState();
    if (!loaded) {
      this.createFreshGame();
    }

    this.updateUI();
    this.setupEventListeners();
    this.checkGameOver();
  }

  setPlayerName() {
    if (!this.playerNameEl) return;
    this.playerNameEl.textContent = getDisplayNameFromEmail(this.user.email || '') || '玩家';
  }

  bindAuthActions() {
    const logoutBtn = document.getElementById('logout-btn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', async () => {
      const { error } = await supabase.auth.signOut();
      if (error) {
        this.setSyncStatus(`退出失败：${error.message}`, true);
        return;
      }
      window.location.href = './auth.html';
    });
  }

  setSyncStatus(message, isError = false) {
    if (!this.syncStatusEl) return;
    this.syncStatusEl.textContent = message;
    this.syncStatusEl.style.color = isError ? '#fca5a5' : '#93c5fd';
  }

  getStateSnapshot() {
    return {
      bottles: this.bottles,
      maxFaceValue: this.maxFaceValue,
      bottleCount: this.bottleCount,
      isGameOver: this.isGameOver,
      maxRecord: this.maxRecord,
    };
  }

  applyState(state) {
    this.bottles = state.bottles;
    this.maxFaceValue = state.maxFaceValue;
    this.bottleCount = state.bottleCount;
    this.isGameOver = state.isGameOver || false;
    this.maxRecord = state.maxRecord || 1;
  }

  createFreshGame() {
    this.maxFaceValue = 1;
    this.maxRecord = 1;
    this.bottleCount = this.maxFaceValue + 1;
    this.bottles = [];
    this.history = [];
    this.selectedBottleIndex = null;
    this.isGameOver = false;
    this.pendingAnimation = null;
    this.createBottles();
    this.dealInitialCoins();
    this.saveState();
  }

  async ensureProfile() {
    const { error } = await supabase.from('profiles').upsert({
      id: this.user.id,
      email: this.user.email,
      display_name: getDisplayNameFromEmail(this.user.email || ''),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      this.setSyncStatus(`资料同步失败：${error.message}`, true);
    }
  }

  async saveRemoteState() {
    if (this.isSavingRemote) {
      this.pendingRemoteSave = true;
      return;
    }

    this.isSavingRemote = true;
    this.setSyncStatus('正在同步云端存档...');

    const payload = {
      user_id: this.user.id,
      bottles: this.bottles,
      max_face_value: this.maxFaceValue,
      max_record: this.maxRecord,
      bottle_count: this.bottleCount,
      is_game_over: this.isGameOver,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('game_saves').upsert(payload);

    if (error) {
      this.setSyncStatus(`云端同步失败：${error.message}`, true);
    } else {
      this.setSyncStatus('云端存档已同步。');
    }

    this.isSavingRemote = false;

    if (this.pendingRemoteSave) {
      this.pendingRemoteSave = false;
      this.saveRemoteState();
    }
  }

  saveState() {
    const state = this.getStateSnapshot();
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (e) {
      console.warn('保存状态失败', e);
    }
    this.saveRemoteState();
  }

  async loadState() {
    const remoteLoaded = await this.loadRemoteState();
    if (remoteLoaded) {
      return true;
    }
    return this.loadLocalState(true);
  }

  async loadRemoteState() {
    this.setSyncStatus('正在读取云端存档...');
    const { data, error } = await supabase
      .from('game_saves')
      .select('bottles,max_face_value,bottle_count,is_game_over,max_record')
      .eq('user_id', this.user.id)
      .maybeSingle();

    if (error) {
      this.setSyncStatus(`读取云端存档失败：${error.message}`, true);
      return false;
    }

    if (!data) {
      this.setSyncStatus('没有找到云端存档，将尝试本地进度。');
      return false;
    }

    this.applyState({
      bottles: data.bottles,
      maxFaceValue: data.max_face_value,
      bottleCount: data.bottle_count,
      isGameOver: data.is_game_over,
      maxRecord: data.max_record,
    });

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.getStateSnapshot()));
    } catch (e) {
      console.warn('缓存远端存档失败', e);
    }

    this.setSyncStatus('已加载云端存档。');
    return true;
  }

  loadLocalState(migrate = false) {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const state = JSON.parse(saved);
        this.applyState(state);
        this.setSyncStatus(migrate ? '已加载本地进度，正在迁移到云端...' : '已加载本地进度。');
        if (migrate) {
          this.saveRemoteState();
        }
        return true;
      }
    } catch (e) {
      console.warn('加载状态失败', e);
      this.setSyncStatus('本地存档读取失败，将开始新游戏。', true);
    }
    return false;
  }

  async clearRemoteState() {
    const { error } = await supabase.from('game_saves').delete().eq('user_id', this.user.id);
    if (error) {
      this.setSyncStatus(`清理云端存档失败：${error.message}`, true);
    }
  }

  clearState() {
    const saved = localStorage.getItem(this.storageKey);
    const preservedMaxRecord = saved ? JSON.parse(saved).maxRecord : this.maxRecord;

    localStorage.removeItem(this.storageKey);
    this.clearRemoteState();

    this.maxRecord = preservedMaxRecord;
    this.maxFaceValue = 1;
    this.bottleCount = this.maxFaceValue + 1;
    this.bottles = [];
    this.history = [];
    this.selectedBottleIndex = null;
    this.isGameOver = false;
    this.pendingAnimation = null;

    this.createBottles();
    this.dealInitialCoins();
    this.updateUI();
    this.checkGameOver();
    this.saveState();
  }

  dealInitialCoins() {
    const initialCount = this.bottles.length * 3;
    for (let i = 0; i < initialCount; i++) {
      const randomIndex = Math.floor(Math.random() * this.bottles.length);
      if (this.bottles[randomIndex].length < this.maxCapacity) {
        this.bottles[randomIndex].push(1);
      }
    }
  }

  createBottles() {
    this.bottles = Array.from({ length: this.bottleCount }, () => []);
  }

  showState() {
    console.log(localStorage.getItem('coinGameSave'));
    document.getElementById('state').value = localStorage.getItem('coinGameSave');
  }

  readRecord() {
    const state = document.getElementById('state').value;
    if (state) {
      localStorage.setItem('coinGameSave', state);
    }
    location.reload();
  }

  debug() {
    this.debugCounter++;
    if (this.debugCounter > 10) {
      document.getElementById('showState').hidden = false;
      document.getElementById('readRecord').hidden = false;
      document.getElementById('state').hidden = false;
    }
  }

  setupEventListeners() {
    if (this.eventsBound) return;
    this.eventsBound = true;

    document.getElementById('showState').addEventListener('click', () => this.showState());
    document.getElementById('readRecord').addEventListener('click', () => this.readRecord());
    document.getElementById('status-bar').addEventListener('click', () => this.debug());
    document.getElementById('undo-btn').addEventListener('click', () => this.undo());
    document.getElementById('deal-btn').addEventListener('click', () => this.deal());
    document.getElementById('bottle-grid').addEventListener('click', (e) => {
      if (this.isGameOver) return;
      const bottleElement = e.target.closest('.bottle');
      if (bottleElement) {
        const index = parseInt(bottleElement.dataset.index);
        this.handleBottleClick(index);
      }
    });

    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('确定要重置游戏吗？此操作将清除所有进度！')) {
          this.clearState();
        }
      });
    }
  }

  handleBottleClick(index) {
    if (this.isGameOver) return;
    if (this.selectedBottleIndex === null) {
      if (this.bottles[index].length > 0) {
        this.selectedBottleIndex = index;
      }
    } else if (this.selectedBottleIndex === index) {
      this.selectedBottleIndex = null;
    } else {
      this.tryMove(this.selectedBottleIndex, index);
      this.selectedBottleIndex = null;
    }
    this.updateUI();
  }

  tryMove(fromIndex, toIndex) {
    const fromBottle = this.bottles[fromIndex];
    const toBottle = this.bottles[toIndex];

    if (fromBottle.length === 0) return;
    if (toBottle.length >= this.maxCapacity) return;

    const topValue = fromBottle[fromBottle.length - 1];
    let countToMove = 0;
    for (let i = fromBottle.length - 1; i >= 0; i--) {
      if (fromBottle[i] === topValue) {
        countToMove++;
      } else {
        break;
      }
    }

    if (toBottle.length > 0 && toBottle[toBottle.length - 1] !== topValue) {
      return;
    }

    const availableSpace = this.maxCapacity - toBottle.length;
    const actualMoveCount = Math.min(countToMove, availableSpace);

    if (actualMoveCount > 0) {
      this.saveHistory();
      const movedCoins = this.bottles[fromIndex].splice(this.bottles[fromIndex].length - actualMoveCount, actualMoveCount);
      this.updateUI();

      this.playMoveAnimation(toIndex, movedCoins, () => {
        this.saveState();
        this.checkGameOver();
        this.pendingAnimation = null;
      });
    }
  }

  checkMerge(index) {
    const bottle = this.bottles[index];
    if (bottle.length === this.maxCapacity) {
      const firstValue = bottle[0];
      const allSame = bottle.every((v) => v === firstValue);
      if (allSame) {
        const newValue = firstValue + 1;
        this.bottles[index] = [newValue];
        if (newValue > this.maxFaceValue) {
          this.maxFaceValue = newValue;
        }
        if (newValue > this.maxRecord) {
          this.maxRecord = newValue;
        }
        return true;
      }
    }
    return false;
  }

  syncBottleCount() {
    this.bottleCount = this.maxFaceValue + 1;
    while (this.bottles.length < this.bottleCount) {
      this.bottles.push([]);
    }
  }

  deal() {
    if (this.isGameOver) return;

    this.saveHistory();
    const coinsToDistribute = this.bottles.length * 2;
    this.syncBottleCount();

    let remaining = coinsToDistribute;
    console.log('remaining: ', remaining);

    while (remaining > 0) {
      const availableBottleIndices = this.bottles
        .map((b, i) => (b.length < this.maxCapacity ? i : -1))
        .filter((i) => i !== -1);

      if (availableBottleIndices.length === 0) break;

      const randomIndex = availableBottleIndices[Math.floor(Math.random() * availableBottleIndices.length)];
      const randomValue = Math.floor(Math.random() * this.maxFaceValue) + 1;
      this.bottles[randomIndex].push(randomValue);

      this.checkMerge(randomIndex);
      remaining--;
    }

    this.syncBottleCount();
    this.updateUI();
    this.saveState();
    this.saveHistory(true);
    this.checkGameOver();
  }

  checkGameOver() {
    const hasValidMove = this.checkHasValidMove();

    if (!hasValidMove) {
      this.isGameOver = true;
      this.showGameOver();
    } else {
      this.isGameOver = false;
    }
  }

  checkHasValidMove() {
    for (let i = 0; i < this.bottles.length; i++) {
      if (this.bottles[i].length < this.maxCapacity) {
        return true;
      }
    }

    for (let i = 0; i < this.bottles.length; i++) {
      const fromBottle = this.bottles[i];
      if (fromBottle.length === 0) continue;

      const topValue = fromBottle[fromBottle.length - 1];

      for (let j = 0; j < this.bottles.length; j++) {
        if (i === j) continue;
        const toBottle = this.bottles[j];

        if (toBottle.length === 0) {
          return true;
        }

        if (toBottle[toBottle.length - 1] === topValue && toBottle.length < this.maxCapacity) {
          return true;
        }
      }
    }

    return false;
  }

  showGameOver() {
    setTimeout(() => {
      alert(`游戏结束！\n最终最高数字：${this.maxFaceValue}`);
    }, 100);
  }

  saveHistory(dealMarker = false) {
    const state = JSON.stringify(this.bottles);
    const historyEntry = {
      bottles: state,
      maxFaceValue: this.maxFaceValue,
      bottleCount: this.bottleCount,
      isDeal: dealMarker,
    };
    this.history.push(historyEntry);

    if (dealMarker) {
      this.history = [historyEntry];
    } else if (this.history.length > 50) {
      this.history.shift();
    }
  }

  undo() {
    if (this.history.length > 0) {
      const prevState = this.history.pop();

      if (prevState.isDeal) {
        this.bottles = JSON.parse(prevState.bottles);
        this.maxFaceValue = prevState.maxFaceValue;
        this.bottleCount = prevState.bottleCount;
        this.isGameOver = false;
        this.history = [];
        this.updateUI();
        this.saveState();
        return;
      }

      this.bottles = JSON.parse(prevState.bottles);
      this.maxFaceValue = prevState.maxFaceValue;
      this.bottleCount = prevState.bottleCount;
      this.isGameOver = false;
      this.updateUI();
      this.saveState();
    }
  }

  playMoveAnimation(toIndex, movedCoins, onComplete) {
    const toBottleEl = document.querySelector(`.bottle[data-index="${toIndex}"]`);

    if (!toBottleEl) {
      if (onComplete) onComplete();
      return;
    }

    const toRect = toBottleEl.getBoundingClientRect();
    const coinCount = movedCoins.length;
    let completedCount = 0;

    for (let i = 0; i < coinCount; i++) {
      setTimeout(() => {
        const currentBottleLength = this.bottles[toIndex].length;
        this.createMovingCoin(toRect, this.getColorForValue(movedCoins[i]), movedCoins[i], i, currentBottleLength, toIndex, () => {
          completedCount++;
          if (completedCount === coinCount && onComplete) {
            this.saveState();
            this.checkGameOver();
            this.pendingAnimation = null;
          }
        });
      }, i * 80);
    }
  }

  createMovingCoin(toRect, color, value, index, targetBottleLength, toIndex, onCoinComplete) {
    const coinEl = document.createElement('div');
    coinEl.className = 'coin-move-animation';
    coinEl.textContent = value;
    coinEl.style.backgroundColor = color;

    const coinHeight = 18;
    const endX = toRect.left + toRect.width * 0.1;
    const endY = toRect.top + toRect.height - 20 - (targetBottleLength + index) * coinHeight;
    const dropStartY = toRect.top - 50 - index * 18;

    coinEl.style.left = `${endX}px`;
    coinEl.style.top = `${dropStartY}px`;
    coinEl.style.width = `${toRect.width * 0.8}px`;
    coinEl.style.opacity = '0';
    coinEl.style.transform = 'scale(0.8)';

    document.body.appendChild(coinEl);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        coinEl.style.transition = 'top 0.3s ease-in, opacity 0.1s, transform 0.3s';
        coinEl.style.opacity = '1';
        coinEl.style.top = `${endY}px`;
        coinEl.style.transform = 'scale(1.1)';

        setTimeout(() => {
          this.bottles[toIndex].push(value);
          this.checkMerge(toIndex);
          this.updateUI();

          coinEl.style.transition = 'opacity 0.15s, transform 0.15s';
          coinEl.style.opacity = '0';
          coinEl.style.transform = 'scale(0.9)';
          setTimeout(() => {
            coinEl.remove();
            if (onCoinComplete) onCoinComplete();
          }, 150);
        }, 300);
      });
    });
  }

  updateUI() {
    const grid = document.getElementById('bottle-grid');
    if (!grid) return;

    grid.innerHTML = '';

    const maxValueEl = document.getElementById('max-value');
    if (maxValueEl) maxValueEl.textContent = this.maxFaceValue;

    const maxRecordEl = document.getElementById('max-record');
    if (maxRecordEl) maxRecordEl.textContent = `${this.maxRecord}`;

    this.bottles.forEach((bottle, index) => {
      const bottleDiv = document.createElement('div');
      bottleDiv.className = 'bottle' + (this.selectedBottleIndex === index ? ' selected' : '');
      bottleDiv.dataset.index = index;

      if (this.isGameOver) {
        bottleDiv.classList.add('disabled');
      }

      bottle.forEach((value) => {
        const coinDiv = document.createElement('div');
        coinDiv.className = 'coin';
        coinDiv.textContent = value;
        coinDiv.style.backgroundColor = this.getColorForValue(value);
        bottleDiv.appendChild(coinDiv);
      });

      grid.appendChild(bottleDiv);
    });
  }

  getColorForValue(val) {
    const colors = [
      '#FF0000',
      '#11bbbbff',
      '#0000FF',
      '#FF7F00',
      '#0ed40eff',
      '#bdbd09ff',
      '#d10cd1ff',
      '#0080FF',
      '#c2a606ff',
      '#0fd170ff',
      '#cf187aff',
      '#32CD32',
      '#FF4500',
      '#1E90FF',
      '#DA70D6',
      '#0bd886ff',
      '#FF0093',
      '#20B2AA',
      '#DC143C',
      '#6495ED',
      '#FFA500',
      '#00BFFF',
      '#FF6347',
      '#40E0D0',
      '#a142a1ff',
      '#73db0bff',
      '#FF8C00',
      '#00CED1',
      '#DB7093',
      '#3CB371',
    ];
    return colors[(val - 1) % colors.length];
  }
}

async function bootGame() {
  const statusEl = document.getElementById('sync-status');
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    if (statusEl) {
      statusEl.textContent = error ? `登录态校验失败：${error.message}` : '请先登录';
      statusEl.style.color = '#fca5a5';
    }
    window.location.href = './auth.html';
    return;
  }

  new Game(data.user);
}

window.addEventListener('load', () => {
  bootGame();
});
