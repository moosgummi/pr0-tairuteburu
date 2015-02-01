
'use strict';

/**
 * Module dependencies
 */

var gui = require('nw.gui');
var guiWindow = gui.Window.get();

var fs = require('fs');
var os = require('os');
var path = require('path');

var ffmpeg = require('fluent-ffmpeg');

/**
 * Tairuteburu
 */

var Tairuteburu = function Tairuteburu() {

  this.config = {

    useBundledFfmpeg: false,

    binPath: path.join( process.cwd(), 'bin' ),
    platform: os.platform(),
    arch: os.arch(),

    outputExt: '.webm',
    threads: os.cpus().length,

    windowAddon: os.platform() === 'win32' ? 42 : 22,

    acceptedInput: [
      '.mp4',
      '.gif'
    ],

    video: {
      codec: 'libvpx',
      format: 'webm',
      constantRateFactor: '32',
      quality: 'best',
      lagInFrames: '16',
      maxWidth: 1052,
      maxDuration: 120,
      maxFileSize: 4,
    },

  };

  this.processingIsRunning = false;

  this.input = {
    path: '',
    ext: '',
    meta: ''
  };

  this.output = {
    path: ''
  };

  this.ffmpeg = '';

};

/**
 * Helpers
 */

Tairuteburu.prototype.getFfmpegPath = function() {

  var that = this;

  var ffmpegPath = path.join(
    that.config.binPath,
    that.config.platform,
    that.config.arch,
    ( that.config.platform === 'win32' ) ? 'ffmpeg.exe' : 'ffmpeg'
  );

  if ( !fs.existsSync(ffmpegPath) ) {
    throw new Error( 'Kauf dir \'nen neuen Rechner oder benutze kein Untermenschen Betriebssystem!' );
  }

  return ffmpegPath;

};

Tairuteburu.prototype.getFfprobePath = function() {

  var that = this;

  var ffprobePath = path.join(
    that.config.binPath,
    that.config.platform,
    that.config.arch,
    ( that.config.platform === 'win32' ) ? 'ffprobe.exe' : 'ffprobe'
  );

  if ( !fs.existsSync(ffprobePath) ) {
    throw new Error( 'Kauf dir \'nen neuen Rechner oder benutze kein Untermenschen Betriebssystem!' );
  }

  return ffprobePath;

};

/**
 * ffmpeg events / methods
 */

Tairuteburu.prototype.__ffmpegOnError = function() {

  var that = this;

  that.input = { path: '', meta: '' };
  that.output = { path: '' };

  $('#input').val('');
  $('#input').removeAttr('disabled');
  $('#process').attr('disabled','disabled');
  $('#kill').attr('disabled','disabled');
  $('#progress-video').fadeOut('fast');
  $('#progress-bar').fadeOut('fast', function() {
    guiWindow.height = 220 + that.config.windowAddon;
    $('#progress').css({ width: '0%' });
  });

};

Tairuteburu.prototype.__ffmpegOnProgress = function( progress ) {

  var that = this;

  that.processingIsRunning = true;
  $('#progress').css({ width: progress.percent + '%' });

};

Tairuteburu.prototype.__ffmpegOnEnd = function() {

  var that = this;
  var outputPath = that.output.path;

  that.input = { path: '', meta: '' };
  that.output = { path: '' };
  that.processingIsRunning = false;

  $('#progress').css({ width: '100%' });
  $('#process').attr('disabled','disabled');
  $('#kill').attr('disabled','disabled');
  $('#input').removeAttr('disabled');

  $('#input').val('');

  $('#progress-video').delay( 500 ).fadeOut('slow');
  $('#progress-bar').delay( 500 ).fadeOut('slow', function() {
    guiWindow.height = 220 + that.config.windowAddon;
    $('#progress').css({ width: '0%' });
    $('#done > h3').text( outputPath );
    $('#done').fadeIn('fast');
  });

};

Tairuteburu.prototype.__killFfmpeg = function() {

  var that = this;

  if ( !that.processingIsRunning ) {
    return;
  }

  that.ffmpeg.kill();

  that.processingIsRunning = false;

};

