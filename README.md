<h1 align="center">ExCore</h1>

<p align="center">
ExCore is TypeScript/JavaScript Library for to perform asynchronous tasks.
</p>

<br>

<h2 align="center">How to use</h2>

```javascript
  import { ExCore } from 'excore';

  const core = new ExCore({ mode: 'auto' });

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

- ExCore execute tasks by priority (tasks with bigger priority are executed first)
- ExCore set default priority 0 if you don't set it
- ExCode has possibilities for callback functions
- ExCode has auto|manual modes. If mode is manual you must call core.start() to process tasks