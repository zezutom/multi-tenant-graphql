import {PubSub} from 'graphql-subscriptions';
import {getTenantFromKey, setPlanForTenant} from './tenants.js';

const pubsub = new PubSub();
const PLAN_CHANGED = 'PLAN_CHANGED';

const resolvers = {
    Query: {
        currentUser: (_, __, {tenant}) => {
            if (!tenant) throw new Error('Unauthorized');
            return tenant;
        },
        reports: () => ({}), // Resolved by nested fields
    },
    Mutation: {
        upgradePlan: (_, {newPlan}, {apiKey}) => {
            console.log('API Key:', apiKey);
            console.log('New Plan:', newPlan);
            setPlanForTenant(apiKey, newPlan);
            const updatedTenant = getTenantFromKey(apiKey);
            console.log('Updated Tenant:', updatedTenant);
            pubsub.publish(PLAN_CHANGED, {planChanged: updatedTenant});
            return updatedTenant;
        }
    },
    Report: {
        usage: (_, __, {tenant}) => 123,
        conversionFunnel: (_, __, {tenant}) => {
            if (tenant?.features.includes("conversionFunnel")) {
                return "Step 1 → Step 2 → Step 3";
            }
            return null;
        },
        churnRate: (_, __, {tenant}) => {
            if (tenant?.features.includes("churnRate")) {
                return "5.4%";
            }
            return null;
        }
    },
    Subscription: {
        planChanged: {
            subscribe: () => pubsub.asyncIterator([PLAN_CHANGED])
        }
    }
};

export {resolvers, pubsub};
