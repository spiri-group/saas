  import { useEffect } from "react";
  import {
    useQuery,
    useQueryClient,
    UseQueryOptions,
    QueryKey,
  } from "@tanstack/react-query";
  import { useSignalRConnection } from "@/components/utils/SignalRProvider";
  import { safePatch } from "./shared";
import { recordref_type } from "@/utils/spiriverse";

  type IdType = string | number | (string | number)[] | recordref_type;

  type UseRealTimeQueryListProps<T> = {
    queryKey: QueryKey;
    queryFn: () => Promise<T[]>;
    hydrateFn?: (id: IdType) => Promise<T>;
    realtimeEvent: string;
    selectId: (record: T) => IdType;
    shouldUpdate?: (prev?: T, next?: T) => boolean;
    signalRGroup?: string;
    updateDelay?: number;
    enabled?: boolean;
  } & Omit<UseQueryOptions<T[]>, "queryKey" | "queryFn">;

  export function useRealTimeQueryList<T extends object>({
    queryKey,
    queryFn,
    hydrateFn,
    realtimeEvent,
    selectId,
    shouldUpdate = () => true,
    signalRGroup,
    updateDelay = 0,
    enabled = true,
    ...options
  }: UseRealTimeQueryListProps<T>) {
    const queryClient = useQueryClient();
    const signalR = useSignalRConnection();

    const query = useQuery({
      queryKey,
      queryFn,
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

      const updateCache = (transform: (list: T[]) => T[]) => {
        const current = queryClient.getQueryData<T[]>(queryKey);
        if (!Array.isArray(current)) return;

        const next = transform([...current]);
        const update = () => queryClient.setQueryData<T[]>(queryKey, next);
        if (updateDelay) {
          setTimeout(update, updateDelay);
        } else {
          update();
        }
      };

    const handleUpsert = async (incoming: T) => {
        const id = selectId(incoming);

        const updatedItem = hydrateFn ? await hydrateFn(id) : incoming;

        updateCache((list) => {
          const index = list.findIndex((item) => compareIds(selectId(item), id));
          if (index === -1) return [...list, updatedItem];

          const existing = list[index];
          if (!shouldUpdate(existing, updatedItem)) return list;

          list[index] = safePatch(existing, updatedItem);
          return list;
        });
      };


      const handleRemove = (incoming: T) => {
        const incomingId = selectId(incoming);
        updateCache((list) =>
          list.filter((item) => !compareIds(selectId(item), incomingId))
        );
      };

      const handler = async (message: any) => {
        const { type, action, data } = message;
        if (type !== "data" || !data) return;

        try {
          if (action === "upsert") {
            await handleUpsert(data);
          } else if (action === "remove") {
            handleRemove(data);
          } else if (action === "batch-upsert" && Array.isArray(data)) {
            for (const item of data) await handleUpsert(item);
          } else if (action === "batch-remove" && Array.isArray(data)) {
            for (const item of data) handleRemove(item);
          }
        } catch (err) {
          console.error("Real-time list update failed:", err);
        }
      };


      signalR.connection.on(realtimeEvent, handler);
      return () => {
          if (!signalR?.connection) return;
          signalR.connection.off(realtimeEvent, handler);
      }
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