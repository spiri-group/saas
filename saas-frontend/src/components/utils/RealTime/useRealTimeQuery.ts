import { useEffect } from "react";
import {
  useQuery,
  useQueryClient,
  UseQueryOptions,
  QueryKey,
} from "@tanstack/react-query";
import { useSignalRConnection } from "@/components/utils/SignalRProvider";
import { recordref_type } from "@/utils/spiriverse";

type IdType = string | number | (string | number)[] | recordref_type;

type UseRealTimeQueryProps<T> = {
  queryKey: QueryKey;
  realtimeEvent: string;
  selectId: (record: T | undefined) => IdType;
  shouldUpdate?: (prev?: T, next?: T) => boolean;
  signalRGroup?: string;
  updateDelay?: number;
  enabled?: boolean;
} & Omit<UseQueryOptions<T>, "queryKey">;

/**
 * React Query hook for a real-time list of records.
 *
 * Listens to SignalR `upsert` and `remove` events and updates the cached list in-place.
 *
 * ⚠️ Real-time messages must include the full record object (not just the ID),
 *     as the hook will directly insert or remove records in the query cache
 *     without triggering a refetch.
 *
 * - `selectId(record)` must return a unique, stable ID (string, number, or array)
 * - `realtimeEvent` should match the SignalR broadcast name
 * - `signalRGroup` scopes which clients receive which updates
 *
 * This hook does not refetch on update. If you require canonical server state,
 * use `useRealTimeQuery()` instead.
 */
export function useRealTimeQuery<T>({
  queryKey,
  realtimeEvent,
  selectId,
  shouldUpdate = () => true,
  signalRGroup,
  updateDelay = 0,
  enabled = true,
  ...options
}: UseRealTimeQueryProps<T>) {
  const queryClient = useQueryClient();
  const signalR = useSignalRConnection();

  const query = useQuery({
    queryKey,
    enabled,
    staleTime: Infinity,
    ...options,
  });

  useEffect(() => {
    if (!signalR?.connection || !enabled) return;

    const compareIds = (a: IdType, b: IdType): boolean =>
      Array.isArray(a)
        ? Array.isArray(b) &&
          a.length === b.length &&
          a.every((val, i) => compareIds(val, b[i])) // Recursive!
        : a === b;

    const handler = async (message: any) => {
      if (message?.type !== "data" || message?.action !== "upsert") return;

      const incoming = message.data;
      if (!incoming) return;

      const currentId = selectId(query.data);
      const incomingId = selectId(incoming);

      if (!compareIds(currentId, incomingId)) return;

      try {
        const result = await query.refetch();
        const current = queryClient.getQueryData<T>(queryKey);

        if (!result?.data || !shouldUpdate(current, result.data)) return;

        const update = () =>
          queryClient.setQueryData(queryKey, result.data as T);

        if (updateDelay) {
          setTimeout(update, updateDelay);
        } else {
          update();
        }

      } catch (err) {
        console.error("Real-time query update failed:", err);
      }
    };

    signalR.connection.on(realtimeEvent, handler);
    return () => {
      if (!signalR?.connection) return;
      signalR.connection.off(realtimeEvent, handler);
    };
  }, [signalR?.connection, enabled, query.data]);

  useEffect(() => {
    if (!signalR?.connection || !signalRGroup) return;
    signalR.joinGroup(signalRGroup).catch(console.error);
    return () => {
      signalR.leaveGroup(signalRGroup).catch(console.error);
    };
  }, [signalR?.connection, signalRGroup]);

  return query;
}