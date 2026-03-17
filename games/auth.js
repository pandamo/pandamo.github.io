import { getDisplayNameFromEmail, supabase } from './supabase.js'

const emailEl = document.getElementById('email')
const passwordEl = document.getElementById('password')
const statusEl = document.getElementById('status')

function setStatus(message, isError = false) {
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

  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    setStatus(`注册失败：${error.message}`, true)
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

  setStatus('注册成功。若开启邮箱确认，请先完成邮箱验证后再登录。')
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
