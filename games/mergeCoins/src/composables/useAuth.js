import { computed, onMounted, onUnmounted, readonly, ref } from 'vue'
import { getDisplayNameFromEmail, supabase } from '../lib/supabase'

const user = ref(null)
const initialized = ref(false)
const loading = ref(false)
const statusMessage = ref('')
const statusIsError = ref(false)
let subscription = null

function setStatus(message, isError = false) {
  statusMessage.value = message
  statusIsError.value = isError
}

async function refreshSession() {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    setStatus(`登录态检测失败：${error.message}`, true)
    user.value = null
    initialized.value = true
    return null
  }

  user.value = data.session?.user ?? null
  initialized.value = true
  return user.value
}

async function ensureProfile(targetUser, email) {
  const { error } = await supabase.from('profiles').upsert({
    id: targetUser.id,
    email,
    display_name: getDisplayNameFromEmail(email),
    updated_at: new Date().toISOString(),
  })

  if (error) {
    throw error
  }
}

async function checkEmailRegistered(email) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (error) {
    throw error
  }

  return Boolean(data)
}

async function signUp(email, password) {
  if (!email || !password) {
    setStatus('请输入邮箱和密码。', true)
    return false
  }

  loading.value = true
  setStatus('')

  try {
    const isRegistered = await checkEmailRegistered(email)
    if (isRegistered) {
      setStatus('该邮箱已注册，请直接登录。', true)
      return false
    }

    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setStatus(`注册失败：${error.message}`, true)
      return false
    }

    if (data.user?.identities && data.user.identities.length === 0) {
      setStatus('该邮箱已注册，请直接登录。', true)
      return false
    }

    if (data.session && data.user) {
      await ensureProfile(data.user, email)
      user.value = data.user
    }

    setStatus('请检查邮箱，根据验证邮箱链接验证后再登录。')
    return true
  } catch (error) {
    setStatus(error.message || '注册失败。', true)
    return false
  } finally {
    loading.value = false
  }
}

async function signIn(email, password) {
  if (!email || !password) {
    setStatus('请输入邮箱和密码。', true)
    return false
  }

  loading.value = true
  setStatus('')

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setStatus(`登录失败：${error.message}`, true)
      return false
    }

    await ensureProfile(data.user, email)
    user.value = data.user
    setStatus('登录成功，正在进入游戏...')
    return true
  } catch (error) {
    setStatus(error.message || '登录失败。', true)
    return false
  } finally {
    loading.value = false
  }
}

async function signOut() {
  loading.value = true
  setStatus('')

  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      setStatus(`退出失败：${error.message}`, true)
      return false
    }

    user.value = null
    localStorage.removeItem('coinGameSave')
    return true
  } finally {
    loading.value = false
  }
}

export function useAuth() {
  onMounted(() => {
    if (!initialized.value) {
      refreshSession()
    }

    if (!subscription) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        user.value = session?.user ?? null
        initialized.value = true
      })
      subscription = data.subscription
    }
  })

  onUnmounted(() => {})

  return {
    user: readonly(user),
    initialized: readonly(initialized),
    loading: readonly(loading),
    statusMessage: readonly(statusMessage),
    statusIsError: readonly(statusIsError),
    displayName: computed(() => getDisplayNameFromEmail(user.value?.email || '')),
    refreshSession,
    signUp,
    signIn,
    signOut,
    clearStatus: () => setStatus(''),
  }
}
