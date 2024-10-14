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
          compression: 'UPDATE riders SET {{intake.rider}} WHERE id = {{rider.license}}',
          intake: { type: 'object', properties: { rider: { type: 'object' } } },
          exhaust: { type: 'array' },
          ignition: ['rider']
      }]).middleware()(
          {
            rider: {
              license: 123,
              keys: ['rider']
            },
            body: {
              requests: [
                {
                  engine: '{riders.update}',
                  fuel: {
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
            ignition: ['rider']
          },
          {
            model: 'short',
            compression: '100',
            intake: { type: 'null' },
            exhaust: { type: 'string' },
            ignition: ['rider']
          },
          {
            model: 'long',
            compression: '200',
            intake: { type: 'null' },
            exhaust: { type: 'string' },
            ignition: ['rider']
          }
        ]
      ).middleware()(
          {
            rider: {
              license: 123,
              keys: ['rider']
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
          },
          res
        )
        .then(() => {
          expect(res.data.requests).toEqual([
            { serial: '1', engine: 'long', results: '200' },
            { serial: '4', engine: 'immediate', results: '0' },
            { serial: '3', engine: 'short', results: '100' },
            { serial: '2', engine: 'long', results: '200' }
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
          ignition: ['rider']
        },
        {
          model: 'thing.two',
          compression: 'thing.two is bigger than {{odometer.one.[0]}}',
          intake: { type: 'null' },
          exhaust: { type: 'array' },
          ignition: ['rider']
        }
      ]).middleware()(
          {
            rider: {
              license: 123,
              keys: ['rider']
            },
            body: {
              requests: [
                {
                  serial: 'one',
                  engine: 'thing.one'
                },
                {
                  serial: 'two',
                  engine: 'thing.two'
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
              engine: 'thing.one',
              results: ['thing.one', []]
            },
            {
              serial: 'two',
              engine: 'thing.two',
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
          ignition: ['rider']
        }
      ]).middleware()(
          {
            rider: {
              license: 123,
              keys: ['rider']
            },
            body: {
              requests: [
                {
                  serial: '1',
                  engine: 'thing.one',
                  fuel: {
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
              engine: 'thing.one',
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
          ignition: ['rider']
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
        license: 123,
          keys: ['rider']
      })
      .then(({ requests }) => {
        expect(requests).toEqual([
          {
            serial: '1',
            engine: 'nested',
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
          ignition: ['rider']
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
            license: 123,
            keys: ['rider']
          },
      )
      .then(({ requests }) => {
        expect(requests).toEqual([
          {
            engine: 'alias',
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
          ignition: ['rider']
        }
      ])
        .run([
          {
            engine: 'power'
          }
        ], {
          license: 123,
          keys: ['rider']
        }
      )
      .then(({ requests }) => {
        expect(requests).toEqual([{ engine: 'power', results: 1 } ])
        done()
      })
      .catch(error => {
        done(error)
      })
    })

    it('tuning drive errors', done => {
      try {
        kickStart({
          drive: 'wrong',
          engines: []
        } as any)
      } catch(error) {
        expect((error as any).message).toEqual('ERROR_REQUEST_ENGINE_VALIDATION')
        done()
      }
    })

    it('tuning engine errors', done => {
      try {
        kickStart({
          drive: () => {},
          engines: [{
            model: 'thing.one',
            compression: 'thing.one {{_trim intake.trimspace}}',
            power: () => {},
            intake: { type: 'object', properties: { trimspace: { type: 'string'} } },
            exhaust: { type: 'array' },
            ignition: ['rider']
          }]
        } as any)
      } catch(error) {
        expect((error as any).message).toEqual('ERROR_REQUEST_ENGINE_ENGINES_VALIDATION')
        done()
      }
    })

    it('request intake errors', done => {
      start([
        {
          model: 'wrong.intake',
          intake: { type: 'string' },
          exhaust: { type: 'string' },
          compression: 'test',
          ignition: ['rider']
        }
      ]).run([
        {
          engine: 'wrong.intake',
          fuel: { firstName: 'Abe'}
        },
        {
          engine: 'wrong.intake',
          fuel: { firstName: 'Gabe'}
        }
      ], {
            license: 123,
            keys: ['rider']
          },
      )
      .then(({ requests }) => {
        expect(requests.length).toEqual(1)
        expect(requests[0].error.code).toEqual('ERROR_REQUEST_INTAKE_VALIDATION')
        done()
      })
      .catch(error => {
        done(error)
      })
    })

    it('request wrong keys errors', done => {
      start([
        {
          model: 'wrong.keys',
          intake: { type: 'object' },
          exhaust: { type: 'array' },
          compression: 'test',
          ignition: ['rider']
        }
      ]).run([
        {
          engine: 'wrong.keys',
          fuel: { firstName: 'Abe'}
        }
      ], {
            license: 123,
            keys: ['nothing']
          },
      )
      .then(({ requests }) => {
        expect(requests.length).toEqual(1)
        expect(requests[0].error.code).toEqual('ERROR_REQUEST_WRONG_KEYS')
        done()
      })
      .catch(error => {
        done(error)
      })
    })

    it('request wrong engine model errors', done => {
      start([
        {
          model: 'wrong.engine',
          intake: { type: 'object' },
          exhaust: { type: 'array' },
          compression: 'test',
          ignition: ['rider']
        }
      ]).run([
        {
          engine: 'wrong.wrong',
          fuel: { firstName: 'Abe'}
        }
      ], {
            license: 123,
            keys: ['rider']
          },
      )
      .then(({ requests }) => {
        expect(requests.length).toEqual(1)
        expect(requests[0].error.code).toEqual('ERROR_REQUEST_ENGINE_MODEL_NOT_FOUND')
        done()
      })
      .catch(error => {
        done(error)
      })
    })
  })
  describe('getEngineSchemas', () => {
    it('should return the correct engine schemas', () => {
      const engines = [
        {
          model: 'engine1',
          intake: { type: 'object', properties: { field1: { type: 'string' } } },
          exhaust: { type: 'array' },
          compression: 'test1',
          ignition: ['rider']
        },
        {
          model: 'engine2',
          intake: { type: 'object', properties: { field2: { type: 'number' } } },
          exhaust: { type: 'array' },
          compression: 'test2',
          ignition: ['rider']
        }
      ]

      const engine = start(engines)
      const schemas = engine.getEngineSchemas()

      expect(schemas).toEqual([
        { model: 'engine1', intake: engines[0].intake, exhaust: engines[0].exhaust },
        { model: 'engine2', intake: engines[1].intake, exhaust: engines[1].exhaust }
      ])
    })
  })
})
