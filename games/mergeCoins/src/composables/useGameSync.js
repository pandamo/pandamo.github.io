import { ref } from 'vue'
import { getDisplayNameFromEmail, supabase } from '../lib/supabase'

export function useGameSync(user, gameState) {
  const storageKey = 'coinGameSave'
  const syncMessage = ref('')
  const syncIsError = ref(false)
  const isSavingRemote = ref(false)
  const pendingRemoteSave = ref(false)

  function setSyncStatus(message, isError = false) {
    syncMessage.value = message
    syncIsError.value = isError
  }

  async function ensureProfile() {
    const { error } = await supabase.from('profiles').upsert({
      id: user.value.id,
      email: user.value.email,
      display_name: getDisplayNameFromEmail(user.value.email || ''),
      updated_at: new Date().toISOString(),
    })

    if (error) {
      setSyncStatus(`资料同步失败：${error.message}`, true)
    }
  }

  async function saveRemoteState() {
    if (!user.value) return false

    if (isSavingRemote.value) {
      pendingRemoteSave.value = true
      return true
    }

    isSavingRemote.value = true
    //setSyncStatus('正在同步云端存档...')
    setSyncStatus('')

    const snapshot = gameState.getStateSnapshot()
    const payload = {
      user_id: user.value.id,
      bottles: snapshot.bottles,
      max_face_value: snapshot.maxFaceValue,
      max_record: snapshot.maxRecord,
      bottle_count: snapshot.bottleCount,
      is_game_over: snapshot.isGameOver,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('game_saves').upsert(payload)

    if (error) {
      setSyncStatus(`云端同步失败：${error.message}`, true)
    } else {
      //setSyncStatus('云端存档已同步。')
      setSyncStatus('')
    }

    isSavingRemote.value = false

    if (pendingRemoteSave.value) {
      pendingRemoteSave.value = false
      await saveRemoteState()
    }

    return !error
  }

  function saveLocalState() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(gameState.getStateSnapshot()))
      return true
    } catch (error) {
      console.warn('保存状态失败', error)
      return false
    }
  }

  async function saveState() {
    saveLocalState()
    await saveRemoteState()
  }

  function loadLocalState(migrate = false) {
    try {
      const saved = localStorage.getItem(storageKey)
      if (!saved) {
        return false
      }

      gameState.applyState(JSON.parse(saved))
      setSyncStatus(migrate ? '已加载本地进度，正在迁移到云端...' : '已加载本地进度。')

      if (migrate) {
        saveRemoteState()
      }

      return true
    } catch (error) {
      console.warn('加载状态失败', error)
      setSyncStatus('本地存档读取失败，将开始新游戏。', true)
      return false
    }
  }

  async function loadRemoteState() {
    const { data, error } = await supabase
      .from('game_saves')
      .select('bottles,max_face_value,bottle_count,is_game_over,max_record')
      .eq('user_id', user.value.id)
      .maybeSingle()

    if (error) {
      setSyncStatus(`读取云端存档失败：${error.message}`, true)
      return false
    }

    if (!data) {
      setSyncStatus('没有找到云端存档，将尝试本地进度。')
      return false
    }

    gameState.applyState({
      bottles: data.bottles,
      maxFaceValue: data.max_face_value,
      bottleCount: data.bottle_count,
      isGameOver: data.is_game_over,
      maxRecord: data.max_record,
    })

    saveLocalState()
    return true
  }

  async function loadState() {
    const remoteLoaded = await loadRemoteState()
    if (remoteLoaded) {
      return true
    }

    return loadLocalState(true)
  }

  async function clearRemoteState() {
    const { error } = await supabase.from('game_saves').delete().eq('user_id', user.value.id)
    if (error) {
      setSyncStatus(`清理云端存档失败：${error.message}`, true)
      return false
    }
    return true
  }

  async function clearState() {
    const saved = localStorage.getItem(storageKey)
    const preservedMaxRecord = saved ? JSON.parse(saved).maxRecord : gameState.maxRecord.value

    localStorage.removeItem(storageKey)
    await clearRemoteState()
    gameState.reset(preservedMaxRecord)
    await saveState()
  }

  return {
    storageKey,
    syncMessage,
    syncIsError,
    ensureProfile,
    saveState,
    loadState,
    clearState,
    setSyncStatus,
  }
}
