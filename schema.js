import gql from 'graphql-tag';

const typeDefs = gql`
    type Query {
        currentUser: User!
        reports: Report!
    }

    type Mutation {
        upgradePlan(newPlan: String!): User!
    }
    
    type User {
        name: String!
        plan: Plan!
    }

    type Plan {
        name: String!
        features: [String!]!
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