/**
 * Video processing
 */

Tairuteburu.prototype.getInputMeta = function( callback ) {

  if ( !callback ) {
    return;
  }

  var that = this;

  that.ffmpeg.ffprobe(function( err, probeData ) {

    if ( !!err ) {
      return callback( err );
    }

    var streams = probeData.streams.filter(function( stream ) {
      return stream.codec_type === 'video';
    });

    if ( streams.length === 0 ) {
      return callback( new Error('Untermenschlicher Input wird nicht akzeptiert!') );
    }

    return callback( null, streams[0] );

  });

};

Tairuteburu.prototype.getBitrate = function() {

  var that = this;

  var duration = parseInt( that.input.meta.duration );

  if ( isNaN(duration) ) {
    return 2024;
  }

  var bitrate = parseInt( 8192 * that.config.video.maxFileSize / duration );

  return bitrate;

};

Tairuteburu.prototype.getSize = function() {

  var that = this;

  var size = '1052x?';
  var inputWidth = parseInt( that.input.meta.width );

  if ( inputWidth < that.config.video.maxWidth ) {
    size = inputWidth.toString() + 'x?';
  }

  return size;


};

Tairuteburu.prototype.processVideo = function() {

  var that = this;

  that.ffmpeg = ffmpeg( that.input.path );

  if ( that.config.useBundledFfmpeg ) {
    that.ffmpeg
      .setFfmpegPath( that.getFfmpegPath() )
      .setFfprobePath( that.getFfprobePath() );
  }

  that.getInputMeta(function( err, meta ) {

    if ( !!err ) {
      throw err;
    }

    that.input.meta = meta;

    that.ffmpeg
      .noAudio()
      .videoCodec( that.config.video.codec )
      .videoBitrate( that.getBitrate() )
      .size( that.getSize() )
      .duration( that.config.video.maxDuration )
      .addOptions([
        '-crf ' + that.config.video.constantRateFactor,
        '-threads ' + that.config.threads,
        '-quality ' + that.config.video.quality,
        '-fs ' + that.config.video.maxFileSize * 1024 * 1024
      ])
      .format( that.config.video.format )
      .on('error', function() {
        that.__ffmpegOnError();
      })
      .on('progress', function( progress ) {
        that.__ffmpegOnProgress( progress );
      })
      .on('end', function() {
        that.__ffmpegOnEnd();
      })
      .output( that.output.path )
      .run();

  });

};

/**
 * UI Events
 */

Tairuteburu.prototype.__onInputChange = function( newValue ) {

  var that = this;

  if ( !newValue) {
    $('#process').attr('disabled','disabled');
    $('#kill').attr('disabled','disabled');
    return;
  }

  that.input.path = path.join( newValue );
  that.input.ext = path.extname( that.input.path );

  if ( that.config.acceptedInput.indexOf( that.input.ext ) === -1 ) {
    $('#process').attr('disabled','disabled');
    $('#kill').attr('disabled','disabled');
    $('#input').val('');
    return;
  }

  that.output.path = that.input.path.replace( that.input.ext, that.config.outputExt );

  $('#process').removeAttr('disabled');

};

Tairuteburu.prototype.__onProcessClick = function() {

  var that = this;

  guiWindow.height = 570 + that.config.windowAddon;

  $('#progress-video > video').get(0).play();

  $('#progress-bar').fadeIn();
  $('#progress-video').fadeIn();

  $('#kill').removeAttr('disabled');
  $('#process').attr('disabled','disabled');
  $('#input').attr('disabled','disabled');

  that.processVideo();

};

Tairuteburu.prototype.registerUIEvents = function() {

  var that = this;

  $( document ).on('change', '#input', function() {
    that.__onInputChange( this.value );
  });

  $( document ).on('click', '#process', that.__onProcessClick.bind(that) );

  $( document ).on('click', '#kill', function() {
    that.__killFfmpeg();
  });

  $( document ).on('click', '#done .close', function() {
    $('#done').fadeOut('fast');
  });

};

/**
 * Init
 */

Tairuteburu.prototype.init = function() {

  var that = this;

  that.registerUIEvents();

};
