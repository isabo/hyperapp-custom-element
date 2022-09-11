import { h, text, app } from 'https://unpkg.com/hyperapp';
import {
  generateClass,
  dispatchEvent,
} from 'https://unpkg.com/hyperapp-custom-element';

/**
 * Creates a component that displays a number, and has a button that, when
 * pressed, increments the number by a predefined increment size.
 *
 * HTML Attributes:
 * ----------------
 * increment-size: An integer larger than zero, by which the count will be
 *                 increased each time.
 * hide-button:    If this attribute appears, the increment button will not be
 *                 shown.
 * onincrement:    An event handler function that will be called whenever
 *                 the count is incremented.
 *
 * Javascript Properties:
 * ----------------------
 * incrementSize:  Get/set the size of the increments -- see similarly
 *                 named HTML attribute.
 * hideButton:     Get/set whether the increment button is hidden (true/false).
 * count:          Get the current value stored in the component.
 *
 * Javascript Methods:
 * -------------------
 * increment():    Equivalent to pressing the increment button inside the
 *                 component.
 *
 * Javascript Events:
 * ------------------
 * 'Incremented':  Dispatched whenever the count is incremented.
 */
const MyCounter = generateClass({
  name: 'my-counter',
  app: app,
  init: {
    count: 0,
    incrementSize: 1,
    hideButton: false,
  },
  view: view,
  exposedConfig: [
    {
      attrName: 'increment-size',
      propName: 'incrementSize',
      setter: SetIncrementSize,
    },
    {
      propName: 'count',
    },
    {
      propName: 'hideButton',
      attrName: 'hide-button',
    },
    {
      propName: 'onincrement',
      attrName: 'onincrement',
      eventType: 'Incremented',
    },
  ],
  exposedMethods: {
    increment: IncrementCounter,
  },
});

customElements.define('my-counter', MyCounter);

function view(state) {
  return h('div', {}, [
    h('input', { value: state.count, type: 'text', disabled: true }),
    !state.hideButton &&
      h(
        'button',
        { onclick: IncrementCounter },
        text(`Increment by ${state.incrementSize}`)
      ),
  ]);
}

function SetIncrementSize(state, { incrementSize }) {
  const size = parseInt(incrementSize);
  if (!isNaN(size) && incrementSize > 0) {
    return {
      ...state,
      incrementSize: size,
    };
  } else {
    return state;
  }
}

function IncrementCounter(state, event) {
  const newState = {
    ...state,
    count: state.count + state.incrementSize,
  };

  return [newState, dispatchEvent('Incremented', { bubbles: true })];
}
