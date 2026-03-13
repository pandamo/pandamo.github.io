class Game {
  constructor() {
    this.maxFaceValue = 1;
    this.maxRecord = 1; // 历史最高纪录
    this.bottleCount = this.maxFaceValue + 1;
    this.bottles = [];
    this.history = [];
    this.selectedBottleIndex = null;
    this.maxCapacity = 10;
    this.storageKey = 'coinGameSave';
    this.isGameOver = false;
    this.pendingAnimation = null; // 存储待动画的移动信息

    this.debugCounter = 0

    this.init();
  }

  init() {
    // 优先尝试加载存档
    if (this.loadState()) {
      this.updateUI();
      this.setupEventListeners();
      return;
    }

    this.createBottles();
    this.dealInitialCoins();
    this.updateUI();
    this.setupEventListeners();
    // 初始状态也检查是否游戏结束
    this.checkGameOver();
  }

  // ==================== 状态保存与加载 ====================
  saveState() {
    const state = {
      bottles: this.bottles,
      maxFaceValue: this.maxFaceValue,
      bottleCount: this.bottleCount,
      isGameOver: this.isGameOver,
      maxRecord: this.maxRecord
    };
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (e) {
      console.warn('保存状态失败', e);
    }
  }

  loadState() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const state = JSON.parse(saved);
        this.bottles = state.bottles;
        this.maxFaceValue = state.maxFaceValue;
        this.bottleCount = state.bottleCount;
        this.isGameOver = state.isGameOver || false;
        this.maxRecord = state.maxRecord || 1;
        return true;
      }
    } catch (e) {
      console.warn('加载状态失败', e);
    }
    return false;
  }

  clearState() {
    // 保存历史最高纪录
    const saved = localStorage.getItem(this.storageKey);
    const preservedMaxRecord = saved ? JSON.parse(saved).maxRecord : 1;

    // 清空 localStorage
    localStorage.removeItem(this.storageKey);

    // 重置游戏状态（但保留历史最高纪录）
    this.maxRecord = preservedMaxRecord;
    this.maxFaceValue = 1;
    this.bottleCount = this.maxFaceValue + 1;
    this.bottles = [];
    this.history = [];
    this.selectedBottleIndex = null;
    this.isGameOver = false;
    this.pendingAnimation = null;

    // 重新初始化游戏
    this.createBottles();
    this.dealInitialCoins();
    this.updateUI();
    this.checkGameOver();
  }
  // ==================== 状态保存与加载 ====================

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
    console.log(localStorage.getItem("coinGameSave"));
    document.getElementById('state').value = localStorage.getItem("coinGameSave");
  }
  readRecord() {
    const _state = document.getElementById('state').value
    _state && localStorage.setItem("coinGameSave", _state);
    location.reload();
  }
  debug() {
    this.debugCounter++
    if (this.debugCounter > 10) {
      document.getElementById('showState').hidden = false;
      document.getElementById('readRecord').hidden = false;
      document.getElementById('state').hidden = false;
    }

  }

  setupEventListeners() {
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

      // 修改：先只更新源瓶子数据，硬币立即从源瓶子消失
      const movedCoins = this.bottles[fromIndex].splice(this.bottles[fromIndex].length - actualMoveCount, actualMoveCount);

      // 更新 UI（源瓶子硬币已移除，目标瓶子尚未显示新硬币）
      this.updateUI();

      // 触发动画，硬币从目标瓶子上方落下
      // 修改：传入 movedCoins 数组，让每个硬币动画完成后单独添加
      this.playMoveAnimation(fromIndex, toIndex, movedCoins, () => {
        // 所有硬币动画完成后，检查合并、保存状态和检查游戏结束
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
      const allSame = bottle.every(v => v === firstValue);
      if (allSame) {
        const newValue = firstValue + 1;
        this.bottles[index] = [newValue];
        if (newValue > this.maxFaceValue) {
          this.maxFaceValue = newValue;
        }
        // 更新历史最高纪录
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
    // 记录当前瓶子数量作为发放硬币数
    const coinsToDistribute = this.bottles.length * 2;
    this.syncBottleCount();

    let remaining = coinsToDistribute;
    console.log('remaining: ', remaining);

    while (remaining > 0) {
      const availableBottleIndices = this.bottles
        .map((b, i) => b.length < this.maxCapacity ? i : -1)
        .filter(i => i !== -1);

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

    // deal 操作完成后，保存并标记这是 deal 后的状态
    this.saveHistory(true);
    this.checkGameOver();
  }

  // ==================== 游戏结束检测 ====================
  checkGameOver() {
    // 检查是否还有任何可行的操作
    const hasValidMove = this.checkHasValidMove();

    if (!hasValidMove) {
      this.isGameOver = true;
      this.showGameOver();
    } else {
      this.isGameOver = false;
    }
  }

  checkHasValidMove() {
    // 1. 检查是否有未满的瓶子（可以接受新硬币）
    for (let i = 0; i < this.bottles.length; i++) {
      if (this.bottles[i].length < this.maxCapacity) {
        return true;
      }
    }

    // 2. 检查是否有可以合并的移动
    for (let i = 0; i < this.bottles.length; i++) {
      const fromBottle = this.bottles[i];
      if (fromBottle.length === 0) continue;

      const topValue = fromBottle[fromBottle.length - 1];

      for (let j = 0; j < this.bottles.length; j++) {
        if (i === j) continue;
        const toBottle = this.bottles[j];

        // 目标瓶子为空，可以移动
        if (toBottle.length === 0) {
          return true;
        }

        // 目标瓶子顶部面值相同且未满，可以移动
        if (toBottle[toBottle.length - 1] === topValue && toBottle.length < this.maxCapacity) {
          return true;
        }
      }
    }

    // 没有任何可行操作
    return false;
  }

  showGameOver() {
    setTimeout(() => {
      alert(`游戏结束！\n最终最高数字：${this.maxFaceValue}`);
    }, 100);
  }
  // ==================== 游戏结束检测 ====================

  saveHistory(dealMarker = false) {
    const state = JSON.stringify(this.bottles);
    const historyEntry = {
      bottles: state,
      maxFaceValue: this.maxFaceValue,
      bottleCount: this.bottleCount,
      isDeal: dealMarker // 标记是否是 deal 操作后的状态
    };
    this.history.push(historyEntry);

    // 如果当前标记了 deal，移除之前的所有历史记录
    if (dealMarker) {
      // 只保留最新的这一个记录
      this.history = [historyEntry];
    } else if (this.history.length > 50) {
      this.history.shift();
    }
  }

  undo() {
    if (this.history.length > 0) {
      const prevState = this.history.pop();

      // 如果刚才是 deal 操作，则不允许继续 undo
      if (prevState.isDeal) {
        // 恢复该状态，并清空历史
        this.bottles = JSON.parse(prevState.bottles);
        this.maxFaceValue = prevState.maxFaceValue;
        this.bottleCount = prevState.bottleCount;
        this.isGameOver = false;
        this.history = []; // 清空历史，阻止继续 undo
        this.updateUI();
        this.saveState();
        return;
      }

      // 正常 undo
      this.bottles = JSON.parse(prevState.bottles);
      this.maxFaceValue = prevState.maxFaceValue;
      this.bottleCount = prevState.bottleCount;
      this.isGameOver = false;
      this.updateUI();
      this.saveState();
    }
  }

  playMoveAnimation(fromIndex, toIndex, movedCoins, onComplete) {
    const fromBottleEl = document.querySelector(`.bottle[data-index="${fromIndex}"]`);
    const toBottleEl = document.querySelector(`.bottle[data-index="${toIndex}"]`);

    if (!toBottleEl) {
      if (onComplete) onComplete();
      return;
    }

    const toRect = toBottleEl.getBoundingClientRect();
    const coinCount = movedCoins.length;
    let completedCount = 0;

    // 为每个移动的硬币创建下落动画
    for (let i = 0; i < coinCount; i++) {
      setTimeout(() => {
        // 修改：传入当前硬币的值和索引，以及目标瓶子当前硬币数量
        const currentBottleLength = this.bottles[toIndex].length;
        this.createMovingCoin(toRect, this.getColorForValue(movedCoins[i]), movedCoins[i], i, coinCount, currentBottleLength, toIndex, () => {
          completedCount++;
          // 所有硬币动画完成后执行回调
          if (completedCount === coinCount && onComplete) {
            this.saveState();
            this.checkGameOver();
            this.pendingAnimation = null;
          }
        });
      }, i * 80);
    }
  }

  createMovingCoin(toRect, color, value, index, totalCoins, targetBottleLength, toIndex, onCoinComplete) {
    const coinEl = document.createElement('div');
    coinEl.className = 'coin-move-animation';
    coinEl.textContent = value;
    coinEl.style.backgroundColor = color;

    // 修改：计算目标位置时，考虑目标瓶子当前已有的硬币数量
    // 每个硬币高度约 18px（16px 高度 + 2px margin）
    const coinHeight = 18;
    const endX = toRect.left + toRect.width * 0.1;
    // 修改：从瓶子底部向上计算，基于当前瓶子中的硬币数量
    const endY = toRect.top + toRect.height - 20 - (targetBottleLength + index) * coinHeight;

    // 下落起始位置（目标瓶子上方更高处）
    const dropStartY = toRect.top - 50 - (index * 18);

    // 设置初始位置（从目标瓶子上方开始）
    coinEl.style.left = `${endX}px`;
    coinEl.style.top = `${dropStartY}px`;
    coinEl.style.width = `${toRect.width * 0.8}px`;
    coinEl.style.opacity = '0';
    coinEl.style.transform = 'scale(0.8)';

    document.body.appendChild(coinEl);

    // 强制重绘后开始下落动画
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // 显示硬币并开始下落
        coinEl.style.transition = 'top 0.3s ease-in, opacity 0.1s, transform 0.3s';
        coinEl.style.opacity = '1';
        coinEl.style.top = `${endY}px`;
        coinEl.style.transform = 'scale(1.1)';

        // 动画完成后移除元素并回调
        setTimeout(() => {
          // 修改：当前硬币动画完成后，立即添加到目标瓶子并检查合并
          this.bottles[toIndex].push(value);

          // 修改：立即检查合并，确保瓶子满时自动合并
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

    // 更新历史最高纪录显示
    const maxRecordEl = document.getElementById('max-record');
    if (maxRecordEl) maxRecordEl.textContent = `${this.maxRecord}`;

    this.bottles.forEach((bottle, index) => {
      const bottleDiv = document.createElement('div');
      bottleDiv.className = 'bottle' + (this.selectedBottleIndex === index ? ' selected' : '');
      bottleDiv.dataset.index = index;

      if (this.isGameOver) {
        bottleDiv.classList.add('disabled');
      }

      bottle.forEach((value, coinIndex) => {
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
    // 使用高饱和度、低灰度的颜色数组，确保颜色鲜艳且区别明显
    const colors = [
      '#FF0000', // 纯红
      '#11bbbbff', // 纯青
      '#0000FF', // 纯蓝
      '#FF7F00', // 纯橙
      '#0ed40eff', // 纯绿
      '#bdbd09ff', // 纯黄
      '#d10cd1ff', // 纯紫红
      '#0080FF', // 亮蓝
      '#c2a606ff', // 纯金
      '#0fd170ff', // 春绿
      '#cf187aff', // 深粉红
      '#32CD32', // 石灰绿
      '#FF4500', // 橙红
      '#1E90FF', // 道奇蓝
      '#DA70D6', // 兰花紫
      '#0bd886ff', // 亮春绿
      '#FF0093', // 亮粉红
      '#20B2AA', // 浅海绿
      '#DC143C', // 深红
      '#6495ED', // 矢车菊蓝
      '#FFA500', // 纯橙
      '#00BFFF', // 深天蓝
      '#FF6347', // 番茄红
      '#40E0D0', // 绿松石
      '#a142a1ff', // 紫罗兰
      '#73db0bff', // 查特酒绿
      '#FF8C00', // 深橙
      '#00CED1', // 深青
      '#DB7093', // 淡紫红
      '#3CB371'  // 海洋绿
    ];
    return colors[(val - 1) % colors.length];
  }
}

window.onload = () => {
  new Game();
};