(function(){
  angular
    .module('ColumnStudy')
    .factory('simulation', simulationFactory);

    simulationFactory.$inject = ['$rootScope','initialConditions'];

    function simulationFactory($rootScope,initialConditions){

      var worker = null;
      var simulation = {
        error: null,
        data: []
      };

      $rootScope.$on('valid-initial-conditions', restart);
      restart();

      return simulation;

      function restart(){
        if(worker){
          worker.removeEventListener('message',onReady);
          worker.removeEventListener('error',onError);
          worker.terminate();
          simulation.error = null;
          simulation.data = [];
        }
        worker = new Worker('script/worker/worker.js');
        worker.addEventListener('message',onReady);
        worker.addEventListener('error',onError);
      }

      function onReady(){
        worker.removeEventListener('message',onReady);
        worker.addEventListener('message',onData);
        worker.postMessage(initialConditions);
      }

      function onData(event){
        $rootScope.$apply(function(){
          simulation.data.push(event.data);
        });
      }

      function onError(error){
        $rootScope.$apply(function(){
          simulation.error = error.message||error.toString();
          worker.terminate();
          worker = null;
        });
      }
    }
})();
