<template>
  <div
    v-if="clientsStore.total > 0"
    class="flex flex-wrap items-center justify-between gap-3 border-t border-solid border-gray-100 px-3 py-3 text-sm dark:border-neutral-600"
  >
    <div class="text-gray-500 dark:text-neutral-400">
      {{
        $t('client.pageRange', {
          start: clientsStore.rangeStart,
          end: clientsStore.rangeEnd,
          total: clientsStore.total,
        })
      }}
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <label class="flex items-center gap-1 text-gray-500 dark:text-neutral-400">
        <span>{{ $t('client.perPage') }}</span>
        <select
          :value="clientsStore.pageSize"
          :disabled="clientsStore.busy"
          class="rounded bg-gray-100 py-1 pl-2 pr-8 text-sm text-gray-700 outline-none dark:bg-neutral-600 dark:text-neutral-200"
          @change="onPageSizeChange"
        >
          <option v-for="size in pageSizes" :key="size" :value="size">
            {{ size }}
          </option>
        </select>
      </label>

      <button
        type="button"
        :disabled="clientsStore.page <= 1 || clientsStore.busy"
        :title="$t('client.prevPage')"
        :aria-label="$t('client.prevPage')"
        class="rounded bg-gray-100 p-1.5 text-gray-500 transition enabled:hover:bg-red-800 enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-neutral-600 dark:text-neutral-300"
        @click="clientsStore.prevPage()"
      >
        <IconsArrowLeftCircle class="w-4" />
      </button>

      <template v-for="(item, index) in pageItems" :key="`${item}-${index}`">
        <span
          v-if="typeof item !== 'number'"
          class="px-1 text-gray-400 dark:text-neutral-500"
          >…</span
        >
        <button
          v-else
          type="button"
          :disabled="clientsStore.busy"
          :aria-current="item === clientsStore.page ? 'page' : undefined"
          class="min-w-[1.75rem] rounded px-2 py-1 text-sm transition"
          :class="
            item === clientsStore.page
              ? 'bg-red-800 text-white'
              : 'bg-gray-100 text-gray-600 enabled:hover:bg-red-800 enabled:hover:text-white dark:bg-neutral-600 dark:text-neutral-300'
          "
          @click="clientsStore.goToPage(item)"
        >
          {{ item }}
        </button>
      </template>

      <button
        type="button"
        :disabled="clientsStore.page >= clientsStore.pageCount || clientsStore.busy"
        :title="$t('client.nextPage')"
        :aria-label="$t('client.nextPage')"
        class="rounded bg-gray-100 p-1.5 text-gray-500 transition enabled:hover:bg-red-800 enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-neutral-600 dark:text-neutral-300"
        @click="clientsStore.nextPage()"
      >
        <IconsArrowRightCircle class="w-4" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const clientsStore = useClientsStore();

// keep in sync with PAGE_SIZES in app/stores/clients.ts
const pageSizes = [10, 20, 50, 100];

const pageItems = computed<(number | string)[]>(() => {
  const count = clientsStore.pageCount;
  const current = clientsStore.page;

  if (count <= 7) {
    return Array.from({ length: count }, (_, index) => index + 1);
  }

  const items: (number | string)[] = [1];
  const start = Math.max(2, current - 2);
  const end = Math.min(count - 1, current + 2);

  if (start > 2) {
    items.push('start-ellipsis');
  }

  for (let index = start; index <= end; index++) {
    items.push(index);
  }

  if (end < count - 1) {
    items.push('end-ellipsis');
  }

  items.push(count);

  return items;
});

function onPageSizeChange(event: Event) {
  const value = Number.parseInt((event.target as HTMLSelectElement).value, 10);
  clientsStore.setPageSize(value);
}
</script>
