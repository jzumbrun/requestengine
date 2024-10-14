import type { ITuning, IRider, 
  IOdometer, IRequest, IResponse, IHTTPRequest, IHTTPResponse, 
  IEngine} from '../types.d.js'
import Cycle from './Cycle.js'
import Start from './Start.js'
import EngineError from './errors/EngineError.js'

export type * from '../types.d.ts'

export default class RequestEngine {
  readonly tuning: ITuning

  constructor (tuning: ITuning) {
    tuning.engines = tuning.engines
    tuning.env = process.env.NODE_ENV || 'production'
    tuning.neutral = tuning.neutral || undefined
    tuning.drive = tuning.drive
    this.tuning = tuning
  }

  /**
   * Start
   */
  public start (): void {
    const start = new Start(this.tuning)
    start.turnOver()
  }

  /**
   * Request middleware
   */
  public middleware () {
    return async (req: IHTTPRequest, res: IHTTPResponse) => {
      const response = await this.run(req.body?.requests || [], req.rider)
      res.send(response)
    }
  }

  /**
   * Execute requests
   */
  public async run (requests: IRequest[], rider: IRider): Promise<IResponse> {

    const response: IResponse = { requests: [] }
    const timing: Promise<void>[] = []
    const odometer: IOdometer = {}

    try {
      for await (const request of requests) {
        const strokes = new Cycle(request, response, odometer, timing, rider, this.tuning)
        await strokes.stroke()
      }

      // Process all of the async queries here
      // The catch was defined above in the creation of the promise
      if (timing.length) await Promise.all(timing)
    } catch (error: any) {
      if(!(error instanceof EngineError)) {
        // Do we have any unknown issues?
        const err = new EngineError(1007, 'ERROR_UNKNOWN')
        if (this.tuning.env === 'production') response.requests.push(err)
        else {
          err.details = error.message
          response.requests.push(err)
        }
      }
      
    } finally {
      if (typeof this.tuning.neutral === 'function') this.tuning.neutral(response)
    }

    return response
  }

  /**
   * Get Engine Schemas
   */
  public getEngineSchemas(): Pick<IEngine, "model" | "intake" | "exhaust" >[] {
    return this.tuning.engines.map(engine => ({ model: engine.model, intake: engine.intake, exhaust: engine.exhaust }))
  }
}

/**
 * Start
 */
export function kickStart (tuning: ITuning): RequestEngine {
  const engine = new RequestEngine(tuning)
  engine.start()
  return engine
}
