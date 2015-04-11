/*jshint laxcomma: true, smarttabs: true, node:true */
'use strict';
/**
 * A Resource for interacting with the Mongoose ODM for mongodb
 * @module tastypie/lib/resource/mongoose
 * @author Eric Satterwhite
 * @since 0.0.1
 * @requires util
 * @requires tastypie/lib/class
 * @requires tastypie/lib/class/options
 * @requires tastypie/lib/resource
 * @requires joi
 */

var util       = require( 'util' )
  , Class      = require( '../class' )
  , Options    = require( '../class/options' )
  , http       = require('../http')
  , object     = require('mout/object')
  , Resource   = require('./index')
  , joi        = require('joi')
  , Boom       = require('boom')
  , debug      = require('debug')('tastpie:resource:mongoose')
  , toArray    = require("mout/lang/toArray")
  , isFunction = require('mout/lang/isFunction')
  , isNumber   = require('mout/lang/isNumber')
  , typecast   = require('mout/string/typecast')
  , compact    = require('mout/array/map')
  , set        = require('mout/object/set')
  , merge      = require('mout/object/merge')
  , orderExp   = /^(\-)?([\w]+)/
  , SEP        = '__'
  , MongoResource
  , terms
  ;


function quickmap( array, mapFunction ){
	var arrayLen = array.length;
	 var newArray = new Array(arrayLen);
	 for(var i = 0; i < arrayLen; i++) {
	   newArray[i] = mapFunction(array[i], i, array);
	 }

	 return newArray;
};


terms = {
	'gt'          : '$gt'
  , 'gte'         : '$gte'
  , 'in'          : '$in'
  , 'lt'          : '$lt'
  , 'lte'         : '$lte'
  , 'ne'          : '$ne'
  , 'nin'         : '$nin'
  , 'regex'       : '$regex'
  , 'all'         : '$all'
  , 'size'        : '$size'
  , 'match'       : '$elemMatch'
  , 'contains'    : { key:'$regex', value: function( term ){ return new RegExp( term )}}
  , 'icontains'   : { key:'$regex', value: function( term ){ return new RegExp(term, 'i')}}
  , 'startswith'  : { key:'$regex', value: function( term ){ return new RegExp( '^' + term ) }}
  , 'istartswith' : { key:'$regex', value: function( term ){ return new RegExp( '^' + term, 'i' )}}
  , 'endswith'    : { key:'$regex', value: function( term ){ return new RegExp( term + '$' ) }}
  , 'iendswith'   : { key:'$regex', value: function( term ){ return new RegExp( term + '$', 'i') }}
}


function join( array, sep ){
	return quickmap( array, function( i ){
		return i.key ? i.key : i;
	}).join( sep )
}

/**
 * @constructor
 * @alias module:tastypie/lib/resource/mongoose
 * @extends module:tastypie/lib/resource
 * @mixes module:tastypie/lib/class/options
 * @param {Object} options
 */
