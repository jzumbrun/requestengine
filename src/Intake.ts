import { Ajv } from 'ajv'
import ajvKeywords from 'ajv-keywords'
import { getRequestEngine } from './toolChest.js'
import Engine from './Engine.js'
import RequestError from './errors/RequestError.js'

/**
 * Intake
 */
export default class Intake {
  private engine: Engine
  private avj: Ajv

  constructor(engine: Engine) {
    this.engine = engine
    this.avj = new Ajv({ useDefaults: true, removeAdditional: 'all' })
    ajvKeywords.default(this.avj)
  }

  public stroke(): never | void {

    // Do we have a engine?
    if (!this.engine.model.model) {
      throw new RequestError(getRequestEngine(this.engine.request), 2000, 'ERROR_REQUEST_ENGINE_MODEL_NOT_FOUND')
    }

    // Do we have the correct keys for the ignition?
    if (!this.ignitionKeysIntersects()) {
      throw new RequestError(getRequestEngine(this.engine.request), 2001, 'ERROR_REQUEST_WRONG_KEYS')
    }

    if (!this.avj.validate(this.engine.model.intake, this.engine.request.fuel || null)) {
      throw new RequestError(getRequestEngine(this.engine.request), 2003, 'ERROR_REQUEST_INTAKE_VALIDATION', this.avj.errors)
    }
  }

  private ignitionKeysIntersects (): boolean {
    const setA = new Set(this.engine.model.ignition);
    return (this.engine.operator?.keys || []).some(value => setA.has(value));
  }

  /**
   * Check
   */
  public check (): boolean {
    return this.avj.validate(
      {
        type: 'object',
        properties: {
          serial: {
            type: 'string',
            default: ''
          },
          engine: {
            type: 'string',
            default: 'ERROR_MISSING_MODEL'
          },
          fuel: {
            type: ['number', 'integer', 'string', 'boolean', 'array', 'object', 'null']
          },
          timing: {
            type: 'boolean',
            default: false
          }
        },
        additionalProperties: false,
        required: ['engine']
      },
      this.engine.request
    )
  }

}
