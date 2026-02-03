import { serverContext } from "../services/azFunction";

// Generic resolver wrapper for authenticated mutations
export const createMutationResolver = <TArgs, TResult>(
    operationName: string,
    operation: (ds: any, args: TArgs, userId: string) => Promise<TResult>,
    resultKey?: string,
    customMessageFn?: (result: TResult) => string
) => {
    return (managerFactory: (context: serverContext) => any) => {
        return async (_: any, args: TArgs, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const ds = managerFactory(context);
            
            try {
                const result = await operation(ds, args, context.userId);
                
                // Generate message dynamically from operation name
                let message: string;
                if (customMessageFn) {
                    message = customMessageFn(result);
                } else {
                    const action = operationName.startsWith('create') ? 'created' :
                                  operationName.startsWith('update') ? 'updated' :
                                  operationName.startsWith('delete') ? 'deleted' :
                                  operationName.startsWith('upsert') ? 'processed' : 'processed';
                    
                    const entity = operationName.replace(/^(create|update|delete|upsert)Gallery/, '').toLowerCase();
                    message = `Gallery ${entity} ${action} successfully`;
                }
                
                const response: any = {
                    success: true,
                    message
                };
                
                if (resultKey && result) {
                    response[resultKey] = result;
                } else if (result && typeof result === 'object' && 'galleryItem' in result) {
                    // Handle upsert special case
                    Object.assign(response, result);
                } else if (result && !resultKey) {
                    // Auto-detect result key from operation name if not specified
                    const entity = operationName.replace(/^(create|update|delete|upsert)Gallery/, '').toLowerCase();
                    const key = entity === 'item' ? 'galleryItem' : entity;
                    response[key] = result;
                }
                
                return response;
            } catch (error) {
                const action = operationName.startsWith('create') ? 'create' :
                              operationName.startsWith('update') ? 'update' :
                              operationName.startsWith('delete') ? 'delete' :
                              operationName.startsWith('upsert') ? 'upsert' : 'process';
                
                const response: any = {
                    success: false,
                    message: `Failed to ${action}: ${error.message}`
                };
                
                if (resultKey) {
                    response[resultKey] = null;
                }
                
                return response;
            }
        };
    };
};

// Generic resolver wrapper for queries (no authentication required)
export const createQueryResolver = <TArgs, TResult>(
    operation: (ds: any, args: TArgs) => Promise<TResult>
) => {
    return (managerFactory: (context: serverContext) => any) => {
        return async (_: any, args: TArgs, context: serverContext) => {
            const ds = managerFactory(context);
            return await operation(ds, args);
        };
    };
};