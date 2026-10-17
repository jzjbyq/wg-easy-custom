import { defineStore } from 'pinia';
import { sha256 } from 'js-sha256';
import type { TypedInternalResponse } from 'nitropack/types';

type WGClientReturn = TypedInternalResponse<
  '/api/client',
  unknown,
  'get'
>[number];

export type LocalClient = WGClientReturn & {
  avatar?: string;
  transferMax?: number;
} & Omit<ClientPersist, 'transferRxPrevious' | 'transferTxPrevious'>;

export type ClientPersist = {
  transferRxHistory: number[];
  transferRxPrevious: number;
  transferRxCurrent: number;
  transferRxSeries: { name: string; data: number[] }[];
  hoverRx?: unknown;
  transferTxHistory: number[];
  transferTxPrevious: number;
  transferTxCurrent: number;
  transferTxSeries: { name: string; data: number[] }[];
  hoverTx?: unknown;
};

export const PAGE_SIZES = [10, 20, 50, 100] as const;

export type BatchAction = 'delete' | 'enable' | 'disable';

export type BatchResult = {
  /** successfully processed clients */
  ok: number;
  /** failed clients */
  failed: number;
};

export const useClientsStore = defineStore('Clients', () => {
  const globalStore = useGlobalStore();
  const clients = ref<null | LocalClient[]>(null);
  const clientsPersist = ref<Record<string, ClientPersist>>({});

  const filter = ref<string | undefined>(undefined);

  // ---------------------------------------------------------------------------
  // Pagination (client side only; the API always returns the full list so that
  // the 1s polling keeps working across pages)
  // ---------------------------------------------------------------------------
  const page = ref(1);
  const pageSize = useCookie<number>('clientsPageSize', {
    default: () => 10,
    maxAge: 365 * 24 * 60 * 60,
    sameSite: 'lax',
  });

  // Cookie values can be tampered with or come back as a string, normalize them
  const pageSizeSafe = computed(() => {
    const value = Number(pageSize.value);
    return Number.isInteger(value) && value > 0 ? value : 10;
  });

  const searchParams = computed(() => ({
    filter: filter.value,
    sort: globalStore.sortClient,
  }));

  const { data: _clients, refresh: _refresh } = useFetch('/api/client', {
    method: 'get',
    params: searchParams,
  });

  const total = computed(() => clients.value?.length ?? 0);

  const pageCount = computed(() =>
    Math.max(1, Math.ceil(total.value / pageSizeSafe.value))
  );

  const pagedClients = computed<LocalClient[] | null>(() => {
    if (!clients.value) {
      return null;
    }
    const start = (page.value - 1) * pageSizeSafe.value;
    return clients.value.slice(start, start + pageSize.value);
  });

  const rangeStart = computed(() =>
    total.value === 0 ? 0 : (page.value - 1) * pageSizeSafe.value + 1
  );

  const rangeEnd = computed(() =>
    Math.min(page.value * pageSizeSafe.value, total.value)
  );

  function goToPage(target: number) {
    const next = Math.min(Math.max(1, Math.trunc(target)), pageCount.value);
    page.value = Number.isFinite(next) ? next : 1;
  }

  function nextPage() {
    goToPage(page.value + 1);
  }

  function prevPage() {
    goToPage(page.value - 1);
  }

  function setPageSize(size: number) {
    const next = PAGE_SIZES.includes(size as (typeof PAGE_SIZES)[number])
      ? size
      : 10;
    pageSize.value = next;
    page.value = 1;
  }

  // Keep the current page in range when the list shrinks (delete, search, ...)
  function clampPage() {
    if (page.value > pageCount.value) {
      page.value = pageCount.value;
    }
    if (page.value < 1) {
      page.value = 1;
    }
  }

  // ---------------------------------------------------------------------------
  // Selection (multi select + bulk actions)
  // ---------------------------------------------------------------------------
  const selectedIds = ref<number[]>([]);

  /** a batch action (delete / enable / disable) is currently running */
  const busy = ref(false);
  const busyAction = ref<BatchAction | null>(null);
  const progress = ref<{ done: number; total: number }>({ done: 0, total: 0 });

  const deleting = computed(
    () => busy.value && busyAction.value === 'delete'
  );

  const pageIds = computed(() => pagedClients.value?.map((c) => c.id) ?? []);
  const selectedCount = computed(() => selectedIds.value.length);
  const pageSelectedCount = computed(
    () => pageIds.value.filter((id) => selectedIds.value.includes(id)).length
  );
  const allPageSelected = computed(
    () =>
      pageIds.value.length > 0 &&
      pageSelectedCount.value === pageIds.value.length
  );
  const somePageSelected = computed(
    () => pageSelectedCount.value > 0 && !allPageSelected.value
  );

  function isSelected(id: number) {
    return selectedIds.value.includes(id);
  }

  function toggleSelected(id: number) {
    if (busy.value) {
      return;
    }
    if (isSelected(id)) {
      selectedIds.value = selectedIds.value.filter((v) => v !== id);
    } else {
      selectedIds.value = [...selectedIds.value, id];
    }
  }

  function clearSelection() {
    selectedIds.value = [];
  }

  /** Select / unselect every client of the current page */
  function toggleSelectPage() {
    if (busy.value) {
      return;
    }

    if (allPageSelected.value) {
      const current = new Set(pageIds.value);
      selectedIds.value = selectedIds.value.filter((id) => !current.has(id));
      return;
    }

    selectedIds.value = [...new Set([...selectedIds.value, ...pageIds.value])];
  }

  /**
   * Run a batch action over the given clients.
   *
   * The API only offers single client endpoints and every call rewrites the
   * config + syncs the interface, so requests are sent sequentially to avoid
   * concurrent `syncconf` / iptables rebuilds.
   */
  async function runBatch(
    action: BatchAction,
    ids: number[]
  ): Promise<BatchResult> {
    const targets = [...new Set(ids)];

    if (busy.value || targets.length === 0) {
      return { ok: 0, failed: 0 };
    }

    busy.value = true;
    busyAction.value = action;
    progress.value = { done: 0, total: targets.length };

    let ok = 0;
    let failed = 0;

    for (const id of targets) {
      try {
        if (action === 'delete') {
          await $fetch(`/api/client/${id}`, { method: 'delete' });
        } else {
          await $fetch(`/api/client/${id}/${action}`, { method: 'post' });
        }
        ok += 1;
      } catch (error) {
        failed += 1;
        console.error(`failed to ${action} client ${id}`, error);
      }

      progress.value = {
        done: progress.value.done + 1,
        total: targets.length,
      };
    }

    // Removed clients cannot stay selected
    if (action === 'delete') {
      selectedIds.value = selectedIds.value.filter(
        (id) => !targets.includes(id)
      );
    }

    try {
      await refresh();
    } catch (error) {
      console.error(error);
    }

    busy.value = false;
    busyAction.value = null;
    progress.value = { done: 0, total: 0 };

    return { ok, failed };
  }

  function deleteClients(ids: number[]) {
    return runBatch('delete', ids);
  }

  function setClientsEnabled(ids: number[], enabled: boolean) {
    return runBatch(enabled ? 'enable' : 'disable', ids);
  }

  // TODO: rewrite
  async function refresh({ updateCharts = false } = {}) {
    await _refresh();
    const transformedClients = _clients.value?.map((client) => {
      let avatar = undefined;
      if (client.name.includes('@') && client.name.includes('.')) {
        avatar = `https://gravatar.com/avatar/${sha256(client.name.toLowerCase().trim())}.jpg`;
      }

      if (!clientsPersist.value[client.id]) {
        clientsPersist.value[client.id] = {
          transferRxHistory: Array(50).fill(0),
          transferRxPrevious: client.transferRx ?? 0,
          transferTxHistory: Array(50).fill(0),
          transferTxPrevious: client.transferTx ?? 0,
          transferRxCurrent: 0,
          transferTxCurrent: 0,
          transferRxSeries: [],
          transferTxSeries: [],
        };
      }

      // We know that this can't be undefined
      const clientPersist = clientsPersist.value[client.id]!;

      // Debug
      /* client.transferRx =
        clientPersist.transferRxPrevious + Math.random() * 1000;
      client.transferTx =
        clientPersist.transferTxPrevious + Math.random() * 1000;
      client.latestHandshakeAt = new Date().toISOString(); */

      clientPersist.transferRxCurrent =
        (client.transferRx ?? 0) - clientPersist.transferRxPrevious;

      clientPersist.transferRxPrevious = client.transferRx ?? 0;

      clientPersist.transferTxCurrent =
        (client.transferTx ?? 0) - clientPersist.transferTxPrevious;

      clientPersist.transferTxPrevious = client.transferTx ?? 0;

      let transferMax = undefined;

      if (updateCharts) {
        clientPersist.transferRxHistory.push(clientPersist.transferRxCurrent);
        clientPersist.transferRxHistory.shift();

        clientPersist.transferTxHistory.push(clientPersist.transferTxCurrent);
        clientPersist.transferTxHistory.shift();

        clientPersist.transferTxSeries = [
          {
            name: 'Tx',
            data: clientPersist.transferTxHistory,
          },
        ];

        clientPersist.transferRxSeries = [
          {
            name: 'Rx',
            data: clientPersist.transferRxHistory,
          },
        ];

        transferMax = Math.max(
          ...clientPersist.transferTxHistory,
          ...clientPersist.transferRxHistory
        );
      }

      return {
        ...client,
        avatar,
        transferTxHistory: clientPersist.transferTxHistory,
        transferRxHistory: clientPersist.transferRxHistory,
        transferMax,
        transferTxSeries: clientPersist.transferTxSeries,
        transferRxSeries: clientPersist.transferRxSeries,
        transferTxCurrent: clientPersist.transferTxCurrent,
        transferRxCurrent: clientPersist.transferRxCurrent,
        hoverTx: clientPersist.hoverTx,
        hoverRx: clientPersist.hoverRx,
      };
    });

    clients.value = transformedClients ?? null;

    // Drop selections of clients that no longer exist
    if (transformedClients) {
      const alive = new Set(transformedClients.map((client) => client.id));
      selectedIds.value = selectedIds.value.filter((id) => alive.has(id));
    }

    clampPage();
  }

  function setSearchQuery(query: string) {
    clients.value = null;
    filter.value = query || undefined;
    page.value = 1;
    clearSelection();
  }

  // Sorting is done server side, reset to the first page when it changes
  watch(
    () => globalStore.sortClient,
    () => {
      page.value = 1;
    }
  );

  return {
    clients,
    clientsPersist,
    refresh,
    _clients,
    setSearchQuery,
    // pagination
    page,
    pageSize,
    pageCount,
    total,
    pagedClients,
    rangeStart,
    rangeEnd,
    goToPage,
    nextPage,
    prevPage,
    setPageSize,
    // selection
    selectedIds,
    selectedCount,
    pageSelectedCount,
    allPageSelected,
    somePageSelected,
    isSelected,
    toggleSelected,
    toggleSelectPage,
    clearSelection,
    // batch actions
    busy,
    busyAction,
    progress,
    deleting,
    deleteClients,
    setClientsEnabled,
  };
});
