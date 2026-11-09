mergeInto(LibraryManager.library, {
  UngaBrowserEvent: function(pointer) {
    try { window.dispatchEvent(new CustomEvent('unga-game', {detail: JSON.parse(UTF8ToString(pointer))})); } catch(error) { console.error(error); }
  },
  UngaFlushSave: function() {
    if (typeof FS === 'undefined' || FS.ungaSyncing) return;
    FS.ungaSyncing = true;
    FS.syncfs(false, function(error) { FS.ungaSyncing = false; if(error) window.dispatchEvent(new CustomEvent('unga-save-error')); });
  }
});
