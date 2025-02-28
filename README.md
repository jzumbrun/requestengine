# RequestEngine

RequestEngine is a "code-less" as in less code, PostgreSQL parameterized paralell request api, using plain SQL statements managed by handlebar templates, and validated by json schema. RequestEngine simplifies the majority of handling client requests securely passing data to PostgreSQL statements.

RequestEngine is highly architected around the concept of a motorcyle and it's engine, where a four cycle engine has 4 cycles including intake -> compression -> power -> exhaust.  
These cycles align with the requirements to validate requests and provide server actions. (intake) and (exhaust) provide input/output validations. (compression) and (power) provide server actions via a powerful SQL statement (compression) or a (power) handler that allows for full logical programming.

RequestEngine, similar to GraphQL, can wrap up multiple resource requests and mutations into one api call, thus reducing
the chattiness of SPAs. Also all requests are POSTS regardless of the request actions.

## Client -> Server Property Flow

The client request properties align with the server properties as follows. These will be explained in detail later:

- engine -> model
  - The client engine will request the server engine's model
- fuel -> intake
  - The client fuel will provide data to the server engine's intake
- keys -> ignition
  - The client operator's keys must have one value that matches the server engine's ignition

## Client Requests

Each request requires an engine, an optional serial, timing and fuel object.

- engine!: string; The engine model is used to find the defined request engine model.
- serial?: string; Required if using the same request engine model multiple times, or if using previous request's response revolution.
- fuel?: number, integer, string, boolean, array,object, null; Data values supplied to the compression string, or power handler.
- timing?: boolean; Timing set to false will allow requests to be called asynchronously.

```
// Engines are supplied by the server
const engines = [{
    model: 'notes',
    compression: 'SELECT * FROM notes WHERE tag = {{intake.tag}} and user_id = {{operator.id}}',
    ignition: ['canRead']
}];

// Operator, aka `user` info is supplied by an auth layer, like jwt on the server.
const operator = {
    id: 123, // unique value
    keys: ['canRead'] // at least one value must match the engine's ignition.
}

// Requests are supplied by a client request.
const requests = [{
    engine: 'notes',
    fuel: { tag: 'groceries'}
}]

const requestengine = kickStart({ engines }, { drive: q => pg.query(q) })
requestengine.run({ operator, requests })
```

A middleware for express is also provided with a query callback to a live database connection:

```
const requestengine = kickStart({ engines }, { drive: q => pg.query(q) })
app.post('/requests', requestengine.middleware())
```

## Request Engines

Each engine is given a model, an compression statement, a keys list, and an intake schema.

- model!: string; Model should reflect the resource and action, like "notes:update". This is only a convention. But it must be unique.
- compression?: string; The `compression` property is a simple SQL statement managed by handlebars. Handlebars will take care of sql injections using postgres parameterization. Any value within {{}} will be replace by a postgres parameter such as $1.
  Postgres does not allow parameterization of "values or identifiers", such as SELECT columns, or LIMIT values, etc. so we provide a :esc tool to help with those. For convenience, other tools such as :cols, :vals and :colvals help simplify setting objects and arrays to parameters.

  Ex string: `select` -> `id`  
   Ex number: `limit` -> `20`  
   Ex undefined: `unknown` -> `undefined`  
   Ex object: `intake.person` -> `{ lastName: 'Able', lastName: 'Lincoln', age: 215}`  
   Ex array: `intake.jobs` -> `['engineer', 'plummer', 'doctor']`

  - `:cols` type(array or object) will list escaped array values or object keys.
    - Ex: `{{:cols intake.person}}` -> `"firstName", "lastName", "age"`
    - Ex: `{{:cols intake.jobs}}` -> `"engineer", "plummer", "doctor"`
  - `:vals` type(array or object) will list array values and object values.
    - Ex: `{{:vals intake.person}}` -> `$1, $2, $3`
    - Ex: `{{:vals intake.jobs}}` -> `$1, $2, $3`
  - `:colvals` type(object) will list key value pairs with the key escaped.
    - Ex: `{{:colvals intake.person}}` -> `"firstName" = $1, "lastName" = $2, "age" = $3`
  - `:esc` type(strings, number, boolean, null, undefined)
    - Ex: `{{:esc select}}` -> `"id"`
    - Ex: `{{:esc limit}}` -> `20`
    - Ex: `{{:esc unknown}}` -> `NULL`

  These tools help with queries such as:

  - inserts  
    `INSERT INTO persons ({{:keys intake.person}}) VALUES({{:valuesintake.person}}) ...`  
    `INSERT INTO persons ("firstName", "lastName", "age") VALUES($1, $2, $3) ...`
  - updates
    `UPDATE persons SET {{:keyvals intake.person}}) ...`  
    `UPDATE persons SET "firstName" = $1, "lastName" = $2, "age" = $3 ...`

  Note: tools can be prefixed with any character, however requestengine reserves all tools prefix with `:`  
   Warning: using the :key or :keyvals with an intake property REQUIRES the intake schema to specify the exact fields and set `additionalProperties` to false. This will ensure any rogue fields or access is denied.

Available handlebar helper functions need to be supplied to `kickStart()` function.  
The following are properties provided to the compression string:

    - revolution: All successfull request responses within a client request will be available to subseqent requests in the `revolution` object, if the serial property is set.
    - operator: The values for `operator.id` and `operator.keys` will be available to authenticate against database user identifiers.
    - intake: All request's `fuel` values will be available within the `intake` property.

All requests are run synchronous by default in the order provided. Setting the `timing` property to false, will allow for asynchronous calls, but the revolution timeline cannot be guaranteed. Since synchronous requests can depend on previous request response, if any synchronous requests fail, any subsequent synchronous will not be called. Asynchronous requests will always run reguardless of previous failures.

- power?: (engine: Engine, { compressionStroke, engineCycle }: IPowerSystems ) => any; The `power` handler is optional and cannot be combined with the compression property. It is a handling function that allows for more flexible control over the request if more complex logic is needed that the compression statement alone, cannot provide. The `power` handler passes a compressionStroke function to allow code to make query calls along with all other data in the request pipeline. It also passes a engineCycle function to allow code to make an entirely new call to another engine.
- ignition!: string[]; The `ignition` property array is a list for authorized keys for each engine model.
- intake!: AnySchema; The `intake` property is an avj json schema that validates inbound data.
- exhaust!: AnySchema; The `exhaust` property is an avj json schema that validates outbound data.

## Server Engine Examples

```
{
    "model": "notes.insert",
    "compression": "INSERT INTO notes (title, body, user_id) VALUES ('{{intake.title}}', '{{intake.body}}', {{operator.id}})",
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
    "compression": "SELECT {{:keys intake.select}} FROM greetings WHERE user_id={{operator.id}} AND id={{revolution[notes.insert].id}} LIMIT {{limit}}",
    "ignition": ["canWrite"],
    "intake": {
        "type": "object",
        "properties": {
            "select": {
                type: "array"
                items: { enum: ['firstName', 'lastName'] }
                "default": ["*"],
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
