const mocha = require('mocha')
const _ = require('lodash')
const expect = require('expect')
const supersequel = require('./index')({
  helpers: [{ functions: _, prefix: '_' }],
  release: () => null,
  query: statement => {
    return new Promise((resolve) => {
      const number = parseInt(statement)
      if (parseInt(statement) > -1) {
        setTimeout(() => {
          resolve(statement)
        }, number)
      } else resolve(statement)
    })
  }
})
const { describe, it } = mocha

describe('Supersequel', () => {
  describe('middleware', done => {
    const res = {
      send: response => {
        res.data = response
      }
    }

    it('sql injection', done => {
      supersequel
        .middleware(
          {
            definitions: [
              {
                name: 'sql.injection',
                statement:
                  'SELECT {{: select}} FROM accessors WHERE `id`=105 {{? injection}}',
                access: ['accessor']
              }
            ]
          })(
          {
            accessor: {
              id: 123,
              access: ['accessor']
            },
            body: {
              queries: [
                {
                  name: 'sql.injection',
                  properties: {
                    select: ['id'],
                    injection: 'OR 1=1;'
                  }
                }
              ]
            }
          },
          res
        )
        .then(() => {
          expect(res.data.queries[0].results).toEqual(
            "SELECT `id` FROM accessors WHERE `id`=105 'OR 1&#x3D;1;'"
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
                access: ['accessor']
              },
              {
                name: 'short',
                statement: '100',
                access: ['accessor']
              },
              {
                name: 'long',
                statement: '200',
                access: ['accessor']
              }
            ]
          })(
          {
            accessor: {
              id: 123,
              access: ['accessor']
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
                access: ['accessor']
              },
              {
                name: 'thing.two',
                statement: 'thing.two is bigger than {{$history.one}}',
                access: ['accessor']
              }
            ]
          })(
          {
            accessor: {
              id: 123,
              access: ['accessor']
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
                access: ['accessor']
              }
            ]
          })(
          {
            accessor: {
              id: 123,
              access: ['accessor']
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
          accessor: {
            id: 123,
            access: ['accessor']
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
                'UPDATE accessors SET ',
                '{{#_trim ", "}}',
                '{{#each fields}}',
                '{{#unless (_eq @key "id")}}',
                '{{: @key}}={{#if (_isString this)}}{{_trim this}}, {{else}}{{this}}, {{/if}}',
                '{{/unless}}',
                '{{/each}}',
                '{{/_trim}}'
              ].join(''),
              access: ['accessor']
            }
          ]
        })
        .then(({ queries }) => {
          expect(queries).toEqual([
            {
              id: '1',
              name: 'nested',
              results: "UPDATE accessors SET `column1`=3, `column2`='hello'"
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
