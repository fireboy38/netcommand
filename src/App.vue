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
