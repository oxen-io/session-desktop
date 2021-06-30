const WORKER_TIMEOUT = 60 * 1000; // one minute

class TimedOutError extends Error {
  constructor(message: any) {
    super(message);
    this.name = this.constructor.name;
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = new Error(message).stack;
    }
  }
}

class WorkerInterface {
  _utilWorker: Worker;
  timeout: number;
  _jobs: Record<number, any>;
  _DEBUG: boolean;
  _jobCounter: number;

  constructor(path: string, timeout = WORKER_TIMEOUT) {
    this._utilWorker = new Worker(path);
    this.timeout = timeout;
    this._jobs = Object.create(null);
    this._DEBUG = true;
    this._jobCounter = 0;

    this._utilWorker.onmessage = e => {
      const [jobId, errorForDisplay, result] = e.data;

      const job = this._getJob(jobId);
      if (!job) {
        throw new Error(
          `Received worker reply to job ${jobId}, but did not have it in our registry!`
        );
      }

      const { resolve, reject, fnName } = job;

      if (errorForDisplay) {
        return reject(
          new Error(`Error received from worker job ${jobId} (${fnName}): ${errorForDisplay}`)
        );
      }

      return resolve(result);
    };
  }

  _makeJob(fnName: string) {
    this._jobCounter += 1;
    const id = this._jobCounter;

    if (this._DEBUG) {
      window.log.info(`Worker job ${id} (${fnName}) started`);
    }
    this._jobs[id] = {
      fnName,
      start: Date.now(),
    };

    return id;
  }

  _updateJob(id: number, data: any) {
    const { resolve, reject } = data;
    const { fnName, start } = this._jobs[id];

    this._jobs[id] = {
      ...this._jobs[id],
      ...data,
      resolve: (value: any) => {
        this._removeJob(id);
        const end = Date.now();
        if (this._DEBUG) {
          window.log.info(`Worker job ${id} (${fnName}) succeeded in ${end - start}ms`);
        }
        return resolve(value);
      },
      reject: (error: any) => {
        this._removeJob(id);
        const end = Date.now();
        window.log.info(`Worker job ${id} (${fnName}) failed in ${end - start}ms`);
        return reject(error);
      },
    };
  }

  _removeJob(id: number) {
    if (this._DEBUG) {
      this._jobs[id].complete = true;
    } else {
      delete this._jobs[id];
    }
  }

  _getJob(id: number) {
    return this._jobs[id];
  }

  callWorker(fnName: string, ...args: any) {
    const jobId = this._makeJob(fnName);

    return new Promise((resolve, reject) => {
      this._utilWorker.postMessage([jobId, fnName, ...args]);

      this._updateJob(jobId, {
        resolve,
        reject,
        args: this._DEBUG ? args : null,
      });

      setTimeout(
        () => reject(new TimedOutError(`Worker job ${jobId} (${fnName}) timed out`)),
        this.timeout
      );
    });
  }
}

module.exports = WorkerInterface;
