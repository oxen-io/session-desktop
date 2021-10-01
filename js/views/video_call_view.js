/* global React: false */
/* global ReactDOM: false */

const rootVideoElement = document.getElementById('video-call-root');

const { CallContainerView } = window.Signal.Components;

if (rootVideoElement) {
  ReactDOM.render(React.createElement(CallContainerView), rootVideoElement);
}
