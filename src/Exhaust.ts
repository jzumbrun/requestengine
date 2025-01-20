import { Ajv } from 'ajv'
import ajvKeywords from 'ajv-keywords'
import Engine from './Engine.js'
import { getRequestEngine } from './toolChest.js'
import { IResponse } from './types.js'
import RequestError from './errors/RequestError.js'

/**
 * Exhaust
 */
export default class Exhaust {
  private avj: Ajv
  private engine: Engine
  private exhaustValves: unknown

  constructor(engine: Engine, exhaustValves: unknown) {
    this.avj = new Ajv({ useDefaults: true })
    ajvKeywords.default(this.avj)
    this.engine = engine
    this.exhaustValves = exhaustValves
  }

  public stroke(): IResponse {
    // Do we have proper exhaust schema
    if (
      this.engine.model.exhaust &&
      !this.avj.validate(this.engine.model.exhaust, this.exhaustValves)
    ) {
      throw new RequestError(
        getRequestEngine(this.engine.request),
        1005,
        'ERROR_REQUEST_EXHAUST_VALIDATION',
        this.avj.errors
      )
    }

    if (this.engine.request.serial)
      this.engine.revolution[this.engine.request.serial] = this.exhaustValves
    // Add succesfull request response by id
    return {
      ...getRequestEngine(this.engine.request),
      response: this.exhaustValves,
    }
  }
}
