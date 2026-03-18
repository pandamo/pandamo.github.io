import { computed, ref } from 'vue'

const colors = [
  '#FF0000', '#11bbbbff', '#0000FF', '#FF7F00', '#0ed40eff', '#bdbd09ff', '#d10cd1ff', '#0080FF',
  '#c2a606ff', '#0fd170ff', '#cf187aff', '#32CD32', '#FF4500', '#1E90FF', '#DA70D6', '#0bd886ff',
  '#FF0093', '#20B2AA', '#DC143C', '#6495ED', '#FFA500', '#00BFFF', '#FF6347', '#40E0D0', '#a142a1ff',
  '#73db0bff', '#FF8C00', '#00CED1', '#DB7093', '#3CB371',
]

function cloneBottles(bottles) {
  return bottles.map((bottle) => [...bottle])
}

export function useGameState() {
  const maxFaceValue = ref(1)
  const maxRecord = ref(1)
  const bottleCount = ref(2)
  const bottles = ref([])
  const history = ref([])
  const selectedBottleIndex = ref(null)
  const isGameOver = ref(false)
  const maxCapacity = 10

  function getColorForValue(value) {
    return colors[(value - 1) % colors.length]
  }

  function getStateSnapshot() {
    return {
      bottles: cloneBottles(bottles.value),
      maxFaceValue: maxFaceValue.value,
      bottleCount: bottleCount.value,
      isGameOver: isGameOver.value,
      maxRecord: maxRecord.value,
    }
  }

  function applyState(state) {
    bottles.value = cloneBottles(state.bottles || [])
    maxFaceValue.value = state.maxFaceValue || 1
    bottleCount.value = state.bottleCount || maxFaceValue.value + 1
    isGameOver.value = Boolean(state.isGameOver)
    maxRecord.value = state.maxRecord || 1
    selectedBottleIndex.value = null
  }

  function createBottles() {
    bottles.value = Array.from({ length: bottleCount.value }, () => [])
  }

  function saveHistory(dealMarker = false) {
    const entry = {
      bottles: JSON.stringify(bottles.value),
      maxFaceValue: maxFaceValue.value,
      bottleCount: bottleCount.value,
      isDeal: dealMarker,
      maxRecord: maxRecord.value,
    }

    history.value.push(entry)

    if (dealMarker) {
      history.value = [entry]
    } else if (history.value.length > 50) {
      history.value.shift()
    }
  }

  function dealInitialCoins() {
    const initialCount = bottles.value.length * 3
    for (let i = 0; i < initialCount; i++) {
      const randomIndex = Math.floor(Math.random() * bottles.value.length)
      if (bottles.value[randomIndex].length < maxCapacity) {
        bottles.value[randomIndex].push(1)
      }
    }
  }

  function createFreshGame() {
    maxFaceValue.value = 1
    maxRecord.value = 1
    bottleCount.value = maxFaceValue.value + 1
    history.value = []
    selectedBottleIndex.value = null
    isGameOver.value = false
    createBottles()
    dealInitialCoins()
  }

  function checkMerge(index) {
    const bottle = bottles.value[index]
    if (bottle.length !== maxCapacity) {
      return false
    }

    const firstValue = bottle[0]
    const allSame = bottle.every((value) => value === firstValue)
    if (!allSame) {
      return false
    }

    const newValue = firstValue + 1
    bottles.value[index] = [newValue]

    if (newValue > maxFaceValue.value) {
      maxFaceValue.value = newValue
    }

    if (newValue > maxRecord.value) {
      maxRecord.value = newValue
    }

    return true
  }

  function syncBottleCount() {
    bottleCount.value = maxFaceValue.value + 1
    while (bottles.value.length < bottleCount.value) {
      bottles.value.push([])
    }
  }

  function checkHasValidMove() {
    for (let i = 0; i < bottles.value.length; i++) {
      if (bottles.value[i].length < maxCapacity) {
        return true
      }
    }

    for (let i = 0; i < bottles.value.length; i++) {
      const fromBottle = bottles.value[i]
      if (fromBottle.length === 0) continue

      const topValue = fromBottle[fromBottle.length - 1]

      for (let j = 0; j < bottles.value.length; j++) {
        if (i === j) continue
        const toBottle = bottles.value[j]

        if (toBottle.length === 0) {
          return true
        }

        if (toBottle[toBottle.length - 1] === topValue && toBottle.length < maxCapacity) {
          return true
        }
      }
    }

    return false
  }

  function checkGameOver() {
    isGameOver.value = !checkHasValidMove()
    return isGameOver.value
  }

  function tryMove(fromIndex, toIndex) {
    const fromBottle = bottles.value[fromIndex]
    const toBottle = bottles.value[toIndex]

    if (!fromBottle?.length) return false
    if (toBottle.length >= maxCapacity) return false

    const topValue = fromBottle[fromBottle.length - 1]
    let countToMove = 0

    for (let i = fromBottle.length - 1; i >= 0; i--) {
      if (fromBottle[i] === topValue) {
        countToMove++
      } else {
        break
      }
    }

    if (toBottle.length > 0 && toBottle[toBottle.length - 1] !== topValue) {
      return false
    }

    const availableSpace = maxCapacity - toBottle.length
    const actualMoveCount = Math.min(countToMove, availableSpace)

    if (actualMoveCount <= 0) {
      return false
    }

    saveHistory()
    const movedCoins = fromBottle.splice(fromBottle.length - actualMoveCount, actualMoveCount)
    toBottle.push(...movedCoins)
    checkMerge(toIndex)
    checkGameOver()
    return true
  }

  function handleBottleClick(index) {
    if (isGameOver.value) return false

    if (selectedBottleIndex.value === null) {
      if (bottles.value[index].length > 0) {
        selectedBottleIndex.value = index
      }
      return false
    }

    if (selectedBottleIndex.value === index) {
      selectedBottleIndex.value = null
      return false
    }

    const moved = tryMove(selectedBottleIndex.value, index)
    selectedBottleIndex.value = null
    return moved
  }

  function deal() {
    if (isGameOver.value) return false

    saveHistory()
    const coinsToDistribute = bottles.value.length * 2
    syncBottleCount()

    let remaining = coinsToDistribute
    while (remaining > 0) {
      const availableBottleIndices = bottles.value
        .map((bottle, index) => (bottle.length < maxCapacity ? index : -1))
        .filter((index) => index !== -1)

      if (availableBottleIndices.length === 0) break

      const randomIndex = availableBottleIndices[Math.floor(Math.random() * availableBottleIndices.length)]
      const randomValue = Math.floor(Math.random() * maxFaceValue.value) + 1
      bottles.value[randomIndex].push(randomValue)
      checkMerge(randomIndex)
      remaining--
    }

    syncBottleCount()
    saveHistory(true)
    checkGameOver()
    return true
  }

  function undo() {
    if (!history.value.length) return false

    const prevState = history.value.pop()
    bottles.value = JSON.parse(prevState.bottles)
    maxFaceValue.value = prevState.maxFaceValue
    bottleCount.value = prevState.bottleCount
    maxRecord.value = prevState.maxRecord || maxRecord.value
    isGameOver.value = false

    if (prevState.isDeal) {
      history.value = []
    }

    selectedBottleIndex.value = null
    return true
  }

  function reset(preservedMaxRecord = maxRecord.value) {
    maxRecord.value = preservedMaxRecord
    maxFaceValue.value = 1
    bottleCount.value = maxFaceValue.value + 1
    history.value = []
    selectedBottleIndex.value = null
    isGameOver.value = false
    createBottles()
    dealInitialCoins()
    checkGameOver()
  }

  return {
    maxFaceValue,
    maxRecord,
    bottleCount,
    bottles,
    history,
    selectedBottleIndex,
    isGameOver,
    maxCapacity,
    canUndo: computed(() => history.value.length > 0),
    getColorForValue,
    getStateSnapshot,
    applyState,
    createFreshGame,
    handleBottleClick,
    tryMove,
    deal,
    undo,
    reset,
    checkGameOver,
  }
}
