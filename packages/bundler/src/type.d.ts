export type Unpacked<T> = T extends (infer U)[] ? U : T;

export type Str = string & {}

export type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<keyof T, K>>>
}[keyof T]

export type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

export type GenericFunc<A extends any[] = any, R = unknown> = (... args: A) => R