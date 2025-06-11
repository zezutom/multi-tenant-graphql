import {getDirective} from '@graphql-tools/utils';
import {getTenantFromKey, setPlanForTenant} from '../data/tenants.js';
import {pubsub} from './pubsub.js';

const PLAN_CHANGED = 'planChanged';

const featureGuard = (fieldName, parent, args, context, info, originalResolver, requiredFeature) => {
    const feature = requiredFeature || fieldName;
    console.log(`tenant: ${JSON.stringify(context?.tenant)}`);
    const hasFeature = context?.tenant?.plan?.features?.includes(feature) ?? false;
    console.log(`Feature guard for ${feature} on field ${fieldName}: ${hasFeature}`);
    return hasFeature ? originalResolver(parent, args, context, info) : null;
};

const tenantGuard = (fieldName, parent, args, context, info, originalResolver, requiredTenant) => {
    const directive = getDirective(info.schema, info.parentType.getFields?.()[fieldName], 'requiresTenant')?.[0];
    const tenantName = directive?.name;
    const tenant = getTenantFromKey(context.apiKey);
    if (!tenantName || tenant?.name?.toLowerCase() === tenantName.toLowerCase()) {
        return originalResolver(parent, args, context, info);
    }
    return null;
};

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
            setPlanForTenant(apiKey, newPlan);
            const updatedTenant = getTenantFromKey(apiKey);
            console.log('Publishing planChanged for: ', updatedTenant.name);
            pubsub.publish(PLAN_CHANGED, {planChanged: updatedTenant});
            return updatedTenant;
        }
    },
    Subscription: {
        planChanged: {
            subscribe: () => {
                console.log("Subscribing to planChanged");
                return pubsub.subscribe(PLAN_CHANGED);
            }
        }
    },
    Plan: {
      limits: (parent, args, context, info) => {
          return tenantGuard('limits', parent, args, context, info, () => ({
              maxSeats: 10,
              maxStorage: 100
          }));
      }
    },
    Report: {
        usage: (parent, args, context, info) => {
            return featureGuard('usage', parent, args, context, info, () => 123);
        },
        funnel: (parent, args, context, info) => {
            return featureGuard('conversionFunnel', parent, args, context, info, () => 'Step 1 → Step 2 → Step 3');
        },
        churnRate: (parent, args, context, info) => {
            return featureGuard('churnRate', parent, args, context, info, () => '5.4%');
        }
    },
    User: {
        report: (user, _, context) => {
            return {}; // Report is virtual — resolved field-by-field based on tenant context
        }
    }
};

export {resolvers, pubsub};
