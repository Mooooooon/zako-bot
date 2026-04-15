<template>
  <div class="settings-redirect">正在跳转…</div>
</template>

<script setup lang="ts">
navigateTo('/settings/models', { redirectCode: 302 })
</script>