import { Ajv } from 'ajv'
import ajvKeywords from 'ajv-keywords'
import Cycle from './Cycle.js'
import { getRequestModel } from './toolBox.js'

/**
 * Exhaust
 */
export default class Exhaust {
  private avj: Ajv
  private cycle: Cycle
  private data: unknown

  constructor(cycle: Cycle, data: unknown) {
    this.avj = new Ajv({ useDefaults: true, removeAdditional: 'all' })
    ajvKeywords.default(this.avj)
    this.cycle = cycle
    this.data = data
  }

  public stroke (): void {
    // Do we have proper exhaust schema
    if (this.cycle.engine.exhaust && !this.avj.validate(this.cycle.engine.exhaust, this.data)) {
      this.cycle.response.requests.push({
        ...getRequestModel(this.cycle.request),
        error: {
          errno: 1005,
          code: 'ERROR_REQUEST_EXHAUST_VALIDATION',
          details: this.avj.errors
        }
      })
    } else {
      if (this.cycle.request.serial) this.cycle.odometer[this.cycle.request.serial] = this.data
      // Add succesfull request responses by id
      this.cycle.response.requests.push({ ...getRequestModel(this.cycle.request), results: this.data })
    }
  }

  
}
