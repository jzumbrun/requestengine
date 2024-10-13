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

    if (!this.checkTuning()) {
      throw new EngineError(1000, 'ERROR_REQUEST_ENGINE_VALIDATION', this.avj.errors)
    }

    for(const engine of this.tuning.engines!) {
      if (!this.checkEngines(engine)) {
        throw new EngineError(1001, 'ERROR_REQUEST_ENGINE_ENGINES_VALIDATION', this.avj.errors)
      }
    }
  }

  checkTuning() {
    return this.avj.validate({
      type: 'object',
      properties: {
        engines: { type: 'array' },
        env: { type: 'string' },
        tools: { type: 'array' },
        neutral: { typeof: 'function' },
        drive: { typeof: 'function' }
      },
      required: ['engines', 'drive'],
      additionalProperties: false
    }, this.tuning)
  }

  /**
   * Check Engines
   */
  checkEngines (engine: IEngine): boolean {
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
          ignition: {
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
        required: [ 'model', 'intake', 'exhaust', 'ignition' ]
      },
      engine
    )
  }
  
}
