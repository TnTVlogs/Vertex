<template>
  <div class="relative shrink-0" :style="{ width: sizePx, height: sizePx }">
    <div
      class="w-full h-full flex items-center justify-center font-black overflow-hidden transition-all border"
      :class="[roundedClass, !showImg ? bgClass : '', borderClass]"
    >
      <img
        v-if="avatarUrl && showImg"
        :src="avatarUrl"
        :alt="username"
        class="w-full h-full object-cover"
        @error="showImg = false"
      />
      <span v-else :class="textClass">{{ initial }}</span>
    </div>
    <div
      v-if="online !== undefined"
      class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--v-bg-surface)]"
      :class="online ? 'bg-[#10B981]' : 'bg-[var(--v-text-secondary)] opacity-40'"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  username?: string
  avatarUrl?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  variant?: 'accent' | 'surface' | 'base'
  online?: boolean
}>(), {
  size: 'sm',
  variant: 'surface',
})

const showImg = ref(!!props.avatarUrl)
watch(() => props.avatarUrl, (v) => { showImg.value = !!v })

const initial = computed(() => props.username?.charAt(0).toUpperCase() || '?')

const sizePx = computed(() => ({
  xs: '2rem',
  sm: '2.25rem',
  md: '3rem',
  lg: '5rem',
}[props.size]))

const roundedClass = computed(() => ({
  xs: 'rounded-lg',
  sm: 'rounded-xl',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
}[props.size]))

const textClass = computed(() => ({
  xs: 'text-sm',
  sm: 'text-xs',
  md: 'text-base',
  lg: 'text-3xl',
}[props.size]))

const bgClass = computed(() => ({
  accent:  'bg-[var(--v-accent)] text-[var(--v-bg-base)]',
  surface: 'bg-[var(--v-bg-surface)] text-[var(--v-text-primary)]',
  base:    'bg-[var(--v-bg-base)] text-[var(--v-text-primary)]',
}[props.variant]))

const borderClass = computed(() => ({
  accent:  'border-transparent',
  surface: 'border-[var(--v-border)] shadow-lg group-hover:border-[var(--v-accent)]',
  base:    'border-[var(--v-border)] shadow-inner group-hover:border-[var(--v-accent)]',
}[props.variant]))
</script>
