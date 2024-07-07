<template>
  <slot>
    <button @click="count++">Count is: {{ count }}</button>
  </slot>
</template>

<script lang="ts" setup>
import { ref } from 'vue'

const count = ref(0)
</script>