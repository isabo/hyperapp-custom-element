/**
 * Returns a Hyperapp middleware function (wrapper for dispatch) that combines
 * two other middleware functions. The outer function will be the first to be
 * called by Hyperapp, so it has the first opportunity to make changes.
 *
 * @param {function} outer
 * @param {function} inner
 * @returns {function}
 */
export function combineMiddleware(outer, inner) {
  return function middleware(dispatch) {
    return outer(inner(dispatch));
  };
}
