export { generateClass, define };

import { setOnEventListenerEffect } from './effects';
import { combineDispatchInitialisers } from './middleware';

/**
 * Creates a CustomElement class definition that uses the Hyperapp
 * microframework to define its functionality. The resulting CustomElement is a
 * standard Web Component that can be consumed by any HTML/Javascript project --
 * it does not require Hyperapp coding in order to use it.
 *
 * CustomElements built with this function compose their DOM structures using
 * Hyperapp view functions. Their behaviour is governed by Hyperapp Action,
 * Effect and Subscription functions.
 *
 * Unlike regular Hyperapp apps, there are three additional types of external
 * events to which a CustomElement needs to react. The app that consumes the
 * component may:
 * 1. set HTML attributes in the component's HTML tag;
 * 2. set values of properties exposed by the component;
 * 3. call methods exposed by the component.
 *
 * In addition, some or all of the Javascript properties and HTML attributes
 * need to be kept in sync with each other.
 *
 * @param {Object} config
 * @param {function} config.app Hyperapp's app() function.
 * @param {Object|Hyperapp.Action} config.init Any valid input for the Hyperapp
 *      `app()` function argument's `init` property, e.g. an object, an Action
 *      function, or anything that can be returned by an Action function.
 * @param {Hyperapp.View} config.view Hyperapp view function that composes the
 *      component's DOM structure.
 * @param {Hyperapp.Subscriptions} [config.subscriptions] Hyperapp subscriptions
 *      function.
 * @param {Hyperapp.DispatchFn} [config.dispatch] Hyperapp dispatch initialiser
 *      function - akin to middleware that wraps `dispatch`.
 *
 * @param {Object[]} [config.exposedConfig] Array of config objects (optional):
 * @param {string} [config.exposedConfig[].attrName] HTML attribute name
 *      (optional).
 * @param {string} [config.exposedConfig[].propName] Javascript Element property
 *      name.
 * @param {Hyperapp.Action} [config.exposedConfig[].setter] Hyperapp Action
 *      function that controls whether/how the state will change when the HTML
 *      attribute valueor the CustomElement property value is changed by the
 *      consuming app.If the HTML attribute does not need a value, e.g.
 *      `<tag-name disabled>`, i.e. its mere presence is a flag, then when it is
 *      setter action will be called with `{[attrName]: ''}`. When removed from
 *      added to the tag, the setter action will be called with
 *      `{[attrName]: null}`. This means that any value except `null` indicates
 *      the presence of the flag. Optional.
 * @param {function(Object):*} [config.exposedConfig[].getter] A function that
 *      takes the state as an argument and returns the value of the attribute or
 *      property. This allows the exposed properties to be named differently
 *      from internal properties, or to be based on a combination of multiple
 *      internal properties. Optional.
 * @param {string} [config.exposedConfig[].eventType] When the attribute and/or
 *      property is an on<event>, this signifies the name of the event that
 *      needs to be listened to, i.e. that will be dispatched by an
 *      Action/Effect when something meaningful happens.
 *
 * @param {Object} [config.exposedMethods] Object that maps method names to
 *      Hyperapp Actions that change the state in the required ways. Optional.
 * @param {boolean} [config.useShadowDOM] Whether to use Shadow DOM. Default:
 *      true.
 * @param {HTMLElement} [parent] HTMLElement class to extend. Default:
 *      HTMLElement.
 * @returns {HTMLElement} a class that extends HTMLElement or a subclass of it.
 */
