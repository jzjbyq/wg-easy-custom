<template>
  <BaseDialog :trigger-class="triggerClass">
    <template #trigger>
      <slot />
    </template>
    <template #title>{{ title }}</template>
    <template #description>
      <p>{{ message }}</p>
    </template>
    <template #actions>
      <DialogClose as-child>
        <BasePrimaryButton>{{ $t('dialog.cancel') }}</BasePrimaryButton>
      </DialogClose>
      <DialogClose as-child>
        <BaseSecondaryButton @click="$emit('confirm')">
          {{ confirmLabel }}
        </BaseSecondaryButton>
      </DialogClose>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
defineEmits(['confirm']);
defineProps<{
  triggerClass?: string;
  title: string;
  message: string;
  confirmLabel: string;
}>();
</script>
