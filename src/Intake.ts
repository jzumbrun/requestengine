import { Ajv } from 'ajv'
import ajvKeywords from 'ajv-keywords'
import { getRequestModel } from './toolBox.js'
import Cycle from './Cycle.js'

/**
 * Intake
 */
export default class Intake {
  private cycle: Cycle
  private avj: Ajv

  constructor(cycle: Cycle) {
    this.cycle = cycle
    this.avj = new Ajv({ useDefaults: true, removeAdditional: 'all' })
    ajvKeywords.default(this.avj)
  }

  stroke(): never | void {

    // Do we have a cycle?
    if (!this.cycle.engine.model) {
      this.cycle.response.requests.push({
        ...getRequestModel(this.cycle.request),
        error: { errno: 2000, code: 'ERROR_REQUEST_NOT_FOUND' }
      })
      throw new Error('ERROR_REQUEST_NOT_FOUND')
    }

    // Do we have keys?
    if (!this.keysIntersects()) {
      this.cycle.response.requests.push({
        ...getRequestModel(this.cycle.request),
        error: { errno: 2001, code: 'ERROR_REQUEST_NO_KEYS' }
      })
      throw new Error('ERROR_REQUEST_NO_KEYS')
    }

    if (!this.avj.validate(this.cycle.engine.intake, this.cycle.request.intake || null)) {
      this.cycle.response.requests.push({
        ...getRequestModel(this.cycle.request),
        error: {
          errno: 2003,
          code: 'ERROR_REQUEST_INTAKE_VALIDATION',
          details: this.avj.errors
        }
      })
      throw new Error('ERROR_REQUEST_INTAKE_VALIDATION')
    }
  }

  keysIntersects (): boolean {
    const setA = new Set(this.cycle.engine.keys);
    return (this.cycle.rider?.keys || []).some(value => setA.has(value));
  }

  /**
   * Check
   */
  check (): boolean {
    return this.avj.validate(
      {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            default: ''
          },
          model: {
            type: 'string',
            default: 'ERROR_MISSING_MODEL'
          },
          intake: {
            type: ['number', 'integer', 'string', 'boolean', 'array', 'object', 'null']
          },
          wait: {
            type: 'boolean',
            default: false
          }
        },
        additionalProperties: false,
        required: ['model']
      },
      this.cycle.request
    )
  }

}
