/*
Copyright (c) 2015 BugBytes, Inc. http://www.bugbytes.com
Distributed under the MIT License.

A One dimensional finite difference saturated aquifer contaminant
fate and trasnport numerical model. Based on a master's thesis by Jason Fabritz.
http://www.bugbytes.com/jasonf/msthesis/index.html
*/
/* jshint esnext: true */
/* exported solve */
export function* solve(options) {

  // Calculation constants
  var m_fac = 2.9991716 ; // "Optimal" timestep factor

  // Simulation Input Parameters
  var m_bKinSorp; //As Boolean ' Flag denoting kinetic sorption (bool)
  var m_rhoB;     //As Double  ' Bulk Density (g/cm3)
  var m_Kd;       //As Double  ' Contaminint Partitioning Coefficient (l/kg)
  var m_n;        //As Double  ' Effective Water Porosity (none)
  var m_Q;        //As Double  ' Infiltration Rate (m3/m2-d)
  var m_alpha;    //As Double  ' Dispersitivity Coefficient (m)
  var m_LenC;     //As Double  ' Contaminant Depth (m)
  var m_LenSoil;  //As Double  ' Soil Depth (m)
  var m_MassC;    //As Double  ' Ammount of Contaminant (kg/m2)
  var m_alphaS;   //As Double  ' Mass Transfer rate for kinetic sorption (1/d)
  var m_ka;       //As Double  ' Aqueous Decay Coefficient
  var m_ks;       //As Double  ' Sorbed Decay Coefficient
  var m_end;      //As Double  ' Simulation Ending time

  // Intermediate Calculated Variables
  var m_maxCaq;  //As Double  ' Maximum Aqueous Concentration
  var m_maxCs;   //As Double  ' Maximum Sorbed Concentration
  var m_v;       //As Double  ' Pore water velocity
  var m_dx;      //As Double  ' Grid spacing
  var m_nx;      //As Long    ' Number of nodes
  var m_ncx;     //As Long    ' Number of Initially Contaminated Nodes
  var m_dt;      //As Double  ' Global timesep
  var m_ldt;     //As Double  ' Local Timestep
  var m_pdt;     //As Double  ' Printing Timestep
  var m_nlt;     //As Double  ' Number of local timesteps inside a global timestep
  var m_j1;      //As Double  ' Advection/Dispersion Flux Factor 1
  var m_j2;      //As Double  ' Advection/Dispersion Flux Factor 2
  var m_lambdaA; //As Double  ' 0.5*m_ldt*m_ka
  var m_lambdaS; //As Double  ' 0.5*m_ldt*m_ks
  var m_gamma;   //As Double

  // Current Simulation Data
  var m_dCurrTime; //As Double  ' Current Simulation Time
  var m_aCaq1;     //As Double  ' Array of Aqueous Concentrations - ARRAY
  var m_aCs1;      //As Double  ' Array of Sorbed Concentrations - ARRAY
  var m_aCaq2;     //As Double  ' Array of Aqueous Concentrations - ARRAY
  var m_aCs2;      //As Double  ' Array of Sorbed Concentrations - ARRAY
  var m_NextPTime; //As Double  ' The next printing time

  // The Finite Difference Solver Function,
  // one of 4 optimized functions chosen in CalcColumnConfig
  var CalcMovementAndDecay = null;

  SetSimulationConfiguration(options);
  CalcCoumnConfig();
  CalcInitalConditions( m_aCaq1, m_aCs1 );
  while( m_dCurrTime < m_end ) {
    if( m_dCurrTime >= m_NextPTime ) {
      yield {
        time: m_dCurrTime,
        Caq: m_aCaq1,
        Cs: m_aCs1
      };
      m_NextPTime = m_dCurrTime + m_pdt;
    }
    CalcMovementAndDecay( m_aCaq1, m_aCs1, m_aCaq2, m_aCs2 );
    m_dCurrTime = m_dCurrTime + m_dt;
    if( m_dCurrTime >= m_NextPTime ) {
      yield {
        time: m_dCurrTime,
        Caq: m_aCaq2,
        Cs: m_aCs2
      };
      m_NextPTime = m_dCurrTime + m_pdt;
    }
    CalcMovementAndDecay( m_aCaq2, m_aCs2, m_aCaq1, m_aCs1 );
    m_dCurrTime = m_dCurrTime + m_dt;
    CheckForCompletedSimulation();
  }
  return {
    time: m_dCurrTime,
    Caq: m_aCaq1,
    Cs: m_aCs1
  };

  function SetSimulationConfiguration( options ) {
    m_bKinSorp = GetPropertyOrDefault(options,'kinSorp',false); // Flag denoting kinetic sorption (bool)
    m_rhoB = GetPropertyOrDefault(options,'rhoB', 2.2);         // Bulk Density (g/cm3)
    m_Kd = GetPropertyOrDefault(options,'Kd', 0.38);            // Contaminint Partitioning Coefficient (l/kg)
    m_n = GetPropertyOrDefault(options,'n', 0.18);              // Effective Water Porosity (none)
    m_Q = GetPropertyOrDefault(options,'Q', 0.1);               // Infiltration Rate (m3/m2-d)
    m_alpha = GetPropertyOrDefault(options,'alpha', 0.1);       // Dispersitivity Coefficient (m)
    m_LenC = GetPropertyOrDefault(options,'lenC', 1);           // Contaminant Depth (m)
    m_LenSoil = GetPropertyOrDefault(options,'lenSoil', 5);     // Soil Depth (m)
    m_MassC = GetPropertyOrDefault(options,'massC', 1);         // Ammount of Contaminant (kg/m2)
    m_alphaS = GetPropertyOrDefault(options,'alphaS', 0.12);    // Mass Transfer rate for kinetic sorption (1/d)
    m_ka = GetPropertyOrDefault(options,'ka', 0.01);            // Aqueous Decay Coefficient
    m_ks = GetPropertyOrDefault(options,'ks',0.01);             // Sorbed Decay Coefficient
  }

  function GetPropertyOrDefault( options, parameterName, defaultValue ){
    if(options.hasOwnProperty(parameterName)) {
      return options[parameterName];
    }
    return defaultValue;
  }

  function CalcCoumnConfig() {
    var r;       //As Double   ' Retardation factor ()
    var dttest;  //As Double   ' test dt (d)

    // If equilibrium Sorption Calculate Retardation Factor and
    // appropriate adjusted velocity.
    if( m_bKinSorp ) {
      m_v = m_Q / m_n;                         // (m/d)
    } else {
      r = 1 + m_rhoB * m_Kd / m_n;             // (none)
      m_v = m_Q / m_n / r;                     // (m/d)
    }

    // Calculate the mesh, target approximately 100 nodes
    // determine how many nodes are contaminated
    m_ncx = Math.ceil(m_LenC / m_LenSoil) * 100;          // (none)
    if( m_ncx === 0 ) {
      m_ncx = 1;                               // (none)
    }

    // Determine the grid spacing as a result of node spacing
    // determined by the contamination length
    m_dx = m_LenC / m_ncx;                     // (m)

    // Calculate the actual number of nodes (add one so output looks like expected)
    m_nx = Math.floor(m_LenSoil / m_dx) + 1;               // (none)

    // Calulate the calculation timestep in order to minimize numerical diffusion
    // (m_fac provides the "optimal" adjustment)
    m_dt = Math.sqrt((m_fac * m_fac * m_alpha * m_alpha / (m_v * m_v)) + (m_dx * m_dx / (m_v * m_v))) - m_fac * m_alpha / m_v; // (d)
    dttest = (m_dx - 2 * m_alpha) / m_v;       // (d)
    if( dttest > m_dt ) {
      m_dt = dttest;                           // (d)
    }

    // Calculate the local timestep limitation on reactions.
    if( m_alpha > 0.00001 ) {
      m_ldt = m_dt;
      m_nlt = 1;
    } else {
      m_ldt = 0.25 * m_dt;
      m_nlt = 4;
    }
    if( m_ka > 0 ) {
      while( m_ldt > 0.1 / m_ka ) {
         m_ldt = 0.5 * m_ldt;
         m_nlt = m_nlt + 1;
      }
    }
    if( m_ks > 0 ) {
      while( m_ldt > 0.1 / m_ks ) {
         m_ldt = 0.5 * m_ldt;
         m_nlt = m_nlt + 1;
      }
    }
    if( m_bKinSorp ) {
      while( m_ldt > 0.1 / m_alphaS ) {
         m_ldt = 0.5 * m_ldt;
         m_nlt = m_nlt + 1;
      }
    }

    // Calculate the printing timesep to be approximately 200 timesteps for one flushing
    // of the soil column
    m_pdt = 0.005 * m_LenSoil / m_v;

    // Calculate the advection/dispersion factors, they don't change, are static for ss flow.
    m_j1 = 0.5 * m_v * m_n - 0.5 * m_v * m_v * m_n * m_dt / m_dx - m_alpha * m_v * m_n / m_dx; // (m/d)
    m_j2 = m_v * m_n;  // (m/d)

    // Now add in the timestep, porosity and grid spacing to convert flux into a delta C for the node
    // divide by m_nlt because want flux in magnitude of local timesep, it is still calculated on the
    // global timestep though, but applied m_nlt times in one global timestep
    if( ( m_alpha > 0 ) && !m_bKinSorp ) {
      m_j1 = m_j1 * m_dt / (m_n * m_dx * m_nlt);
      m_j2 = m_j2 * m_dt / (m_n * m_dx * m_nlt);
    } else {
      m_j1 = m_j1 * m_dt / (m_n * m_dx);
      m_j2 = m_j2 * m_dt / (m_n * m_dx);
    }
    // Calculate the sorption/decay factors, they are static and porportional to concentrations
    m_lambdaA = 0.5 * m_ka * m_ldt;
    m_lambdaS = 0.5 * m_ks * m_ldt;
    m_gamma = 0.5 * m_alphaS * m_ldt;

    // Set the maximum ending time
    m_end = 1000;

    // Allocate Buffer Arrays
    m_aCaq1 = new Array(m_nx);
    m_aCs1  = new Array(m_nx);
    m_aCaq2 = new Array(m_nx);
    m_aCs2  = new Array(m_nx);

    // Determine which solver function should be used:
    // combination of equilibrium sorption and wether or
    // not dispersion is included in the model.
    if( m_bKinSorp ) {
      if( m_alpha > 0.00001 ) {
        CalcMovementAndDecay = CalcStepKinDisp;
      } else {
        CalcMovementAndDecay = CalcStepKinAdvect;
      }
    } else {
      if( m_alpha > 0.00001 ) {
        CalcMovementAndDecay = CalcStepEquiDisp;
      } else {
        CalcMovementAndDecay = CalcStepEquiAdvect;
      }
    }
  }

  function CalcInitalConditions( Caq, Cs ) {

    var i;         //As Long     ' Counter Variable

    // Calculate the distribution of contaminant in contaminated nodes
    m_maxCaq = (m_MassC / m_LenC) / (m_rhoB * m_Kd + m_n); // (mg/l)
    m_maxCs = m_Kd * m_maxCaq;                             // (mg/kg)

    // Initalize the node values
    for( i = 0; i < m_ncx; i ++ ) {
      Caq[i] = m_maxCaq;             // (mg/l)
      Cs[i] = m_maxCs;               // (mg/kg)
    }

    for( i = m_ncx; i < m_nx; i ++ ) {
      Caq[i] = 0;                    // (mg/l)
      Cs[i] = 0;                     // (mg/kg)
    }

    // Set the inital time
    m_dCurrTime = 0;
    m_NextPTime = 0;
  }

  function CalcStepEquiDisp( Caq0, Cs0, CaqFinal, CsFinal ) {

    var ct; // As Long        ' Current Time index
    var cn; // As Long        ' Current node index
    var dCaq; // As Double    ' Change in Aqueous Concentration
    var dCs; //  As Double    ' Change in Sorbed Concentration
    var dCaqX; // As Double   ' Total Change in Aqueous Concentration
    var dCsX; //  As Double   ' Total Change in Sorbed Concentration
    var Caq; // As Double     ' Placeholder variable for aqueous concentration
    var Cs; //  As Double     ' Change in Sorbed Concentration
    var CaqF; // As Double    ' Placeholder variable for aqueous concentration
    var CsF; //  As Double    ' Placeholder variable for sorbed concentration
    var CaqFold; // As Double ' Placeholder variable for aqueous concentration
    var CsFold; // As Double  ' Placeholder variable for sorbed concentraiton
    var nx; // As Long        ' Number of nodes minus one

    nx = m_nx - 1;

    // first node is special
    Caq = Caq0[0];
    Cs = Cs0[0];
    dCaq = m_j1 * (Caq - Caq0[1]) - m_j2 * Caq;
    dCs = dCaq * m_Kd;
    CaqF = Caq;
    CsF = Cs;

    for(ct = 0; ct < m_nlt; ct ++ ) {
      do {
        CaqFold = CaqF;
        CsFold = CsF;
        CaqF = Caq - m_lambdaA * (Caq + CaqF) + dCaq;
        CsF = Cs - m_lambdaS * (Cs + CsF) + dCs;
        dCsX = (m_Kd * CaqF - CsF) / (1 + m_Kd * m_rhoB / m_n);
        dCaqX = -m_rhoB * dCsX / m_n;
        CaqF = CaqF + dCaqX;
        CsF = CsF + dCsX;
      } while( ( Math.abs(CaqF - CaqFold) > 0.0000001 ) || ( Math.abs(CsF - CsFold) > 0.0000001 ) );
      Caq = CaqF;
      Cs = CsF;
    }
    CaqFinal[0] = CaqF;
    CsFinal[0] = CsF;

    // Iterate through the body of the column
    for( cn = 1; cn < nx; cn ++ ) {
      Caq = Caq0[cn];
      Cs = Cs0[cn];
      dCaq = m_j1 * (2 * Caq - Caq0[cn - 1] - Caq0[cn + 1]) + m_j2 * (Caq0[cn - 1] - Caq);
      dCs = dCaq * m_Kd;
      CaqF = Caq;
      CsF = Cs;
      for( ct = 0; ct < m_nlt; ct ++ ) {
        do {
          CaqFold = CaqF;
          CsFold = CsF;
          CaqF = Caq - m_lambdaA * (Caq + CaqF) + dCaq;
          CsF = Cs - m_lambdaS * (Cs + CsF) + dCs;
          dCsX = (m_Kd * CaqF - CsF) / (1 + m_Kd * m_rhoB / m_n);
          dCaqX = -m_rhoB * dCsX / m_n;
          CaqF = CaqF + dCaqX;
          CsF = CsF + dCsX;
        } while( ( Math.abs(CaqF - CaqFold) > 0.000001 ) || ( Math.abs(CsF - CsFold) > 0.000001 ) );
        Caq = CaqF;
        Cs = CsF;
      }
      CaqFinal[cn] = CaqF;
      CsFinal[cn] = CsF;
    }

    // The last node is special
    Caq = Caq0[nx];
    Cs = Cs0[nx];
    dCaq = m_j1 * (Caq - Caq0[nx - 1]) + m_j2 * (Caq0[nx - 1] - Caq);
    dCs = dCaq * m_Kd;
    CaqF = Caq;
    CsF = Cs;
    for( ct = 0; ct < m_nlt; ct ++ ) {
      do {
        CaqFold = CaqF;
        CsFold = CsF;
        CaqF = Caq + -m_lambdaA * (Caq + CaqF) + dCaq;
        CsF = Cs + -m_lambdaS * (Cs + CsF) + dCs;
        dCsX = (m_Kd * CaqF - CsF) / (1 + m_Kd * m_rhoB / m_n);
        dCaqX = -m_rhoB * dCsX / m_n;
        CaqF = CaqF + dCaqX;
        CsF = CsF + dCsX;
      } while( ( Math.abs(CaqF - CaqFold) > 0.000001 ) || ( Math.abs(CsF - CsFold) > 0.000001 ) );
      Caq = CaqF;
      Cs = CsF;
    }
    CaqFinal[nx] = CaqF;
    CsFinal[nx] = CsF;
  }

  function CalcStepEquiAdvect( Caq0, Cs0, CaqFinal, CsFinal ) {

    var ct; // As Long        ' Current Time index
    var cn; // As Long        ' Current node index
    var dCaq; // As Double    ' Change in Aqueous Concentration
    var dCs; //  As Double    ' Change in Sorbed Concentration
    var dCaqX; // As Double   ' Total Change in Aqueous Concentration
    var dCsX; //  As Double   ' Total Change in Sorbed Concentration
    var Caq; // As Double     ' Placeholder variable for aqueous concentration
    var Cs; //  As Double     ' Change in Sorbed Concentration
    var CaqF; // As Double    ' Placeholder variable for aqueous concentration
    var CsF; //  As Double    ' Placeholder variable for sorbed concentration
    var CaqFold; // As Double ' Placeholder variable for aqueous concentration
    var CsFold; // As Double  ' Placeholder variable for sorbed concentraiton
    var nx; // As Long        ' Number of nodes minus one

    nx = m_nx - 1;

    // First node is special
    Caq = Caq0[0];
    Cs = Cs0[0];
    dCaq = m_j1 * (Caq - Caq0[1]) - m_j2 * Caq;
    dCs = dCaq * m_Kd;
    Caq = Caq + dCaq;
    Cs = Cs + dCs;
    CaqF = Caq;
    CsF = Cs;
    for(ct = 0; ct < m_nlt; ct ++ ) {
      do {
        CaqFold = CaqF;
        CsFold = CsF;
        CaqF = Caq - m_lambdaA * (Caq + CaqF);
        CsF = Cs - m_lambdaS * (Cs + CsF);
        dCsX = (m_Kd * CaqF - CsF) / (1 + m_Kd * m_rhoB / m_n);
        dCaqX = -m_rhoB * dCsX / m_n;
        CaqF = CaqF + dCaqX;
        CsF = CsF + dCsX;
      } while( ( Math.abs(CaqF - CaqFold) > 0.0000001 ) || ( Math.abs(CsF - CsFold) > 0.0000001 ) );
      Caq = CaqF;
      Cs = CsF;
    }
    CaqFinal[0] = CaqF;
    CsFinal[0] = CsF;

    // Iterate through the body of the column
    for( cn = 1; cn < nx; cn ++ ) {
      Caq = Caq0[cn];
      Cs = Cs0[cn];
      dCaq = m_j1 * (2 * Caq - Caq0[cn - 1] - Caq0[cn + 1]) + m_j2 * (Caq0[cn - 1] - Caq);
      dCs = dCaq * m_Kd;
      Caq = Caq + dCaq;
      Cs = Cs + dCs;
      CaqF = Caq;
      CsF = Cs;
      for( ct = 0; ct < m_nlt; ct ++ ) {
        do {
          CaqFold = CaqF;
          CsFold = CsF;
          CaqF = Caq - m_lambdaA * (Caq + CaqF);
          CsF = Cs - m_lambdaS * (Cs + CsF);
          dCsX = (m_Kd * CaqF - CsF) / (1 + m_Kd * m_rhoB / m_n);
          dCaqX = -m_rhoB * dCsX / m_n;
          CaqF = CaqF + dCaqX;
          CsF = CsF + dCsX;
        } while ( ( Math.abs(CaqF - CaqFold) > 0.000001 ) || ( Math.abs(CsF - CsFold) > 0.000001 ) );
        Caq = CaqF;
        Cs = CsF;
      }
      CaqFinal[cn] = CaqF;
      CsFinal[cn] = CsF;
    }

    // The last node is special
    Caq = Caq0[nx];
    Cs = Cs0[nx];
    dCaq = m_j1 * (Caq - Caq0[nx - 1]) + m_j2 * (Caq0[nx - 1] - Caq);
    dCs = dCaq * m_Kd;
    Caq = Caq + dCaq;
    Cs = Cs + dCs;
    CaqF = Caq;
    CsF = Cs;
    for( ct = 0; ct < m_nlt; ct ++ ) {
      do {
        CaqFold = CaqF;
        CsFold = CsF;
        CaqF = Caq + -m_lambdaA * (Caq + CaqF);
        CsF = Cs + -m_lambdaS * (Cs + CsF);
        dCsX = (m_Kd * CaqF - CsF) / (1 + m_Kd * m_rhoB / m_n);
        dCaqX = -m_rhoB * dCsX / m_n;
        CaqF = CaqF + dCaqX;
        CsF = CsF + dCsX;
      } while( ( Math.abs(CaqF - CaqFold) > 0.000001 ) || ( Math.abs(CsF - CsFold) > 0.000001 ) );
      Caq = CaqF;
      Cs = CsF;
    }
    CaqFinal[nx] = CaqF;
    CsFinal[nx] = CsF;
  }

  function CalcStepKinDisp( Caq0, Cs0, CaqFinal, CsFinal ) {

    var ct; // As Long        ' Current Time index
    var cn; // As Long        ' Current node index
    var dSorp; // As Double
    var dCaq; // As Double    ' Change in Aqueous Concentration
    var Caq; // As Double     ' Placeholder variable for aqueous concentration
    var Cs; //  As Double     ' Change in Sorbed Concentration
    var CaqF; // As Double    ' Placeholder variable for aqueous concentration
    var CsF; //  As Double    ' Placeholder variable for sorbed concentration
    var CaqFold; // As Double ' Placeholder variable for aqueous concentration
    var CsFold; // As Double  ' Placeholder variable for sorbed concentraiton
    var nx; // As Long        ' Number of nodes minus one

    nx = m_nx - 1;

    // first node is special
    Caq = Caq0[0];
    Cs = Cs0[0];
    dCaq = m_j1 * (Caq - Caq0[1]) - m_j2 * Caq;
    CaqF = Caq;
    CsF = Cs;
    for( ct = 0; ct < m_nlt; ct ++ ) {
      do {
        CaqFold = CaqF;
        CsFold = CsF;
        dSorp = m_gamma * (m_Kd * (Caq + CaqF) - (Cs + CsF));
        CaqF = Caq - m_lambdaA * (Caq + CaqF) + dCaq - m_rhoB * dSorp / m_n;
        CsF = Cs - m_lambdaS * (Cs + CsF) + dSorp;
      } while( ( Math.abs(CaqF - CaqFold) > 0.000001 ) || ( Math.abs(CsF - CsFold) > 0.000001 ) );
      Caq = CaqF;
      Cs = CsF;
    }
    CaqFinal[0] = CaqF;
    CsFinal[0] = CsF;

    // Iterate through the body of the column
    for( cn = 1; cn < nx; cn ++ ) {
      Caq = Caq0[cn];
      Cs = Cs0[cn];
      dCaq = m_j1 * (2 * Caq - Caq0[cn - 1] - Caq0[cn + 1]) + m_j2 * (Caq0[cn - 1] - Caq);
      CaqF = Caq;
      CsF = Cs;
      for( ct = 0; ct < m_nlt; ct ++ ) {
        do {
          CaqFold = CaqF;
          CsFold = CsF;
          dSorp = m_gamma * (m_Kd * (Caq + CaqF) - (Cs + CsF));
          CaqF = Caq - m_lambdaA * (Caq + CaqF) + dCaq - m_rhoB * dSorp / m_n;
          CsF = Cs - m_lambdaS * (Cs + CsF) + dSorp;
        } while( ( Math.abs(CaqF - CaqFold) > 0.000001 ) || ( Math.abs(CsF - CsFold) > 0.000001 ) );
        Caq = CaqF;
        Cs = CsF;
      }
      CaqFinal[cn] = CaqF;
      CsFinal[cn] = CsF;
    }

    // The last node is special
    Caq = Caq0[nx];
    Cs = Cs0[nx];
    dCaq = m_j1 * (Caq - Caq0[nx - 1]) + m_j2 * (Caq0[nx - 1] - Caq);
    CaqF = Caq;
    CsF = Cs;
    for( ct = 0; ct < m_nlt; ct ++ ) {
      do {
        CaqFold = CaqF;
        CsFold = CsF;
        dSorp = m_gamma * (m_Kd * (Caq + CaqF) - (Cs + CsF));
        CaqF = Caq - m_lambdaA * (Caq + CaqF) + dCaq - m_rhoB * dSorp / m_n;
        CsF = Cs - m_lambdaS * (Cs + CsF) + dSorp;
      } while ( ( Math.abs(CaqF - CaqFold) > 0.000001 ) || ( Math.abs(CsF - CsFold) > 0.000001 ) );
      Caq = CaqF;
      Cs = CsF;
    }
    CaqFinal[nx] = CaqF;
    CsFinal[nx] = CsF;
  }

  function CalcStepKinAdvect( Caq0, Cs0, CaqFinal, CsFinal ) {

    var ct; // As Long        ' Current Time index
    var cn; // As Long        ' Current node index
    var dSorp; // As Double
    var Caq; // As Double     ' Placeholder variable for aqueous concentration
    var Cs; //  As Double     ' Change in Sorbed Concentration
    var CaqF; // As Double    ' Placeholder variable for aqueous concentration
    var CsF; //  As Double    ' Placeholder variable for sorbed concentration
    var CaqFold; // As Double ' Placeholder variable for aqueous concentration
    var CsFold; // As Double  ' Placeholder variable for sorbed concentraiton
    var nx; // As Long        ' Number of nodes minus one

    nx = m_nx - 1;

    // First node is special
    Caq = Caq0[0];
    Cs = Cs0[0];
    Caq = Caq + m_j1 * (Caq - Caq0[1]) - m_j2 * Caq;
    CaqF = Caq;
    CsF = Cs;
    for( ct = 0; ct < m_nlt; ct ++ ) {
      do {
        CaqFold = CaqF;
        CsFold = CsF;
        dSorp = m_gamma * (m_Kd * (Caq + CaqF) - (Cs + CsF));
        CaqF = Caq - m_lambdaA * (Caq + CaqF) - m_rhoB * dSorp / m_n;
        CsF = Cs - m_lambdaS * (Cs + CsF) + dSorp;
      } while ( ( Math.abs(CaqF - CaqFold) > 0.000001 ) || ( Math.abs(CsF - CsFold) > 0.000001 ) );
      Caq = CaqF;
      Cs = CsF;
    }
    CaqFinal[0] = CaqF;
    CsFinal[0] = CsF;

    // Iterate through the body of the column
    for( cn = 1; cn < nx; cn ++ ) {
      Caq = Caq0[cn];
      Cs = Cs0[cn];
      Caq = Caq + m_j1 * (2 * Caq - Caq0[cn - 1] - Caq0[cn + 1]) + m_j2 * (Caq0[cn - 1] - Caq);
      CaqF = Caq;
      CsF = Cs;
      for( ct = 0; ct < m_nlt; ct ++ ) {
        do {
          CaqFold = CaqF;
          CsFold = CsF;
          dSorp = m_gamma * (m_Kd * (Caq + CaqF) - (Cs + CsF));
          CaqF = Caq - m_lambdaA * (Caq + CaqF) - m_rhoB * dSorp / m_n;
          CsF = Cs - m_lambdaS * (Cs + CsF) + dSorp;
        } while ( ( Math.abs(CaqF - CaqFold) > 0.000001 ) || ( Math.abs(CsF - CsFold) > 0.000001 ) );
        Caq = CaqF;
        Cs = CsF;
      }
      CaqFinal[cn] = CaqF;
      CsFinal[cn] = CsF;
    }

    // The last node is special
    Caq = Caq0[nx];
    Cs = Cs0[nx];
    Caq = Caq + m_j1 * (Caq - Caq0[nx - 1]) + m_j2 * (Caq0[nx - 1] - Caq);
    CaqF = Caq;
    CsF = Cs;
    for( ct = 0; ct < m_nlt; ct ++ ) {
      do {
        CaqFold = CaqF;
        CsFold = CsF;
        dSorp = m_gamma * (m_Kd * (Caq + CaqF) - (Cs + CsF));
        CaqF = Caq - m_lambdaA * (Caq + CaqF) - m_rhoB * dSorp / m_n;
        CsF = Cs - m_lambdaS * (Cs + CsF) + dSorp;
      } while ( ( Math.abs(CaqF - CaqFold) > 0.000001 ) || ( Math.abs(CsF - CsFold) > 0.000001 ) );
      Caq = CaqF;
      Cs = CsF;
    }
    CaqFinal[nx] = CaqF;
    CsFinal[nx] = CsF;
  }

  function CheckForCompletedSimulation( ) {
    for( var i = 0; i < m_nx; i ++ ) {
      if( (m_aCaq1[i] > m_maxCaq * 0.0001) || (m_aCs1[i] > m_maxCs * 0.0001) ) {
        // There is still contaminant enough to warrant
        // continuing the simulation
        return;
      }
    }
    // NO more contaminant in the column, set the ending time
    // to the current time and the simulation will end.
    m_end = m_dCurrTime;
  }
}
