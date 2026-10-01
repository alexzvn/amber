import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { $, $$, SequenceError } from '../../src/selector/Selector'

// `$.wait`/`$.any`/`$.sequence` drive a real `MutationObserver` over `document.body`, so
// these tests need an actual (if lightweight) DOM; `Selector.ts` only touches `document`
// inside function bodies, so importing it before the DOM is registered is safe.
beforeAll(async () => {
  await GlobalRegistrator.register({ url: 'https://example.com/' })
})

afterAll(async () => {
  await GlobalRegistrator.unregister()
})

describe('$ / $$', () => {
  test('$ queries the whole document when given only a selector string', () => {
    document.body.innerHTML = '<div class="target">a</div>'

    expect($('.target')?.textContent).toBe('a')
  })

  test('$ scopes the query to the given element when one is passed', () => {
    document.body.innerHTML = '<div id="scope"><span class="inner">x</span></div><span class="inner">y</span>'
    const scope = document.getElementById('scope') as HTMLElement

    expect($(scope, '.inner')?.textContent).toBe('x')
  })

  test('$ returns null when nothing matches', () => {
    document.body.innerHTML = '<div></div>'

    expect($('.missing')).toBeNull()
  })

  test('$$ returns every matching element', () => {
    document.body.innerHTML = '<i class="item"></i><i class="item"></i><i class="item"></i>'

    expect($$('.item').length).toBe(3)
  })
})

describe('$.wait', () => {
  test('resolves immediately when the element already exists', async () => {
    document.body.innerHTML = '<div id="existing"></div>'

    const el = await $.wait('#existing')
    expect(el.id).toBe('existing')
  })

  test('resolves once a matching element is added to the DOM later', async () => {
    document.body.innerHTML = ''
    const promise = $.wait('#late', { throttle: 0, timeout: 1000 })

    const el = document.createElement('div')
    el.id = 'late'
    document.body.appendChild(el)

    expect(await promise).toBe(el)
  })

  test('rejects with a timeout error when the selector never matches', async () => {
    document.body.innerHTML = ''

    await expect($.wait('#never', { timeout: 20, throttle: 0 }))
      .rejects.toThrow('Timeout when waiting for selector #never')
  })
})

describe('$.any', () => {
  test('resolves with the first of several selectors to match', async () => {
    document.body.innerHTML = '<span id="b"></span>'

    const el = await $.any(['#a', '#b', '#c'], { timeout: 50, throttle: 0 })
    expect(el.id).toBe('b')
  })

  test('throws SequenceError when none of the selectors ever match', async () => {
    document.body.innerHTML = ''

    await expect($.any(['#x', '#y'], { timeout: 20, throttle: 0 })).rejects.toThrow(SequenceError)
  })
})

describe('$.sequence', () => {
  test('resolves with the first selector (in order) that matches, skipping ones that time out', async () => {
    document.body.innerHTML = '<p id="second"></p>'

    const el = await $.sequence(['#first', '#second'], { timeout: 20, throttle: 0 })
    expect(el?.id).toBe('second')
  })

  test('resolves with undefined when none of the selectors match', async () => {
    document.body.innerHTML = ''

    const el = await $.sequence(['#first', '#second'], { timeout: 10, throttle: 0 })
    expect(el).toBeUndefined()
  })
})
