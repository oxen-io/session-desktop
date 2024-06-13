// `missingCaseError` is useful for compile-time checking that all `case`s in
// a `switch` statement have been handled, e.g.
//

export const missingCaseError = (x: never): TypeError => new TypeError(`Unhandled case: ${x}`);
