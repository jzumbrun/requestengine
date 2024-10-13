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
        tools: [{ tools: {
                    trim: (str) => str.trim(),
                    eq: (a, b) => a === b,
                    isString: (str) => typeof str === 'string'
                }, prefix: '_', context: false }],
        release: () => null,
        query: queryStatement,
        engines
    });
}
describe('RequestEngine', () => {
    describe('middleware', () => {
        const res = {
            send: (response) => {
                res.data = response;
            }
        };
        it('$riders.update', done => {
            start([{
                    model: '$riders.update',
                    compression: 'UPDATE riders SET {{rider}} WHERE id={{$rider.id}}',
                    intake: { type: 'object', properties: { rider: { type: 'object' } } },
                    exhaust: false,
                    keys: ['rider']
                }]).middleware()({
                rider: {
                    id: 123,
                    keys: ['rider']
                },
                body: {
                    requests: [
                        {
                            model: '$riders.update',
                            properties: {
                                rider: { model: 'Jon', age: 33 }
                            }
                        }
                    ]
                }
            }, res)
                .then(() => {
                expect(res.data.requests[0].results).toEqual(['UPDATE riders SET $1 = $2, $3 = $4', ['name', 'Jon', 'age', 33]]);
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
                    intake: false,
                    exhaust: false,
                    keys: ['rider']
                },
                {
                    model: 'short',
                    compression: '100',
                    intake: false,
                    exhaust: false,
                    keys: ['rider']
                },
                {
                    model: 'long',
                    compression: '200',
                    intake: false,
                    exhaust: false,
                    keys: ['rider']
                }
            ]).middleware()({
                rider: {
                    id: 123,
                    keys: ['rider']
                },
                body: {
                    requests: [
                        {
                            id: '1',
                            model: 'long',
                        },
                        {
                            id: '2',
                            model: 'long',
                            async: true
                        },
                        {
                            id: '3',
                            model: 'short',
                            async: true
                        },
                        {
                            id: '4',
                            model: 'immediate',
                        }
                    ]
                }
            }, res)
                .then(() => {
                expect(res.data.requests).toEqual([
                    { id: '1', model: 'long', results: '200' },
                    { id: '4', model: 'immediate', results: '0' },
                    { id: '3', model: 'short', results: '100' },
                    { id: '2', model: 'long', results: '200' }
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
                    model: 'thing.one',
                    compression: 'thing.one',
                    intake: false,
                    exhaust: false,
                    keys: ['rider']
                },
                {
                    model: 'thing.two',
                    compression: 'thing.two is bigger than {{$history.one.[0]}}',
                    intake: false,
                    exhaust: false,
                    keys: ['rider']
                }
            ]).middleware()({
                rider: {
                    id: 123,
                    keys: ['rider']
                },
                body: {
                    requests: [
                        {
                            id: 'one',
                            model: 'thing.one'
                        },
                        {
                            id: 'two',
                            model: 'thing.two'
                        }
                    ]
                }
            }, res)
                .then(() => {
                expect(res.data.requests).toEqual([
                    {
                        id: 'one',
                        model: 'thing.one',
                        intake: false,
                        exhaust: false,
                        results: ['thing.one', []]
                    },
                    {
                        id: 'two',
                        model: 'thing.two',
                        intake: false,
                        exhaust: false,
                        results: ["thing.two is bigger than $1", ['thing.one']]
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
                    model: 'thing.one',
                    compression: 'thing.one {{_trim trimspace}}',
                    intake: false,
                    exhaust: false,
                    keys: ['rider']
                }
            ]).middleware()({
                rider: {
                    id: 123,
                    keys: ['rider']
                },
                body: {
                    requests: [
                        {
                            id: '1',
                            model: 'thing.one',
                            properties: {
                                trimspace: '  nospaces   '
                            }
                        }
                    ]
                }
            }, res)
                .then(() => {
                expect(res.data.requests).toEqual([
                    {
                        id: '1',
                        model: 'thing.one',
                        results: ["thing.one $1", ['nospaces']]
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
                        'UPDATE riders SET ',
                        '{{#_trim ', '}}',
                        '{{#each fields}}',
                        "{{#unless (_eq @key 'id')}}",
                        '{{@key}} = {{#if (_isString this)}}{{_trim this}}, {{else}}{{this}}, {{/if}}',
                        '{{/unless}}',
                        '{{/each}}',
                        '{{/_trim}}'
                    ].join(''),
                    intake: false,
                    exhaust: false,
                    keys: ['rider']
                }
            ]).run([
                {
                    id: '1',
                    model: 'nested',
                    properties: {
                        fields: {
                            id: 1,
                            column1: 3,
                            column2: '  hello  '
                        }
                    }
                }
            ], {
                id: 123,
                keys: ['rider']
            })
                .then(({ requests }) => {
                expect(requests).toEqual([
                    {
                        id: '1',
                        model: 'nested',
                        intake: false,
                        exhaust: false,
                        results: [
                            'UPDATE riders SET $1 = $2, $3 = $4,',
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
        it('identfiers with alias', done => {
            start([
                {
                    model: 'alias',
                    throttle: ['first_name as firstName', 'last_name as lastName'],
                    intake: false,
                    exhaust: false,
                    compression: 'SELECT {{:id select}} from riders where firstName={{firstName}}',
                    keys: ['rider']
                }
            ]).run([
                {
                    model: 'alias',
                    properties: {
                        firstName: 'Abe',
                        lastName: 'Lincoln',
                        email: 'able@lincoln.com',
                        select: ['lastName', 'firstName']
                    }
                }
            ], {
                id: 123,
                keys: ['rider']
            })
                .then(({ requests }) => {
                expect(requests).toEqual([
                    {
                        model: 'alias',
                        results: [
                            'SELECT "first_name" as "firstName", "last_name" as "lastName" from riders where firstName=$1',
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
        it('identfiers', done => {
            start([
                {
                    model: 'alias',
                    throttle: ['first_name', 'last_name'],
                    intake: false,
                    exhaust: false,
                    compression: 'SELECT {{:id select}} from riders where first_name={{first_name}}',
                    keys: ['rider']
                }
            ])
                .run([
                {
                    model: 'alias',
                    properties: {
                        first_model: 'Abe',
                        last_model: 'Lincoln',
                        email: 'able@lincoln.com',
                        select: ['last_name', 'first_name']
                    }
                }
            ], {
                id: 123,
                keys: ['rider']
            })
                .then(({ requests }) => {
                expect(requests).toEqual([
                    {
                        model: 'alias',
                        results: [
                            'SELECT "first_name", "last_name" from riders where first_name=$1',
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
                    intake: false,
                    exhaust: false,
                    power: (data) => {
                        return new Promise((resolve) => {
                            setTimeout(() => { resolve(1); }, 0);
                        });
                    },
                    keys: ['rider']
                }
            ])
                .run([
                {
                    model: 'handler'
                }
            ], {
                id: 123,
                keys: ['rider']
            })
                .then(({ requests }) => {
                expect(requests).toEqual([{ model: 'power', results: 1 }]);
                done();
            })
                .catch(error => {
                done(error);
            });
        });
    });
});
