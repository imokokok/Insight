export type NonEmptyArray<T> = [T, ...T[]];

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredProps<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type PickByType<T, U> = {
  [P in keyof T as T[P] extends U ? P : never]: T[P];
};

export type OmitByType<T, U> = {
  [P in keyof T as T[P] extends U ? never : P]: T[P];
};

export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

export type Immutable<T> = {
  readonly [P in keyof T]: T[P];
};

export type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

export type UnionToTuple<T> =
  UnionToIntersection<T extends unknown ? (t: T) => T : never> extends (_: any) => infer W
    ? [...UnionToTuple<Exclude<T, W>>, W]
    : [];

export type StringKey<T> = keyof T & string;

export type ValueOf<T> = T[keyof T];

export type ArrayElement<T> = T extends readonly (infer E)[] ? E : never;

export type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;

export type Brand<T, B> = T & { __brand: B };

export type BrandedString<Brand extends string> = Brand<string, Brand>;

export type Nominal<T, Name extends string> = T & {
  __brand: Name;
  __type: unique symbol;
};

export type Exact<T, Shape> = T extends Shape
  ? Exclude<keyof T, keyof Shape> extends never
    ? T
    : never
  : never;

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

export type RequireOnlyOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Record<Exclude<Keys, K>, undefined>>;
  }[Keys];

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

export type ReadonlyKeys<T> = {
  [P in keyof T]-?: IfEquals<{ [Q in P]: T[P] }, { -readonly [Q in P]: T[P] }, never, P>;
}[keyof T];

export type WritableKeys<T> = {
  [P in keyof T]-?: IfEquals<{ [Q in P]: T[P] }, { -readonly [Q in P]: T[P] }, P, never>;
}[keyof T];

type IfEquals<X, Y, A = X, B = never> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? A : B;

export type Merge<M, N> = Omit<M, keyof N> & N;

export type MergeRecursive<A, B> = {
  [K in keyof A | keyof B]: K extends keyof B
    ? B[K] extends object
      ? A[K] extends object
        ? MergeRecursive<A[K], B[K]>
        : B[K]
      : B[K]
    : K extends keyof A
      ? A[K]
      : never;
};

export type TupleToUnion<T extends unknown[]> = T[number];

export type Length<T extends readonly unknown[]> = T['length'];

export type Push<T extends unknown[], V> = [...T, V];

export type Pop<T extends unknown[]> = T extends [...infer U, infer _] ? U : never;

export type Shift<T extends unknown[]> = T extends [infer _, ...infer U] ? U : never;

export type Unshift<T extends unknown[], V> = [V, ...T];

export type Reverse<T extends unknown[]> = T extends [infer F, ...infer R]
  ? [...Reverse<R>, F]
  : [];
