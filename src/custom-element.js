import { app } from 'hyperapp';
import { PatchStateAction } from './util';

/**
 * Creates a CustomElement that uses the Hyperapp microframework to define its
 * functionality. The resulting CustomElement is a standard Web Component that
 * can be consumed by any HTML/Javascript project -- it does not require
 * Hyperapp coding in order to use it.
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
 * @param {string} config.name Hyphenated tag name for the component.
 * @param {Object} config.state An object containing the component's default
 *      state.
 * @param {Hyperapp.View} config.view Hyperapp view function that composes the
 *      component's DOM structure.
 *
 * @param {Object[]} [attributes] Array of attribute objects (optional):
 * @param {string} attributes[].attrName HTML attribute name. Optional.
 * @param {string} attributes[].propName Javascript Element property name.
 * @param {Hyperapp.Action} attributes[].setter Hyperapp Action function that
 *      controls whether/how the state will change when the HTML attribute value
 *      or the CustomElement property value is changed by the consuming app.
 *      If the HTML attribute does not need a value, e.g. `<tag-name disabled>`,
 *      i.e. its mere presence is a flag, then when it is added to the tag the
 *      setter action will be called with `{[attrName]: ''}`. When removed from
 *      the tag, the setter action will be called with `{[attrName]: null}`.
 *      This means that any value except `null` indicates the presence of the
 *      flag. Optional.
 * @param {function(Object):*} attributes[].getter A function that takes the
 *      state as an argument and returns the value of the attribute or property.
 *      This allows the exposed properties to be named differently from internal
 *      properties, or to be based on a combination of multiple internal
 *      properties. Optional.
 *
 * @param {Object} [methods] Object that maps method names to Hyperapp Actions
 *      that change the state in the required ways. Optional.
 */