function generateClass({
  app,
  state, // Deprecated. Use init instead.
  init,
  view,
  subscriptions,
  dispatch,
  exposedConfig = [],
  exposedMethods = {},
  useShadowDOM = true,
  parent = HTMLElement,
}) {
  /**
   * Make it easy to look up exposed properties and attributes by generating
   * corresponding maps.
   * Assign default setters where necessary.
   */
  const [exposedProps, exposedAttrs] = (function generateMaps() {
    const props = new Map();
    const attrs = new Map();
    for (const cfg of exposedConfig) {
      if (cfg.propName) {
        props.set(cfg.propName, cfg);
      }
      if (cfg.attrName) {
        attrs.set(cfg.attrName.toLowerCase(), cfg);
      }
      if (typeof cfg.setter !== 'function') {
        cfg.setter = cfg.eventType ? generateOnEventSetter(cfg) : PatchState;
      }
    }
    return [props, attrs];
  })();

  /**
   * Create a subclass of HTMLElement.
   */
  class CustomElement extends parent {
    /**
     * The `dispatch` function is Hyperapp's method of invoking Actions that
     * change state. We will obtain and save a reference to it.
     *
     * @type {Hyperapp.Dispatch}
     * @private
     */
    //_dispatch;

    /**
     * For Light DOM components, stores the DocumentFragment created in the
     * constructor so that is can be appended to the DOM by the
     * connectedCallback.
     *
     * @type {DocumentFragment}
     * @private
     */
    //_fragment;

    /**
     * Initialises Hyperapp app.
     */
    constructor() {
      super();

      // One of the challenges here is that Hyperapp initialises and builds the
      // DOM structure in the same step. However, a CustomElement must not
      // create child nodes in its constructor (unless it uses Shadow DOM). See
      // https://html.spec.whatwg.org/#custom-element-conformance
      // The way around this is to build the DOM in a DocumentFragment, and
      // connect the fragment when the component later enters the DOM.
      const root = useShadowDOM
        ? this.attachShadow({ mode: 'open' })
        : (this._fragment = document.createDocumentFragment());

      // Before creating component's DOM, we need a trivial node that Hyperapp
      // can replace, such as <span>. Hyperapp always _replaces_ the node that
      // it is given to start with.
      const span = root.appendChild(document.createElement('span'));

      // Create a Hyperapp instance, which will render the view in the
      // shadow DOM or a DocumentFragment.
      if (state) {
        init = state;
        console.warn('Passing "state" is deprecated. Pass "init" instead');
      }

      // Configure our dispatch initialiser.
      const wrappedDispatch = this.wrapDispatch.bind(this);
      if (typeof dispatch === 'function') {
        // Consumer supplied dispatch initialiser. Hyperapp can accept only a
        // single dispatch initialiser, so we need to combine it with our own.
        dispatch = combineDispatchInitialisers(wrappedDispatch, dispatch);
      } else {
        dispatch = wrappedDispatch;
      }

      app({
        init,
        view,
        subscriptions,
        dispatch,
        node: span,
      });
    }

    /**
     * Called by the host (usually a browser) when the component enters the DOM.
     * For Light DOM components, appends the DocumentFragment to the DOM, which
     * is not allowed in the constructor. However, if this is an extension of a
     * native element, we should not be writing any DOM at all as the native
     * functionality takes care of that.
     */
    connectedCallback() {
      if (!useShadowDOM && parent === HTMLElement) {
        this.appendChild(this._fragment);
      }
    }

    /**
     * Cleans up when called by the host (usually a browser).
     */
    disconnectedCallback() {
      // Calling the dispatch function with no arguments is the official way to
      // halt the app and free its relevant resources.
      this._dispatch();
      this._dispatch = undefined;
      this._fragment = undefined;
    }

    /**
     * A dispatch initialiser that generates a wrapped version of Hyperapp's
     * dispatch function.
     *
     * As a result, all Actions and Effects that are dispatched are bound to the
     * CustomElement instance as `this`, and our internal `_state` property is
     * updated every time an Action changes the state.
     *
     * It is very useful for Actions and Effects dispatched by the component to
     * have a value of `this` that refers to the component. For example, without
     * this it would be challenging for components to dispatch events to their
     * consumers.
     *
     * In addition, every action can potentially update the state. We want to
     * know when this happens so that we can keep CustomElement properties and
     * HTML attributes synchronised.
     *
     * @param {function} dispatch
     * @returns {function} a modified dispatch function
     */
    wrapDispatch(dispatch) {
      /**
       * Binds an action to this element.
       * When used in conjunction with additional middleware that wraps actions
       * and effects, it copies the $isWrapped indicator from the unbound
       * function to the bound function. This can be used by the middleware to
       * prevent rewrapping wrapped functions.
       *
       * @param {Hyperapp.Action} action
       */
      const bindToThis = (action) => {
        const bound = action.bind(this);
        const isWrapped = action['$isWrapped'];
        if (isWrapped) {
          bound['$isWrapped'] = true;
        }
        return bound;
      };

      const newDispatch = (action, props) => {
        // In order to bind the Actions to the component, we need to identify
        // the actions in the various signatures of the dispatch function.
        // Also, we need to identify and capture changes of state.
        // 1. Direct invocation, e.g. from an Effect:
        //      dispatch(action, props)
        // 2. Invocation with an Action tuple returned by an Action:
        //      dispatch([action, props])
        // 3. Invocation with a state and Effect tuples returned by an Action:
        //      dispatch([state, [effect, props], [effect, props], ...])
        // 4. Invocation with just a state:
        //      dispatch(state)
        //
        // In cases 1 and 2, we need to bind the actions.
        // In case 3 we need to capture the new state, and bind all the effects.
        // In case 4, we just need to capture the state.

        let newState;
        if (typeof action === 'function') {
          // Signature 1.
          action = bindToThis(action);
        } else if (Array.isArray(action)) {
          if (typeof action[0] === 'function') {
            // Signature 2: the first element of the array is an action.
            action[0] = bindToThis(action[0]);
          } else {
            // Signature 3: the first element of the array is a new state.
            newState = action[0];
            // The remaining elements are Effect tuples.
            for (let i = 1; i < action.length; i++) {
              const tuple = action[i];
              tuple[0] = bindToThis(tuple[0]);
            }
          }
        } else {
          // Signature 4: it's just a new state (no Effects).
          newState = action;
        }

        // Capture the new state. We purposely do this before calling dispatch.
        // The call to dispatch returns only after all Effects have been
        // processed. If any of the Effects dispatches an event that is designed
        // to be listened to by the consuming application, the state of the
        // CustomElement will not otherwise reflect the new situation.
        if (newState !== undefined) {
          this._state = newState;
        }

        // Now call the original dispatch.
        // If the arguments match signature 3, this will just update the state
        // in Hyperapp.
        dispatch(action, props);

        // Any modification of the state may need to be synced to the HTML
        // attributes as well.
        if (newState !== undefined) {
          this.syncAttributes();
        }
      };

      // Save a reference to dispatch, so that we can call it whenever we want.
      this._dispatch = dispatch;

      return newDispatch; // Hyperapp will use this instead of the original.
    }

    /**
     * Dispatches a Hyperapp Action to change the state.
     * Afterwards, ensures that HTML attributes are brought into sync with the
     * new internal state.
     *
     * @param {Hyperapp.Action} action
     * @param {Object} props
     * @private
     */
    dispatchAction(action, props) {
      this._dispatch(action, props);
    }

    /**
     * Ensures that the top-level properties in the state are reflected in the
     * attributes where relevant.
     */
    syncAttributes() {
      for (const name in this._state) {
        if (exposedProps.has(name)) {
          // It's not an internal property. It might need to be synced to
          // an attribute.
          const cfg = exposedProps.get(name);
          if (cfg.attrName) {
            // Needs to be synced.
            this.syncAttribute(cfg, this._state[name]);
          }
        }
      }
    }

    /**
     * Syncs the state of an HTML attribute with its parallel CustomElement
     * property. Not to be used to set attribute values.
     *
     * @param {string} cfg property/attribute configuration object
     * @param {string} value value of the property
     * @private
     */
    syncAttribute(cfg, value) {
      // The standard browser behaviour is that an on<event> handler can be set
      // via an attribute, but if set via a property, the handler will not be
      // reflected into an attribute. This might be because the attribute
      // value, a string, is wrapped into a function before being stored
      // internally. Serialising this function and assigning it to the attribute
      // makes it look as if the attribute value has changed, and will cause
      // a stack overflow when the new value handled and starts the cycle again.
      if (cfg.eventType) return;

      const attrName = cfg.attrName;

      if (typeof value === 'boolean') {
        // If the property is a boolean with a value of `true`, the HTML
        // attribute is a flag and has no value. Setting its value to an empty
        // string achieves this. If its value is false, we need to remove the
        // HTML attribute.
        if (value) {
          this.setAttribute(attrName, '');
        } else {
          this.removeAttribute(attrName);
        }
      } else {
        // It's not a boolean.

        // If it is an empty string, undefined, null etc. the best way to
        // represent that is by removing the attribute. Otherwise, it would
        // either behave like a flag or have a string value of 'undefined' or
        // 'null'.
        if (value === undefined || value === null || value === '') {
          this.removeAttribute(attrName);
        } else {
          this.setAttribute(attrName, value);
        }
      }
    }

    /**
     * Returns a property value. This is called by automatically generated
     * property getters, and is not designed to be used directly.
     *
     * @param {string} propName
     * @returns {*} value of the named property.
     * @private
     */
    getProperty(propName) {
      // If a getter was supplied for this property, use it.
      const attr = exposedProps.get(propName);
      const getter = attr.getter || ((state) => state?.[propName]);

      return getter(this._state);
    }

    /**
     * Sets a property value. This is called by automatically generated
     * property setters, and is not designed to be used directly.
     *
     * @param {string} propName
     * @param {*} value
     * @private
     */
    setProperty(propName, value) {
      // If an action was supplied for setting this property, use it.
      const cfg = exposedProps.get(propName);
      const action = cfg.setter;

      // Hyperapp state is updated only by invoking an action:
      this.dispatchAction(action, { [propName]: value });
    }

    /**
     * Updates the Hyperapp state to reflect changes in any observed attribute.
     * Called by the host (usually a browser).
     *
     * @param {string} attrName
     * @param {string|number|undefined} oldVal
     * @param {string|number|undefined} newVal
     */
    attributeChangedCallback(attrName, oldVal, newVal) {
      // Don't waste time or handle re-entry.
      if (oldVal === newVal) return;

      // If an action was supplied for this attribute, use it.
      const cfg = exposedAttrs.get(attrName.toLowerCase());
      const action = cfg.setter;

      // Prefer propName to attrName when sending to action.
      const propName = cfg.propName || cfg.attrName;

      // If the attribute value is an empty string, the HTML attribute behaves
      // as if it is a boolean attribute. For boolean attributes we would
      // therefore set the internal value to true. However, we cannot be sure
      // that it's not a string attribute that just had its value changed to an
      // empty string. Therefore, we will examine the previous value to
      // confirm. A previous value of null that changes to an empty string (or
      // the other way around) is indicative of adding (or removing) a boolean
      // attribute. For boolean attributes, the only other value can be the name
      // of the attribute itself. See:
      // https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#boolean-attributes
      if (
        (newVal === '' && oldVal === null) ||
        (newVal === null && oldVal === '') ||
        (newVal === null && oldVal === attrName) ||
        (newVal === attrName && oldVal === null)
      ) {
        // It's a boolean attribute, so store a boolean value (not '' or null).
        newVal = !(newVal === null);
      }

      // Hyperapp state is updated only by invoking an action:
      this.dispatchAction(action, { [propName]: newVal });
    }

    /**
     * Implements the `observedAttributes` method of CustomElement.
     *
     * The CustomElement's observed attributes are those items in the
     * `exposedConfig` array that have a value specified for their `attrName`
     * property. The host (usually a browser) calls `attributeChangedCallback`
     * whenever something tries to change one of these HTML attributes.
     *
     * @returns {string[]} Array of attribute names.
     */
    static get observedAttributes() {
      return exposedAttrs.keys();
    }
  }

  /**
   * Updates a state object with provided changes.
   * This is a default that is used if a ChangeAttribute action was not
   * provided.
   *
   * @param {Object} state The current state of the Hyperapp app instance.
   * @param {Object} props The property/value pair(s) to overwrite.
   * @returns {Object} A new state object.
   */
  function PatchState(state, props) {
    return {
      ...state,
      ...props,
    };
  }

  /**
   * Returns a Hyperapp Action function that knows how to set the value of an
   * on<event> handler.
   *
   * @param {Object} config
   * @returns {Hyperapp.Action}
   */
  function generateOnEventSetter({ propName, attrName, eventType }) {
    return function SetOnEventHandler(state, props) {
      // Prefer property name over attribute name.
      const name = propName || attrName;

      // props will look like this: { onsomeevent: 'some javascript code'}
      let handler = props[name];

      // If the inline event handler is not a function, wrap it in one.
      // The attribute value will remain a string, but the internal property
      // value will be a function.
      if (handler && typeof handler !== 'function') {
        handler = new Function('event', handler);
        // Assign the function a name for logging purposes.
        Object.defineProperty(handler, 'name', { value: name });
      }

      // We need to know the previous value, so we can remove it as a listener.
      const oldHandler = state[name];

      // Add the new handler to the state.
      const newState = {
        ...state,
        [name]: handler,
      };

      // Configure an effect that will register the handler as a listener.
      const effect = [
        setOnEventListenerEffect,
        { eventType, oldVal: oldHandler, newVal: handler },
      ];

      return [newState, effect];
    };
  }

  /**
   * Generates the specified properties and adds them to the CustomElement's
   * class definition.
   */
  (function addProperties() {
    // TODO: use Object.defineProperties to do them all at once.
    exposedProps.forEach((cfg, name) => {
      const propAttribs = {
        configurable: false,
        enumerable: true,
        get() {
          return this.getProperty(name);
        },
        set(newValue) {
          this.setProperty(name, newValue);
        },
      };
      Object.defineProperty(CustomElement.prototype, name, propAttribs);
    });
  })();

  /**
   * Generates the specified methods and adds them to the CustomElement's class
   * definition.
   */
  (function addMethods() {
    for (const name in exposedMethods) {
      CustomElement.prototype[name] = function () {
        this.dispatchAction(exposedMethods[name]);
      };
    }
  })();

  return CustomElement;
}

/**
 * Provided for backward compatibility. Use `generateClass()` followed by
 * `customElements.define()` instead.
 *
 * @deprecated
 * @param {string} name
 * @param {Object} cfg See `generateClass`
 */
function define(name, cfg) {
  console.warn('"define()" is depracated. Use generateClass instead.');

  const cls = generateClass(cfg);

  customElements.define(name, cls);
}
