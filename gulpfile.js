var gulp = require('gulp');

var jshint = require('gulp-jshint');
var csslint = require('gulp-csslint');
var sass = require('gulp-ruby-sass');
var autoprefixer = require('gulp-autoprefixer');
var minifycss = require('gulp-minify-css');
var minifyhtml = require('gulp-minify-html');
var plumber = require('gulp-plumber');
var order = require('gulp-order');
var traceur = require('gulp-traceur');
var connect = require('gulp-connect');
var inject = require('gulp-inject');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var ignore = require('gulp-ignore');
var angularFileSort = require('gulp-angular-filesort');
var templateCache = require('gulp-angular-templatecache');

var del = require('del');
var eventStream = require('event-stream');

var plumberOptions = {
  handleError: function(err) {
    console.error(err);
    this.emit('end');
  }
}

gulp.task('clean',function(cb){
  del(['build','.sass-cache'],cb);
});

gulp.task('js', function() {
  var workerFiles = eventStream.merge(
      gulp.src(traceur.RUNTIME_PATH),
      gulp.src(['app/script/worker/solve.js','app/script/worker/run.js'])
        .pipe(plumber(plumberOptions))
        .pipe(jshint())
        .pipe(traceur({modules:'inline'})))
    .pipe(order([
      'traceur-runtime.js',
      'solve.js',
      'run.js']))
    .pipe(concat('worker.js'))
    .pipe(jshint.reporter('default'))
  var jsFiles = gulp.src(['app/script/**/*.js','!app/script/worker/*.js'])
    .pipe(plumber(plumberOptions))
    .pipe(jshint())
    .pipe(jshint.reporter('default'))
  return eventStream.merge(jsFiles,workerFiles)
    .pipe(gulp.dest('build/dev/script'))
    .pipe(connect.reload());
});

gulp.task('sass', function() {
  return gulp.src('app/scss/*.scss')
    .pipe(plumber(plumberOptions))
    .pipe(sass({ style: 'expanded' }))
    .pipe(ignore.exclude('*.map'))
    .pipe(autoprefixer('last 2 version', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1'))
    .pipe(csslint({
      'compatible-vendor-prefixes':false,
      'overqualified-elements':false,
      'box-sizing': false
    }))
    .pipe(csslint.reporter())
    .pipe(gulp.dest('build/dev/css'))
    .pipe(connect.reload());
});

gulp.task('html', function(){
  return gulp.src('app/**/*.html')
    .pipe(plumber(plumberOptions))
    .pipe(gulp.dest('build/dev/'))
    .pipe(connect.reload());
});

gulp.task('lib', function(){
      return gulp.src([
          'node_modules/angular/angular.js',
          traceur.RUNTIME_PATH])
        .pipe(gulp.dest('build/dev/script'));
});

gulp.task('connect', ['lib'], function(){
  return connect.server({
    root: [ 'build/dev' ],
    port: 8000,
    livereload: true
  });
});

// Watch Files For Changes
gulp.task('watch', function() {
    gulp.watch('app/script/**/*.js', ['js']);
    gulp.watch('app/scss/*.scss', ['sass']);
    gulp.watch('app/**/*.html', ['html']);
});

gulp.task('dist',function(){
  var jsFiles = eventStream.merge(
      gulp.src(['node_modules/angular/angular.min.js']),
      eventStream.merge(
        gulp.src(['app/script/directives/*.html'])
          .pipe(minifyhtml({empty:true}))
          .pipe(templateCache({
            module:'ColumnStudy',
            root:'script/directives'
          })),
        gulp.src(['app/script/**/*.js','!app/script/worker/*.js'])
          .pipe(jshint())
          .pipe(jshint.reporter('default'))
        ).pipe(angularFileSort())
        .pipe(concat('main.min.js'))
        .pipe(uglify())
    ).pipe(gulp.dest('build/dist/script'));
  var workerFiles = eventStream.merge(
      gulp.src(traceur.RUNTIME_PATH),
      gulp.src(['app/script/worker/solve.js','app/script/worker/run.js'])
        .pipe(jshint())
        .pipe(traceur({modules:'inline'})))
      .pipe(order([
        'traceur-runtime.js',
        'solve.js',
        'run.js']))
      .pipe(concat('worker.js'))
      .pipe(uglify())
      .pipe(jshint.reporter('default'))
      .pipe(gulp.dest('build/dist/script/'));
  var cssFiles = eventStream.merge(
      gulp.src('app/scss/*.scss')
        .pipe(sass({ style: 'expanded' }))
        .pipe(ignore.exclude('*.map'))
        .pipe(autoprefixer('last 2 version', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1'))
        .pipe(csslint({
          'compatible-vendor-prefixes':false,
          'overqualified-elements':false,
          'box-sizing': false
        }))
        .pipe(csslint.reporter())
        .pipe(minifycss())
    ).pipe(gulp.dest('build/dist/css'));
  var injected = inject(eventStream.merge(jsFiles,cssFiles),{ignorePath:'/build/dist/',relative:false,addRootSlash:false});
  return eventStream.merge(
    workerFiles,
    gulp.src('app/index.html')
      .pipe(injected)
      .pipe(minifyhtml({empty:true}))
      .pipe(gulp.dest('build/dist')));
});

gulp.task('connect-dist',['dist'],function(){
  return connect.server({
    root: ['build/dist'],
    port: 8000,
    livereload: false
  });
});

gulp.task('default', ['html', 'js', 'sass', 'connect', 'watch']);
