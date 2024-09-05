import { describe, it, expect } from '@jest/globals'
import { initRequestEngine } from '.'

const queryStatement = (hql: string, data: unknown) => {
  return new Promise((resolve) => {
    const number = parseInt(hql)
    if (parseInt(hql) > -1) {
      setTimeout(() => {
        resolve(hql)
      }, number)
    } else resolve([hql, data])
  })
}
const requestengine = initRequestEngine({
  helpers: [{ functions: {
    trim: (str: string) => str.trim(),
    eq: (a, b) => a === b,
    isString: (str) => typeof str === 'string'
  }, prefix: '_', context: false }],
  release: () => null,
  query: queryStatement
})

describe('RequestEngine', () => {
  describe('middleware', () => {
    const res: any = {
      send: (response: unknown) => {
        res.data = response
      }
    }

    it('$users.update', done => {
      requestengine
        .middleware(
          {
            definitions: [
              {
                name: '$users.update',
                hql: 'UPDATE users SET {{user}}',
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
              requests: [
                {
                  name: '$users.update',
                  properties: {
                    user: { name: 'Jon', age: 33 }
                  }
                }
              ]
            }
          },
          res
        )
        .then(() => {
          expect(res.data.requests[0].results).toEqual(
            ['UPDATE users SET $1 = $2, $3 = $4', ['name', 'Jon', 'age', 33]]
          )
          done()
        })
        .catch(error => {
          done(error)
        })
    })

    it('sync', done => {
      requestengine
        .middleware(
          {
            definitions: [
              {
                name: 'immediate',
                hql: '0',
                access: ['user']
              },
              {
                name: 'short',
                hql: '100',
                access: ['user']
              },
              {
                name: 'long',
                hql: '200',
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
              requests: [
                {
                  id: '1',
                  name: 'long',
                },
                {
                  id: '2',
                  name: 'long',
                  async: true
                },
                {
                  id: '3',
                  name: 'short',
                  async: true
                },
                {
                  id: '4',
                  name: 'immediate',
                }
              ]
            }
          },
          res
        )
        .then(() => {
          expect(res.data.requests).toEqual([
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
      requestengine
        .middleware(
          {
            definitions: [
              {
                name: 'thing.one',
                hql: 'thing.one',
                access: ['user']
              },
              {
                name: 'thing.two',
                hql: 'thing.two is bigger than {{$history.one.[0]}}',
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
              requests: [
                {
                  id: 'one',
                  name: 'thing.one'
                },
                {
                  id: 'two',
                  name: 'thing.two'
                }
              ]
            }
          },
          res
        )
        .then(() => {
          expect(res.data.requests).toEqual([
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
          ])
          done()
        })
        .catch(error => {
          done(error)
        })
    })

    it('registered helpers', done => {
      requestengine
        .middleware(
          {
            definitions: [
              {
                name: 'thing.one',
                hql: 'thing.one {{_trim trimspace}}',
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
              requests: [
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
          expect(res.data.requests).toEqual([
            {
              id: '1',
              name: 'thing.one',
              results: ["thing.one $1", ['nospaces']]
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
      requestengine
        .execute({
          user: {
            id: 123,
            access: ['user']
          },
          requests: [
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
              hql: [
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
        .then(({ requests }) => {
          expect(requests).toEqual([
            {
              id: '1',
              name: 'nested',
              results: [
                'UPDATE users SET $1 = $2, $3 = $4,',
                ['column1', 3, 'column2', 'hello']
              ]
            }
          ])
          done()
        })
        .catch(error => {
          done(error)
        })
    })

    it('identfiers with alias', done => {
      requestengine
        .execute({
          user: {
            id: 123,
            access: ['user']
          },
          requests: [
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
              hql: 'SELECT {{:id select}} from users where firstName={{firstName}}',
              access: ['user']
            }
          ]
        })
        .then(({ requests }) => {
          expect(requests).toEqual([
            {
              name: 'alias',
              results: [
                'SELECT "first_name" as "firstName", "last_name" as "lastName" from users where firstName=$1',
                ['Abe']
              ]
            }
          ])
          done()
        })
        .catch(error => {
          done(error)
        })
    })

    it('identfiers', done => {
      requestengine
        .execute({
          user: {
            id: 123,
            access: ['user']
          },
          requests: [
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
              hql: 'SELECT {{:id select}} from users where first_name={{first_name}}',
              access: ['user']
            }
          ]
        })
        .then(({ requests }) => {
          expect(requests).toEqual([
            {
              name: 'alias',
              results: [
                'SELECT "first_name", "last_name" from users where first_name=$1',
                ['Abe']
              ]
            }
          ])
          done()
        })
        .catch(error => {
          done(error)
        })
    })

    it('async handler', done => {
      requestengine
        .execute({
          user: {
            id: 123,
            access: ['user']
          },
          requests: [
            {
              name: 'handler'
            }
          ],
          definitions: [
            {
              name: 'handler',
              handler: (data: any) => {
                return new Promise((resolve) => {
                  setTimeout(() => { resolve(1) }, 0)
                })
              },
              access: ['user']
            }
          ]
        })
        .then(({ requests }) => {
          expect(requests).toEqual([{ name: 'handler', results: 1 } ])
          done()
        })
        .catch(error => {
          done(error)
        })
    })
  })
})
