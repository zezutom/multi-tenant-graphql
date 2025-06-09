import { createPubSub } from '@graphql-yoga/subscription';
import {getTenantFromKey, setPlanForTenant} from '../data/tenants.js';
import {pubsub} from './pubsub.js';

const PLAN_CHANGED = 'planChanged';

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
            console.log('Publishing planChanged for: ', updatedTenant.name);
            pubsub.publish(PLAN_CHANGED, {planChanged: updatedTenant});
            return updatedTenant;
        }
    },
    Plan: {
      limits: (parent, arg, context) => {
          if (context.apiKey !== 'bob-api-key') return null;
          return {
              maxSeats: 10,
              maxStorage: 100
          };
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
            subscribe: () => {
                console.log("Subscribing to planChanged");
                return pubsub.subscribe(PLAN_CHANGED);
            }
        }
    }
};

export {resolvers, pubsub};
