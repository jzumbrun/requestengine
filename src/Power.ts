import Cycle from './Cycle.js'
import Compression from './Compression.js'

/**
 * Power
 */
export default class Power {
  private cycle: Cycle

  constructor(cycle: Cycle) {
    this.cycle = cycle
  }

  public stroke (): Promise<unknown> {
    if (this.cycle.engine.power) {
      return this.cycle.engine.power(this.cycle, Compression.compression);
    } else {
      return Promise.resolve();
    }
  }

  
}