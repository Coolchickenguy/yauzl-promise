/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'is-it-type' {
  export function isArray(arg: any): arg is any[];

  export function isBoolean(arg: any): arg is boolean;
  export function isNull(arg: any): arg is null;
  export function isUndefined(arg: any): arg is undefined;
  export function isNullOrUndefined(arg: any): arg is null | undefined;

  export function isNumber(arg: any): arg is number;
  export function isString(arg: any): arg is string;
  export function isSymbol(arg: any): arg is symbol;

  export function isRegExp(arg: any): arg is RegExp;
  export function isDate(arg: any): arg is Date;
  export function isError(arg: any): arg is Error;

  export function isFunction(arg: any): arg is (...args: any[]) => any;

  export function isPrimitive(arg: any): arg is string | number | boolean | symbol | null | undefined;

  // Strings
  export function isEmptyString(arg: any): arg is '';
  export function isFullString(arg: any): arg is string;

  // Objects
  export function isObject(arg: any): arg is Record<string | number | symbol, any>;
  export function isEmptyObject(arg: any): arg is Record<string | number | symbol, never>;

  // Numbers
  export function isInteger(arg: any): arg is number;
  export function isPositiveInteger(arg: any): arg is number;
  export function isPositiveIntegerOrZero(arg: any): arg is number;
  export function isNegativeInteger(arg: any): arg is number;
  export function isNegativeIntegerOrZero(arg: any): arg is number;

  // Other
  export function isType<T extends string>(type: T, arg: any): boolean;
}
