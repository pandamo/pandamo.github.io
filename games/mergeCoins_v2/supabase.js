import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'


export const supabaseUrl = 'https://bkyoerblezhnainnhmzk.supabase.co'
export const supabaseKey = 'sb_publishable_vJcduFNGLNYHXlywN9wuzw_RhBhlLlX'

export const supabase = createClient(supabaseUrl, supabaseKey)

export function getDisplayNameFromEmail(email = '') {
  const [prefix] = email.split('@')
  return prefix || '玩家'
}
