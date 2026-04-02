export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Required<T, K extends keyof T> = Omit<T, K> & RequiredField<Pick<T, K>>;

type RequiredField<T> = {
  [K in keyof T]-?: T[K];
};

export type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

export type NonNullable<T> = T extends null | undefined ? never : T;

export type ExtractOptional<T> = {
  [K in keyof T as undefined extends T[K] ? K : never]?: T[K];
};

export type ExtractRequired<T> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
};
