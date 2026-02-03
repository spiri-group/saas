export enum DataAction {
    UPSERT = "upsert", DELETE = "delete"
}

type SignalRMessageArgument = {
    userId?: string,
    group?: string,
    persisted?: string,
    position?: "bottom-center" | "top-center"
}

type DataMessageArgument = SignalRMessageArgument & {
    action: DataAction 
}

type NoficationMessageArgument = SignalRMessageArgument & {
    url?: string,
    status?: "success" | "warn" | "error" | "info" | "normal"
}

class signalRManager {
    public messages: {
      target: string,
      userId?: string,
      group?: string,
      arguments: any[]   
    }[] = []

    addDataMessage<T>(typeName: string, data: T, options: DataMessageArgument ) {
        if (options.userId == undefined && options.group == undefined) throw "Either a userId or group must be present when sending a signalr message."

        const new_message = {
            type: "data",
            position: options.position ?? "bottom-center",
            action: options.action ?? DataAction.UPSERT,
            data,
            persisted: options.persisted ?? false
        }

        if (this.messages.find(x => x.target == typeName && x.userId == options.userId)) {
            this.messages.find(x => x.target == typeName && x.userId == options.userId).arguments.push(new_message)
        } else {
            this.messages.push({
                target: typeName,            
                userId: options.userId ?? undefined,
                group: options.group ?? undefined,
                arguments: [new_message]
            });
        }
       
    }
      
    addNotificationMessage(message: string | { title: string, description: string }, options: NoficationMessageArgument) {
        if (options.userId == undefined && options.group == undefined) throw "Either a userId or group must be present when sending a signalr message."

        const new_message = {
            type: "notification",
            position: options.position ?? "bottom-center",
            status: options.status ?? "normal",
            message: typeof message === "string" ? message : message.title,
            url: options.url,
            persisted: options.persisted ?? false,
            description: typeof message === "string" ? undefined : message.description
        }

        if (this.messages.find(x => x.target == 'notification' && x.userId == options.userId)) {
            this.messages.find(x => x.target == 'notification' && x.userId == options.userId).arguments.push(new_message)
        } else {
            this.messages.push({
                target: 'notification',
                userId: options.userId ?? undefined,
                group: options.group ?? undefined,
                arguments: [new_message]
            });
        }
    }
    
}

export { signalRManager };