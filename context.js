import {getTenantFromKey} from './tenants.js';

function getTenantContext(req) {
    const apiKey = req.headers['x-api-key'];
    const tenant = getTenantFromKey(apiKey);
    return {
        apiKey,
        tenant,
    };
}

export {getTenantContext};
