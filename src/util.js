export { PatchStateAction, chainActions };

/**
 * Updates a state object with provided changes.
 * This is a default that is used if a ChangeAttribute action was not
 * provided.
 *
 * @param {Object} state The current state of the Hyperapp app instance.
 * @param {Object} props The property/value pair(s) to overwrite.
 * @returns {Object} A new state object.
 */
function PatchStateAction(state, props) {
  return {
    ...state,
    ...props,
  };
}

/**
 * Returns an Hyperapp Action that is actually a series of two supplied actions.
 *
 * @param {Hyperapp.Action} originalAction
 * @param {Hyperapp.Action} followUpAction
 * @param {Object} [followUpProps]
 * @param {this} [bindTo] Binds all actions to this object.
 */
function chainActions(
  originalAction,
  followUpAction,
  followUpProps = {},
  bindTo
) {
  return WrappedAction;
  /**
   * Wraps the original action. Based on the shape of the return value, either
   * invokes the following Action, or adds an Effect that dispatches the
   * following Action.
   *
   * @param {*} state
   * @param {*} props
   */
  function WrappedAction(state, props) {
    let rv = originalAction.call(bindTo, state, props);
    // rv is any of the following:
    // 1. state
    // 2. [state, ...effects]
    // 3. [Action, props]
    if (!Array.isArray(rv)) {
      // The action returned just a state - option 1.
      // We need to pass this state to Hyperapp, and then have Hyperapp dispatch
      // the followUpAction. This could be done via the effects mechanism.
      // However, it's probably OK to just invoke it directly.
      rv = followUpAction.call(bindTo, rv, followUpProps);
    } else {
      if (typeof rv[0] !== 'function') {
        // The action returned a state and effect(s) - option 2.
        // Insert an effect that will dispatch the followUp action.
        const effect = [
          (dispatch, props) => {
            dispatch(followUpAction.bind(this), followUpProps);
          },
          {},
        ];
        rv.splice(1, 0, effect);
      } else {
        // The action returned another action - option 3.
        // We will need wait until after this new action has completed.
        // Therefore we will recurse to chain ourselves to it.
        rv[0] = chainActions(rv[0], followUpAction, followUpProps, bindTo);
      }
    }

    return rv;
  }
}
