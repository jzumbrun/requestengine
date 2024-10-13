import { Ajv } from 'ajv'
import ajvKeywords from 'ajv-keywords'
import { ITuning, IEngine } from '../types.d.js'
import EngineError from './errors/EngineError.js'

/**
 * Start
 */
export default class Start {
  private tuning: ITuning
  private avj: Ajv

  constructor(tuning: ITuning) {
    this.tuning = tuning
    this.avj = new Ajv({ useDefaults: true, removeAdditional: 'all' })
    ajvKeywords.default(this.avj)
  }

  turnOver(): never | void {

    if (!this.tuning.engines?.length) {
      throw new EngineError(1000, 'ERROR_MISSING_ENGINES')
    } 

    for(const engine of this.tuning.engines) {
      if (!this.check(engine)) {
        throw new EngineError(1001, 'ERROR_REQUEST_ENGINE_VALIDATION', this.avj.errors)
      }
    }
  }

  /**
   * Check
   */
  check (engine: IEngine): boolean {
    return this.avj.validate(
      {
        type: 'object',
        properties: {
          model: {
            type: 'string',
            default: 'ERROR_MISSING_MODEL'
          },
          throttle: {
            items: {
              type: 'string',
            },
            type: 'array',
            default: []
          },
          intake: {
            type: 'object',
            default: {}
          },
          exhaust: {
            type: 'object',
            default: {}
          },
          keys: {
            type: 'array',
            default: []
          },
          compression: {
            type: 'string'
          },
          power: {
            typeof: 'function',
            // Do not set default function
          }
        },
        oneOf: [{
          type: 'object', required: ['compression'] },{ 
          type: 'object', required: ['power'] }],
        additionalProperties: false,
        required: [ 'model', 'intake', 'exhaust', 'keys']
      },
      engine
    )
  }
  
}
