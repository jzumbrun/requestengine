import { describe, it, expect } from '@jest/globals'
import { IEngineModel, kickStart } from '../index.js'

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

function start(engines: IEngineModel[]) {
  return kickStart(
    {
      engines,
      toolbox: [
        {
          tools: {
            trim: (str: string) => str.trim(),
            eq: (a: string, b: string) => a === b,
            isString: (str: string) => typeof str === 'string',
          },
          prefix: '_',
          context: false,
        },
      ],
    },
    {
      neutral: () => null,
      drive: queryStatement,
    }
  )
}

describe('RequestEngine', () => {
  describe('middleware', () => {
    const res: any = {
      send: (response: unknown) => {
        res.data = response
      },
    }

    it(':operators:update', (done) => {
      start([
        {
          model: ':operators:update',
          compression:
            'UPDATE operators SET {{:assign intake.operator}} WHERE id = {{operator.id}}',
          intake: {
            type: 'object',
            properties: { operator: { type: 'object' } },
          },
          exhaust: { type: 'array' },
          ignition: ['operator'],
        },
      ])
        .middleware()(
          {
            operator: {
              id: 123,
              keys: ['operator'],
            },
            body: [
              {
                engine: ':operators:update',
                fuel: {
                  operator: { name: 'Jon', age: 33 },
                },
              },
            ],
          },
          res
        )
        .then(() => {
          expect(res.data[0].response).toEqual([
            'UPDATE operators SET "name" = $1, "age" = $2 WHERE id = $3',
            ['Jon', 33, 123],
          ])
          done()
        })
        .catch((error) => {
          done(error)
        })
    })

    it('sync', (done) => {
      start([
        {
          model: 'immediate',
          compression: '0',
          intake: { type: 'null' },
          exhaust: { type: 'string' },
          ignition: ['operator'],
        },
        {
          model: 'short',
          compression: '100',
          intake: { type: 'null' },
          exhaust: { type: 'string' },
          ignition: ['operator'],
        },
        {
          model: 'long',
          compression: '200',
          intake: { type: 'null' },
          exhaust: { type: 'string' },
          ignition: ['operator'],
        },
      ])
        .middleware()(
          {
            operator: {
              id: 123,
              keys: ['operator'],
            },
            body: [
              {
                serial: '1',
                engine: 'long',
              },
              {
                serial: '2',
                engine: 'long',
                timing: false,
              },
              {
                serial: '3',
                engine: 'short',
                timing: false,
              },
              {
                serial: '4',
                engine: 'immediate',
              },
            ],
          },
          res
        )
        .then(() => {
          expect(res.data).toEqual([
            { engine: 'long', response: '200', serial: '1' },
            { engine: 'immediate', response: '0', serial: '4' },
            { engine: 'long', response: '200', serial: '2' },
            { engine: 'short', response: '100', serial: '3' },
          ])
          done()
        })
        .catch((error) => {
          done(error)
        })
    })

    it('previous query response', (done) => {
      start([
        {
          model: 'thing:one',
          compression: 'thing:one',
          intake: { type: 'null' },
          exhaust: { type: 'array' },
          ignition: ['operator'],
        },
        {
          model: 'thing:two',
          compression: 'thing:two is bigger than {{revolution.one.[0]}}',
          intake: { type: 'null' },
          exhaust: { type: 'array' },
          ignition: ['operator'],
        },
      ])
        .middleware()(
          {
            operator: {
              id: 123,
              keys: ['operator'],
            },
            body: [
              {
                serial: 'one',
                engine: 'thing:one',
              },
              {
                serial: 'two',
                engine: 'thing:two',
              },
            ],
          },
          res
        )
        .then(() => {
          expect(res.data).toEqual([
            {
              serial: 'one',
              engine: 'thing:one',
              response: ['thing:one', []],
            },
            {
              serial: 'two',
              engine: 'thing:two',
              response: ['thing:two is bigger than $1', ['thing:one']],
            },
          ])
          done()
        })
        .catch((error) => {
          done(error)
        })
    })

    it('registered tools', (done) => {
      start([
        {
          model: 'thing:one',
          compression: 'thing:one {{_trim intake.trimspace}}',
          intake: {
            type: 'object',
            properties: { trimspace: { type: 'string' } },
          },
          exhaust: { type: 'array' },
          ignition: ['operator'],
        },
      ])
        .middleware()(
          {
            operator: {
              id: 123,
              keys: ['operator'],
            },
            body: [
              {
                serial: '1',
                engine: 'thing:one',
                fuel: {
                  trimspace: '  nospaces   ',
                },
              },
            ],
          },
          res
        )
        .then(() => {
          expect(res.data).toEqual([
            {
              serial: '1',
              engine: 'thing:one',
              response: ['thing:one $1', ['nospaces']],
            },
          ])
          done()
        })
        .catch((error) => {
          done(error)
        })
    })
  })

  describe('run', () => {
    it('nested tools', (done) => {
      start([
        {
          model: 'nested',
          compression: [
            'UPDATE operators SET ',
            '{{#_trim ',
            '}}',
            '{{#each intake.fields}}',
            "{{#unless (_eq @key 'id')}}",
            '{{@key}} = {{#if (_isString this)}}{{_trim this}}, {{else}}{{this}}, {{/if}}',
            '{{/unless}}',
            '{{/each}}',
            '{{/_trim}}',
          ].join(''),
          intake: {
            type: 'object',
            properties: { fields: { type: 'object' } },
          },
          exhaust: { type: 'array' },
          ignition: ['operator'],
        },
      ])
        .run(
          [
            {
              serial: '1',
              engine: 'nested',
              fuel: {
                fields: {
                  column1: 3,
                  column2: '  hello  ',
                },
              },
            },
          ],
          {
            id: 123,
            keys: ['operator'],
          }
        )
        .then((requests) => {
          expect(requests).toEqual([
            {
              serial: '1',
              engine: 'nested',
              response: [
                'UPDATE operators SET $1 = $2, $3 = $4,',
                ['column1', 3, 'column2', 'hello'],
              ],
            },
          ])
          done()
        })
        .catch((error) => {
          done(error)
        })
    })

    it('async power', (done) => {
      start([
        {
          model: 'power',
          intake: { type: 'null' },
          exhaust: { type: 'number' },
          power: () => {
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve(1)
              }, 0)
            })
          },
          ignition: ['operator'],
        },
      ])
        .run(
          [
            {
              engine: 'power',
            },
          ],
          {
            id: 123,
            keys: ['operator'],
          }
        )
        .then((requests) => {
          expect(requests).toEqual([{ engine: 'power', response: 1 }])
          done()
        })
        .catch((error) => {
          done(error)
        })
    })

    it('async power call compressionStroke', (done) => {
      start([
        {
          model: 'power',
          intake: { type: 'null' },
          exhaust: { type: 'array' },
          power: async (engine, { compressionStroke }) => {
            const result = await compressionStroke('callCompression', engine)
            return result
          },
          ignition: ['operator'],
        },
      ])
        .run(
          [
            {
              engine: 'power',
            },
          ],
          {
            id: 123,
            keys: ['operator'],
          }
        )
        .then((requests) => {
          expect(requests).toEqual([
            { engine: 'power', response: ['callCompression', []] },
          ])
          done()
        })
        .catch((error) => {
          done(error)
        })
    })

    it('async power call engineCycle', (done) => {
      start([
        {
          model: 'another:engine',
          intake: { type: 'null' },
          exhaust: { type: 'array' },
          compression: 'another:engine:compression',
          ignition: ['system'],
        },
        {
          model: 'power',
          intake: { type: 'null' },
          exhaust: { type: 'array' },
          power: async (engine, { engineCycle }) => {
            const result = await engineCycle(
              { engine: 'another:engine' },
              engine.garage,
              engine.gear,
              { id: 'system', keys: ['system'] }
            )
            return result.response
          },
          ignition: ['operator'],
        },
      ])
        .run(
          [
            {
              engine: 'power',
            },
          ],
          {
            id: 123,
            keys: ['operator'],
          }
        )
        .then((requests) => {
          expect(requests).toEqual([
            { engine: 'power', response: ['another:engine:compression', []] },
          ])
          done()
        })
        .catch((error) => {
          done(error)
        })
    })

    it('gear engines errors', (done) => {
      try {
        kickStart({ engines: false } as any, { drive: 'wrong' } as any)
      } catch (error) {
        expect((error as any).message).toEqual(
          'ERROR_REQUEST_ENGINE_GARAGE_VALIDATION'
        )
        done()
      }
    })

    it('gear drive errors', (done) => {
      try {
        kickStart({ engines: [] }, { drive: 'wrong' } as any)
      } catch (error) {
        expect((error as any).message).toEqual(
          'ERROR_REQUEST_ENGINE_GEAR_VALIDATION'
        )
        done()
      }
    })

    it('garage engine errors', (done) => {
      try {
        kickStart(
          {
            engines: [
              {
                model: 'thing:one',
                compression: 'thing:one {{_trim intake.trimspace}}',
                power: () => {},
                intake: {
                  type: 'object',
                  properties: { trimspace: { type: 'string' } },
                },
                exhaust: { type: 'array' },
                ignition: ['operator'],
              },
            ],
          } as any,
          { drive: () => {} } as any
        )
      } catch (error) {
        expect((error as any).message).toEqual(
          'ERROR_REQUEST_ENGINE_ENGINES_VALIDATION'
        )
        done()
      }
    })

    it('request intake errors', (done) => {
      start([
        {
          model: 'wrong:intake',
          intake: { type: 'string' },
          exhaust: { type: 'string' },
          compression: 'test',
          ignition: ['operator'],
        },
      ])
        .run(
          [
            {
              engine: 'wrong:intake',
              fuel: { firstName: 'Abe' },
            },
            {
              engine: 'wrong:intake',
              fuel: { firstName: 'Gabe' },
            },
          ],
          {
            id: 123,
            keys: ['operator'],
          }
        )
        .then((requests) => {
          expect(requests.length).toEqual(1)
          expect(requests[0].engine).toEqual('wrong:intake')
          expect(requests[0].error?.code).toEqual(
            'ERROR_REQUEST_INTAKE_VALIDATION'
          )
          done()
        })
        .catch((error) => {
          done(error)
        })
    })

    it('request wrong keys errors', (done) => {
      start([
        {
          model: 'wrong:keys',
          intake: { type: 'object' },
          exhaust: { type: 'array' },
          compression: 'test',
          ignition: ['operator'],
        },
      ])
        .run(
          [
            {
              engine: 'wrong:keys',
              fuel: { firstName: 'Abe' },
            },
          ],
          {
            id: 123,
            keys: ['nothing'],
          }
        )
        .then((requests) => {
          expect(requests.length).toEqual(1)
          expect(requests[0].error?.code).toEqual('ERROR_REQUEST_WRONG_KEYS')
          done()
        })
        .catch((error) => {
          done(error)
        })
    })

    it('allows empy ignition with operator', (done) => {
      start([
        {
          model: 'empy:ignition',
          intake: { type: 'null' },
          exhaust: { type: 'array' },
          compression: 'test',
          ignition: [],
        },
      ])
        .run(
          [
            {
              engine: 'empy:ignition',
            },
          ],
          {
            id: 123,
            keys: ['operator'],
          }
        )
        .then((requests) => {
          expect(requests).toEqual([
            { engine: 'empy:ignition', response: ['test', []] },
          ])
          done()
        })
        .catch((error) => {
          done(error)
        })
    })

    it('allows empy ignition with no operator', (done) => {
      start([
        {
          model: 'empy:ignition',
          intake: { type: 'null' },
          exhaust: { type: 'array' },
          compression: 'test',
          ignition: [],
        },
      ])
        .run([
          {
            engine: 'empy:ignition',
          },
        ])
        .then((requests) => {
          expect(requests).toEqual([
            { engine: 'empy:ignition', response: ['test', []] },
          ])
          done()
        })
        .catch((error) => {
          done(error)
        })
    })

    it('request wrong engine model errors', (done) => {
      start([
        {
          model: 'wrong:engine',
          intake: { type: 'object' },
          exhaust: { type: 'array' },
          compression: 'test',
          ignition: ['operator'],
        },
      ])
        .run(
          [
            {
              engine: 'wrong:wrong',
              fuel: { firstName: 'Abe' },
            },
          ],
          {
            id: 123,
            keys: ['operator'],
          }
        )
        .then((requests) => {
          expect(requests.length).toEqual(1)
          expect(requests[0].error?.code).toEqual(
            'ERROR_REQUEST_ENGINE_MODEL_NOT_FOUND'
          )
          done()
        })
        .catch((error) => {
          done(error)
        })
    })

    it('compression allows arrays', (done) => {
      start([
        {
          model: 'wrong:params',
          intake: { type: 'object' },
          exhaust: { type: 'array' },
          compression: '{{intake.names}}',
          ignition: ['operator'],
        },
      ])
        .run(
          [
            {
              engine: 'wrong:params',
              fuel: { names: ['Abe'] },
            },
          ],
          {
            id: 123,
            keys: ['operator'],
          }
        )
        .then((requests) => {
          expect(requests.length).toEqual(1)
          expect(requests[0]).toEqual({
            engine: 'wrong:params',
            response: ['$1', [['Abe']]],
          })
          done()
        })
        .catch((error) => {
          done(error)
        })
    })

    it('compression uses object, string and number', (done) => {
      start([
        {
          model: 'object:engine',
          intake: {
            type: 'object',
            properties: {
              operator: {
                type: 'object',
                properties: {
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                },
                additionalProperties: false,
              },
              throttle: {
                type: 'object',
                properties: {
                  select: {
                    type: 'array',
                    items: [{ const: 'id' }, { const: 'lastName' }],
                  },
                  limit: { type: 'number' },
                  orderBy: {
                    type: 'object',
                    properties: {
                      lastName: { type: 'string' },
                      createdAt: { type: 'string' },
                    },
                    additionalProperties: false,
                  },
                },
                additionalProperties: false,
              },
            },
            additionalProperties: false,
          },
          exhaust: { type: 'array' },
          compression: `INSERT INTO operators ({{:columns intake.operator}}) VALUES({{:values intake.operator}}); SELECT {{:columns intake.throttle.select}} FROM operators ORDER BY {{:orderBy intake.throttle.orderBy}} LIMIT {{:escape intake.throttle.limit}}`,
          ignition: ['operator'],
        },
      ])
        .run(
          [
            {
              engine: 'object:engine',
              fuel: {
                operator: {
                  firstName: 'Abe',
                  lastName: 'Lincoln',
                },
                throttle: {
                  select: ['id'],
                  orderBy: { lastName: 'ASC', createdAt: 'DESC' },
                  limit: 20,
                },
              },
            },
          ],
          {
            id: 123,
            keys: ['operator'],
          }
        )
        .then((requests) => {
          expect(requests).toEqual([
            {
              engine: 'object:engine',
              response: [
                'INSERT INTO operators ("firstName", "lastName") VALUES($1, $2); SELECT "id" FROM operators ORDER BY "lastName" ASC, "createdAt" DESC LIMIT 20',
                ['Abe', 'Lincoln'],
              ],
            },
          ])
          done()
        })
        .catch((error) => {
          done(error)
        })
    })
  })

  describe('getEngineSchemas', () => {
    it('should return the correct engine schemas', () => {
      const engines = [
        {
          model: 'engine1',
          intake: {
            type: 'object',
            properties: { field1: { type: 'string' } },
          },
          exhaust: { type: 'array' },
          compression: 'test1',
          ignition: ['operator'],
        },
        {
          model: 'engine2',
          intake: {
            type: 'object',
            properties: { field2: { type: 'number' } },
          },
          exhaust: { type: 'array' },
          compression: 'test2',
          ignition: ['operator'],
        },
      ]

      const engine = start(engines)
      const schemas = engine.getEngineSchemas()

      expect(schemas).toEqual([
        {
          model: 'engine1',
          intake: engines[0].intake,
          exhaust: engines[0].exhaust,
        },
        {
          model: 'engine2',
          intake: engines[1].intake,
          exhaust: engines[1].exhaust,
        },
      ])
    })
  })
})
