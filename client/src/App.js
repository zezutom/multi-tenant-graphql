import React, {useEffect, useState} from 'react';
import {
    ApolloClient,
    InMemoryCache,
    ApolloProvider,
    HttpLink,
    split,
    useQuery,
    useMutation,
    useSubscription,
    gql
} from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

const API_KEY = 'bob-api-key'; // Change to 'beta-api-key' to simulate pro tenant

// HTTP link (queries, mutations)
const httpLink = new HttpLink({
    uri: 'http://localhost:4000/graphql',
    headers: {
        'x-api-key': API_KEY
    }
});

// WebSocket link (subscriptions)
const wsLink = new GraphQLWsLink(createClient({
    url: 'ws://localhost:4000/graphql',
    connectionParams: {
        headers: {
            'x-api-key': API_KEY
        }
    },
    on: {
        connected: () => console.log('[WS] Connected ✅'),
        closed: () => console.log('[WS] Closed ❌'),
        error: (err) => console.error('[WS] Error:', err)
    }
}));

// Split based on operation type
const splitLink = split(
    ({ query }) => {
        const definition = getMainDefinition(query);
        return (
            definition.kind === 'OperationDefinition' &&
            definition.operation === 'subscription'
        );
    },
    wsLink,
    httpLink
);

// Apollo Client instance
const client = new ApolloClient({
    link: splitLink,
    cache: new InMemoryCache()
});

const GET_USER = gql`
    query {
        currentUser {
            name
            plan { name features }
        }
    }
`;

const UPGRADE_PLAN = gql`
    mutation UpgradePlan($newPlan: String!) {
        upgradePlan(newPlan: $newPlan) {
            name
            plan { name features }
        }
    }
`;

// Subscription query
const PLAN_CHANGED = gql`
    subscription {
        planChanged {
            name
            plan { name features }
        }
    }
`;

function UserStatus() {
    const {data, refetch} = useQuery(GET_USER);
    const [upgradePlan] = useMutation(UPGRADE_PLAN, {
        onCompleted: (data) => {
            console.log('Plan upgraded to:', data.upgradePlan.plan);
            setPlan(data.upgradePlan);
        },
        onError: (error) => {
            console.error('Error upgrading plan:', error);
        }
    });
    const {data: subData} = useSubscription(PLAN_CHANGED);

    const [user, setPlan] = useState({
        name: 'Loading...',
        plan: { name: 'Loading...', features: [] }
    });

    useEffect(() => {
        if (data?.currentUser) {
            console.log('Query data received:', data);
            setPlan(data.currentUser);
        }
    }, [data]);

    useEffect(() => {
        if (subData?.planChanged) {
            console.log('Subscription data received:', subData);
            setPlan(subData.planChanged);
        }
    }, [subData]);

    return (
        <div style={{fontFamily: 'sans-serif', padding: 20}}>
            <h1>Multi-Tenant Plan Demo</h1>
            <p><strong>Current Plan:</strong> {user.plan?.name || 'None'}</p>
            <p><strong>Features:</strong> {user.plan?.features.join(', ') || 'None'}</p>
            {user.plan?.name === 'pro' && (
                <button onClick={() => upgradePlan({variables: {newPlan: 'free'}})}>Downgrade to Free</button>
            )}
            {user.plan?.name === 'free' && (
                <button onClick={() => upgradePlan({variables: {newPlan: 'pro'}})}>Upgrade to Pro</button>
            )}
        </div>
    );
}

function App() {
    return (
        <ApolloProvider client={client}>
            <UserStatus/>
        </ApolloProvider>
    );
}

export default App;
