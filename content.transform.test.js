'use strict';

const path = require( 'path' ),
   fs = require( 'fs' ),
   TMP = path.resolve( `${ __dirname }/tmp` ),
   shell = require( 'shelljs' ),
   test = require( 'ava' ),
   sinon = require( 'sinon' ),
   rewire = require( 'rewire' ),
   {exists} = require( 'maintenance' ),
   // ModuleError = require( 'module.error' ),
   mod = rewire( './index' ),
   {
      contentTransform,
   } = mod;

mod.__set__( 'log', { // disable logger
   red: _=>_,
});

test( `opts should contan 'content' option`, t => {

   const opts = {};
   const error = t.throws( _=> contentTransform( opts ));
   t.deepEqual( error.code, 'EMPTY_CONTENT' );
});


test( `option 'content' must to be a string`, async t => {

   const opts = { content: 1 };
   const error = t.throws( _=> contentTransform( opts ));
   t.deepEqual( error.code, 'NOT_VALID_CONTENT' );
});


test( `opts should contan 'transform' option`, t => {

   const opts = { content: 'text tex t ext ex test es text' };
   const error = t.throws( _=> contentTransform( opts ));
   t.deepEqual( error.code, 'EMPTY_TRANSFORM' );
});


test( `option 'transform' must to be a object or array`, async t => {

   const opts = {

      content: 'text tex t ext ex test es text',
      transform: 1,
   };

   const error = t.throws( _=> contentTransform( opts ));
   t.deepEqual( error.code, 'NOT_VALID_TRANSFORM' );
});


test( `'transform' object must contain 'find' and 'replace' properties`, async t => {

   const opts = {

      content: 'text tex t ext ex test es text',
      transform: {},
   };

   const error = t.throws( _=> contentTransform( opts ));
   t.deepEqual( error.code, 'NOT_VALID_FIND_REPLACE' );
});


test( `'transform' object options type`, async t => {

   const opts = {

      content: 'text tex t ext ex test es text',
      transform: {

         find: 1,
         replace: 'text',
      },
   };

   let error = t.throws( _=> contentTransform( opts ));
   t.deepEqual( error.code, 'NOT_VALID_FIND_REPLACE' );

   opts.transform.find = 'test';
   opts.transform.replace = 1;

   error = t.throws( _=> contentTransform( opts ));
   t.deepEqual( error.code, 'NOT_VALID_FIND_REPLACE' );

   opts.transform.find = 'test';
   opts.transform.replace = 'test';
   t.notThrows( _=> contentTransform( opts ));

   opts.transform.find = new RegExp();
   t.notThrows( _=> contentTransform( opts ));
});


test( `'transform' array must contain objects with 'find' and 'replace' properties`, async t => {

   const opts = {

      content: 'text tex t ext ex test es text',
      transform: [],
   };

   const error = t.throws( _=> contentTransform( opts ));
   t.deepEqual( error.code, 'NOT_VALID_FIND_REPLACE' );
});


test( `'transform' array options type`, async t => {

   const opts = {

      content: 'text tex t ext ex test es text',
      transform: [{

         find: 1,
         replace: 'text',
      }],
   };

   let error = t.throws( _=> contentTransform( opts ));
   t.deepEqual( error.code, 'NOT_VALID_FIND_REPLACE' );

   opts.transform[ 0 ].find = 'test';
   opts.transform[ 0 ].replace = 1;

   error = t.throws( _=> contentTransform( opts ));
   t.deepEqual( error.code, 'NOT_VALID_FIND_REPLACE' );

   opts.transform[ 0 ].find = 'test';
   opts.transform[ 0 ].replace = 'test';
   t.notThrows( _=> contentTransform( opts ));

   opts.transform[ 0 ].find = new RegExp();
   t.notThrows( _=> contentTransform( opts ));
});


test( `transform content`, async t => {

   const opts = {

      content: 'text abc z ext xyz test and text',
      transform: {

         find: 'abc',
         replace: 'cba',
      },
   };

   t.deepEqual( opts.content,              'text abc z ext xyz test and text' );
   t.deepEqual(  contentTransform( opts ), 'text cba z ext xyz test and text' );
   opts.transform = [{

      find: /test/g,
      replace: 'just',
   },{

      find: 'and',
      replace: 'not',
   }];
   t.deepEqual(  contentTransform( opts ), 'text abc z ext xyz just not text' );
});
