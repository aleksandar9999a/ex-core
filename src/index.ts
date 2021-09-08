interface ExWorkerBaseTask {
  fn: () => any,
  before?: (task: ExWorkerTask) => void,
  after?: (task: ExWorkerTaskResult) => void,
  priority?: number
}

interface ExWorkerTask extends ExWorkerBaseTask {
  id: number|string,
  priority: number,
  created: number
}

interface ExWorkerTaskResult extends ExWorkerTask {
  result: any
}

interface ExWorkerConfig {
  mode: 'auto'|'manual'
}

type Task = (() => any)|ExWorkerBaseTask

export class ExWorker {
  private _isStarted: boolean;
  private _queue: ExWorkerTask[];
  private _config: ExWorkerConfig;
  private processPromise: Promise<ExWorkerTaskResult[]>|null;

  get isStarted () {
    return this._isStarted;
  }

  get config () {
    return this._config;
  }

  get queue () {
    return this._queue;
  }

  constructor (config: ExWorkerConfig) {
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

  private createTask (fn: () => any): ExWorkerTask {
    return {
      id: this.getID(),
      fn,
      priority: 0,
      created: new Date().getTime()
    }
  }

  private createAdvTask (task: ExWorkerBaseTask): ExWorkerTask {
    return {
      ...task,
      id: this.getID(),
      priority: task.priority || 0,
      created: new Date().getTime()
    }
  }

  private executeTask (task: ExWorkerTask) {
    if (task.before) {
      task.before(task);
    }

    const updatedTask = {
      ...task,
      result: task.fn()
    }

    if (task.after) {
      task.after(updatedTask);
    }

    return Promise.resolve(updatedTask);
  }

  private process (results: ExWorkerTaskResult[] = []): Promise<ExWorkerTaskResult[]> {
    if (!this._isStarted) {
      return Promise.resolve(results);
    }

    if (this._queue.length <= 0) {
      this._isStarted = false;
      return Promise.resolve(results);
    }

    return Promise.resolve(this._queue.shift())
      .then((task: ExWorkerTask|undefined) => {
        if (!task) {
          return Promise.reject(new Error('Task is undefined!'));
        }

        return this.executeTask(task);
      })
      .then(task => {
        results.push(task)
        return this.process(results);
      })
  }

  private insertTask (task: ExWorkerTask) {
    return Promise.resolve()
      .then(() => {
        let isInserted = false;

        for (let i = 0; i < this._queue.length; i++) {
          const nextTask = this._queue[i + 1];
    
          if (!nextTask || nextTask.priority < task.priority) {
            this._queue.splice(i, 0, task);
            isInserted = true;
            break;
          }
        }

        if (!isInserted) {
          this._queue.push(task);
        }

        return Promise.resolve(task);
      })
  }

  start () {
    this._isStarted = true;
    this.processPromise = this.process();
    return this.processPromise;
  }

  stop () {
    this._isStarted = false;
    return this.processPromise || Promise.resolve([] as ExWorkerTask[]);
  }

  remove (id: string) {
    const wasItStarted = this._isStarted;

    return this.stop()
      .then(() => {
        this._queue = this._queue.filter(x => x.id !== id)

        if (wasItStarted) {
          return this.start();
        }

        return Promise.resolve(this._queue);
      })
  }

  push (task: Task): Promise<ExWorkerTask> {
    return Promise.resolve(typeof task === 'function')
      .then(isFn => {
        return isFn
          ? this.createTask(task as () => any)
          : this.createAdvTask(task as ExWorkerBaseTask)
      })
      .then(task => {
        return this.insertTask(task);
      })
      .then(task => {
        if (this._config.mode === 'auto' && !this._isStarted) {
          this.start();
        }
  
        return task;
      })
  }
}