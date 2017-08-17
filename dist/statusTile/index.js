'use strict';

var createStatusTile = require('./createStatusTile');
var updateStatusTile = require('./updateStatusTile');
var updateStatusTileScope = require('./updateStatusTileScope');

var _require = require('./tooltip'),
    disposeTooltip = _require.disposeTooltip;

var statusBarTile = void 0;

// $FlowFixMe
var attachStatusTile = function attachStatusTile(statusBarHandler, subscriptions) {
  if (!statusBarHandler) return;
  var tileElement = createStatusTile();
  statusBarTile = statusBarHandler.addLeftTile({
    item: tileElement,
    priority: 1000
  });
  updateStatusTile(subscriptions, tileElement);

  subscriptions.add(
  // $FlowFixMe
  atom.config.observe('prettier-atom.formatOnSaveOptions.enabled', function () {
    return updateStatusTile(subscriptions, tileElement);
  }),
  // onDidChangeActiveTextEditor is only available in Atom 1.18.0+.
  atom.workspace.onDidChangeActiveTextEditor ? atom.workspace.onDidChangeActiveTextEditor(function (editor) {
    return updateStatusTileScope(tileElement, editor);
  }) : atom.workspace.onDidChangeActivePaneItem(function () {
    return updateStatusTileScope(tileElement, atom.workspace.getActiveTextEditor());
  }));
};

var detachStatusTile = function detachStatusTile() {
  disposeTooltip();
  if (statusBarTile) {
    statusBarTile.destroy();
  }
};

module.exports = {
  createStatusTile: createStatusTile,
  updateStatusTile: updateStatusTile,
  updateStatusTileScope: updateStatusTileScope,
  disposeTooltip: disposeTooltip,
  attachStatusTile: attachStatusTile,
  detachStatusTile: detachStatusTile
};