import { Ajv } from 'ajv'
import ajvKeywords from 'ajv-keywords'
import Engine from './Engine.js'
import { getRequestEngine } from './toolChest.js'
import { IResult } from '../types.js'
import RequestError from './errors/RequestError.js'

/**
 * Exhaust
 */
export default class Exhaust {
  private avj: Ajv
  private engine: Engine
  private data: unknown

  constructor(engine: Engine, data: unknown) {
    this.avj = new Ajv({ useDefaults: true, removeAdditional: 'all' })
    ajvKeywords.default(this.avj)
    this.engine = engine
    this.data = data
  }

  public stroke (): IResult {
    // Do we have proper exhaust schema
    if (this.engine.model.exhaust && !this.avj.validate(this.engine.model.exhaust, this.data)) {
      throw new RequestError(getRequestEngine(this.engine.request), 1005, 'ERROR_REQUEST_EXHAUST_VALIDATION', this.avj.errors)
    }

    if (this.engine.request.serial) this.engine.odometer[this.engine.request.serial] = this.data
    // Add succesfull request response by id
    return { ...getRequestEngine(this.engine.request), results: this.data }
  }
  
}
