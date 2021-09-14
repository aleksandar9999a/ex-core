<h1 align="center">ExWorker</h1>

<p align="center">
ExWorker is TypeScript/JavaScript Library for to perform asynchronous tasks.
</p>

<br>

<h2 align="center">How to use</h2>

```javascript
  import ExWorker from 'ex-worker';

  const core = new ExWorker({ mode: 'auto' });

  core.push(() => {
    console.debug('It works!');
  })

  core.push({
    fn: () => {
      console.debug('It works!');
    },
    before: () => {},
    after: () => {},
    priority: 10
  })
```

- ExWorker execute tasks by priority (tasks with bigger priority are executed first)
- ExWorker set default priority 0 if you don't set it
- ExWorker has possibilities for callback functions
- ExWorker has auto|manual modes. If mode is manual you must call core.start() to process tasks