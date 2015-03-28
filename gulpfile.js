var gulp = require('gulp');

var jshint = require('gulp-jshint');
var csslint = require('gulp-csslint');
var sass = require('gulp-ruby-sass');
var autoprefixer = require('gulp-autoprefixer');
var minifycss = require('gulp-minify-css');
var minifyhtml = require('gulp-minify-html');
var connect = require('gulp-connect');
var inject = require('gulp-inject');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var ignore = require('gulp-ignore');
var angularFileSort = require('gulp-angular-filesort');
var templateCache = require('gulp-angular-templatecache');

var del = require('del');
var eventStream = require('event-stream');

gulp.task('clean',function(cb){
  del(['build','.sass-cache'],cb);
});

gulp.task('js', function() {
  return gulp.src('app/script/**/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('default'))
    .pipe(connect.reload());
});

gulp.task('sass', function() {
  return gulp.src('app/scss/*.scss')
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
    .pipe(connect.reload());
});

gulp.task('lib', function(){
      return gulp.src([
          'node_modules/angular/angular.js',
          'node_modules/gulp-traceur/node_modules/traceur/bin/traceur.js'])
        .pipe(gulp.dest('build/dev/script'));
});

gulp.task('connect', ['lib'], function(){
  return connect.server({
    root: [ 'app', 'build/dev' ],
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
      gulp.src(['node_modules/gulp-traceur/node_modules/traceur/bin/traceur.js']),
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
  var workerFiles = gulp.src('app/script/worker/*.js')
      .pipe(jshint())
      .pipe(jshint.reporter('default'))
      .pipe(gulp.dest('build/dist/script/worker'));
  var cssFiles = eventStream.merge(
      gulp.src('app/scss/*.scss')
        .pipe(sass({ style: 'expanded' }))
        .pipe(autoprefixer('last 2 version', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1'))
        .pipe(ignore.exclude('*.map'))
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

gulp.task('default', ['js', 'sass', 'connect', 'watch']);
