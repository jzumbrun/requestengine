# RequestEngine

RequestEngine is a logic-less PostgreSQL parameterized paralell request api, using plain SQL statements built by handlebar templates, validated by json schema.

RequestEngine, inspired by GraphQL, can wrap up multiple resource requests and mutations into one api call, thus reducing
the chattiness of SPAs. Similar to GraphQL, all requests are POSTS regardless of the query actions.


## Client Requests
Each request requires a name, an optional id, async and properties object (as defined by the request definition).

- id: Required if using the same request name multiple times, or if accessing previous request's response history.
- name: The name is used to find the defined request name.
- properties: Data values supplied to the statement query string.
- async: async will allow requests to be called asynchronously.


```
// Definitions are supplied by the server
const definitions = [{
    name: 'greetings',
    hql:
        'SELECT * FROM greetings WHERE `accent`={{accent}}',
    access: ['user']
}];

// User info is supplied by an auth layer, like jwt.
const user = {
    id: 123,
    access: ['user']
}

// Requests are supplied by a client request.
const Requests = [{
    name: 'greetings',
    properties: {
        "accent": "british",
    }
}]

const requestengine = initRequestEngine({
    definitions,
    query: q => pg.query(q)
})
requestengine.execute({ user, requests })
```

A middleware for express is also provided with a query callback to a live database connection:

```
const requestengine = initRequestEngine({
    definitions,
    query: q => pg.query(q)
})

app.post('/requests', requestengine.middleware())
```

## Request Definitions

Each definitions is given a name, an hql statement, an access list, and an inbound schema.

- name: Name should reflect the resource and action. This is only a convention. But it must be unique.   
- hql: The hql statement is a simple SQL statement managed by handlebars. Handlebars will take care of sql injections using postgres parameterization.   
We have taken the liberty to add all lodash functions to handlebars for convenience. Thay are defined as `_trim`, etc.
All successfull requests responses within a client request will be available to subseqent requests in the $history object.
An id is required on the request in order to access it in the $history object. All requests are run synchronous by default in the order provided. Setting async to true, will allow for asynchronous calls, but the $history timeline cannot be guaranteed.
- handler: The handler is optional and cannot be combined with the hql property. It is a handling function that allows for more flexible control over the request if more complex logic is need that the hql statement alone, cannot provide. The handler has access to a hql function to make query calls along with all other data in the request pipeline.
- access: The access array is a list for authorized access to each query.   
- inboundSchema: Inbound schema utilizes json schema and validates inbound data.   
- outboundSchema: Outbound schema utilizes json schema and validates data coming from the database response.   
    If properties are not defined, they will be removed form the outbound response.
```
{
    "id": "greetings.insert",
    "name": "greetings.insert",
    "hql": "INSERT INTO greetings (description, words, user_id) VALUES ('{{description}}', '{{words}}', {{$user.id}})",
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
    "hql": "SELECT {{select}} FROM greetings WHERE user_id={{$user.id}} AND id={{$history.[greetings.insert].id}} LIMIT {{limit}}",
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
