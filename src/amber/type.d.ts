export type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

export type GenericFunc<K extends any[] = any, V = unknown> = (...args: K) => V