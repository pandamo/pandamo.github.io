import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export function useLeaderboard() {
  const entries = ref([])
  const loading = ref(false)
  const errorMessage = ref('')

  function createLeaderboardQuery(limit = 10) {
    return supabase
      .from('leaderboard_entries')
      .select('display_name,max_record,updated_at')
      .order('max_record', { ascending: false })
      .order('updated_at', { ascending: true })
      .limit(limit)
  }

  async function loadLeaderboard(limit = 10) {
    loading.value = true
    errorMessage.value = ''

    const { data, error } = await createLeaderboardQuery(limit)

    if (error) {
      entries.value = []
      errorMessage.value = `排行榜加载失败：${error.message}`
      loading.value = false
      return false
    }

    entries.value = data || []
    loading.value = false
    return true
  }

  async function loadTopRecord() {
    const { data, error } = await createLeaderboardQuery(1)

    if (error) {
      return 1
    }

    return data?.[0]?.max_record || 1
  }

  return {
    entries,
    loading,
    errorMessage,
    loadLeaderboard,
    loadTopRecord,
  }
}
