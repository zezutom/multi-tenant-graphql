import gql from 'graphql-tag';

const typeDefs = gql`
    type Query {
        currentUser: User!
        reports: Report!
    }

    type Mutation {
        upgradePlan(newPlan: String!): User!
    }
    
    directive @requiresTenant(name: String!) on FIELD_DEFINITION
    directive @requiresFeature(name: String) on FIELD_DEFINITION | OBJECT
    
    type PlanLimits {
        maxSeats: Int
        maxStorage: Int
    }
    
    type Plan {
        name: String!
        features: [String!]!
        limits: PlanLimits @requiresTenant(name: "bob")
    }

    type User {
        name: String!
        plan: Plan!
        report: Report
    }
    
    type Report @requiresFeature {
        usage: Int
        churnRate: String
        funnel: String @requiresFeature(name: "conversionFunnel")
    }

    type Subscription {
        planChanged: User!
    }
`;

export {typeDefs};
