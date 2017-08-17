// @flow
const createStatusTile = require('./createStatusTile');
const updateStatusTile = require('./updateStatusTile');
const updateStatusTileScope = require('./updateStatusTileScope');
const { disposeTooltip } = require('./tooltip');

let statusBarTile;

// $FlowFixMe
const attachStatusTile = (statusBarHandler, subscriptions) => {
  if (!statusBarHandler) return;
  const tileElement = createStatusTile();
  statusBarTile = statusBarHandler.addLeftTile({
    item: tileElement,
    priority: 1000,
  });
  updateStatusTile(subscriptions, tileElement);

  subscriptions.add(
    // $FlowFixMe
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
};

const detachStatusTile = () => {
  disposeTooltip();
  if (statusBarTile) {
    statusBarTile.destroy();
  }
};

module.exports = {
  createStatusTile,
  updateStatusTile,
  updateStatusTileScope,
  disposeTooltip,
  attachStatusTile,
  detachStatusTile,
};
