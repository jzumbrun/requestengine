var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { getRequestModel } from './toolBox.js';
import Intake from './Intake.js';
import Compression from './Compression.js';
import Power from './Power.js';
import Exhaust from './Exhaust.js';
import { RequestError } from './errors/index.js';
/**
 * Cycle
 */
export default class Cycle {
    constructor(request, response, history, async, rider, tuning) {
        var _a;
        this.async = [];
        this.request = request;
        this.response = response;
        this.history = history;
        this.async = async;
        this.rider = rider;
        this.tuning = tuning;
        this.engine = ((_a = this.tuning.engines) === null || _a === void 0 ? void 0 : _a.find((engine) => engine.model === request.model))
            || { model: '', keys: [], intake: {}, exhaust: {} };
    }
    stroke() {
        return __awaiter(this, void 0, void 0, function* () {
            const intake = new Intake(this);
            intake.stroke();
            const requestPromise = new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
                // Do we have proper cycle request schema?
                try {
                    // Do we have proper inbound request schema?
                    let data;
                    if (this.engine.power) {
                        const power = new Power(this);
                        data = yield power.stroke();
                        const exhaust = new Exhaust(this, data);
                        exhaust.stroke();
                    }
                    else {
                        const compression = new Compression(this);
                        data = yield compression.stroke();
                        const exhaust = new Exhaust(this, data);
                        exhaust.stroke();
                    }
                }
                catch (error) {
                    this.cycleError(error);
                }
                finally {
                    resolve();
                }
            }));
            if (!this.request.async)
                yield requestPromise;
            else
                this.async.push(requestPromise);
        });
    }
    /**
    * Cycle Error
    */
    cycleError(error) {
        // Do we have good query?
        const err = new RequestError(getRequestModel(this.request), 1006, 'ERROR_IMPROPER_REQUEST_STATEMENT');
        if (this.tuning.env !== 'production')
            err.details = error.message;
        this.response.requests.push(err);
    }
}
