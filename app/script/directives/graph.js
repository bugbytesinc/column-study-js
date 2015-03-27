(function(){
  angular
    .module('ColumnStudy')
    .directive('csGraph', drawingDirectiveFactory);

    var GRAPH_LEFT = 0;
    var GRAPH_TOP = 0;
    var GRAPH_RIGHT = 200;
    var GRAPH_BOTTOM = 200;

    drawingDirectiveFactory.$inject = ['numberFilter','initialConditions','simulation'];

    function drawingDirectiveFactory(numberFilter,initialConditions,simulation){
      return {
        scope: {},
        link: link,
        templateUrl: 'script/directives/graph.html'
      };

      function link(scope){
        scope.time = {
          index: -1,
          value: null,
          count: 0
        };
        scope.aqueous = null;
        scope.sorbed = null;
        scope.$watch('time.index',onTimeIndexChanged);
        scope.$watch(function(){return simulation.data.length;},onResultsUpdated);
        scope.$on('valid-initial-conditions', onNewInitialConditions);
        onNewInitialConditions();

        function onResultsUpdated(){
          scope.time.count = simulation.data.length;
          if(scope.time.index===-1 && simulation.data.length > 0 ){
            scope.time.index = 0;
            scope.time.value = simulation.data[scope.time.index].time;
          } else if (scope.time.index > simulation.data.length ) {
            scope.time.index = (simulation.data.length||0)-1;
            scope.time.value = scope.time.index > -1 ? simulation.data[scope.time.index].time : null;
          }
        }
        function onTimeIndexChanged(){
          scope.time.value = scope.time.index > -1 ? simulation.data[scope.time.index].time : null;
          if(scope.time.index > -1){
            var Caq = simulation.data[scope.time.index].Caq;
            var Cs = simulation.data[scope.time.index].Cs;
            var xOrigin = scope.layout.left;
            var yOrigin = scope.layout.bottom;
            var dxMult = scope.layout.xScale;
            var dyMult = scope.layout.yScale;
            var dx = scope.layout.xCell;

            var aq = [];
            for(var i=0;i<Caq.length;i++){
              aq.push(xOrigin+dxMult*dx*i);
              aq.push(yOrigin+dyMult*[Caq[i]]);
              aq.push(xOrigin+dxMult*dx*(i+1));
              aq.push(yOrigin+dyMult*[Caq[i]]);
            }

            var s = [];
            for(i=0;i<Cs.length;i++){
              s.push(xOrigin+dxMult*dx*i);
              s.push(yOrigin+dyMult*[Cs[i]]);
              s.push(xOrigin+dxMult*dx*(i+1));
              s.push(yOrigin+dyMult*[Cs[i]]);
            }

            scope.aqueous = 'M ' + xOrigin + ' ' + yOrigin + ' L ' + aq.join(' ');
            scope.sorbed = 'M ' + xOrigin + ' ' + yOrigin + ' L ' + s.join(' ');
          } else {
            scope.aqueous = null;
            scope.sorbed = null;
          }
        }
        function onNewInitialConditions(){
          var ncx = Math.ceil(initialConditions.lenC / initialConditions.lenSoil) * 100;
          if(ncx === 0) {
            ncx = 1;
          }
          var dx = initialConditions.lenC / ncx ;
          var nx = Math.floor(initialConditions.lenSoil / dx) + 1;
          var dxMax = dx * nx;

          var maxCaq = (initialConditions.massC / initialConditions.lenC) / (initialConditions.rhoB * initialConditions.Kd + initialConditions.n); // (mg/l)
          var maxCs = initialConditions.Kd * maxCaq; // (mg/kg)
          var dyMax = maxCaq; // (mg/l) or (mg/kg)
          if( dyMax < maxCs ) {
            dyMax = maxCs; // (mg/l) or (mg/kg)
          }
          dyMax = 0.1*(Math.ceil(dyMax*10.0)); // (mg/l) or (mg/kg)

          var sz = calculateTextSize(numberFilter(dyMax,1));
          var tm = calculateTextSize('M');
          var textHeight = tm.height;
          var textWidth = tm.width;
          var xOrigin = GRAPH_LEFT + sz.width + textWidth;
          var yOrigin = GRAPH_BOTTOM - 3 * textHeight;
          var xTextOrigin = GRAPH_LEFT + sz.width + textWidth / 3;
          var yTextOrigin = GRAPH_BOTTOM - 7 * textHeight / 5;
          var graphWidth = (GRAPH_RIGHT - GRAPH_LEFT) - sz.width - 2 * textWidth;
          var graphHeight = (GRAPH_BOTTOM - GRAPH_TOP) - 4.8 * textHeight;
          var dxMult = graphWidth / dxMax;
          var dyMult = 0.0 - graphHeight / dyMax;
          var dyLabel = Math.max(0.1,dyMax/(2*Math.floor(graphHeight/(3*textHeight/2)/2)));
          var yLabels = [];
          for(var y = 0; y <= dyMax; y += dyLabel ) {
            yLabels.push({
              x: xTextOrigin,
              y: yOrigin + (dyMult*y) + 0.3*textHeight,
              text: numberFilter(y,1)
            });
          }
          var dxLabel = Math.max(0.1,dxMax/(2*Math.floor(graphWidth/(1.5*(calculateTextSize(numberFilter(dxMax,1)).width))/2)));
          var xLabels = [];
          for(var x = 0; x <= dxMax; x += dxLabel ) {
            xLabels.push({
              x: xOrigin + dxMult*x,
              y: yTextOrigin,
              text: numberFilter(x,1)
            });
          }
          var yTicks = [];
          var yTickLeft = xOrigin - textWidth / 3;
          var yTickRight = xOrigin;
          var dyTick = dyLabel / 4.0;
          for(y = 0; y <= dyMax; y += dyTick ){
            yTicks.push(yOrigin+dyMult*y);
          }
          var xTicks = [];
          var xTickTop = yOrigin;
          var xTickBottom = yOrigin + textHeight/3;
          var dxTick = dxLabel / 2.0;
          for(x = 0; x <= dxMax; x += dxTick ){
            xTicks.push(xOrigin+dxMult*x);
          }

          scope.layout = {
            top: yOrigin - graphHeight,
            bottom: yOrigin,
            left: xOrigin,
            right: xOrigin + graphWidth,
            xScale: dxMult,
            yScale: dyMult,
            xCell: dx,
            yAxisLabelX: GRAPH_LEFT,
            yAxisLabelY: 0.8 * textHeight,
            yLabels: yLabels,
            yTickLeft: yTickLeft,
            yTickRight: yTickRight,
            yTicks: yTicks,
            xAxisLabelX: xOrigin + 0.5 * graphWidth,
            xAxisLabelY: yOrigin + 2.6 * textHeight,
            xLabels: xLabels,
            xTickTop: xTickTop,
            xTickBottom: xTickBottom,
            xTicks: xTicks,
            soluteLabelX: GRAPH_RIGHT,
            soluteLabelY: GRAPH_TOP + textHeight,
            sorbedLabelX: GRAPH_RIGHT,
            sorbedLabelY: GRAPH_TOP + 2 * textHeight
          };
          scope.time.index = -1;
          scope.time.value = null;
          scope.time.count = 0;
        }

        function calculateTextSize(value){
          var text  = document.createElementNS("http://www.w3.org/2000/svg", "text");
          text.setAttributeNS(null,"x",0);
          text.setAttributeNS(null,"y",0);
          text.setAttributeNS(null,"font-size","8px");
          text.appendChild(document.createTextNode(value));
          var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          svg.appendChild(text);
          document.documentElement.appendChild(svg);
          var box = text.getBBox();
          var size = {
            width: box.width,
            height: box.height
          };
          document.documentElement.removeChild(svg);
          return size;
        }
      }
    }
})();
