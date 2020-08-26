# Build CustomElements using Hyperapp

This library makes it easy to create a WebComponents-compliant CustomElement
that uses the Hyperapp microframework to define its behaviour. Such components
are extremely lightweight.

The resulting CustomElement can be consumed by any HTML/Javascript project -- it
does not require Hyperapp coding in order to use it.

## Hyperapp

CustomElements built with this library are mini Hyperapp apps that compose their
DOM structures using Hyperapp View functions. Their behaviour is governed by
Hyperapp Action, Effect and Subscription functions.

Unlike regular Hyperapp apps, there are three additional types of external
events to which a CustomElement may need to react. An app that consumes a
CustomElement component may:

1. set HTML attributes in the component's HTML tag;
2. set values of JavasScript properties that the component exposes;
3. call JavaScript methods that the component exposes.

In addition, some or all of the Javascript properties and HTML attributes need
to be kept in sync with each other.

**This library provides functionality to configure and handle all of these
behaviours automatically.**

## Installation

Install the library into your project:

```
npm install hyperapp-custom-element
```

Then, import it into your app.

```javascript
import { define } from 'hyperapp-custom-element';
```

## How to Create a CustomElement

```javascript
import { app, h, text } from 'hyperapp';
import { define } from 'hyperapp-custom-element';

define({
  // The tag name of the CustomElement.
  name: 'my-counter',

  // The library uses your imported version of Hyperapp.
  app: app,

  // The initial state of the component.
  state: { count: 0 },

  // The Hyperapp View function that builds the component's DOM.
  view: (state) => {
    h('p', {}, [text('The current count is '), text(state.count)]);
  },

  // An array of Hyperapp subscriptions (optional).
  subscriptions: [],

  // An array of Javascript properties and HTML attributes (they often come in
  // pairs) that can be used by a consuming app to configure the component.
  exposedConfig: [
    {
      // Name of HTML attribute.
      // Specify attrName or propName or both.
      // If both are specified, their values will be synchronised.
      attrName: 'increment-size',

      // Name of JS property.
      // Specify attrName or propName or both.
      // If both are specified, their values will be synchronised.
      propName: 'incrementSize',

      // Action function that will incorporate the new property or attribute
      // value into the component's state (optional). If not specified, the
      // value will be incorporated into the state thus:
      // `newState[propName||attrName] = newValue;`
      setter: SetIncrementSizeAction,

      // A function that receives the state and returns the property value
      // (optional). If not specified, the value will be obtained thus:
      // `value = state[propName||attrName]`
      getter: getIncrementSize,
    },
    {
      // This is how to define an on<event> attribute/property. Specify an event
      // name and do not specify a getter or setter. When one of your effects
      // dispatches an event with the specified eventType, the corresponding
      // handler will be invoked.
      attrName: 'onsomeevent',
      propName: 'onsomeevent',
      eventType: 'SomeEvent',
    },
  ],

  // Methods to expose to the consuming app, and the corresponding Actions that
  // will be invoked when the methods are called.
  exposedMethods: {
    increment: DoSomething,
  },

  // Whether to use Shadow DOM (true) or Light DOM (false).
  useShadowDOM: true,
});
```

If your component has an on<event> attributes and/or dispatches events, a
convenient `dispatchEventEffect` effect is exported from the module. This effect
should receive a properties object with an `eventType` property and an
`eventInit` property, which correspond to arguments of CustomEvent constructor,
`typeArg` and `customEventInit` (see
https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent)

```javascript
import { define, dispatchEventEffect } from 'hyperapp-custom-element';

function DoSomething(state, props) {
  const newState = {
    ...state,
    ...props,
  };

  const effect = [
    dispatchEventEffect,
    {
      eventType: 'Incremented',
      eventInit: { bubbles: true },
    },
  ];

  return [newState, effect];
}
```

## Example

- A full example component: [my-counter.js](./examples/counter.js)
- A web page that consumes and exercises this component: [counter.html](./examples/counter.html)
