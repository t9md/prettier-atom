'use strict';

// console.time('load prettier-pkg');
var config = require('./config-schema.json');
// eslint-disable-next-line import/no-extraneous-dependencies, import/no-unresolved

var _require = require('atom'),
    CompositeDisposable = _require.CompositeDisposable;

// local helpers


var linterInterface = void 0;
var subscriptions = void 0;
var statusBarHandler = void 0;

// HACK: lazy load most of the code we need for performance
var lazy = {
  get format() {
    // eslint-disable-next-line  global-require, no-underscore-dangle
    var format = this.__format || (this.__format = require('./manualFormat'));

    return function () {
      var editor = atom.workspace.getActiveTextEditor();
      if (editor) format(editor);
    };
  },
  get formatOnSave() {
    // eslint-disable-next-line  global-require, no-underscore-dangle
    return this.__formatOnSave || (this.__formatOnSave = require('./formatOnSave'));
  },
  get warnAboutLinterEslintFixOnSave() {
    return (
      // eslint-disable-next-line no-underscore-dangle
      this.__warnAboutLinterEslintFixOnSave || (
      // eslint-disable-next-line  global-require, no-underscore-dangle
      this.__warnAboutLinterEslintFixOnSave = require('./warnAboutLinterEslintFixOnSave'))
    );
  },
  get displayDebugInfo() {
    // eslint-disable-next-line  global-require, no-underscore-dangle
    return this.__displayDebugInfo || (this.__displayDebugInfo = require('./displayDebugInfo'));
  },
  get toggleFormatOnSave() {
    return (
      // eslint-disable-next-line  global-require, no-underscore-dangle
      this.__toggleFormatOnSave || (this.__toggleFormatOnSave = require('./atomInterface').toggleFormatOnSave)
    );
  },
  get attachStatusTile() {
    var attachStatusTile =
    // eslint-disable-next-line  global-require, no-underscore-dangle
    this.__attachStatusTile || (this.__attachStatusTile = require('./statusTile').attachStatusTile);

    return function () {
      return attachStatusTile(statusBarHandler, subscriptions);
    };
  },
  get detachStatusTile() {
    // eslint-disable-next-line  global-require, no-underscore-dangle
    return this.__detachStatusTile || (this.__detachStatusTile = require('./statusTile').detachStatusTile);
  }
};

var loadPackageDeps = function loadPackageDeps() {
  return (
    // eslint-disable-next-line global-require
    require('atom-package-deps').install('prettier-atom')
    // eslint-disable-next-line no-console
    .then(function () {
      return console.log('All dependencies installed, good to go');
    })
  );
};

// public API
var activate = function activate() {
  // console.time('activate prettier');
  // console.time('load pkg-deps');
  loadPackageDeps();
  // console.timeEnd('load pkg-deps');

  subscriptions = new CompositeDisposable();
  subscriptions.add(atom.commands.add('atom-workspace', {
    'prettier:format': function prettierFormat() {
      return lazy.format();
    },
    'prettier:debug': function prettierDebug() {
      return lazy.displayDebugInfo();
    },
    'prettier:toggle-format-on-save': function prettierToggleFormatOnSave() {
      return lazy.toggleFormatOnSave();
    }
  }), atom.workspace.observeTextEditors(function (editor) {
    return subscriptions.add(editor.getBuffer().onWillSave(function () {
      return lazy.formatOnSave(editor);
    }));
  }), atom.config.observe('linter-eslint.fixOnSave', function (value) {
    return value && lazy.warnAboutLinterEslintFixOnSave();
  }), atom.config.observe('prettier-atom.useEslint', function (value) {
    return value && lazy.warnAboutLinterEslintFixOnSave();
  }), atom.config.observe('prettier-atom.formatOnSaveOptions.showInStatusBar', function (show) {
    if (show) {
      lazy.attachStatusTile();
      // eslint-disable-next-line no-underscore-dangle
    } else if (lazy.__attachStatusTile) {
      lazy.detachStatusTile();
    }
  }));

  // HACK: an Atom bug seems to be causing old configuration settings to linger for some users
  //       https://github.com/prettier/prettier-atom/issues/72
  atom.config.unset('prettier-atom.singleQuote');
  atom.config.unset('prettier-atom.trailingComma');
  // console.timeEnd('activate prettier');
  // console.log(Object.keys(lazy));
};

var deactivate = function deactivate() {
  subscriptions.dispose();
  lazy.detachStatusTile();
};

var consumeStatusBar = function consumeStatusBar(statusBar) {
  statusBarHandler = statusBar;

  var showInStatusBar = atom.config.get('prettier-atom.formatOnSaveOptions.showInStatusBar');
  if (showInStatusBar) {
    lazy.attachStatusTile();
  }
};

var consumeIndie = function consumeIndie(registerIndie) {
  var linter = registerIndie({ name: 'Prettier' });
  if (!linterInterface) {
    // eslint-disable-next-line global-require
    linterInterface = require('./linterInterface');
  }

  linterInterface.set(linter);

  // Setting and clearing messages per filePath
  subscriptions.add(linter, atom.workspace.observeTextEditors(function (textEditor) {
    var editorPath = textEditor.getPath();
    if (!editorPath) {
      return;
    }

    var subscription = textEditor.onDidDestroy(function () {
      subscriptions.remove(subscription);
      linter.setMessages(editorPath, []);
      linterInterface.set(null);
    });
    subscriptions.add(subscription);
  }));
};

module.exports = {
  activate: activate,
  deactivate: deactivate,
  config: config,
  subscriptions: subscriptions,
  consumeStatusBar: consumeStatusBar,
  consumeIndie: consumeIndie
};
// console.timeEnd('load prettier-pkg');