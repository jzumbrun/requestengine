var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
import Cycle from './Cycle.js';
import Start from './Start.js';
import EngineError from './errors/EngineError.js';
export default class RequestEngine {
    constructor(tuning = {}) {
        tuning.engines = tuning.engines || [];
        tuning.env = process.env.NODE_ENV || 'production';
        tuning.release = tuning.release || undefined;
        tuning.query = tuning.query || undefined;
        this.tuning = tuning;
    }
    /**
     * Start
     */
    start() {
        const start = new Start(this.tuning);
        start.turnOver();
    }
    /**
     * Request middleware
     */
    middleware() {
        return (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const response = yield this.run(((_a = req.body) === null || _a === void 0 ? void 0 : _a.requests) || [], req.rider);
            res.send(response);
        });
    }
    /**
     * Execute queries
     */
    run(requests, rider) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, requests_1, requests_1_1;
            var _b, e_1, _c, _d;
            const response = { requests: [] };
            const async = [];
            const history = {};
            try {
                try {
                    for (_a = true, requests_1 = __asyncValues(requests); requests_1_1 = yield requests_1.next(), _b = requests_1_1.done, !_b; _a = true) {
                        _d = requests_1_1.value;
                        _a = false;
                        const request = _d;
                        const strokes = new Cycle(request, response, history, async, rider, this.tuning);
                        yield strokes.stroke();
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (!_a && !_b && (_c = requests_1.return)) yield _c.call(requests_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                // Process all of the async queries here
                // The catch was defined above in the creation of the promise
                if (async.length)
                    yield Promise.all(async);
            }
            catch (error) {
                // Do we have any unknown issues?
                const err = new EngineError(1007, 'ERROR_UNKNOWN');
                if (this.tuning.env === 'production')
                    response.requests.push(err);
                else {
                    err.details = error.message;
                    response.requests.push(err);
                }
            }
            finally {
                if (typeof this.tuning.release === 'function')
                    this.tuning.release(response);
            }
            return response;
        });
    }
}
/**
 * Start
 */
export function kickStart(tuning) {
    const engine = new RequestEngine(tuning);
    engine.start();
    return engine;
}
