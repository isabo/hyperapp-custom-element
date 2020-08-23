# Build CustomElements using Hyperapp

This library makes it easy to create a WebComponents-compliant CustomElement
that uses the Hyperapp microframework to define its behaviour. Such components
are extremely lightweight.

The resulting CustomElement can be consumed by any HTML/Javascript project -- it does not require Hyperapp coding in order to use it.

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

**This library provides functionality to configure and handle all of these behaviours automatically.**

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
import { app } from 'hyperapp';
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
      // value will be incorporate into the state thus:
      // `newState[propName||attrName] = newValue;`
      setter: SetIncrementSizeAction,

      // A function that receives the state and returns the property value
      // (optional). If not specified, the value will be obtained thus:
      // `value = state[propName||attrName]`
      getter: getIncrementSize,
    },
  ],

  // Methods to expose to the consuming app, and the corresponding Actions that
  // will be invoked when the methods are called.
  exposedMethods: {
    increment: IncrementAction,
  },

  // Whether to use Shadow DOM (true) or Light DOM (false).
  useShadowDOM: true,
});
```
