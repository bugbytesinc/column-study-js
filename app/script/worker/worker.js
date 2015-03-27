/* jshint worker: true */
(function(global){
  'use strict';
  importScripts('../traceur.js');
  var webLoader = global.System.get(global.System.version+'/src/runtime/webLoader').webLoader;
  new global.traceur.runtime.TraceurLoader(webLoader, location.href).import('run').catch(function(error){
    throw error;
  });
})(self);