export function define({ name, state, view, attributes = [], methods = {} }) {
  /**
   * Create a subclass of HTMLElement.
   */
  class CustomElement extends HTMLElement {
    /**
     * The `dispatch` function is Hyperapp's method of invoking Actions that
     * change state. We will obtain and save a reference to it.
     *
     * @type {Hyperapp.Dispatch}
     * @private
     */
    _dispatch;

    constructor() {
      super();

      // Before creating component's DOM, we need a <span>. This is
      // because Hyperapp is not exepecting shadow DOM, and crashes.
      const shadowRoot = this.attachShadow({ mode: 'open' });
      const span = shadowRoot.appendChild(document.createElement('span'));

      // Record the initial state.
      this._state = state;

      // Create a Hyperapp instance, which will render the view in the
      // shadow DOM.
      app({
        init: state,
        view,
        middleware: this.wrapDispatch.bind(this),
        node: span,
      });
    }

    /**
     * Cleans up when called by the browser.
     */
    disconnectedCallback() {
      // TODO: use the value returned from app, which is a kill function.
      // See https://github.com/jorgebucaran/hyperapp/pull/873
      this._dispatch = undefined;
    }

    /**
     * Returns a wrapped version the Hyperapp dispatch function.
     * As a result, all Actions and Effects that are dispatched are bound to the
     * CustomElement instance as `this`, and our internal `_state` property is
     * updated every time an Action changes the state.
     *
     * It is very useful for Actions and Effects dispatched by the component to
     * have a value of `this` that refers to the component. For example, without
     * this it would be challenging for components to source events to their
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
      const newDispatch = (action, props) => {
        // In order to bind the Actions to the component, we need to identify
        // the actions in the various signatures of the dispatch function.
        // Also, we need to identify and capture changes of state.
        // 1. Direct invocation, e.g. from an Effect:
        //      dispatch(action, props)
        // 2. Invocation of an Action tuple returned by an Action:
        //      dispatch([action, props])
        // 3. Invocation of a state and optional Effect tuples returned by an
        //    Action:
        //      dispatch([state, [effect, props], [effect, props], ...])
        //
        // In cases 1 and 2, we need to bind the actions.
        // In case 3 we need to capture the new state, and bind all the effects.

        let newState;
        if (typeof action === 'function') {
          // Signature 1.
          action = action.bind(this);
        } else if (Array.isArray(action)) {
          if (typeof action[0] === 'function') {
            // Signature 2: the first element of the array is an action.
            action[0] = action[0].bind(this);
          } else {
            // Signature 3: the first element of the array is a new state.
            newState = action[0];
            // The remaining elements are Effect tuples.
            for (let i = 1; i < action.length; i++) {
              const tuple = action[i];
              tuple[0] = tuple[0].bind(this);
            }
          }
        } else {
          // Signature 3: it's just a new state (no Effects).
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
      };

      // Save a reference to dispatch, so that we can call it whenever we want.
      this._dispatch = dispatch;

      return newDispatch; // Hyperapp will use this instead of the original.
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
      const attr = this.getAttrConfigByPropertyName(propName);
      const getter = attr?.getter || ((state) => state?.[propName]);

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
      const attr = this.getAttrConfigByPropertyName(propName);
      const action = attr.setter || PatchStateAction;

      // Hyperapp state is updated only by invoking an action:
      this.dispatchAction(action, { [propName]: value });

      // If there is a parallel HTML attribute, sync it.
      if (attr.attrName) {
        this.syncAttribute(attr.attrName, propName);
      }
    }

    /**
     * Retrieves the attributes array entry that contains a specific property
     * name.
     *
     * @param {string} propName
     * @returns {Object}
     * @private
     */
    getAttrConfigByPropertyName(propName) {
      // TODO: optimise this by preparing a map of property names to configs.
      return attributes.find((item, index) => item.propName === propName);
    }

    /**
     * Retrieves the attributes array entry that contains a specific attribute.
     * name.
     *
     * @param {string} propName
     * @returns {Object}
     * @private
     */
    getAttrConfigByAttributeName(attrName) {
      return attributes.find(
        (item, index) => item.attrName?.toLowerCase() === attrName.toLowerCase()
      );
    }

    /**
     * Syncs the state of an HTML attribute with its parallel CustomElement
     * property. Not to be used to set attribute values.
     *
     * @param {string} attrName name of the HTML attribute
     * @param {string} propName name of the property
     * @private
     */
    syncAttribute(attrName, propName) {
      // If the property is a boolean with a value of `true`, the HTML
      // attribute is a flag and has no value. Setting its value to an empty
      // string achieves this. If its value is false, we need to remove the
      // HTML attribute.
      const value = this.getProperty(propName);
      if (typeof value === 'boolean') {
        if (value) {
          this.setAttribute(attrName, '');
        } else {
          this.removeAttribute(attrName);
        }
      } else {
        this.setAttribute(attrName, value);
      }
    }

    /**
     * Dispatches a Hyperapp Action to change the state.
     *
     * @param {Hyperapp.Action} action
     * @param {Object} props
     * @private
     */
    dispatchAction(action, props) {
      this._dispatch(action, props);
    }

    /**
     * Updates the Hyperapp state to reflect changes in any observed attribute.
     * Called by the host.
     *
     * @param {string} attrName
     * @param {string|number|undefined} oldVal
     * @param {string|number|undefined} newVal
     */
    attributeChangedCallback(attrName, oldVal, newVal) {
      if (oldVal === newVal) return;

      console.log('attributeChangedCallback', attrName, oldVal, newVal);

      // If an action was supplied for this attribute, use it.
      const attr = this.getAttrConfigByAttributeName(attrName);
      const action = attr.setter || PatchStateAction;

      // Prefer propName to attrName when sending to action.
      const propName = attr?.propName || attr.attrName;

      // Hyperapp state is updated only by invoking an action:
      this.dispatchAction(action, { [propName]: newVal });
    }

    /**
     * Implements the `observedAttributes` method of CustomElement.
     *
     * The CustomElement's observed attributes are those items in the
     * `attributes` array that have a value specified for their `attrName`
     * property. The browser calls `attributeChangedCallback` whenever something
     * tries to change one of these HTML attributes.
     *
     * @returns {string[]} Array of attribute names.
     */
    static get observedAttributes() {
      return attributes.reduce(function (observed, item) {
        return !!item.attrName ? observed.concat(item.attrName) : observed;
      }, []);
    }
  }

  /**
   * Generates the specified properties and adds them to the CustomElement's
   * class definition.
   */
  (function addProperties() {
    // TODO: use Object.defineProperties to do them all at once.
    attributes.forEach((item) => {
      const name = item.propName;
      if (name !== undefined) {
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
      }
    });
  })();

  /**
   * Generates the specified methods and adds them to the CustomElement's class
   * definition.
   */
  (function addMethods() {
    for (const name in methods) {
      CustomElement.prototype[name] = function () {
        this.dispatchAction(methods[name]);
      };
    }
  })();

  customElements.define(name, CustomElement);
}
