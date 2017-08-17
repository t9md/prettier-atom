console.time('load prettier-pkg');
const config = require('./config-schema.json');
// eslint-disable-next-line import/no-extraneous-dependencies, import/no-unresolved
const { CompositeDisposable } = require('atom');
const { createStatusTile, updateStatusTile, updateStatusTileScope, disposeTooltip } = require('./statusTile');

// local helpers
let linterInterface;
let subscriptions;
let statusBarHandler;
let statusBarTile;
let tileElement;

// HACK: lazy load most of the code we need for performance
const lazy = {
  get format() {
    // eslint-disable-next-line  global-require, no-underscore-dangle
    const format = this.__format || (this.__format = require('./manualFormat'));

    const editor = atom.workspace.getActiveTextEditor();
    if (editor) format(editor);
  },
  get formatOnSave() {
    // eslint-disable-next-line  global-require, no-underscore-dangle
    return this.__formatOnSave || (this.__formatOnSave = require('./formatOnSave'));
  },
  get warnAboutLinterEslintFixOnSave() {
    return (
      // eslint-disable-next-line no-underscore-dangle
      this.__warnAboutLinterEslintFixOnSave ||
      // eslint-disable-next-line  global-require, no-underscore-dangle
      (this.__warnAboutLinterEslintFixOnSave = require('./warnAboutLinterEslintFixOnSave'))
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
};

const attachStatusTile = () => {
  if (statusBarHandler) {
    tileElement = createStatusTile();
    statusBarTile = statusBarHandler.addLeftTile({
      item: tileElement,
      priority: 1000,
    });
    updateStatusTile(subscriptions, tileElement);

    subscriptions.add(
      atom.config.observe('prettier-atom.formatOnSaveOptions.enabled', () =>
        updateStatusTile(subscriptions, tileElement),
      ),
      // onDidChangeActiveTextEditor is only available in Atom 1.18.0+.
      atom.workspace.onDidChangeActiveTextEditor
        ? atom.workspace.onDidChangeActiveTextEditor(editor => updateStatusTileScope(tileElement, editor))
        : atom.workspace.onDidChangeActivePaneItem(() =>
          updateStatusTileScope(tileElement, atom.workspace.getActiveTextEditor()),
        ),
    );
  }
};

const detachStatusTile = () => {
  disposeTooltip();
  if (statusBarTile) {
    statusBarTile.destroy();
  }
};

const loadPackageDeps = () =>
  // eslint-disable-next-line global-require
  require('atom-package-deps')
    .install('prettier-atom')
    // eslint-disable-next-line no-console
    .then(() => console.log('All dependencies installed, good to go'));

// public API
const activate = () => {
  console.time('activate prettier');
  console.time('load pkg-deps');
  loadPackageDeps();
  console.timeEnd('load pkg-deps');

  subscriptions = new CompositeDisposable();
  subscriptions.add(
    atom.commands.add('atom-workspace', {
      'prettier:format': () => lazy.format(),
      'prettier:debug': () => lazy.displayDebugInfo(),
      'prettier:toggle-format-on-save': () => lazy.toggleFormatOnSave(),
    }),
    atom.workspace.observeTextEditors(editor =>
      subscriptions.add(editor.getBuffer().onWillSave(() => lazy.formatOnSave(editor))),
    ),
    atom.config.observe('linter-eslint.fixOnSave', () => lazy.warnAboutLinterEslintFixOnSave()),
    atom.config.observe('prettier-atom.useEslint', () => lazy.warnAboutLinterEslintFixOnSave()),
    atom.config.observe(
      'prettier-atom.formatOnSaveOptions.showInStatusBar',
      show => (show ? attachStatusTile() : detachStatusTile()),
    ),
  );

  // HACK: an Atom bug seems to be causing old configuration settings to linger for some users
  //       https://github.com/prettier/prettier-atom/issues/72
  atom.config.unset('prettier-atom.singleQuote');
  atom.config.unset('prettier-atom.trailingComma');
  console.timeEnd('activate prettier');
};

const deactivate = () => {
  subscriptions.dispose();
  detachStatusTile();
};

const consumeStatusBar = (statusBar) => {
  statusBarHandler = statusBar;

  const showInStatusBar = atom.config.get('prettier-atom.formatOnSaveOptions.showInStatusBar');
  if (showInStatusBar) {
    attachStatusTile();
  }
};

const consumeIndie = (registerIndie) => {
  const linter = registerIndie({ name: 'Prettier' });
  if (!linterInterface) {
    // eslint-disable-next-line global-require
    linterInterface = require('./linterInterface');
  }

  linterInterface.set(linter);

  // Setting and clearing messages per filePath
  subscriptions.add(
    linter,
    atom.workspace.observeTextEditors((textEditor) => {
      const editorPath = textEditor.getPath();
      if (!editorPath) {
        return;
      }

      const subscription = textEditor.onDidDestroy(() => {
        subscriptions.remove(subscription);
        linter.setMessages(editorPath, []);
        linterInterface.set(null);
      });
      subscriptions.add(subscription);
    }),
  );
};

module.exports = {
  activate,
  deactivate,
  config,
  subscriptions,
  consumeStatusBar,
  consumeIndie,
};
console.timeEnd('load prettier-pkg');
