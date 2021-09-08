interface ExCoreBaseTask {
  fn: () => any,
  before?: (task: ExCoreTask) => void,
  after?: (task: ExCoreTaskResult) => void,
  priority?: number
}

interface ExCoreTask extends ExCoreBaseTask {
  id: number|string,
  priority: number,
  created: number
}

interface ExCoreTaskResult extends ExCoreTask {
  result: any
}

interface ExCoreConfig {
  mode: 'automatic'|'manual'
}

type Task = (() => any)|ExCoreBaseTask

export class ExCore {
  private _isStarted: boolean;
  private _queue: ExCoreTask[];
  private _config: ExCoreConfig;
  private processPromise: Promise<ExCoreTaskResult[]>|null;

  get isStarted () {
    return this._isStarted;
  }

  get config () {
    return this._config;
  }

  get queue () {
    return this._queue;
  }

  constructor (config: ExCoreConfig) {
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

  private createTask (fn: () => any): ExCoreTask {
    return {
      id: this.getID(),
      fn,
      priority: 0,
      created: new Date().getTime()
    }
  }

  private createAdvTask (task: ExCoreBaseTask): ExCoreTask {
    return {
      ...task,
      id: this.getID(),
      priority: task.priority || 0,
      created: new Date().getTime()
    }
  }

  private executeTask (task: ExCoreTask) {
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

  private process (results: ExCoreTaskResult[] = []): Promise<ExCoreTaskResult[]> {
    if (!this._isStarted) {
      return Promise.resolve(results);
    }

    if (this._queue.length <= 0) {
      this._isStarted = false;
      return Promise.resolve(results);
    }

    return Promise.resolve(this._queue.shift())
      .then((task: ExCoreTask|undefined) => {
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

  private insertTask (task: ExCoreTask) {
    return Promise.resolve(this._queue.length <= 0)
      .then(hasTasks => {
        if (!hasTasks) {
          this._queue.push(task);
          return Promise.resolve(task);
        }

        for (let i = 0; i < this._queue.length; i++) {
          const nextTask = this._queue[i + 1];
    
          if (!nextTask || nextTask.priority < task.priority) {
            this._queue.splice(i, 0, task);
            return Promise.resolve(task);
          }
        }

        return Promise.reject(new Error('Task is not inserted! I don\'t know why!'));
      })
  }

  start () {
    this._isStarted = true;
    this.processPromise = this.process();
    return this.processPromise;
  }

  stop () {
    this._isStarted = false;
    return this.processPromise || Promise.resolve([] as ExCoreTask[]);
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

  push (task: Task): Promise<ExCoreTask> {
    return Promise.resolve(typeof task === 'function')
      .then(isFn => {
        return isFn
          ? this.createTask(task as () => any)
          : this.createAdvTask(task as ExCoreBaseTask)
      })
      .then(task => {
        return this.insertTask(task);
      })
      .then(task => {
        if (this._config.mode === 'automatic' && !this._isStarted) {
          this.start();
        }
  
        return task;
      })
  }
}