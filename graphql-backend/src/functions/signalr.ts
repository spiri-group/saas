import { app, HttpRequest, input, HttpResponseInit, InvocationContext, output } from '@azure/functions';

const inputSignalR = input.generic({
    type: 'signalRConnectionInfo',
    name: 'connectionInfo',
    hubName: 'serverless',
    userId: '{query.userId}',
    connectionStringSetting: 'AzureSignalRConnectionString',
});

const outputSignalR = output.generic({
    type: 'signalR',
    name: 'signalR',
    hubName: 'serverless',
    connectionStringSetting: 'AzureSignalRConnectionString',
});

app.http('negotiate', {
    methods: ['GET','POST'],
    authLevel: 'anonymous',
    extraInputs: [inputSignalR],
    handler: (_: HttpRequest, context: InvocationContext) => {
        const signalRConnection = context.extraInputs.get(inputSignalR);
        return {
            status: 200,
            body: JSON.stringify(signalRConnection) 
        };    
    }
});

// The following function adds a user to a group
app.http('addUserToGroup', {
    methods: ['POST'],
    authLevel: 'anonymous',
    extraOutputs: [outputSignalR],
    handler: async (request, context) => {
        const userId = request.query.get("userId");
        const group = request.query.get("group"); // Get group from query parameters
        // Ensure both userId and group are provided
        if (!userId || !group) {
            return {
                status: 400,
                body: "Missing userId or group"
            };
        }
        // Use context.extraOutputs.set if needed, uncomment and adjust as necessary
        context.extraOutputs.set('signalR', {
            "userId": userId,
            "groupName": group,
            "action": "add"
        });
        return {
            status: 200
        }
    }
});

// The following function removes a user from a group
app.http('removeUserFromGroup', {
    methods: ['POST'],
    authLevel: 'anonymous',
    extraOutputs: [outputSignalR],
    handler: (request, context) => {
        const userId = request.query.get("userId");
        const group = request.query.get("group"); // Get group from query parameters
        // Ensure both userId and group are provided
        if (!userId || !group) {
            return {
                status: 400,
                body: "Missing userId or group"
            };
        }
        // Use context.extraOutputs.set if needed, uncomment and adjust as necessary
        context.extraOutputs.set('signalR', {
            "userId": userId,
            "groupName": group,
            "action": "remove"
        });
        return {
            status: 200
        }
    }
});