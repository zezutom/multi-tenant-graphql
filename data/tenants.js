import {plans} from "./plans.js";

const tenants = {
    "alice-api-key": {
        name: "Alice",
        plan: plans["free"]
    },
    "bob-api-key": {
        name: "Bob",
        plan: plans["pro"]
    }
};

function getTenantFromKey(apiKey) {
    return tenants[apiKey] || null;
}

function setPlanForTenant(apiKey, newPlan) {
    if (tenants[apiKey]) {
        tenants[apiKey].plan = plans[newPlan] || tenants[apiKey].plan;
    }
}

export {getTenantFromKey, setPlanForTenant};
