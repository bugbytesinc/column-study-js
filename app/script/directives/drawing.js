(function(){
  angular
    .module('ColumnStudy')
    .directive('csDrawing', drawingDirectiveFactory);

    var TOP = 10.0;
    var BOTTOM = 190.0;
    var LENGTH = 180.0;
    var THRESHOLD = 30.0;
    var TEXTMARGIN = 6.5;
    var BASELINEFACTOR = 3;

    drawingDirectiveFactory.$inject = ['numberFilter','initialConditions'];

    function drawingDirectiveFactory(numberFilter,initialConditions){
      return {
        scope: {},
        link: link,
        templateUrl: 'script/directives/drawing.html'
      };

      function link(scope){

        scope.$on('valid-initial-conditions', computeCoordinates);
        scope.drawing = {};
        computeCoordinates();

        function computeCoordinates(){
          var lenC = Math.max(0,initialConditions.lenC);
          var lenSoil = Math.max(0,initialConditions.lenSoil);
          var showContaminant = 1;
          var showClean = 1;
          var notToScale = 'translate(-20,-20)';
          var contaminantLength = 0.0;
          var cleanLength = 0.0;
          if( lenSoil <= lenC ) {
            contaminantLength = LENGTH;
            cleanLength = 0;
            showClean = 0;
          } else if( lenC <= 0.0) {
            contaminantLength = 0;
            cleanLength = LENGTH;
            showContaminant = 0;
          } else {
            contaminantLength = lenC/lenSoil*LENGTH;
            cleanLength = LENGTH - contaminantLength;
            if(contaminantLength < THRESHOLD ) {
              contaminantLength = THRESHOLD;
              cleanLength = LENGTH - THRESHOLD;
              notToScale = 'translate(81,170)';
            } else if(cleanLength < THRESHOLD ) {
              cleanLength = THRESHOLD;
              contaminantLength = LENGTH - THRESHOLD;
              notToScale = 'translate(81,'+(contaminantLength + TOP - 20)+')';
            }
          }
          var middle = contaminantLength + TOP;
          var top = TOP + 0.5 * (middle-TOP);
          var topUpperGap = top - TEXTMARGIN;
          var topLowerGap = top + TEXTMARGIN;
          var topBaseline = top + BASELINEFACTOR;
          var bottom = middle + 0.5 * (BOTTOM - middle);
          var bottomUpperGap = bottom - TEXTMARGIN;
          var bottomLowerGap = bottom + TEXTMARGIN;
          var bottomBaseline = bottom + BASELINEFACTOR;
          var topLabel = numberFilter(lenC,2);
          var bottomLabel = numberFilter(lenSoil-lenC,2);
          scope.drawing = {
            contaminant: contaminantLength,
            topLabel: topLabel,
            bottomLabel: bottomLabel,
            topUpperGap: topUpperGap,
            topLowerGap: topLowerGap,
            topBaseline: topBaseline,
            middle: middle,
            bottomUpperGap: bottomUpperGap,
            bottomLowerGap: bottomLowerGap,
            bottomBaseline: bottomBaseline,
            notToScale: notToScale,
            showContaminant: showContaminant,
            showClean: showClean
          };
        }
      }
    }
})();
