import { getDisplayNameFromEmail, supabase } from './supabase.js'

const emailEl = document.getElementById('email')
const passwordEl = document.getElementById('password')
const statusEl = document.getElementById('status')

function setStatus(message, isError = false) {
  message && (statusEl.hidden = false)
  statusEl.textContent = message
  statusEl.classList.toggle('error', isError)
}

async function upsertProfile(user, email) {
  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
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

async function ensureSessionRedirect() {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    setStatus(`登录态检测失败：${error.message}`, true)
    return
  }

  if (data.session) {
    window.location.href = './game.html'
  }
}

async function signUp() {
  const email = emailEl.value.trim()
  const password = passwordEl.value

  if (!email || !password) {
    setStatus('请输入邮箱和密码。', true)
    return
  }

  try {
    const isRegistered = await checkEmailRegistered(email)
    if (isRegistered) {
      setStatus('该邮箱已注册，请直接登录。', true)
      return
    }
  } catch (checkError) {
    setStatus(`注册前检查失败：${checkError.message}`, true)
    return
  }

  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    setStatus(`注册失败：${error.message}`, true)
    return
  }

  if (data.user?.identities && data.user.identities.length === 0) {
    setStatus('该邮箱已注册，请直接登录。', true)
    return
  }

  if (data.session && data.user) {
    try {
      await upsertProfile(data.user, email)
    } catch (profileError) {
      setStatus(`注册成功，但资料写入失败：${profileError.message}`, true)
      return
    }
  }

  setStatus('请检查邮箱，根据验证邮箱链接验证后再登录。')
}

async function signIn() {
  const email = emailEl.value.trim()
  const password = passwordEl.value

  if (!email || !password) {
    setStatus('请输入邮箱和密码。', true)
    return
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    setStatus(`登录失败：${error.message}`, true)
    return
  }

  try {
    await upsertProfile(data.user, email)
  } catch (profileError) {
    setStatus(`登录成功，但资料写入失败：${profileError.message}`, true)
    return
  }

  setStatus('登录成功，正在进入游戏...')
  window.location.href = './game.html'
}

document.getElementById('sign-up-btn').addEventListener('click', signUp)
document.getElementById('sign-in-btn').addEventListener('click', signIn)

ensureSessionRedirect()
