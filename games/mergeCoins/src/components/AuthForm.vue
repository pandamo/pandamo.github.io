<script setup>
import { reactive } from "vue";
import { Icon } from "@iconify/vue/offline";
const emit = defineEmits(["sign-up", "sign-in"]);

defineProps({
  loading: Boolean,
  statusMessage: {
    type: String,
    default: "",
  },
  statusIsError: Boolean,
});

const form = reactive({
  email: "",
  password: "",
});
</script>

<template>
  <main class="auth-card shell-card pixel-panel">
    <h1>注册 / 登录</h1>
    <p>注册后即可同步游戏进度，并参与全站最高纪录排行榜。</p>

    <label for="email">邮箱</label>
    <input
      id="email"
      v-model="form.email"
      type="email"
      placeholder="请输入邮箱"
    />

    <label for="password">密码</label>
    <input
      id="password"
      v-model="form.password"
      type="password"
      placeholder="请输入密码"
    />

    <div class="actions">
      <RouterLink class="link-button" to="/" style="flex: 0 0 42px">
        <Icon icon="pixelarticons:redo" flip="horizontal" width="20px" />
      </RouterLink>
      <button
        class="primary"
        :disabled="loading"
        @click="emit('sign-up', form)"
      >
        注册
      </button>
      <button
        class="secondary"
        :disabled="loading"
        @click="emit('sign-in', form)"
      >
        登录
      </button>
    </div>

    <div
      v-if="statusMessage"
      class="status-panel"
      :class="{ error: statusIsError }"
    >
      {{ statusMessage }}
    </div>
  </main>
</template>
