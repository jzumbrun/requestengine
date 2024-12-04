import { Ajv } from 'ajv'
import ajvKeywords from 'ajv-keywords'
import { IGarage, IGear, IEngineModel } from '../types.d.js'
import EngineError from './errors/EngineError.js'

/**
 * Start
 */
export default class Start {
  private garage: IGarage
  private gear: IGear
  private avj: Ajv

  constructor(garage: IGarage, gear: IGear) {
    this.garage = garage
    this.gear = gear
    this.avj = new Ajv({ useDefaults: true, removeAdditional: 'all' })
    ajvKeywords.default(this.avj)
  }

  public turnOver(): never | void {

    if (!this.checkGarage()) {
      throw new EngineError(1000, 'ERROR_REQUEST_ENGINE_GARAGE_VALIDATION', this.avj.errors)
    }

    if (!this.checkGear()) {
      throw new EngineError(1000, 'ERROR_REQUEST_ENGINE_GEAR_VALIDATION', this.avj.errors)
    }

    for(const engine of this.garage.engines!) {
      if (!this.checkEngines(engine)) {
        throw new EngineError(1001, 'ERROR_REQUEST_ENGINE_ENGINES_VALIDATION', this.avj.errors)
      }
    }
  }

  private checkGarage() {
    return this.avj.validate({
      type: 'object',
      properties: {
        engines: { type: 'array' },
        env: { type: 'string' },
        toolbox: { 
          type: 'array',
          items: {  
            type: 'object', 
            properties: { 
              tools: { 
                type: 'object',
                patternProperties: { 
                  '^[_a-zA-Z]*$': { typeof: 'function' }
                },
                additionalProperties: false
              },
              context: { type: 'boolean' },
              prefix: { type: 'string', pattern: '^[_a-zA-Z]*$'}
            },
            required: ['tools'],
            additionalProperties: false
          }
        }
      },
      required: ['engines'],
      additionalProperties: false
    }, this.garage)
  }

  private checkGear() {
    return this.avj.validate({
      type: 'object',
      properties: {
        neutral: { typeof: 'function' },
        drive: { typeof: 'function' }
      },
      required: ['drive'],
      additionalProperties: false
    }, this.gear)
  }

  /**
   * Check Engines
   */
  private checkEngines (engine: IEngineModel): boolean {
    return this.avj.validate(
      {
        type: 'object',
        properties: {
          model: {
            type: 'string',
            default: 'ERROR_MISSING_MODEL'
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
