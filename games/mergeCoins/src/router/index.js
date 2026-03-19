import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import AuthView from '../views/AuthView.vue'
import GameView from '../views/GameView.vue'
import PaletteView from '../views/PaletteView.vue'
import { supabase } from '../lib/supabase'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/auth',
      name: 'auth',
      component: AuthView,
      meta: { guestOnly: true },
    },
    {
      path: '/game',
      name: 'game',
      component: GameView,
      meta: { requiresAuth: true },
    },
    /* {
      path: '/palette',
      name: 'palette',
      component: PaletteView,
    }, */
  ],
})

router.beforeEach(async (to) => {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    if (to.meta.requiresAuth) {
      return { name: 'auth' }
    }
    return true
  }

  const isLoggedIn = Boolean(data.session)

  if (to.meta.requiresAuth && !isLoggedIn) {
    return { name: 'auth' }
  }

  if (to.meta.guestOnly && isLoggedIn) {
    return { name: 'game' }
  }

  return true
})

export default router
