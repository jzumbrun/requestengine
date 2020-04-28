# supersequel


supersequel is a logic-less SQL paralell request api, using plain SQL statements built by handlebar templates, validated by json schema.

supersequel, inspired by GraphQL, can wrap up multiple resource requests and mutations into one api call. Thus reducing
the chattiness of SPAs. Similart to GraphQL, all requests are POSTS regardless of the query actions.

#### Examples

## Client request
Each query request requires a name, an optional id, sync and properties object (as defined by the query definition).

id: Required if querying for same query name multiple times, or if accessing previous query response history.
name: The name is used to find the defined query name.
properties: Data values supplied to the statement query string.
sync: Sync will force an async/await on the query. All synced queries will load first no matter the request order.


```
// Definitions are supplied by the server
const definitions = [{
    name: 'greetings',
    statement:
        'SELECT * FROM greetings WHERE `accent`={{accent}}',
    access: ['user']
}];

// User info is supplied by an auth layer, like jwt.
const user = {
    id: 123,
    access: ['user']
}

// Queries are supplied by a request.
const queries = [{
    name: 'greetings',
    properties: {
        "accent": "british",
    }
}]

supersequel.execute({ definitions, user, queries })
```

A middleware for express is also provided with a query callback to a live database connection:

```
supersequel({
    definitions,
    query: q => mysql.exec(q)
})

app.post('/query', supersequel.middleware())
```

## Defined queries

Each query is given a name, an SQL statement, an access list, and an inbound schema.

Name: Name should reflect the resource and action. This is only a convention. But it must be unique.
statement: The statement is a simple SQL statement managed by handlebars. Handlebars will take care of sql injections.
    We have take the liberty to add all lodash functions to handlebars for convenience. That are defined as `_trim`, etc.
    Each property from the client request will be available to use in the query statement as well as a user object
    that is provided by boxless via a signin gateway and JWT tokens.
    All successfull query responses within a client request will be available to subseqent queries in the $history object.
    An id is required on the query request inorder to access it in the $history object. Also the sync must be set to true, in
    order to ensure the previous query is run in proper order.
access: The access array is a whitelist for authorized access to each query.
inboundSchema: Inbound schema utilizes json schema and validates inbound data.
outboundSchema: Outbound schema utilizes json schema and validates data coming from the database response.
    If properties are not defined, they will be removed form the outbound response.
```
{
    "id": "greetings.insert",
    "name": "greetings.insert",
    sync: true,
    "statement": "INSERT INTO greetings (description, words, user_id) VALUES ('{{description}}', '{{words}}', {{$user.id}})",
    "access": ["user"],
    "inboundSchema": {
        "type": "object",
        "properties": {
            "description": {
                "type": "string",
                "default": ""
            },
            "words": {
                "type": "string",
                "default": ""
            }
        },
        "additionalProperties": false
    }
},
{
    "name": "greetings.select.byId",
    sync: true,
    "statement": "SELECT {{select}} FROM greetings WHERE user_id={{$user.id}} AND id={{$history.[greetings.insert].id}} LIMIT {{limit}}",
    "access": ["user"],
    "inboundSchema": {
        "type": "object",
        "properties": {
            "select": {
                "type": "array",
                "default": ["*"]
            },
            "limit": {
                "type": "number",
                "maximum": 200,
                "default": 200
            }
        },
        "additionalProperties": false
    },
    "outboundSchema": {
        "type": "array",
        "items": { 
            "type": "object",
            "properties": {
                "id": { "type": "number"},
                "description": { "type": "string"},
                "words": { "type": "string"}
            }
        }
    }
}

```

## Tests
npm run test
