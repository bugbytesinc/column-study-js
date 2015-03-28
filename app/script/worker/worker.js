/* jshint worker: true */
(function(global){
  'use strict';
  importScripts('../traceur.js');
  var webLoader = global.System.get(global.System.version+'/src/runtime/webLoader.js').webLoader;
  new global.traceur.runtime.TraceurLoader(webLoader, global.location.href).import('run.js').catch(function(error){
    throw error;
  });
})(self);
