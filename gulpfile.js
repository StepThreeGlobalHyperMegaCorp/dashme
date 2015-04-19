var gulp = require('gulp');
var gutil = require('gulp-util');
var less = require('gulp-less');
var autoprefixer = require('gulp-autoprefixer');
var coffee = require('gulp-coffee');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');

gulp.task('less', function() {
  return gulp.src([
    "client/less/*.less"
  ])
  .pipe(less())
  .pipe(autoprefixer("last 1 version", {cascade: true}))
  .pipe(gulp.dest('gen/css'));
});

gulp.task('coffeescript', function() {
  return gulp.src([
    // TODO: move this to client/coffee or something
    "client/js/*.coffee"
  ])
  .pipe(sourcemaps.init())
  .pipe(coffee().on('error', gutil.log))
  .pipe(uglify( { compress: { drop_console: true } }))
  .pipe(sourcemaps.write('./maps'))
  .pipe(gulp.dest('gen/js'));
});

gulp.task('clean', function() {
    /*return gulp.src("gen", { read: false })
      .pipe(rimraf());*/
});

gulp.task('watch', function() {
  gulp.watch(['client/less/*.less'], ['less']);
  gulp.watch(['client/js/*.coffee'], ['coffeescript']);
});

gulp.task('default', ['less', 'coffeescript']);
