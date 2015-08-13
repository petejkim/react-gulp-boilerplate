"use strict";

var gulp = require('gulp'),
    browserify = require('browserify'),
    watchify = require('watchify'),
    babelify = require('babelify'),
    source = require('vinyl-source-stream'),
    buffer = require('vinyl-buffer'),
    rename = require('gulp-rename'),
    uglify = require('gulp-uglify'),
    sass = require('gulp-sass'),
    sourcemaps = require('gulp-sourcemaps'),
    gutil = require('gulp-util'),
    chalk = require('chalk'),
    del = require('del');

var appJS = 'app/js/app.js',
    appCSS = 'app/css/app.sass';

gulp.task('default', ['clean-dev', 'js-dev', 'css-dev']);

gulp.task('dist', ['clean-dist', 'js-dist', 'css-dist']);

gulp.task('clean-dev', function(cb) {
  del(['build/dev'], cb);
});

gulp.task('clean-dist', function(cb) {
  del(['build/dist'], cb);
});

gulp.task('js-dev', function() {
  var dest = 'build/dev/js';

  del.sync([dest]);

  var w = watchify(browserify(appJS));

  var jsOptions = {
    dest: dest,
    sourcemaps: true,
    compress: false,
    bundler: w
  };

  buildJS(jsOptions);

  w.on('update', function () {
    gutil.log('Building JS...');
    buildJS(jsOptions);
  });
});

gulp.task('css-dev', function() {
  var dest = 'build/dev/css';

  del.sync([dest]);

  var cssOptions = {
    dest: dest,
    sourcemaps: true,
    compress: false
  };

  buildCSS(cssOptions);

  gulp.watch('app/css/**/*.sass').on('change', function() {
    gutil.log('Building CSS...');
    buildCSS(cssOptions);
  });
});

gulp.task('js-dist', function() {
  var dest = 'build/dist/js';

  del.sync([dest]);

  return buildJS({
    dest: dest,
    sourcemaps: false,
    compress: true,
    watch: false
  });
});

gulp.task('css-dist', function() {
  var dest = 'build/dist/css';

  del.sync([dest]);

  return buildCSS({
    dest: dest,
    sourcemaps: false,
    compress: true
  });
});

function buildJS(options) {
  options = merge({
    dest: 'build/dev',
    sourcemaps: true,
    compress: false,
    bundler: null
  }, options || {});

  var js = options.bundler || browserify(appJS);

  js = js.transform(babelify)
    .bundle()
    .on('error', mapError)
    .pipe(source('app.js'))
    .pipe(buffer());

  if (options.compress) {
    js = js.pipe(rename('app.min.js'))
      .pipe(uglify());
  }

  js.pipe(gulp.dest(options.dest));

  if (options.sourcemaps) {
    js = js.pipe(sourcemaps.init({ loadMaps: true }))
      .pipe(sourcemaps.write('.'))
      .pipe(gulp.dest(options.dest));
  }

  return js;
}

function buildCSS(options) {
  options = merge({
    dest: 'build/dev',
    sourcemaps: true,
    compress: false
  }, options || {});

  var css = gulp.src(appCSS);

  if (options.sourcemaps) {
    css = css.pipe(sourcemaps.init());
  }

  css = css.pipe(sass({
    outputStyle: options.compress ? 'compressed' : 'nested'
  }));

  if (options.sourcemaps) {
    css = css.pipe(sourcemaps.write());
  }

  return css.pipe(gulp.dest(options.dest));
}

function mapError(err) {
  if (err.fileName) {
    // regular error
    gutil.log(chalk.red(err.name)
      + ': ' + chalk.yellow(err.fileName.replace(__dirname + '/app/js/', ''))
      + ': ' + 'Line ' + chalk.magenta(err.lineNumber)
      + ' & Column ' + chalk.magenta(err.columnNumber || err.column)
      + ': ' + chalk.blue(err.description));
  } else {
    // browserify error..
    gutil.log(chalk.red(err.name)
      + ': ' + chalk.yellow(err.message));
  }
  this.emit('end');
}

function merge(a, b) {
  var o = {};
  if (a && b) {
    Object.keys(a).forEach(function(k) {
      o[k] = a[k];
    });
    Object.keys(b).forEach(function(k) {
      o[k] = b[k];
    });
    return o;
  }
}