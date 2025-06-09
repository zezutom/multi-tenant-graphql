import express from 'express';
import {createServer} from 'http';
import {WebSocketServer} from 'ws';
import {useServer} from 'graphql-ws/lib/use/ws';
import {makeExecutableSchema} from '@graphql-tools/schema';
import cors from 'cors';
import {ApolloServer} from '@apollo/server';
import {expressMiddleware} from '@apollo/server/express4';

import {typeDefs} from './schema.js';
import {resolvers} from './resolvers.js';
import {getTenantContext} from './context.js';

import {getTenantFromKey, setPlanForTenant} from './tenants.js';
import {pubsub} from './pubsub.js';
import {parse, validate, getOperationAST, execute, subscribe} from 'graphql';
import {GraphQLSchema, isSchema} from 'graphql';

async function startServer() {
    const app = express(); // Use ONE express instance

    const httpServer = createServer(app);
    const schema = makeExecutableSchema({typeDefs, resolvers});

    function getSchemaForTenant(apiKey) {
        const tenantSchemas = {
            'bob-api-key': 'bob',
            'alice-api-key': 'alice'
        }
        const tenantId = tenantSchemas[apiKey] || 'default';
    }

    // Set up WebSocket server for GraphQL subscriptions
    const wsServer = new WebSocketServer({
        server: httpServer,
        path: '/graphql'
    });

    useServer(
        {
            schema,
            context: (ctx) => {
                const apiKey = ctx.connectionParams?.headers?.['x-api-key'];
                const tenant = getTenantFromKey(apiKey);
                if (!tenant) {
                    throw new Error('Unauthorized tenant');
                }
                console.log('✅ WS Context established:', apiKey);
                return {apiKey, tenant};
            },
            onSubscribe: (ctx, msg) => {
                try {
                    console.log('[WS] onSubscribe received:', msg);
                    const apiKey = ctx.connectionParams?.headers?.['x-api-key'];
                    const tenant = getTenantFromKey(apiKey);
                    const tenantId = tenant?.name?.toLowerCase() || 'default';

                    // Dynamically apply directives here
                    const operationName = msg.payload.operationName;
                    const document = parse(msg.payload.query);

                    const errors = validate(schema, document);
                    if (errors.length > 0) return errors;

                    // Attach context + tenant-specific schema
                    return {
                        schema,
                        operationName,
                        document,
                        variableValues: msg.payload.variables,
                        contextValue: {apiKey, tenant},
                        execute,
                        subscribe
                    };
                } catch (err) {
                    console.error('❌ onSubscribe failed:', err);
                    return err;
                }
            },
            onError: (ctx, msg, errors) => {
                console.error('[WS] Subscription error:', errors);
            }
        },
        wsServer
    );

    const server = new ApolloServer({
        typeDefs,
        resolvers,
    });


    // Apply middleware to the same `app` instance, in this order:
    app.use(cors());
    app.use(express.json()); // Must come BEFORE expressMiddleware

    await server.start();

    // Apollo middleware AFTER express.json()
    app.use(
        '/graphql',
        expressMiddleware(server, {
            context: async ({req}) => {
                const {apiKey, tenant} = getTenantContext(req);
                // Dynamically set schema based on tenant
                server.schema = getSchemaForTenant(apiKey);
                return {apiKey, tenant};
            }
        })
    );

    app.post('/admin/upgrade', express.json(), (req, res) => {
        const {apiKey, newPlan} = req.body;
        setPlanForTenant(apiKey, newPlan);
        const updatedTenant = getTenantFromKey(apiKey);
        console.log(`Publishing plan change for tenant: ${JSON.stringify(updatedTenant)}`);
        pubsub.publish('planChanged', {planChanged: updatedTenant});
        res.send({message: `Upgraded to ${newPlan}`});
    });

    const PORT = 4000;
    httpServer.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}/graphql`);
        console.log(`📡 Subscriptions running at ws://localhost:${PORT}/graphql`);
    });
}

startServer().catch(err => {
    console.error('Failed to start server:', err);
});
