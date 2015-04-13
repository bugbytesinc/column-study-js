# Column Study

Column Study is simple numerical model that simulates one-dimensional advection and dispersion of a reactive solute originating from a contaminant spill. It models the processes of transport, sorption and reaction in the aqueous and sorbed phases of a solute. Input parameters include the infiltration rate, amount and location of contaminant, soil bulk density, moisture content, longitudinal dispersivity and partition and reaction coefficients. It solves the resulting system of equations by using a forward finite difference advection/dispersion code coupled to a linearized reaction model by the operator
splitting method; much like the implementation of [BUGS Scratchpad](http://bugbytes.com/scratchpad/default.aspx). For more information regarding the numerical method behind the calculations made by Column study, please see [A Two Dimensional Numerical Model for Simulating the Movement and Biodegradation of Contaminants in a Saturated Aquifer](http://bugbytes.com/jasonf/msthesis/index.html)

## Software Development
Column Study runs as a single page web application inside modern web browsers. It is built leveraging a number of open source frameworks including [AngularJS](https://angularjs.org/), [Traceur](https://github.com/google/traceur-compiler), [Gulp](http://gulpjs.com/) and [Node.js](https://nodejs.org/).  It is a modern port of the original ColumnStudy program written in Visual Basic 4.0 over a decade ago.

### Development Environment Setup

If not already installed, install [Node.js](https://nodejs.org/).

Next, [Gulp](http://gulpjs.com/) must be installed globally:

```sh
$ npm install -g gulp
```

After that, clone the Column Study Repository and install the npm libaries:

```sh
$ git clone https://github.com/bugbytesinc/column-study-js.git columnstudy
$ cd columnstudy
$ npm install
```

If all goes well, you can start a development server within gulp (gulp-connect) with the default gulp task:

```sh
$ gulp
```

The above command starts a local server at http://localhost:8000

To produce a minified production version of the software, one that could be uploaded to a website, issue the dist command to gulp:


```sh
$ gulp dist
```

This will lint, transpile and minify the website files for produciton distribution.  For details of the process, please review the gulpfile.js configuration file.
