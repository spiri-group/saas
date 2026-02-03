import { useEffect, useState, useCallback } from 'react';
import { useSignalRConnection } from './SignalRProvider';
import { upsert } from '@/lib/functions';

type id_value = string | number;

type RealTimeDataProps<T> = {
    idFields?: string[];
    group?: string | number;
    addToFront?: boolean;
    initialData: T[] | null;
    typeName: string;
    getRecord?: (id: id_value | id_value[]) => Promise<T>;
    onDelete?: (id: id_value | id_value[]) => void;
    withDelay?: number;
    mergeLogic?: "replace" | "merge";
};

export type RealTimeArray<T> = {
    get: T[];
    set: React.Dispatch<React.SetStateAction<T[]>>;
    upsert: (item: T) => void;
    remove: (item: T) => void;
};

const useRealTimeArrayState = <T extends { id: id_value }>({ idFields = ["id"], addToFront = true, mergeLogic = "merge", ...props }: RealTimeDataProps<T>): RealTimeArray<T> => {
    const signalR = useSignalRConnection();
    const [data, setData] = useState<T[] | null>(props.initialData);
    const [connectedGroup, setConnectedGroup] = useState<string | undefined>(undefined);

    const isEqual = (a: T, b: T) => {
        return idFields.every(field => a[field] === b[field]);
    };

    const upsertData = useCallback((item: T) => {
        if (mergeLogic === "replace") {
            setData(prev => (prev || []).map(x => isEqual(x, item) ? item : x));
        } else {
            setData(prev => upsert(prev || [], item, {
                addToFront,
                idFields
            }));
        }
    }, [idFields, addToFront, mergeLogic]);

    const removeData = useCallback((item: T) => {
        setData(prev => (prev || []).filter(x => !isEqual(x, item)));
    }, [idFields]);

    const handleMessage = useCallback(async (message: any) => {
        const { type, ...attribs } = message;
        console.log("Received message", message);

        if (type === "data") {
            let record = attribs.data as T;

            try {
                if (attribs.action === "upsert") {
                    if (props.getRecord) {
                        const idValues = idFields.map(field => record[field]);
                        record = await props.getRecord(idValues.length === 1 ? idValues[0] : idValues);
                    }
                    if (props.withDelay) {
                        setTimeout(() => upsertData(record), props.withDelay);
                    } else {
                        upsertData(record);
                    }
                } else if (attribs.action === "delete") {
                    removeData(record);
                    if (props.onDelete) {
                        const idValues = idFields.map(field => record[field]);
                        props.onDelete(idValues.length === 1 ? idValues[0] : idValues);
                    }
                }
            } catch (error) {
                console.error("Error handling message:", error);
            }
        }
    }, [props.getRecord, props.withDelay, props.onDelete, upsertData, removeData, idFields]);

    useEffect(() => {
        if (!signalR?.connection) return;

        const setupSignalR = async () => {
            try {
                if (signalR.connection) {
                    signalR.connection.on(`${props.typeName}s`, handleMessage);
                }
            } catch (error) {
                console.error("Error setting up SignalR:", error);
            }
        };

        setupSignalR();

        return () => {
            if (signalR.connection) {
                signalR.connection.off(`${props.typeName}s`);
            }
        };
    }, [signalR?.connection, props.typeName, handleMessage]);

    const leaveGroup = useCallback(async () => {
        try {
            if (connectedGroup) {
                await signalR?.leaveGroup(connectedGroup);
                setConnectedGroup(undefined);
            }
        } catch (error) {
            console.error("Error leaving group:", error);
        }
    }, [connectedGroup]);

    useEffect(() => {
        if (signalR?.connection?.state !== "Connected" || !props.group) return;

        const group = props.group.toString();

        const joinGroup = async () => {
            try {
                await signalR.joinGroup(group);
                setConnectedGroup(group);
            } catch (error) {
                console.error("Error joining group:", error);
            }
        };

        joinGroup();

        return () => {
            leaveGroup();
        };
    }, [signalR?.connection?.state, props.group]);

    return {
        get: data ?? [],
        set: setData,
        upsert: upsertData,
        remove: removeData,
    };
};

export default useRealTimeArrayState;