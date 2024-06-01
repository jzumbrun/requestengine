"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const _1 = __importDefault(require("."));
const queryStatement = (statement, data) => {
    return new Promise((resolve) => {
        const number = parseInt(statement);
        if (parseInt(statement) > -1) {
            setTimeout(() => {
                resolve(statement);
            }, number);
        }
        else
            resolve([statement, data]);
    });
};
const supersequel = (0, _1.default)({
    helpers: [{ functions: {
                trim: (str) => str.trim(),
                eq: (a, b) => a === b,
                isString: (str) => typeof str === 'string'
            }, prefix: '_', context: false }],
    release: () => null,
    query: queryStatement
});
(0, globals_1.describe)('Supersequel', () => {
    (0, globals_1.describe)('middleware', () => {
        const res = {
            send: (response) => {
                res.data = response;
            }
        };
        (0, globals_1.it)('users.update', done => {
            supersequel
                .middleware({
                definitions: [
                    {
                        name: 'users.update',
                        statement: 'UPDATE users SET {{user}}',
                        access: ['user']
                    }
                ]
            })({
                user: {
                    id: 123,
                    access: ['user']
                },
                body: {
                    queries: [
                        {
                            name: 'users.update',
                            properties: {
                                user: { name: 'Jon', age: 33 }
                            }
                        }
                    ]
                }
            }, res)
                .then(() => {
                (0, globals_1.expect)(res.data.queries[0].results).toEqual(['UPDATE users SET $1 = $2, $3 = $4', ['name', 'Jon', 'age', 33]]);
                done();
            })
                .catch(error => {
                done(error);
            });
        });
        (0, globals_1.it)('sync', done => {
            supersequel
                .middleware({
                definitions: [
                    {
                        name: 'immediate',
                        statement: '0',
                        access: ['user']
                    },
                    {
                        name: 'short',
                        statement: '100',
                        access: ['user']
                    },
                    {
                        name: 'long',
                        statement: '200',
                        access: ['user']
                    }
                ]
            })({
                user: {
                    id: 123,
                    access: ['user']
                },
                body: {
                    queries: [
                        {
                            id: '1',
                            name: 'long',
                            sync: true
                        },
                        {
                            id: '2',
                            name: 'long'
                        },
                        {
                            id: '3',
                            name: 'short'
                        },
                        {
                            id: '4',
                            name: 'immediate',
                            sync: true
                        }
                    ]
                }
            }, res)
                .then(() => {
                (0, globals_1.expect)(res.data.queries).toEqual([
                    { id: '1', name: 'long', results: '200' },
                    { id: '4', name: 'immediate', results: '0' },
                    { id: '3', name: 'short', results: '100' },
                    { id: '2', name: 'long', results: '200' }
                ]);
                done();
            })
                .catch(error => {
                done(error);
            });
        });
        (0, globals_1.it)('previous query results', done => {
            supersequel
                .middleware({
                definitions: [
                    {
                        name: 'thing.one',
                        statement: 'thing.one',
                        access: ['user']
                    },
                    {
                        name: 'thing.two',
                        statement: 'thing.two is bigger than {{$history.one.[0]}}',
                        access: ['user']
                    }
                ]
            })({
                user: {
                    id: 123,
                    access: ['user']
                },
                body: {
                    queries: [
                        {
                            id: 'one',
                            name: 'thing.one',
                            sync: true
                        },
                        {
                            id: 'two',
                            name: 'thing.two',
                            sync: true
                        }
                    ]
                }
            }, res)
                .then(() => {
                (0, globals_1.expect)(res.data.queries).toEqual([
                    {
                        id: 'one',
                        name: 'thing.one',
                        results: ['thing.one', []]
                    },
                    {
                        id: 'two',
                        name: 'thing.two',
                        results: ["thing.two is bigger than $1", ['thing.one']]
                    }
                ]);
                done();
            })
                .catch(error => {
                done(error);
            });
        });
        (0, globals_1.it)('registered helpers', done => {
            supersequel
                .middleware({
                definitions: [
                    {
                        name: 'thing.one',
                        statement: 'thing.one {{_trim trimspace}}',
                        access: ['user']
                    }
                ]
            })({
                user: {
                    id: 123,
                    access: ['user']
                },
                body: {
                    queries: [
                        {
                            id: '1',
                            name: 'thing.one',
                            properties: {
                                trimspace: '  nospaces   '
                            }
                        }
                    ]
                }
            }, res)
                .then(() => {
                (0, globals_1.expect)(res.data.queries).toEqual([
                    {
                        id: '1',
                        name: 'thing.one',
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
    (0, globals_1.describe)('execute', () => {
        (0, globals_1.it)('nested helpers', done => {
            supersequel
                .execute({
                user: {
                    id: 123,
                    access: ['user']
                },
                queries: [
                    {
                        id: '1',
                        name: 'nested',
                        properties: {
                            fields: {
                                id: 1,
                                column1: 3,
                                column2: '  hello  '
                            }
                        }
                    }
                ],
                definitions: [
                    {
                        name: 'nested',
                        statement: [
                            'UPDATE users SET ',
                            '{{#_trim ', '}}',
                            '{{#each fields}}',
                            "{{#unless (_eq @key 'id')}}",
                            '{{@key}} = {{#if (_isString this)}}{{_trim this}}, {{else}}{{this}}, {{/if}}',
                            '{{/unless}}',
                            '{{/each}}',
                            '{{/_trim}}'
                        ].join(''),
                        access: ['user']
                    }
                ]
            })
                .then(({ queries }) => {
                (0, globals_1.expect)(queries).toEqual([
                    {
                        id: '1',
                        name: 'nested',
                        results: [
                            'UPDATE users SET $1 = $2, $3 = $4,',
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
        (0, globals_1.it)('identfiers with alias', done => {
            supersequel
                .execute({
                user: {
                    id: 123,
                    access: ['user']
                },
                queries: [
                    {
                        name: 'alias',
                        properties: {
                            firstName: 'Abe',
                            lastName: 'Lincoln',
                            email: 'able@lincoln.com',
                            select: ['lastName', 'firstName']
                        }
                    }
                ],
                definitions: [
                    {
                        name: 'alias',
                        identifiers: [
                            { name: 'first_name', alias: 'firstName' },
                            { name: 'last_name', alias: 'lastName' },
                        ],
                        statement: 'SELECT {{:id select}} from users where firstName={{firstName}}',
                        access: ['user']
                    }
                ]
            })
                .then(({ queries }) => {
                (0, globals_1.expect)(queries).toEqual([
                    {
                        name: 'alias',
                        results: [
                            'SELECT "first_name" as "firstName", "last_name" as "lastName" from users where firstName=$1',
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
        (0, globals_1.it)('identfiers', done => {
            supersequel
                .execute({
                user: {
                    id: 123,
                    access: ['user']
                },
                queries: [
                    {
                        name: 'alias',
                        properties: {
                            first_name: 'Abe',
                            last_name: 'Lincoln',
                            email: 'able@lincoln.com',
                            select: ['last_name', 'first_name']
                        }
                    }
                ],
                definitions: [
                    {
                        name: 'alias',
                        identifiers: [
                            { name: 'first_name' },
                            { name: 'last_name' },
                        ],
                        statement: 'SELECT {{:id select}} from users where first_name={{first_name}}',
                        access: ['user']
                    }
                ]
            })
                .then(({ queries }) => {
                (0, globals_1.expect)(queries).toEqual([
                    {
                        name: 'alias',
                        results: [
                            'SELECT "first_name", "last_name" from users where first_name=$1',
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
    });
});
