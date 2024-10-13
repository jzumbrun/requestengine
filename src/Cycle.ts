import type { ITuning, IEngine, IOdometer, IRequest, IResponse, IRider } from '../types.js'
import { getRequestModel } from './toolBox.js'
import Intake from './Intake.js'
import Compression from './Compression.js'
import Power from './Power.js'
import Exhaust from './Exhaust.js'
import { RequestError } from './errors/index.js'

/**
 * Cycle
 */
export default class Cycle {
  readonly request: IRequest
  readonly response: IResponse
  readonly odometer: IOdometer
  readonly timing: Promise<void>[] = []
  readonly rider: IRider
  readonly tuning: ITuning

  readonly engine: IEngine

  constructor(
    request: IRequest, response: IResponse, 
    odometer: IOdometer, async: Promise<void>[], 
    rider: IRider, tuning: ITuning
  ) {
    this.request = request
    this.response = response
    this.odometer = odometer
    this.timing = async
    this.rider = rider
    this.tuning = tuning
    this.engine = this.tuning.engines?.find((engine) => engine.model === request.model)
      || { model: '', keys: [], intake: {}, exhaust: {} }

  }

  async stroke(): Promise<void> {
    const intake = new Intake(this)
    intake.stroke()

    const requestPromise = new Promise<void>(async (resolve) => {
      // Do we have proper cycle request schema?
      
      try {
        // Do we have proper inbound request schema?
        let data: unknown
        if (this.engine.power) {
            const power = new Power(this)
            data = await power.stroke()
            const exhaust = new Exhaust(this, data)
            exhaust.stroke()
        } else {
          const compression = new Compression(this)
          data = await compression.stroke()
          const exhaust = new Exhaust(this, data)
          exhaust.stroke()
        }
      } catch (error: any) {
        this.cycleError(error)
      } finally {
        resolve()
      }
    })
    if (this.request.timing !== false) await requestPromise
    else this.timing.push(requestPromise)
  }

  /**
  * Cycle Error
  */
  private cycleError (error: Error): void {
    // Do we have good query?
    const err = new RequestError(getRequestModel(this.request), 1006, 'ERROR_IMPROPER_REQUEST_STATEMENT')
    if (this.tuning.env !== 'production') err.details = error.message
    this.response.requests.push(err)
  }
  
}
