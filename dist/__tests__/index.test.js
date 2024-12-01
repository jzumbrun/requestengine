var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { describe, it, expect } from '@jest/globals';
import { kickStart } from '../index.js';
const queryStatement = (compression, data) => {
    return new Promise((resolve) => {
        const number = parseInt(compression);
        if (parseInt(compression) > -1) {
            setTimeout(() => {
                resolve(compression);
            }, number);
        }
        else
            resolve([compression, data]);
    });
};
function start(engines) {
    return kickStart({
        engines,
        toolbox: [
            {
                tools: {
                    trim: (str) => str.trim(),
                    eq: (a, b) => a === b,
                    isString: (str) => typeof str === 'string'
                },
                prefix: '_', context: false
            }
        ]
    }, {
        neutral: () => null,
        drive: queryStatement
    });
}
describe('RequestEngine', () => {
    describe('middleware', () => {
        const res = {
            send: (response) => {
                res.data = response;
            }
        };
        it(':operators:update', done => {
            start([{
                    model: ':operators:update',
                    compression: 'UPDATE operators SET {{i.operator}} WHERE id = {{o.id}}',
                    intake: { type: 'object', properties: { operator: { type: 'object' } } },
                    exhaust: { type: 'array' },
                    ignition: ['operator']
                }]).middleware()({
                operator: {
                    id: 123,
                    keys: ['operator']
                },
                body: {
                    requests: [
                        {
                            engine: ':operators:update',
                            fuel: {
                                operator: { name: 'Jon', age: 33 }
                            }
                        }
                    ]
                }
            }, res)
                .then(() => {
                expect(res.data.requests[0].results).toEqual(['UPDATE operators SET $1 = $2, $3 = $4 WHERE id = $5', ['name', 'Jon', 'age', 33, 123]]);
                done();
            })
                .catch(error => {
                done(error);
            });
        });
        it('sync', done => {
            start([
                {
                    model: 'immediate',
                    compression: '0',
                    intake: { type: 'null' },
                    exhaust: { type: 'string' },
                    ignition: ['operator']
                },
                {
                    model: 'short',
                    compression: '100',
                    intake: { type: 'null' },
                    exhaust: { type: 'string' },
                    ignition: ['operator']
                },
                {
                    model: 'long',
                    compression: '200',
                    intake: { type: 'null' },
                    exhaust: { type: 'string' },
                    ignition: ['operator']
                }
            ]).middleware()({
                operator: {
                    id: 123,
                    keys: ['operator']
                },
                body: {
                    requests: [
                        {
                            serial: '1',
                            engine: 'long',
                        },
                        {
                            serial: '2',
                            engine: 'long',
                            timing: false
                        },
                        {
                            serial: '3',
                            engine: 'short',
                            timing: false
                        },
                        {
                            serial: '4',
                            engine: 'immediate',
                        }
                    ]
                }
            }, res)
                .then(() => {
                expect(res.data.requests).toEqual([
                    { "engine": "long", "results": "200", "serial": "1" },
                    { "engine": "immediate", "results": "0", "serial": "4" },
                    { "engine": "long", "results": "200", "serial": "2" },
                    { "engine": "short", "results": "100", "serial": "3" }
                ]);
                done();
            })
                .catch(error => {
                done(error);
            });
        });
        it('previous query results', done => {
            start([
                {
                    model: 'thing:one',
                    compression: 'thing:one',
                    intake: { type: 'null' },
                    exhaust: { type: 'array' },
                    ignition: ['operator']
                },
                {
                    model: 'thing:two',
                    compression: 'thing:two is bigger than {{r.one.[0]}}',
                    intake: { type: 'null' },
                    exhaust: { type: 'array' },
                    ignition: ['operator']
                }
            ]).middleware()({
                operator: {
                    id: 123,
                    keys: ['operator']
                },
                body: {
                    requests: [
                        {
                            serial: 'one',
                            engine: 'thing:one'
                        },
                        {
                            serial: 'two',
                            engine: 'thing:two'
                        }
                    ]
                }
            }, res)
                .then(() => {
                expect(res.data.requests).toEqual([
                    {
                        serial: 'one',
                        engine: 'thing:one',
                        results: ['thing:one', []]
                    },
                    {
                        serial: 'two',
                        engine: 'thing:two',
                        results: ["thing:two is bigger than $1", ['thing:one']]
                    }
                ]);
                done();
            })
                .catch(error => {
                done(error);
            });
        });
        it('registered tools', done => {
            start([
                {
                    model: 'thing:one',
                    compression: 'thing:one {{_trim i.trimspace}}',
                    intake: { type: 'object', properties: { trimspace: { type: 'string' } } },
                    exhaust: { type: 'array' },
                    ignition: ['operator']
                }
            ]).middleware()({
                operator: {
                    id: 123,
                    keys: ['operator']
                },
                body: {
                    requests: [
                        {
                            serial: '1',
                            engine: 'thing:one',
                            fuel: {
                                trimspace: '  nospaces   '
                            }
                        }
                    ]
                }
            }, res)
                .then(() => {
                expect(res.data.requests).toEqual([
                    {
                        serial: '1',
                        engine: 'thing:one',
                        results: ["thing:one $1", ['nospaces']]
                    }
                ]);
                done();
            })
                .catch(error => {
                done(error);
            });
        });
    });
    describe('run', () => {
        it('nested tools', done => {
            start([
                {
                    model: 'nested',
                    compression: [
                        'UPDATE operators SET ',
                        '{{#_trim ', '}}',
                        '{{#each intake.fields}}',
                        "{{#unless (_eq @key 'id')}}",
                        '{{@key}} = {{#if (_isString this)}}{{_trim this}}, {{else}}{{this}}, {{/if}}',
                        '{{/unless}}',
                        '{{/each}}',
                        '{{/_trim}}'
                    ].join(''),
                    intake: { type: 'object', properties: { fields: { type: 'object' } } },
                    exhaust: { type: 'array' },
                    ignition: ['operator']
                }
            ]).run([
                {
                    serial: '1',
                    engine: 'nested',
                    fuel: {
                        fields: {
                            column1: 3,
                            column2: '  hello  '
                        }
                    }
                }
            ], {
                id: 123,
                keys: ['operator']
            })
                .then(({ requests }) => {
                expect(requests).toEqual([
                    {
                        serial: '1',
                        engine: 'nested',
                        results: [
                            'UPDATE operators SET $1 = $2, $3 = $4,',
                            ['column1', 3, 'column2', 'hello']
                        ]
                    }
                ]);
                done();
            })
                .catch(error => {
                done(error);
            });
        });
        it('throttle with alias', done => {
            start([
                {
                    model: 'alias',
                    throttle: ['first_name as firstName', 'last_name as lastName'],
                    intake: { type: 'object', properties: { firstName: { type: 'string' }, select: { type: 'array', items: {
                                    enum: ['firstName', 'lastName']
                                } } } },
                    exhaust: { type: 'array' },
                    compression: 'SELECT {{:throttle i.select}} from operators where firstName = {{i.firstName}}',
                    ignition: ['operator']
                }
            ]).run([
                {
                    engine: 'alias',
                    fuel: {
                        firstName: 'Abe',
                        select: ['lastName'],
                    }
                }
            ], {
                id: 123,
                keys: ['operator']
            })
                .then(({ requests }) => {
                expect(requests).toEqual([
                    {
                        engine: 'alias',
                        results: [
                            'SELECT "last_name" as "lastName" from operators where firstName = $1',
                            ['Abe']
                        ]
                    }
                ]);
                done();
            })
                .catch(error => {
                done(error);
            });
        });
        it('async power', done => {
            start([
                {
                    model: 'power',
                    intake: { type: 'null' },
                    exhaust: { type: 'number' },
                    power: () => {
                        return new Promise((resolve) => {
                            setTimeout(() => { resolve(1); }, 0);
                        });
                    },
                    ignition: ['operator']
                }
            ])
                .run([
                {
                    engine: 'power'
                }
            ], {
                id: 123,
                keys: ['operator']
            })
                .then(({ requests }) => {
                expect(requests).toEqual([{ engine: 'power', results: 1 }]);
                done();
            })
                .catch(error => {
                done(error);
            });
        });
        it('async power call compressionStroke', done => {
            start([
                {
                    model: 'power',
                    intake: { type: 'null' },
                    exhaust: { type: 'array' },
                    power: (engine_1, _a) => __awaiter(void 0, [engine_1, _a], void 0, function* (engine, { compressionStroke }) {
                        const result = yield compressionStroke('callCompression', engine);
                        return result;
                    }),
                    ignition: ['operator']
                }
            ])
                .run([
                {
                    engine: 'power'
                }
            ], {
                id: 123,
                keys: ['operator']
            })
                .then(({ requests }) => {
                expect(requests).toEqual([{ engine: 'power', results: ['callCompression', []] }]);
                done();
            })
                .catch(error => {
                done(error);
            });
        });
        it('async power call engineCycle', done => {
            start([
                {
                    model: 'another:engine',
                    intake: { type: 'null' },
                    exhaust: { type: 'array' },
                    compression: 'another:engine:compression',
                    ignition: ['system']
                },
                {
                    model: 'power',
                    intake: { type: 'null' },
                    exhaust: { type: 'array' },
                    power: (engine_1, _a) => __awaiter(void 0, [engine_1, _a], void 0, function* (engine, { engineCycle }) {
                        const result = yield engineCycle({ engine: 'another:engine' }, engine.garage, engine.gear, { id: 'system', keys: ['system'] });
                        return result.results;
                    }),
                    ignition: ['operator']
                }
            ])
                .run([
                {
                    engine: 'power'
                }
            ], {
                id: 123,
                keys: ['operator']
            })
                .then(({ requests }) => {
                expect(requests).toEqual([{ engine: 'power', results: ['another:engine:compression', []] }]);
                done();
            })
                .catch(error => {
                done(error);
            });
        });
        it('gear engines errors', done => {
            try {
                kickStart({ engines: false }, { drive: 'wrong' });
            }
            catch (error) {
                expect(error.message).toEqual('ERROR_REQUEST_ENGINE_GARAGE_VALIDATION');
                done();
            }
        });
        it('gear drive errors', done => {
            try {
                kickStart({ engines: [] }, { drive: 'wrong' });
            }
            catch (error) {
                expect(error.message).toEqual('ERROR_REQUEST_ENGINE_GEAR_VALIDATION');
                done();
            }
        });
        it('garage engine errors', done => {
            try {
                kickStart({
                    engines: [{
                            model: 'thing:one',
                            compression: 'thing:one {{_trim intake.trimspace}}',
                            power: () => { },
                            intake: { type: 'object', properties: { trimspace: { type: 'string' } } },
                            exhaust: { type: 'array' },
                            ignition: ['operator']
                        }]
                }, { drive: () => { } });
            }
            catch (error) {
                expect(error.message).toEqual('ERROR_REQUEST_ENGINE_ENGINES_VALIDATION');
                done();
            }
        });
        it('request intake errors', done => {
            start([
                {
                    model: 'wrong:intake',
                    intake: { type: 'string' },
                    exhaust: { type: 'string' },
                    compression: 'test',
                    ignition: ['operator']
                }
            ]).run([
                {
                    engine: 'wrong:intake',
                    fuel: { firstName: 'Abe' }
                },
                {
                    engine: 'wrong:intake',
                    fuel: { firstName: 'Gabe' }
                }
            ], {
                id: 123,
                keys: ['operator']
            })
                .then(({ requests }) => {
                expect(requests.length).toEqual(1);
                expect(requests[0].error.code).toEqual('ERROR_REQUEST_INTAKE_VALIDATION');
                done();
            })
                .catch(error => {
                done(error);
            });
        });
        it('request wrong keys errors', done => {
            start([
                {
                    model: 'wrong:keys',
                    intake: { type: 'object' },
                    exhaust: { type: 'array' },
                    compression: 'test',
                    ignition: ['operator']
                }
            ]).run([
                {
                    engine: 'wrong:keys',
                    fuel: { firstName: 'Abe' }
                }
            ], {
                id: 123,
                keys: ['nothing']
            })
                .then(({ requests }) => {
                expect(requests.length).toEqual(1);
                expect(requests[0].error.code).toEqual('ERROR_REQUEST_WRONG_KEYS');
                done();
            })
                .catch(error => {
                done(error);
            });
        });
        it('allows empy ignition with operator', done => {
            start([
                {
                    model: 'empy:ignition',
                    intake: { type: 'null' },
                    exhaust: { type: 'array' },
                    compression: 'test',
                    ignition: []
                }
            ]).run([
                {
                    engine: 'empy:ignition',
                }
            ], {
                id: 123,
                keys: ['operator']
            })
                .then(({ requests }) => {
                expect(requests).toEqual([{ engine: 'empy:ignition', results: ['test', []] }]);
                done();
            })
                .catch(error => {
                done(error);
            });
        });
        it('allows empy ignition with no operator', done => {
            start([
                {
                    model: 'empy:ignition',
                    intake: { type: 'null' },
                    exhaust: { type: 'array' },
                    compression: 'test',
                    ignition: []
                }
            ]).run([
                {
                    engine: 'empy:ignition',
                }
            ])
                .then(({ requests }) => {
                expect(requests).toEqual([{ engine: 'empy:ignition', results: ['test', []] }]);
                done();
            })
                .catch(error => {
                done(error);
            });
        });
        it('request wrong engine model errors', done => {
            start([
                {
                    model: 'wrong:engine',
                    intake: { type: 'object' },
                    exhaust: { type: 'array' },
                    compression: 'test',
                    ignition: ['operator']
                }
            ]).run([
                {
                    engine: 'wrong:wrong',
                    fuel: { firstName: 'Abe' }
                }
            ], {
                id: 123,
                keys: ['operator']
            })
                .then(({ requests }) => {
                expect(requests.length).toEqual(1);
                expect(requests[0].error.code).toEqual('ERROR_REQUEST_ENGINE_MODEL_NOT_FOUND');
                done();
            })
                .catch(error => {
                done(error);
            });
        });
    });
    describe('getEngineSchemas', () => {
        it('should return the correct engine schemas', () => {
            const engines = [
                {
                    model: 'engine1',
                    intake: { type: 'object', properties: { field1: { type: 'string' } } },
                    exhaust: { type: 'array' },
                    compression: 'test1',
                    ignition: ['operator']
                },
                {
                    model: 'engine2',
                    intake: { type: 'object', properties: { field2: { type: 'number' } } },
                    exhaust: { type: 'array' },
                    compression: 'test2',
                    ignition: ['operator']
                }
            ];
            const engine = start(engines);
            const schemas = engine.getEngineSchemas();
            expect(schemas).toEqual([
                { model: 'engine1', intake: engines[0].intake, exhaust: engines[0].exhaust },
                { model: 'engine2', intake: engines[1].intake, exhaust: engines[1].exhaust }
            ]);
        });
    });
});
