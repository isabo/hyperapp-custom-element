export {
  dispatchEvent,
  dispatchEventEffectRunner as dispatchEventEffect, // deprecated
  setOnEventListenerEffectRunner,
};

/**
 * Returns a Hyperapp Effect tuple that dispatches a CustomEvent for the
 * consuming app to consume.
 *
 * @param {string} eventType The name of the event. Corresponds to typeArg in
 *    the CustomEvent constructor.
 * @param {CustomEventInit} [eventInit] Settings for the custom event. Corres-
 *    ponds to customEventInit in the CustomEvent constructor. Optional.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent
 */
function dispatchEvent(eventType, eventInit) {
  return [dispatchEventEffectRunner, { eventType, eventInit }];
}

/**
 * Hyperapp Effecter that dispatches a CustomEvent for the consuming app to
 * consume.
 *
 * @param {function} _ The dispatch function passed by Hyperapp. Not used here.
 * @param {Object} props
 * @param {string} props.eventType The name of the event. Corresponds to typeArg
 *    in the CustomEvent constructor.
 * @param {CustomEventInit} props.eventInit Settings for the custom event. Corr-
 *    esponds to customEventInit in the CustomEvent constructor.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent
 */
function dispatchEventEffectRunner(_, { eventType, eventInit }) {
  const ev = new CustomEvent(eventType, eventInit);
  const cancel = !this.dispatchEvent(ev);
  // TODO: figure out how to supply useful functionality for cancelling default
  // actions.
}

/**
 * Hyperapp Effect runner for handling changes to a component's on<event> HTML
 * attribute.
 * If the attribute value is being changed, registers the new value (must be a
 * function) as an event listener, and de-registers the old value's listener.
 * If the attribute was removed, de-registers the listener.
 *
 * @param {function} _ The dispatch function passed by Hyperapp. Not used here.
 * @param {Object} props
 * @param {string} props.eventType The application-defined event type.
 * @param {function|undefined|null} props.oldVal The previous value of the
 *    on<event> attribute
 * @param {function|null} props.newVal The new value of the on<event> attribute.
 */
function setOnEventListenerEffectRunner(_, { eventType, oldVal, newVal }) {
  // Make the function an event listener.
  // But first, remove the current one if there is one.
  if (oldVal !== null) {
    this.removeEventListener(eventType, oldVal);
  }
  if (newVal !== null) {
    this.addEventListener(eventType, newVal);
  }
}
