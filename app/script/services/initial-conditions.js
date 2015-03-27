(function(){
  angular
    .module('ColumnStudy')
    .factory('initialConditions', initialConditionsFactory);

    initialConditionsFactory.$inject = [];

    function initialConditionsFactory(){

      var initialConditions = {
        kinSorp: false,  // Flag denoting kinetic sorption (bool)
        rhoB: 2.2,       // Bulk Density (g/cm3)
        Kd: 0.38,        // Contaminint Partitioning Coefficient (l/kg)
        n: 0.18,         // Effective Water Porosity (none)
        Q: 0.1,          // Infiltration Rate (m3/m2-d)
        alpha: 0.1,      // Dispersitivity Coefficient (m)
        lenC: 1,         // Contaminant Depth (m)
        lenSoil: 5,      // Soil Depth (m)
        massC: 1,        // Ammount of Contaminant (kg/m2)
        alphaS: 0.12,    // Mass Transfer rate for kinetic sorption (1/d)
        ka: 0.01,        // Aqueous Decay Coefficient
        ks: 0.01         // Sorbed Decay Coefficient
      };

      return initialConditions;
    }
})();
