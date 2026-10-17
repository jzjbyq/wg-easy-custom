<template>
  <div
    v-for="client in clientsStore.pagedClients"
    :key="client.id"
    class="flex items-stretch border-b border-solid border-gray-100 last:border-b-0 dark:border-neutral-600"
  >
    <div class="flex shrink-0 items-center pl-3 pr-1">
      <BaseCheckbox
        :model-value="clientsStore.isSelected(client.id)"
        :disabled="clientsStore.busy"
        :aria-label="$t('client.selectClient', { name: client.name })"
        @update:model-value="clientsStore.toggleSelected(client.id)"
      />
    </div>
    <div class="relative min-w-0 flex-1 overflow-hidden">
      <ClientCard :client="client" />
    </div>
  </div>
</template>

<script setup lang="ts">
const clientsStore = useClientsStore();
</script>
