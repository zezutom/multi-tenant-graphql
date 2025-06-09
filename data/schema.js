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
    }
    
    type Report {
        usage: Int!
        conversionFunnel: String
        churnRate: String
    }

    type Subscription {
        planChanged: User!
    }
`;

export {typeDefs};