module.exports = MongoResource = new Class({
	inherits:Resource
	,options:{
		queryset: null
		,pk:'_id'
		,objectTpl:null
		,max:1000
	}
	,constructor: function( options ){
		var instance;

		this.parent( 'constructor', options );
		joi.assert(this.options.queryset, joi.required(),'querset is required')

		instance = new this.options.queryset;
		this.options.objectTpl = this.options.objectTpl || instance.model;
		var paths = Object.keys( this.fields || instance.model.schema.paths );

		this.allowablepaths = paths.filter( function( p ){
			return ( p !== '_id' && p !== '__v');
		});

		instance = null;

	}
	, get_list: function get_list( bundle ){
		var query = new this.options.queryset();

		// TODO: execute the page before the list
		// paging is handled by mongo
		// and paginator is really for formatting
		// at this point.
		query.model.count(function(err, cnt ){
			this._get_list( bundle,function( e, objects ){
				var that = this
				  , paginator
				  , to_be_serialized
				  ;

				objects = objects || [];
				paginator = new this.options.paginator({
					limit:bundle.req.query.limit
					,req:bundle.req
					,res:bundle.res
					,collectionName:this.options.collection
					,objects:objects
					,count: cnt
					,offset: bundle.req.query.offset || 0
				});

				to_be_serialized = paginator.page();
				to_be_serialized[ that.options.collection ] = to_be_serialized[ that.options.collection ].map( function( item ){
					return that.full_dehydrate( item, bundle );
				});

				bundle.data = to_be_serialized;
				return that.respond( bundle );
			}.bind( this ));
		}.bind( this ))
	}
	, _get_list: function( bundle, callback ){
		var query = new this.options.queryset()
		   , filters = this.buildFilters( bundle.req.query )
		   ;

		query.where( filters );
		this.offset( query, bundle );
		this.limit( query, bundle );
		this.sort( query, bundle.req.query );
		query.exec( callback );
	}

	,limit: function limit( query, bundle ){
		var qs = bundle.req.query
		  , lmt
		  ;

		qs.limit = qs.hasOwnProperty( 'limit' )  ? parseInt( qs.limit, 10) : qs.limit;
		lmt = isNumber( qs.limit ) ? qs.limit : this.options.limit ? this.options.limit : 25;
		lmt = Math.min( lmt, this.options.max );
		query.limit( lmt );
		return lmt;
	}

	,offset: function offset( query, bundle ){
		var qs = bundle.req.query;
		query.skip( qs.offset || 0 )

	}
	,get_object: function get_object( bundle, callback ){
		var req= bundle.req


		var query = new this.options.queryset()
			query
				.model
				.findById( req.params.pk )
				.exec( callback )
	}

	, update_object: function update_object( bundle, callback ){
      var format = this.format( bundle, this.options.serializer.types );
  		var that = this;
      this.get_object( bundle, function( err, obj ){
        if( err || !obj ){
          if( err ){
            err.req = bundle.req;
            err.res = bundle.res;
            return this.emit('error',err)
          }
          bundle.data = {message:'not found',code:404};
          return that.respond(bundle,http.notFound );
        }


        this.deserialize( bundle.data, format, function( err, data ){
    			bundle = that.bundle(bundle.req, bundle.res, data )
    			merge(obj, data);
    			bundle.object = obj;

    			bundle = that.full_hydrate( bundle );
    			bundle.object.save(function(err, d ){
    				return callback && callback( err, bundle );
    			});
    		});
      }.bind(this));

	}

	, _patch_detail: function _patch_detail( bundle, callback ){}

	, delete_detail: function delete_detail( bundle ){
		var that = this;
		this._delete_detail(bundle, function( err, instance ){
			if( err ){
				err.req = bundle.req
				err.res = bundle.res
				return that.emit('error', err  )
			}

			if( !instance ){
				bundle.data = {message:'not found',code:404};
				return that.respond(bundle,http.notFound );
			}

			if(!that.options.returnData ){
				bundle.data = null;
				var response = http.noContent
				return that.respond( bundle, response )
			}

			bundle.object = instance;
			bundle.data = that.full_dehydrate( bundle.object, bundle );
			that.options.cache.set(bundle.toKey( 'detail') , null )
			return that.respond( bundle )
		});
	}

	, _delete_detail: function _delete_detail( bundle, callback ){
		var query = new this.options.queryset();
		query = query.model.findByIdAndRemove(bundle.req.params.pk);
		query.exec(callback);
		return this;
	}
	, _post_list: function( bundle, callback ){
		var format = this.format( bundle, this.options.serializer.types );
		var that = this;
		this.deserialize( bundle.data, format, function( err, data ){
			bundle = that.bundle(bundle.req, bundle.res, data )
			var obj = new that.options.objectTpl()
			merge(obj, data)
			bundle.object = obj

			bundle = that.full_hydrate( bundle )

			bundle.object.save(function(err, d ){
				return callback && callback( err, bundle )
			})
		})
	}

	,buildFilters: function buildFilters( qs ){
		var query = new this.options.queryset()
		  , remaining = {}
		  ;

		for( var key in qs ){
			var bits = key.split( SEP )
			   , filter = {}
			   , value
			   , fieldname
			   , filtertype
			   , last

			filtertype = null;
			value     = qs[key];
			fieldname = bits.shift();

			bits = quickmap(bits, function( bit ){
				if( terms.hasOwnProperty( bit ) ){
					return terms[ bit ];
				}
				return bit;
			});

			last = bits[ bits.length - 1 ];
			// should be defined on resource instance
			if( this.allowablepaths.indexOf( fieldname ) >=0 ){
				if( bits.length ){
					set( filter, join( bits, '__' ),  isFunction( last.value ) ? last.value( value ) : typecast( value ) )
				} else{
					filter = typecast( value );
				}
				remaining[ fieldname ] = filter;
			}
		}
		return remaining;
	}

	, sort: function sort( mquery, rquery ){
		var ordering = {};
		toArray( rquery.orderby ).forEach( function( param ){
			var bits = orderExp.exec( param );

			if( !bits ){
				return;
			}

			ordering[ bits[2] ] = bits[1] ? -1 : 1;
		});

		mquery.sort( ordering );
		return mquery;
	}
});

MongoResource.extend = function( proto ){
	proto.inherits = MongoResource;
	return new Class( proto )
}