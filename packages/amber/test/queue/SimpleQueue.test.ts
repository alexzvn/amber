import { describe, expect, test } from 'bun:test'
import { defineSimpleQueue } from '../../src/queue/SimpleQueue'

describe('defineSimpleQueue()', () => {
  test('rejects a non-positive or non-integer concurrency', () => {
    expect(() => defineSimpleQueue(async () => {}, { concurrent: 0 })).toThrow()
    expect(() => defineSimpleQueue(async () => {}, { concurrent: -1 })).toThrow()
    expect(() => defineSimpleQueue(async () => {}, { concurrent: 1.5 })).toThrow()
  })

  test('is idle before any work is pushed', () => {
    const queue = defineSimpleQueue<number>(async () => {})

    expect(queue.isRunning).toBe(false)
    expect(queue.isStopped).toBe(false)
  })

  test('processes pushed items in FIFO order under the default concurrency of 1', async () => {
    const order: number[] = []
    const queue = defineSimpleQueue<number>(async (n) => { order.push(n) })

    queue.push(1, 2, 3)
    await queue.executor

    expect(order).toEqual([1, 2, 3])
  })

  test('bounds concurrently active workers to the configured limit', () => {
    let active = 0
    let maxActive = 0
    const release: Array<() => void> = []

    const queue = defineSimpleQueue<number>((n) => {
      active++
      maxActive = Math.max(maxActive, active)

      const { promise, resolve } = Promise.withResolvers<void>()
      release[n] = () => { active--; resolve() }

      return promise
    }, { concurrent: 2 })

    queue.push(0, 1, 2, 3)

    // Only 2 workers should have started even though 4 items were queued.
    expect(active).toBe(2)
    expect(queue.lines).toEqual([2, 3])

    release[0]?.()
    release[1]?.()

    expect(maxActive).toBe(2)
  })

  test('prepend() inserts the item in front of whatever is still pending', async () => {
    const order: number[] = []
    const { promise: gate, resolve: releaseFirst } = Promise.withResolvers<void>()

    const queue = defineSimpleQueue<number>(async (n) => {
      if (n === 1) await gate
      order.push(n)
    })

    queue.push(1, 2)
    queue.prepend(0)

    releaseFirst()
    await queue.executor

    expect(order).toEqual([1, 0, 2])
  })

  test('stop() halts the queue once the in-flight item finishes, leaving the rest pending', async () => {
    const processed: number[] = []
    const { promise: gate, resolve: releaseFirst } = Promise.withResolvers<void>()

    const queue = defineSimpleQueue<number>(async (n) => {
      if (n === 1) await gate
      processed.push(n)
    })

    queue.push(1, 2, 3)
    const stopped = queue.stop()

    expect(queue.isStopped).toBe(true)

    releaseFirst()
    await stopped

    expect(processed).toEqual([1])
    expect(queue.isRunning).toBe(false)
    expect(queue.lines).toEqual([2, 3])
  })

  test('invokes onError and continues processing subsequent items when a handler rejects', async () => {
    const errors: Array<[unknown, number]> = []
    const processed: number[] = []

    const queue = defineSimpleQueue<number>(async (n) => {
      if (n === 2) throw new Error('bad item')
      processed.push(n)
    }, {
      onError: (error, data) => errors.push([error, data]),
    })

    queue.push(1, 2, 3)
    await queue.executor

    expect(processed).toEqual([1, 3])
    expect(errors).toHaveLength(1)
    expect((errors[0]?.[0] as Error).message).toBe('bad item')
    expect(errors[0]?.[1]).toBe(2)
  })
})
