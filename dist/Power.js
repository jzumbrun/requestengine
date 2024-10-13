import Compression from './Compression.js';
/**
 * Power
 */
export default class Power {
    constructor(cycle) {
        this.cycle = cycle;
    }
    stroke() {
        if (this.cycle.engine.power) {
            return this.cycle.engine.power(this.cycle, Compression.compression);
        }
        else {
            return Promise.resolve();
        }
    }
}
