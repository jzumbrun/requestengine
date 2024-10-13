import { describe, it, expect } from '@jest/globals'
import  { IEngine, kickStart } from '../index.js'

const queryStatement = (compression: string, data: unknown) => {
  return new Promise((resolve) => {
    const number = parseInt(compression)
    if (parseInt(compression) > -1) {
      setTimeout(() => {
        resolve(compression)
      }, number)
    } else resolve([compression, data])
  })
}

function start(engines: IEngine[]) {
  return kickStart({
    tools: [{ tools: {
      trim: (str: string) => str.trim(),
      eq: (a: string, b: string) => a === b,
      isString: (str: string) => typeof str === 'string'
    }, prefix: '_', context: false }],
    neutral: () => null,
    drive: queryStatement,
    engines
  })
}


describe('RequestEngine', () => {

  describe('middleware', () => {
    const res: any = {
      send: (response: unknown) => {
        res.data = response
      }
    }

    it('{riders.update}', done => {
      start([{
          model: '{riders.update}',
          compression: 'UPDATE riders SET {{intake.rider}} WHERE id = {{rider.id}}',
          intake: { type: 'object', properties: { rider: { type: 'object' } } },
          exhaust: { type: 'array' },
          keys: ['rider']
      }]).middleware()(
          {
            rider: {
              id: 123,
              keys: ['rider']
            },
            body: {
              requests: [
                {
                  model: '{riders.update}',
                  intake: {
                    rider: { name: 'Jon', age: 33 }
                  }
                }
              ]
            }
          },
          res
        )
        .then(() => {
          expect(res.data.requests[0].results).toEqual(
            ['UPDATE riders SET $1 = $2, $3 = $4 WHERE id = $5', ['name', 'Jon', 'age', 33, 123]]
          )
          done()
        })
        .catch(error => {
          done(error)
        })
    })

    it('sync', done => {
      start([
          {
            model: 'immediate',
            compression: '0',
            intake: { type: 'null' },
            exhaust: { type: 'string' },
            keys: ['rider']
          },
          {
            model: 'short',
            compression: '100',
            intake: { type: 'null' },
            exhaust: { type: 'string' },
            keys: ['rider']
          },
          {
            model: 'long',
            compression: '200',
            intake: { type: 'null' },
            exhaust: { type: 'string' },
            keys: ['rider']
          }
        ]
      ).middleware()(
          {
            rider: {
              id: 123,
              keys: ['rider']
            },
            body: {
              requests: [
                {
                  serial: '1',
                  model: 'long',
                },
                {
                  serial: '2',
                  model: 'long',
                  timing: false
                },
                {
                  serial: '3',
                  model: 'short',
                  timing: false
                },
                {
                  serial: '4',
                  model: 'immediate',
                }
              ]
            }
          },
          res
        )
        .then(() => {
          expect(res.data.requests).toEqual([
            { serial: '1', model: 'long', results: '200' },
            { serial: '4', model: 'immediate', results: '0' },
            { serial: '3', model: 'short', results: '100' },
            { serial: '2', model: 'long', results: '200' }
          ])
          done()
        })
        .catch(error => {
          done(error)
        })
    })

    it('previous query results', done => {
      start([
        {
          model: 'thing.one',
          compression: 'thing.one',
          intake: { type: 'null' },
          exhaust: { type: 'array' },
          keys: ['rider']
        },
        {
          model: 'thing.two',
          compression: 'thing.two is bigger than {{odometer.one.[0]}}',
          intake: { type: 'null' },
          exhaust: { type: 'array' },
          keys: ['rider']
        }
      ]).middleware()(
          {
            rider: {
              id: 123,
              keys: ['rider']
            },
            body: {
              requests: [
                {
                  serial: 'one',
                  model: 'thing.one'
                },
                {
                  serial: 'two',
                  model: 'thing.two'
                }
              ]
            }
          },
          res
        )
        .then(() => {
          expect(res.data.requests).toEqual([
            {
              serial: 'one',
              model: 'thing.one',
              results: ['thing.one', []]
            },
            {
              serial: 'two',
              model: 'thing.two',
              results: ["thing.two is bigger than $1", ['thing.one']]
            }
          ])
          done()
        })
        .catch(error => {
          done(error)
        })
    })

    it('registered tools', done => {
      start([
        {
          model: 'thing.one',
          compression: 'thing.one {{_trim intake.trimspace}}',
          intake: { type: 'object', properties: { trimspace: { type: 'string'} } },
          exhaust: { type: 'array' },
          keys: ['rider']
        }
      ]).middleware()(
          {
            rider: {
              id: 123,
              keys: ['rider']
            },
            body: {
              requests: [
                {
                  serial: '1',
                  model: 'thing.one',
                  intake: {
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
              serial: '1',
              model: 'thing.one',
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

  describe('run', () => {
    it('nested tools', done => {
      start([
        {
          model: 'nested',
          compression: [
            'UPDATE riders SET ',
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
          keys: ['rider']
        }
      ]).run([
        {
          serial: '1',
          model: 'nested',
          intake: {
            fields: {
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
            serial: '1',
            model: 'nested',
            results: [
              'UPDATE riders SET $1 = $2, $3 = $4,',
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

    it('throttle with alias', done => {
      start([
        {
          model: 'alias',
          throttle: ['first_name as firstName', 'last_name as lastName'],
          intake: { type: 'object', properties: { firstName: { type: 'string' }, select: { type: 'array', items: {
            enum: ['firstName', 'lastName']
          } } } },
          exhaust: { type: 'array' },
          compression: 'SELECT {{:throttle intake.select}} from riders where firstName = {{intake.firstName}}',
          keys: ['rider']
        }
      ]).run([
        {
          model: 'alias',
          intake: {
            firstName: 'Abe',
            select: ['lastName'],
          }
        }
      ], {
            id: 123,
            keys: ['rider']
          },
      )
      .then(({ requests }) => {
        expect(requests).toEqual([
          {
            model: 'alias',
            results: [
              'SELECT "last_name" as "lastName" from riders where firstName = $1',
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

    it('async power', done => {
      start([
        {
          model: 'power',
          intake: { type: 'null' },
          exhaust: { type: 'number' },
          power: (data: any) => {
            return new Promise((resolve) => {
              setTimeout(() => { resolve(1) }, 0)
            })
          },
          keys: ['rider']
        }
      ])
        .run([
          {
            model: 'power'
          }
        ], {
          id: 123,
          keys: ['rider']
        }
      )
      .then(({ requests }) => {
        expect(requests).toEqual([{ model: 'power', results: 1 } ])
        done()
      })
      .catch(error => {
        done(error)
      })
    })
  })
})
