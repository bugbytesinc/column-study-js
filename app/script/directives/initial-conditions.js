(function(){
  angular
    .module('ColumnStudy')
    .directive('csInitialConditions', csInitialConditionsFactory);

    csInitialConditionsFactory.$inject = ['$rootScope','initialConditions'];

    function csInitialConditionsFactory($rootScope,initialConditions){
      return {
        scope: {},
        link: link,
        templateUrl: 'script/directives/initial-conditions.html'
      };

      function link(scope){
        scope.config = initialConditions;
        scope.$watch('[initialConditionsForm.$pristine,initialConditionsForm.$valid]',onNewInitialConditions);
        function onNewInitialConditions(){
          if(!scope.initialConditionsForm.$pristine && scope.initialConditionsForm.$valid) {
            $rootScope.$broadcast('valid-initial-conditions',initialConditions);
            scope.initialConditionsForm.$setPristine(true);
          }
        }
      }
    }
})();
