# RequestEngine

RequestEngine is a "code-less" as in less code, PostgreSQL parameterized paralell request api, using plain SQL statements managed by handlebar templates, and validated by json schema. RequestEngine simplifies the majority of handling client requests securely passing data to PostgreSQL statements.   
   
RequestEngine is highly architected around the concept of a motorcyle and it's engine, where a four cycle engine has 4 cycles including intake -> compression -> power -> exhaust.   
These cycles align with the requirements to validate requests and provide server actions. (intake) and (exhaust) provide input/output validations. (compression) and (power) provide server actions via a powerful SQL statement (compression) or a (power) handler that allows for full logical programming.
   
RequestEngine, similar to GraphQL, can wrap up multiple resource requests and mutations into one api call, thus reducing
the chattiness of SPAs. Also all requests are POSTS regardless of the request actions.   
  

## Client -> Server Property Flow
The client request properties align with the server properties as follows. These will be explained in detail later: 
   
 - engine  ->  model
    - The client engine will request the server engine's model   
 - fuel    ->  intake
    - The client fuel will provide data to the server engine's intake
 - keys    ->  ignition
    - The client keys must have one value that matches the server engine's ignition
   

## Client Requests
Each request requires an engine, an optional serial, timing and fuel object.

- engine!: string; The engine model is used to find the defined request engine model.
- serial?: string; Required if using the same request engine model multiple times, or if using previous request's response odometer.
- fuel?: number, integer, string, boolean, array,object, null; Data values supplied to the compression string, or power handler.
- timing?: boolean; Timing set to false will allow requests to be called asynchronously.


```
// Engines are supplied by the server
const engines = [{
    model: 'notes',
    compression: 'SELECT * FROM notes WHERE tag = {{intake.tag}} and user_id = {{rider.license}}',
    ignition: ['canRead']
}];

// Rider, aka `user` info is supplied by an auth layer, like jwt on the server.
const rider = {
    license: 123, // unique value
    keys: ['canRead'] // at least one value must match the engine's ignition.
}

// Requests are supplied by a client request.
const requests = [{
    engine: 'notes',
    fuel: { tag: 'groceries'}
}]

const requestengine = initRequestEngine({
    engines,
    drive: q => pg.query(q)
})
requestengine.run({ rider, requests })
```

A middleware for express is also provided with a query callback to a live database connection:

```
const requestengine = initRequestEngine({
    engines,
    drive: q => pg.query(q)
})

app.post('/requests', requestengine.middleware())
```

## Request Engines

Each engine is given a model, an compression statement, a keys list, and an intake schema.

- model!: string; Model should reflect the resource and action, like "notes.update". This is only a convention. But it must be unique.   
- compression?: string; The `compression` property is a simple SQL statement managed by handlebars. Handlebars will take care of sql injections using postgres parameterization. Any value within {{}} will be evaluated, and postgres escaped by handlebars. Available handlebar helper functions need to be supplied to `initRequestEngine()` function.   
The following are properties provided to the compression string:

    - odometer: All successfull request responses within a client request will be available to subseqent requests in the `odometer` object, if the serial property is set.
    - rider: The values for `rider.license` and `rider.keys` will be available to authenticate against database user identifiers.
    - intake: All request's `fuel` values will be available within the `intake` property.

All requests are run synchronous by default in the order provided. Setting the `timing` property to true, will allow for asynchronous calls, but the odometer timeline cannot be guaranteed.
- power?: (strokes: IStroke, compression: Compression.compression) => any; The `power` handler is optional and cannot be combined with the compression property. It is a handling function that allows for more flexible control over the request if more complex logic is needed that the compression statement alone, cannot provide. The `power` handler passes a compression function to allow code to make query calls along with all other data in the request pipeline.
- ignition!: string[]; The `ignition` property array is a list for authorized keys for each engine model.   
- intake!: AnySchema; The `intake` property is an avj json schema that validates inbound data.   
- exhaust!: AnySchema; The `exhaust` property is an avj json schema that validates outbound data.

## Server Engine Examples

```
{
    "model": "notes.insert",
    "compression": "INSERT INTO notes (title, body, user_id) VALUES ('{{intake.title}}', '{{intake.body}}', {{rider.id}})",
    "ignition": ["canWrite"],
    "fuel": {
        "type": "object",
        "properties": {
            "title": {
                "type": "string",
                "default": ""
            },
            "body": {
                "type": "string",
                "default": ""
            }
        },
        "additionalProperties": false
    }
},
{
    "model": "notes.select.byId",
    "compression": "SELECT {{:throttle intake.select}} FROM greetings WHERE user_id={{rider.license}} AND id={{odometer[notes.insert].id}} LIMIT {{limit}}",
    "ignition": ["canWrite"],
    "throttle": ["id", "title", "body", "tag"],
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
                "title": { "type": "string"},
                "body": { "type": "string"}
            }
        }
    }
}

```

## Tests
npm run test
