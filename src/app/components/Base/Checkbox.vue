<template>
  <CheckboxRoot
    v-model="checked"
    :disabled="disabled"
    :aria-label="ariaLabel"
    class="flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-gray-400 bg-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-red-800 data-[state=checked]:bg-red-800 data-[state=indeterminate]:border-red-800 data-[state=indeterminate]:bg-red-800 dark:border-neutral-500 dark:bg-neutral-800"
  >
    <CheckboxIndicator class="flex items-center justify-center text-white">
      <svg
        v-if="checked !== 'indeterminate'"
        viewBox="0 0 16 16"
        class="size-3"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M3 8.5L6.2 11.7L13 4.9" />
      </svg>
      <svg
        v-else
        viewBox="0 0 16 16"
        class="size-3"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
      >
        <path d="M3.5 8H12.5" />
      </svg>
    </CheckboxIndicator>
  </CheckboxRoot>
</template>

<script setup lang="ts">
import { CheckboxIndicator, CheckboxRoot } from 'reka-ui';

defineProps<{
  disabled?: boolean;
  ariaLabel?: string;
}>();

const checked = defineModel<boolean | 'indeterminate'>({
  default: false,
});
</script>
