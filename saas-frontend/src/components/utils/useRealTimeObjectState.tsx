import { useEffect, useState, useCallback } from 'react';
import { useSignalRConnection } from './SignalRProvider';
import { clone, mergeDeep } from '@/lib/functions';

type id_value = string | number;

type RealTimeDataProps<T> = {
    initialData?: T;
    initialId?: id_value;
    typeName: string;
    getRecord?: (id: id_value | id_value[]) => Promise<T>;
    withDelay?: number;
    group?: string | number;
    idFields?: string[];
};

const useRealTimeObjectState = <T extends { id: id_value }>({ idFields = ["id"], ...props }: RealTimeDataProps<T>) => {
    if (props.initialData && props.initialId) {
        throw new Error("Both initialData and initialId cannot be present.");
    }

    const signalR = useSignalRConnection();
    const [data, setData] = useState<T | null>(props.initialData || null);
    const [connectedGroup, setConnectedGroup] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (props.initialId) {
            if (!props.getRecord) {
                throw new Error("getRecord is required when initialId is present.");
            }

            const process = async () => {
                try {
                    const record = await props.getRecord!(props.initialId as id_value);
                    setData(record);
                } catch (error) {
                    console.error("Error fetching initial record:", error);
                }
            };
            process();
        }
    }, [props.initialId]);

    const updateData = useCallback((item: T) => {
        setData(prev => {
            const temp = clone(prev, 'deep');
            return mergeDeep(temp, item);
        });
    }, []);

    useEffect(() => {
        if (!signalR?.connection) return;

        const setupSignalR = async () => {
            try {
                if (signalR.connection) {
                    signalR.connection.on(`${props.typeName}`, async (message) => {
                        const { type, ...attribs } = message;

                        if (type === "data") {
                            let record = attribs.data as T;
                            try {
                                if (props.getRecord) {
                                    const idValues = idFields.map(field => record[field]);
                                    record = await props.getRecord(idValues.length === 1 ? idValues[0] : idValues);
                                }

                                if (props.withDelay) {
                                    if (attribs.action === "upsert") {
                                        setTimeout(() => updateData(record), props.withDelay);
                                    }
                                } else {
                                    if (attribs.action === "upsert") {
                                        updateData(record);
                                    }
                                }
                            } catch (error) {
                                console.error("Error processing message:", error);
                            }
                        }
                    });
                }
            } catch (error) {
                console.error("Error setting up SignalR:", error);
            }
        };

        setupSignalR();

        return () => {
            if (signalR.connection) {
                signalR.connection.off(`${props.typeName}`);
            }
        };
    }, [signalR?.connection, props.typeName, updateData, idFields]);

    useEffect(() => {
        if (props.group === connectedGroup) return;
        if (!signalR?.connection || !props.group) return;

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
            const leaveGroup = async () => {
                try {
                    if (connectedGroup) {
                        await signalR.leaveGroup(connectedGroup);
                        setConnectedGroup(undefined);
                    }
                } catch (error) {
                    console.error("Error leaving group:", error);
                }
            };

            leaveGroup();
        };
    }, [signalR?.connection, props.group, connectedGroup]);

    return {
        get: data,
        set: setData,
        update: updateData,
    };
};

export default useRealTimeObjectState;