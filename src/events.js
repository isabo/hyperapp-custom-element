export { SetOnEventListenerEffect, DispatchEventEffect };

/**
 * Hyperapp Effect for handling changes to an HTML on<event> attribute.
 * If the attribute value was changed, registers the new value (must be a
 * function) as an event listener, and de-registers the old value's listener.
 * If the attribute was removed, de-registers the listener.
 *
 * @param {function} dispatch
 * @param {Object} props
 * @param {string} props.eventType The application-defined event type.
 * @param {function|undefined|null} props.oldVal The previous value of the
 *    on<event> attribute
 * @param {function|null} props.newVal The new value of the on<event> attribute.
 */
function SetOnEventListenerEffect(dispatch, { eventType, oldVal, newVal }) {
  // Make the function an event listener.
  // But first, remove the current one if there is one.
  if (oldVal !== null) {
    this.removeEventListener(eventType, oldVal);
  }
  if (newVal !== null) {
    this.addEventListener(eventType, newVal);
  }
}

/**
 * Hyperapp Effect that dispatches a CustomEvent for the consuming app to
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
function DispatchEventEffect(_, { eventType, eventInit }) {
  const ev = new CustomEvent(eventType, eventInit);
  const cancel = !this.dispatchEvent(ev);
  // TODO: figure out how to supply useful functionality for cancelling default
  // actions.
}
