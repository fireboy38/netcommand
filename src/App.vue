<!--
  新数网络调试工具 (NetCommand)
  Copyright (c) 2026 四川新数科技有限公司. All rights reserved.
-->
<template>
  <router-view />
</template>

<script setup lang="ts">
import { useConfigStore } from './store/config'

const store = useConfigStore()
</script>

<style>
#app {
  height: 100%;
}
</style>
