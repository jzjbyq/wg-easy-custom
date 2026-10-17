<template>
  <div
    v-if="clientsStore.total > 0"
    class="flex flex-wrap items-center justify-between gap-2 border-b border-solid border-gray-100 bg-gray-50 px-3 py-2 dark:border-neutral-600 dark:bg-neutral-800"
  >
    <div class="flex flex-wrap items-center gap-2 text-sm">
      <BaseCheckbox
        :model-value="
          clientsStore.allPageSelected
            ? true
            : clientsStore.somePageSelected
              ? 'indeterminate'
              : false
        "
        :disabled="clientsStore.busy"
        :aria-label="t('client.selectAllPage')"
        @update:model-value="clientsStore.toggleSelectPage()"
      />
      <button
        type="button"
        :disabled="clientsStore.busy"
        class="text-gray-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-neutral-300"
        @click="clientsStore.toggleSelectPage()"
      >
        {{ t('client.selectAllPage') }}
      </button>
      <span class="text-gray-300 dark:text-neutral-600">|</span>
      <span class="text-gray-500 dark:text-neutral-400">
        {{ t('client.selectedCount', { count: clientsStore.selectedCount }) }}
      </span>
      <button
        v-if="clientsStore.selectedCount > 0"
        type="button"
        :disabled="clientsStore.busy"
        class="text-gray-500 underline decoration-dotted disabled:cursor-not-allowed disabled:opacity-50 dark:text-neutral-400"
        @click="clientsStore.clearSelection()"
      >
        {{ t('client.clearSelection') }}
      </button>
    </div>

    <div
      v-if="clientsStore.busy"
      class="flex items-center gap-2 text-sm text-gray-500 dark:text-neutral-400"
    >
      <IconsLoading class="w-4 animate-spin" />
      {{
        t('client.batchProgress', {
          done: clientsStore.progress.done,
          total: clientsStore.progress.total,
        })
      }}
    </div>

    <div
      v-else-if="canManage && clientsStore.selectedCount > 0"
      class="flex flex-wrap items-center gap-2"
    >
      <ClientsBulkActionDialog
        :title="t('client.enableClient')"
        :message="t('client.bulkEnableConfirm', { count: clientsStore.selectedCount })"
        :confirm-label="t('client.bulkEnableSelected')"
        @confirm="run('enable')"
      >
        <BaseSecondaryButton as="span" class="px-3 py-1.5 text-xs">
          {{ t('client.bulkEnableSelected') }}
        </BaseSecondaryButton>
      </ClientsBulkActionDialog>

      <ClientsBulkActionDialog
        :title="t('client.disableClient')"
        :message="t('client.bulkDisableConfirm', { count: clientsStore.selectedCount })"
        :confirm-label="t('client.bulkDisableSelected')"
        @confirm="run('disable')"
      >
        <BaseSecondaryButton as="span" class="px-3 py-1.5 text-xs">
          {{ t('client.bulkDisableSelected') }}
        </BaseSecondaryButton>
      </ClientsBulkActionDialog>

      <ClientsBulkActionDialog
        :title="t('client.deleteClient')"
        :message="t('client.bulkDeleteConfirm', { count: clientsStore.selectedCount })"
        :confirm-label="t('client.bulkDeleteSelected')"
        @confirm="run('delete')"
      >
        <BasePrimaryButton as="span" class="px-3 py-1.5 text-xs">
          <IconsDelete class="mr-1 w-3.5" />
          {{ t('client.bulkDeleteSelected') }}
        </BasePrimaryButton>
      </ClientsBulkActionDialog>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
const toast = useToast();
const clientsStore = useClientsStore();
const authStore = useAuthStore();

// role 1 === ADMIN, see src/shared/utils/permissions.ts
const canManage = computed(() => Number(authStore.userData?.role) === 1);

async function run(action: 'delete' | 'enable' | 'disable') {
  const targets = [...clientsStore.selectedIds];
  if (targets.length === 0 || clientsStore.busy) {
    return;
  }

  const result =
    action === 'delete'
      ? await clientsStore.deleteClients(targets)
      : await clientsStore.setClientsEnabled(targets, action === 'enable');

  if (result.failed > 0) {
    toast.showToast({
      type: 'error',
      message: t('client.batchPartial', {
        ok: result.ok,
        failed: result.failed,
      }),
    });
    return;
  }

  toast.showToast({
    type: 'success',
    message: t('client.batchSuccess', { ok: result.ok }),
  });
}
</script>
