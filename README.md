# Build CustomElements using Hyperapp

This library makes it easy to create a
[WebComponents Custom Elements v1](https://html.spec.whatwg.org/multipage/custom-elements.html#custom-elements)-compliant
[CustomElement](https://developers.google.com/web/fundamentals/web-components/customelements)
that uses the [Hyperapp](https://github.com/jorgebucaran/hyperapp)
microframework to define its behaviour. Such components are extremely
lightweight, even including this dependency -- it's only a 1.2K download.

CustomElements created by this library can be consumed by any HTML/Javascript
project or framework -- Hyperapp is not required.

## Hyperapp

CustomElements built with this library are mini Hyperapp apps that compose their
DOM structures using Hyperapp View functions. Their behaviour is governed by
Hyperapp Action, Effect and Subscription functions.

Unlike regular Hyperapp apps, there are three additional types of external
events to which a CustomElement may need to react. An app that consumes a
CustomElement component may:

1. set HTML attributes in the component's HTML tag;
2. set values of JavaScript properties that the component exposes;
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
import { generateClass } from 'hyperapp-custom-element';
```

Alternatively, if you're just hacking around and have not yet configured a build
step with a packager, you can import it directly into a web page:

```html
<script type="module">
  import { generateClass } from 'https://unpkg.com/hyperapp-custom-element';
</script>
```

## How to Create a CustomElement

```javascript
import { app, h, text } from 'hyperapp';
import { generateClass } from 'hyperapp-custom-element';

const MyCustomElement = generateClass({
  // The library uses your imported version of Hyperapp.
  app: app,

  // The initial state of the component. It can be a state object, or anything
  // dispatchable by Hyperapp.
  init: { theThing: 'Nothing' },

  // The Hyperapp View function that builds the component's DOM.
  view: (state) => h('p', {}, text(`The thing is: ${state.theThing}`)),

  // A function that returns an array of Hyperapp subscriptions (optional).
  subscriptions: getSubscriptions,

  // A dispatch initialiser function (optional).
  // N.B.: This library defines its own dispatch function. If a dispatch
  // initialiser is supplied here, it will be combined with the library's own
  // function.
  dispatch: dispatch,

  // An array of Javascript properties and HTML attributes (they often come in
  // pairs) that can be used by a consuming app to configure the component.
  exposedConfig: [
    {
      // Name of HTML attribute.
      // Specify attrName or propName or both.
      // If both are specified, their values will be synchronised.
      attrName: 'the-thing',

      // Name of JS property.
      // Specify attrName or propName or both.
      // If both are specified, their values will be synchronised.
      propName: 'theThing',

      // Optional Action function that will incorporate the new property or
      // attribute value into the component's state. If not specified, the
      // value will be incorporated into the state thus:
      // `newState[propName||attrName] = newValue;`
      setter: SetTheThing,

      // Optional function that receives the state and returns the property
      // value. If not specified, the value will be obtained thus:
      // `value = state[propName||attrName]`
      getter: getTheThing,
    },
    {
      // This is how to define an on<event> attribute/property. Specify an event
      // name and do not specify a getter or setter. When one of your effects
      // dispatches an event with the specified eventType, the corresponding
      // handler will be invoked.
      attrName: 'onsomeevent',
      propName: 'onsomeevent',
      eventType: 'SomethingHappened',
    },
  ],

  // Methods to expose to the consuming app, and the corresponding Actions that
  // will be invoked when the methods are called.
  exposedMethods: {
    doIt: DoSomething,
  },

  // Whether to use Shadow DOM (true) or Light DOM (false).
  useShadowDOM: true,
});

// Register the class and its tag name.
customElements.define('my-tag', MyCustomElement);
```

### Extending Native Elements

```javascript
import { app, h, text } from 'hyperapp';
import { generateClass } from 'hyperapp-custom-element';

const MyExtendedElement = generateClass({
  // The native element class that is being extended.
  parent: HTMLInputElement,

  app,

  // The initial state of the component.
  init: { theThing: 'Nothing' },

  // With an extended native element no DOM will be built. However, Hyperapp
  // needs to have a view function, so provide something minimal. It will not
  // be added to the DOM, though.
  view: (state) => h('span', {}),

  subscriptions: getSubscriptions,

  dispatch: dispatch,

  // When extending a native element, specify here only the properties,
  // attributes and methods that are being *added* -- not those that the native
  // element already has.
  exposedConfig: [],

  exposedMethods: {},

  // When extending a native element, this needs to be false.
  useShadowDOM: false,
});

// Register the class, its tag name, and the element that is being extended.
// Note the additional options object, that tells the browser which tag we are
// extending. This is necessary because some tags share the same HTMLElement
// class.
customElements.define('extended-tag', MyExtendedElement, { extends: 'input' });
```

### Dispatching Events

If your component has 'on\<event\>' attributes and/or dispatches events, you can
use the convenient `dispatchEventEffect` effect that is exported by the module.
This effect should receive a properties object with an `eventType` property and
an `eventInit` property, which correspond to arguments of the [CustomEvent
constructor](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent),
`typeArg` and `customEventInit`.

```javascript
import { dispatchEventEffect } from 'hyperapp-custom-element';

function DoSomething(state, props) {
  const newState = {
    ...state,
    ...props,
  };

  const effect = [
    dispatchEventEffect,
    {
      eventType: 'DidSomething',
      eventInit: { bubbles: true },
    },
  ];

  return [newState, effect];
}
```

## Example

- Counter component:
  - A full example component: [my-counter.js](./examples/counter/my-counter.js)
  - A web page that consumes and exercises this component:
    [counter.html](./examples/counter/counter.html)
