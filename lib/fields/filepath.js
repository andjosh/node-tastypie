/*jshint laxcomma: true, smarttabs: true, node: true*/
'use strict';
/**
 * A field that accepts and returns a simple path to a file
 * @module tastypie/fields/filepath
 * @author Eric Satterwhite
 * @since 0.5.0
 * requires urljoin
 * @requires tastypie/lib/class
 * @requires tastypie/lib/fields/api
 */

var os       = require( 'os' )
  , path     = require( 'path' )
  , urljoin  = require( 'urljoin' )
  , Class    = require( '../class' )
  , ApiField = require( './api' )
  , FilePathField
  ;

/**
 * @constructor
 * @alias module:tastypie/fields/filepath
 * @extends module:tastypie/fields.ApiField
 * @param {Object} options
 * @param {String} [options.root=os.tempDir()]
 * @param {String} [options.dir]
 */
FilePathField = new Class({
	inherits: ApiField
	,options:{
		root:os.tmpDir(),
		dir:'uploads'
	}

	, convert: function( value ){
		return urljoin( this.options.dir, path.basename( value ) );
	}
});
module.exports = FilePathField;