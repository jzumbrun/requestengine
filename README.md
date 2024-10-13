# RequestEngine

RequestEngine is a logic-less PostgreSQL parameterized paralell request api, using plain SQL statements built by handlebar templates, validated by json schema.

RequestEngine, inspired by GraphQL, can wrap up multiple resource requests and mutations into one api call, thus reducing
the chattiness of SPAs. Similar to GraphQL, all requests are POSTS regardless of the query actions.


## Client Requests
Each request requires a model, an optional serial, wait and properties object (as defined by the request cycle).

- serial: Required if using the same request engine model multiple times, or if using previous request's response odometer.
- model: The model is used to find the defined request engine model.
- intake: Data values supplied to the statement query string.
- timing: timing set to false will allow requests to be called asynchronously.


```
// Cycles are supplied by the server
const cycles = [{
    model: 'greetings',
    compression:
        'SELECT * FROM greetings WHERE `accent`={{accent}}',
    keys: ['user']
}];

// User info is supplied by an auth layer, like jwt.
const user = {
    id: 123,
    keys: ['user']
}

// Requests are supplied by a client request.
const requests = [{
    model: 'greetings',
    intake: {
        "accent": "british",
    }
}]

const requestengine = initRequestEngine({
    cycles,
    query: q => pg.query(q)
})
requestengine.execute({ user, requests })
```

A middleware for express is also provided with a query callback to a live database connection:

```
const requestengine = initRequestEngine({
    cycles,
    query: q => pg.query(q)
})

app.post('/requests', requestengine.middleware())
```

## Request Cycles

Each cycles is given a model, an compression statement, an keys list, and an intake schema.

- model: Model should reflect the resource and action. This is only a convention. But it must be unique.   
- compression: The compression statement is a simple SQL statement managed by handlebars. Handlebars will take care of sql injections using postgres parameterization.   
We have taken the liberty to add all lodash functions to handlebars for convenience. Thay are defined as `_trim`, etc.
All successfull requests responses within a client request will be available to subseqent requests in the odometer object.
An id is required on the request in order to keys it in the odometer object. All requests are run synchronous by default in the order provided. Setting wait to true, will allow for asynchronous calls, but the odometer timeline cannot be guaranteed.
- power: The power handler is optional and cannot be combined with the compression property. It is a handling function that allows for more flexible control over the request if more complex logic is need that the compression statement alone, cannot provide. The power handler has properties to a compression function to make query calls along with all other data in the request pipeline.
- keys: The keys array is a list for authorized keys to each query.   
- intake: Inbound schema utilizes json schema and validates inbound data.   
- exhaust: Outbound schema utilizes json schema and validates data coming from the database response.   
    If properties are not defined, they will be removed form the outbound response.
```
{
    "id": "greetings.insert",
    "model": "greetings.insert",
    "compression": "INSERT INTO greetings (description, words, rider_id) VALUES ('{{description}}', '{{words}}', {{rider.id}})",
    "keys": ["user"],
    "intake": {
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
    "model": "greetings.select.byId",
    "compression": "SELECT {{:id select}} FROM greetings WHERE rider_id={{rider.id}} AND id={{odometer[greetings.insert].id}} LIMIT {{limit}}",
    "keys": ["user"],
    "intake": {
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
    "exhaust": {
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
