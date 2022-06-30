/**
 * Returns a Hyperapp dispatch initialiser that combines two other dispatch
 * initialiser functions. The outer function will be the first to be called by
 * Hyperapp, so it has the first opportunity to make changes.
 *
 * @param {function} outer
 * @param {function} inner
 * @returns {function}
 */
export function combineDispatchInitialisers(outer, inner) {
  return function dispatchInitialiser(dispatch) {
    return outer(inner(dispatch));
  };
}
