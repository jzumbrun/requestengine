import type { IOperator, 
  IRevolution, IRequest, IResponse, IHTTPRequest, IHTTPResponse, 
  IEngineModel, IResult,
  IGarage, IGear} from '../types.d.js'
import Engine from './Engine.js'
import Start from './Start.js'

export * as Start from './Start.js'
export * as Engine from './Engine.js'
export * as Intake from './Intake.js'
export * as Compression from './Compression.js'
export * as Power from './Power.js'
export * as Exhaust from './Exhaust.js'
export * from './errors/index.js'
export type * from '../types.d.ts'

export default class RequestEngine {
  readonly garage: IGarage
  readonly gear: IGear

  constructor (garage: IGarage, gear: IGear) {
    garage.env = process.env.NODE_ENV || 'production'
    gear.neutral = gear.neutral || undefined
    this.garage = garage
    this.gear = gear
  }

  /**
   * Start
   */
  public start (): void {
    const start = new Start(this.garage, this.gear)
    start.turnOver()
  }

  /**
   * Request middleware
   */
  public middleware () {
    return async (req: IHTTPRequest, res: IHTTPResponse) => {
      const response = await this.run(req.body?.requests || [], req.operator)
      res.send(response)
    }
  }

  /**
   * Execute requests
   */
  public async run (requests: IRequest[], operator?: IOperator): Promise<IResponse> {

    const response: IResponse = { requests: [] }
    const timing: Promise<IResult>[] = []
    const revolution: IRevolution = {}

    try {
      for (const request of requests) {
        const engineCyle = Engine.engineCycle(request, this.garage, this.gear, operator, revolution)
 
        if (request.timing === false) timing.push(engineCyle)
        else response.requests.push(await engineCyle)
      }

      // Process all of the async queries here
      // The catch was defined above in the creation of the promise
      if (timing.length) response.requests.push(...await Promise.all(timing))
    } catch (error: any) {
      error.details = error.details || error.message
      response.requests.push({ error })
    } finally {
      if (typeof this.gear.neutral === 'function') this.gear.neutral(response)
    }

    return response
  }

  /**
   * Get Engine Schemas
   */
  public getEngineSchemas(): Pick<IEngineModel, "model" | "intake" | "exhaust" >[] {
    return this.garage.engines.map(engine => ({ model: engine.model, intake: engine.intake, exhaust: engine.exhaust }))
  }
}

/**
 * Start
 */
export function kickStart (garage: IGarage, gear: IGear): RequestEngine {
  const engine = new RequestEngine(garage, gear)
  engine.start()
  return engine
}
