export type Worker<T> = (data: T) => Promise<unknown>
export type WorkerQueueOption<T> = Partial<{
  onError: (error: unknown, data: T) => unknown,

  /**
   * @default 1
   */
  concurrent: number,
}>

export const defineWorkerQueue = <T>(handler: Worker<T>, options: WorkerQueueOption<T> = {}) => {
  const queue = new Array<T>()
  const state = { running: 0, stop: false }
  const emitter = new EventTarget()

  let waiter: Promise<unknown>

  const { onError, concurrent = 1 } = options

  if (concurrent < 1 || (concurrent | 0) !== concurrent) {
    throw new Error('concurrent must be a positive integer')
  }

  const worker = async () => {
    state.running++
    while (queue.length > 0 && !state.stop) {
      const data = queue.shift()!
      try {
        await handler(data)
      } catch (error) {
        onError?.(error, data)
      }
    }

    state.running--
    emitter.dispatchEvent(new Event('job:finish'))
  }

  emitter.addEventListener('job:finish', () => {
    const demand = concurrent - state.running

    if (state.running == 0) {
      return emitter.dispatchEvent(new Event('queue:finish'))
    }

    if (queue.length && demand > 0) {
      emitter.dispatchEvent(new Event('queue:start'))
    }
  })

  emitter.addEventListener('queue:start', () => {
    const demand = concurrent - state.running
    new Array(demand).fill(0).forEach(() => worker())
  })


  const run = async () => {
    state.stop = false

    if (state.running === 0) {
      (waiter as any) = undefined
    }

    emitter.dispatchEvent(new Event('queue:start'))

    return waiter ??= new Promise((r) => emitter.addEventListener('queue:finish', r))
  }

  const prepend = (data: T) => {
    queue.unshift(data)
    run()
  }

  const push = (... data: T[]) => {
    queue.push(...data)
    run()
  }

  const stop = () => {
    state.stop = true
    return waiter
  }

  return {
    push,
    prepend,
    stop,
    lines: queue,
    get isRunning() { return state.running > 0 },
    get isStopped() { return state.stop },
    get handler() { return handler },
    get executor() { return waiter }
  }
}