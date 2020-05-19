const mocha = require('mocha')
const _ = require('lodash')
const expect = require('expect')
const queryStatement = statement => {
  return new Promise((resolve) => {
    const number = parseInt(statement)
    if (parseInt(statement) > -1) {
      setTimeout(() => {
        resolve(statement)
      }, number)
    } else resolve(statement)
  })
}
const supersequel = require('./index')({
  helpers: [{ functions: _, prefix: '_', context: false }],
  release: () => null,
  query: queryStatement
})

const supersequelSqlite = require('./index')({
  engine: 'sqlite',
  helpers: [{ functions: _, prefix: '_' }],
  query: queryStatement
})
const { describe, it } = mocha

describe('Supersequel', () => {
  describe('middleware', done => {
    const res = {
      send: response => {
        res.data = response
      }
    }

    it('sql json', done => {
      supersequel
        .middleware(
          {
            definitions: [
              {
                name: 'sql.json',
                statement: 'UPDATE users SET `json`={{json}}',
                access: ['user']
              }
            ]
          })(
          {
            user: {
              id: 123,
              access: ['user']
            },
            body: {
              queries: [
                {
                  name: 'sql.json',
                  properties: {
                    json: '["user"]'
                  }
                }
              ]
            }
          },
          res
        )
        .then(() => {
          expect(res.data.queries[0].results).toEqual(
            "UPDATE users SET `json`='[\\\"user\\\"]'"
          )
          done()
        })
        .catch(error => {
          done(error)
        })
    })

    it('sql injection', done => {
      supersequel
        .middleware(
          {
            definitions: [
              {
                name: 'sql.injection',
                statement:
                  'SELECT {{:id select}} FROM users WHERE `id`={{:ht htmlInjection}} {{injection}}',
                access: ['user']
              }
            ]
          })(
          {
            user: {
              id: 123,
              access: ['user']
            },
            body: {
              queries: [
                {
                  name: 'sql.injection',
                  properties: {
                    select: ['DELETE FROM users'],
                    htmlInjection: "<script src='thing.com' />",
                    injection: "OR 1=1; 'OR 1=1;'"
                  }
                }
              ]
            }
          },
          res
        )
        .then(() => {
          expect(res.data.queries[0].results).toEqual(
            "SELECT `DELETE FROM users` FROM users WHERE `id`='&lt;script src&#x3D;&#x27;thing.com&#x27; /&gt;' 'OR 1=1; \\'OR 1=1;\\''"
          )
          done()
        })
        .catch(error => {
          done(error)
        })
    })

    it('sql injection - sqlite', done => {
      supersequelSqlite
        .middleware(
          {
            definitions: [
              {
                name: 'sql.injection',
                statement:
                  'SELECT {{:id select}} FROM users WHERE `id`={{:ht htmlInjection}} {{injection}}',
                access: ['user']
              }
            ]
          })(
          {
            user: {
              id: 123,
              access: ['user']
            },
            body: {
              queries: [
                {
                  name: 'sql.injection',
                  properties: {
                    select: ['DELETE FROM users'],
                    htmlInjection: "<script src='thing.com' />",
                    injection: "OR 1=1; 'OR 1=1;'"
                  }
                }
              ]
            }
          },
          res
        )
        .then(() => {
          expect(res.data.queries[0].results).toEqual(
            "SELECT `DELETE FROM users` FROM users WHERE `id`='&lt;script src&#x3D;&#x27;thing.com&#x27; /&gt;' 'OR 1=1; ''OR 1=1;'''"
          )
          done()
        })
        .catch(error => {
          done(error)
        })
    })

    it('sql start', done => {
      supersequel
        .middleware(
          {
            definitions: [
              {
                name: 'sql.star',
                statement:
                  'SELECT {{:id select}} FROM users',
                access: ['user']
              }
            ]
          })(
          {
            user: {
              id: 123,
              access: ['user']
            },
            body: {
              queries: [
                {
                  name: 'sql.star',
                  properties: {
                    select: '*'
                  }
                },
                {
                  name: 'sql.star',
                  properties: {
                    select: ['*']
                  }
                },
                {
                  name: 'sql.star',
                  properties: {
                    select: 'id'
                  }
                }
              ]
            }
          },
          res
        )
        .then(() => {
          expect(res.data.queries[0].results).toEqual(
            'SELECT * FROM users'
          )
          expect(res.data.queries[1].results).toEqual(
            'SELECT * FROM users'
          )
          expect(res.data.queries[2].results).toEqual(
            'SELECT `id` FROM users'
          )
          done()
        })
        .catch(error => {
          done(error)
        })
    })

    it('sync', done => {
      supersequel
        .middleware(
          {
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
          })(
          {
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
          },
          res
        )
        .then(() => {
          expect(res.data.queries).toEqual([
            { id: '1', name: 'long', results: '200' },
            { id: '4', name: 'immediate', results: '0' },
            { id: '3', name: 'short', results: '100' },
            { id: '2', name: 'long', results: '200' }
          ])
          done()
        })
        .catch(error => {
          done(error)
        })
    })

    it('previous query results', done => {
      supersequel
        .middleware(
          {
            definitions: [
              {
                name: 'thing.one',
                statement: 'thing.one',
                access: ['user']
              },
              {
                name: 'thing.two',
                statement: 'thing.two is bigger than {{$history.one}}',
                access: ['user']
              }
            ]
          })(
          {
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
          },
          res
        )
        .then(() => {
          expect(res.data.queries).toEqual([
            {
              id: 'one',
              name: 'thing.one',
              results: 'thing.one'
            },
            {
              id: 'two',
              name: 'thing.two',
              results: "thing.two is bigger than 'thing.one'"
            }
          ])
          done()
        })
        .catch(error => {
          done(error)
        })
    })

    it('registered helpers', done => {
      supersequel
        .middleware(
          {
            definitions: [
              {
                name: 'thing.one',
                statement: 'thing.one {{_trim trimspace}}',
                access: ['user']
              }
            ]
          })(
          {
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
          },
          res
        )
        .then(() => {
          expect(res.data.queries).toEqual([
            {
              id: '1',
              name: 'thing.one',
              results: "thing.one 'nospaces'"
            }
          ])
          done()
        })
        .catch(error => {
          done(error)
        })
    })
  })

  describe('execute', () => {
    it('nested helpers', done => {
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
                '{{#_trim ", "}}',
                '{{#each fields}}',
                '{{#unless (_eq @key "id")}}',
                '{{:id @key}}={{#if (_isString this)}}{{_trim this}}, {{else}}{{this}}, {{/if}}',
                '{{/unless}}',
                '{{/each}}',
                '{{/_trim}}'
              ].join(''),
              access: ['user']
            }
          ]
        })
        .then(({ queries }) => {
          expect(queries).toEqual([
            {
              id: '1',
              name: 'nested',
              results: "UPDATE users SET `column1`=3, `column2`='hello'"
            }
          ])
          done()
        })
        .catch(error => {
          done(error)
        })
    })

    it('alias', done => {
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
                select: ['lastName']
              }
            }
          ],
          definitions: [
            {
              name: 'alias',
              alias: {
                firstName: 'first_name',
                lastName: 'last_name'
              },
              statement: 'SELECT {{:id select}} from users where first_name={{firstName}}',
              access: ['user']
            }
          ]
        })
        .then(({ queries }) => {
          expect(queries).toEqual([
            {
              name: 'alias',
              results: "SELECT `last_name` from users where first_name='Abe'"
            }
          ])
          done()
        })
        .catch(error => {
          done(error)
        })
    })

    it('alias - as', done => {
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
                select: ['lastName']
              }
            }
          ],
          definitions: [
            {
              name: 'alias',
              alias: {
                firstName: 'first_name',
                lastName: 'last_name'
              },
              statement: 'SELECT {{:as select}} from users where first_name={{firstName}}',
              access: ['user']
            }
          ]
        })
        .then(({ queries }) => {
          expect(queries).toEqual([
            {
              name: 'alias',
              results: "SELECT `last_name` as `lastName` from users where first_name='Abe'"
            }
          ])
          done()
        })
        .catch(error => {
          done(error)
        })
    })
  })
})
