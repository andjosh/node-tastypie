var should = require('should')
var fields = require('../lib/fields')
var assert = require('assert');

describe("Api Fields", function(){
	describe("ArrayField", function(){
		var f = new fields.ArrayField();
		it("Should convert strings into to An Array", function(){
			var result = f.convert('Hello')

			assert.ok(Array.isArray( result ) )

			result = f.convert('Hello,world')
			assert.ok( Array.isArray( result ) )
			assert.equal( result[0], 'Hello')
			assert.equal( result[1], 'world')
		});

		it('should leave array values untouched', function(){
			var a = [1,2,3];
			var b = f.convert( a );

			assert.deepEqual( a, b )
		})
	})

	describe("BooleanField", function(){
		var f = new fields.BooleanField()
		describe('falsy values', function(){
			it('should convert empty strings to False', function(){
				var value =  f.convert('')
				assert.strictEqual( value, false);
			});

			it('should treat "0" as false', function(){
				var value = f.convert( '0' )
				assert.strictEqual( value, false)
			})
			it('should treat "false" as false', function(){
				var value = f.convert( 'false' )
				assert.strictEqual( value, false)
			})
		})
		describe('truthy values', function(){
			it('should convert strings with chars as true', function(){
				var value =  f.convert('a')
				assert.strictEqual( value, true );
			});

			it('should treat "1" as true', function(){
				var value = f.convert( '1' )
				assert.strictEqual( value, true );
			});

			it('should treat "true" as true', function(){
				var value = f.convert( 'true' )
				assert.strictEqual( value, true );
			})
		});

		describe('boolean values', function(){
			it('should convert strings with chars as true', function(){
				var value =  f.convert('a')
				assert.strictEqual( value, true );
			});

			it('should treat "1" as 1', function(){
				var value = f.convert( '1' );
				assert.strictEqual( value, true );
			})	
		})

	})
	describe('Datefield', function(){
		var f, now;
		before(function( done ){
			f = new fields.DateField();
			done()
		})

		describe('#convert',function(){
			it('should convert strings to dates', function(){
				var value = f.convert('2014-01-22')
				value.getFullYear().should.equal( 2014 )
				value.getMonth().should.equal(0)
				value.getDate().should.equal(22)
				value.getHours().should.equal(0)
				value.getMinutes().should.equal(0)
				value.getSeconds().should.equal(0)
			})
			
		});
	});

	describe('BooleanField', function(){
		var f;
		before(function(){
			f = new fields.BooleanField();
		});

		describe('#convert',function(){
			it('should convert string to boolean', function(){
				var value = f.convert('true');
				value.should.be.a.Boolean;
				value.should.equal( true );

				value = f.convert('false');
				value.should.be.a.Boolean;
				value.should.equal( false );

			});

			it('should convert numbers to boolean', function(){
				var value = f.convert(1);
				value.should.be.a.Boolean;
				value.should.equal( true );

				value = f.convert(0);
				value.should.be.a.Boolean;
				value.should.equal( false );
			});
		})
	});
	describe('ArrayField', function( ){
		var f;
		before( function( ){
			f = new fields.ArrayField();
		});
		describe('#convert', function( ){
			it('should convert single values to an array', function(){
				var value = f.convert( 1 );
				value.should.be.a.Array
			})

			it("should conver comma separate string values", function(){
				var value = f.convert('1, 2, 3');
				value.should.be.a.Array;
				value[0].should.be.String;
				value[0].should.equal('1');
			});

			it("should no convert array values", function(){
				var value = f.convert([1,2,3]);
				value.should.be.a.Array;
				value[0].should.be.Number;
				value[0].should.equal(1);
			});
		})
	})
})

