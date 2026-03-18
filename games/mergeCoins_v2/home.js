import { supabase } from './supabase.js'

const statusEl = document.getElementById('leaderboard-status')
const listEl = document.getElementById('leaderboard-list')
const authActionsEl = document.getElementById('auth-actions')
const gameActionEl = document.getElementById('game-action')

function setStatus(message, isError = false) {
  if (message == 'end') {
    statusEl.remove()
    return
  }
  statusEl.classList.toggle('error', isError)
  statusEl.classList.toggle('loading', !message && !isError)
  statusEl.textContent = ''


  if (!message && !isError) {
    const spinner = document.createElement('span')
    spinner.className = 'loading-spinner'
    spinner.setAttribute('aria-hidden', 'true')
    statusEl.appendChild(spinner)
    return
  }

  statusEl.textContent = message
}

function renderEntries(entries) {
  if (!entries.length) {
    listEl.innerHTML = '<li class="empty">还没有玩家上传纪录，等你来拿第一。</li>'
    return
  }

  listEl.innerHTML = entries
    .map((entry, index) => `
      <li class="rank-item">
        <span class="rank-no">#${index + 1}</span>
        <span class="rank-name">${entry.display_name}</span>
        <span class="rank-score">${entry.max_record}</span>
      </li>
    `)
    .join('')
}

async function loadLeaderboard() {
  setStatus('')

  const { data, error } = await supabase
    .from('leaderboard_entries')
    .select('display_name,max_record,updated_at')
    .order('max_record', { ascending: false })
    .order('updated_at', { ascending: true })
    .limit(10)

  if (error) {
    setStatus(`排行榜加载失败：${error.message}`, true)
    listEl.innerHTML = ''
    return
  }

  renderEntries(data || [])
  setStatus('end')
}

async function updateAuthActions() {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    setStatus(`登录态获取失败：${error.message}`, true)
    return
  }

  const isLoggedIn = Boolean(data.session)
  authActionsEl.classList.toggle('hidden', isLoggedIn)
  gameActionEl.classList.toggle('hidden', !isLoggedIn)
}

supabase.auth.onAuthStateChange(() => {
  updateAuthActions()
})

loadLeaderboard()
updateAuthActions()
