interface ExSequenceBaseTask {
  fn: () => any,
  before?: (task: ExSequenceTask) => void,
  after?: (task: ExSequenceTaskResult) => void,
  priority?: number
}

interface ExSequenceTask extends ExSequenceBaseTask {
  id: number|string,
  priority: number
}

interface ExSequenceTaskResult extends ExSequenceTask {
  result: any
}

interface ExSequenceConfig {
  mode: 'automatic'|'manual'
}

type Task = (() => any)|ExSequenceBaseTask

export class ExSequence {
  private _isStarted: boolean;
  private _queue: ExSequenceTask[];
  private _config: ExSequenceConfig;
  private processPromise: Promise<ExSequenceTaskResult[]>|null;

  get isStarted () {
    return this._isStarted;
  }

  get config () {
    return this._config;
  }

  get queue () {
    return this._queue;
  }

  constructor (config: ExSequenceConfig) {
    this._isStarted = false;
    this._queue = [];
    this._config = config;
    this.processPromise = null;
  }

  private getID (): string {
    const stringArr = [];
    const parts = Math.floor((Math.random() * 8) + 1);

    for (let i = 0; i < parts; i++) {
      stringArr.push((((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1));
    }

    return stringArr.join('-');
  }

  private createTask (fn: () => any): ExSequenceTask {
    return {
      id: this.getID(),
      fn,
      priority: 0
    }
  }

  private createAdvTask (task: ExSequenceBaseTask): ExSequenceTask {
    return {
      ...task,
      id: this.getID(),
      priority: task.priority || 0
    }
  }

  start () {
    this._isStarted = true;
    this.processPromise = this.process();
    return this.processPromise;
  }

  stop () {
    this._isStarted = false;
    return this.processPromise;
  }

  private process (results: ExSequenceTaskResult[] = []): Promise<ExSequenceTaskResult[]> {
    if (!this._isStarted) {
      return Promise.resolve(results);
    }

    if (this._queue.length <= 0) {
      this._isStarted = false;
      return Promise.resolve(results);
    }

    return Promise.resolve(this._queue.shift())
      .then((task: ExSequenceTask|undefined) => {
        if (!task) {
          return Promise.resolve(results);
        }

        if (task.before) {
          task.before(task);
        }

        const updatedTask = {
          ...task,
          result: task.fn()
        }

        results.push(updatedTask)

        if (task.after) {
          task.after(updatedTask);
        }

        return this.process(results)
      })
  }

  push (task: Task): Promise<ExSequenceTask> {
    return Promise.resolve(typeof task === 'function')
      .then(isFn => {
        return isFn
          ? this.createTask(task as () => any)
          : this.createAdvTask(task as ExSequenceBaseTask)
      })
      .then(task => {
        this._queue.push(task);

        if (this._config.mode === 'automatic' && !this._isStarted) {
          this.start();
        }

        return task;
      })
  }
}