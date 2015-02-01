
var NwBuilder = require('node-webkit-builder');
var gulp = require('gulp');
var gutil = require('gulp-util');

gulp.task('default', function() {

  var nw = new NwBuilder({
    version: '0.11.6',
    files: [ './**'],
    platforms: ['osx64','linux64','win64'] // change this to 'win' for/on windows
  });

  nw.on('log', function( msg ) {
    gutil.log( 'node-webkit-builder', msg );
  });

  return nw.build().catch(function( err ) {
    gutil.log( 'node-webkit-builder', err );
  });

});
