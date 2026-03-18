<script setup>
import { useRouter, RouterLink } from 'vue-router'
import AuthForm from '../components/AuthForm.vue'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { loading, statusMessage, statusIsError, signUp, signIn } = useAuth()

async function handleSignUp(form) {
  const success = await signUp(form.email.trim(), form.password)
  if (success) {
    form.password = ''
  }
}

async function handleSignIn(form) {
  const success = await signIn(form.email.trim(), form.password)
  if (success) {
    router.push('/game')
  }
}
</script>

<template>
  <div class="page-shell auth-page">
    <AuthForm
      :loading="loading"
      :status-message="statusMessage"
      :status-is-error="statusIsError"
      @sign-up="handleSignUp"
      @sign-in="handleSignIn"
    />
  </div>
</template>
