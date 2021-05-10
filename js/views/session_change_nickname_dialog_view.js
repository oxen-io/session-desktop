/* global Whisper */

// eslint-disable-next-line func-names
(function () {
  'use strict';

  window.Whisper = window.Whisper || {};

  Whisper.SessionNicknameDialog = Whisper.View.extend({
    className: 'loki-dialog session-nickname-wrapper',
    initialize(options) {
      this.props = {
        title: options.title,
        message: options.message,
        messageSub: options.messageSub,
        onClickOk: this.ok.bind(this),
        onClickClose: this.cancel.bind(this),
        resolve: options.resolve,
        reject: options.reject,
        okText: options.okText,
        cancelText: options.cancelText,
        okTheme: options.okTheme,
        closeTheme: options.closeTheme,
        hideCancel: options.hideCancel,
        sessionIcon: options.sessionIcon,
        iconSize: options.iconSize,
        convoId: options.convoId,
        placeholder: options.placeholder
      };
      this.render();
    },
    registerEvents() {
      this.unregisterEvents();
      document.addEventListener('keyup', this.props.onClickClose, false);
    },

    unregisterEvents() {
      document.removeEventListener('keyup', this.props.onClickClose, false);
      this.$('session-nickname-wrapper').remove();
    },
    render() {
      this.dialogView = new Whisper.ReactWrapperView({
        className: 'session-nickname-wrapper',
        Component: window.Signal.Components.SessionNicknameDialog,
        props: this.props,
      });

      this.$el.append(this.dialogView.el);
      return this;
    },

    close() {
      this.remove();
    },
    cancel() {
      this.$('.session-nickname-wrapper').remove();
      this.unregisterEvents();
      if (this.props.reject) {
        this.props.reject();
      }
    }, 
    ok() {
      this.$('.session-nickname-wrapper').remove();
      console.log('ok method called');
      this.unregisterEvents();

      if (this.props.resolve) {
        console.log('resolving nickname');
        this.props.resolve();
      }
    },
  });
})();