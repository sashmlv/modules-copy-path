'use strict';

const test = require( 'ava' ),
   rewire = require( 'rewire' ),
   mod = rewire( './index' ),
   {
      contentTransform,
   } = mod;

mod.__set__( 'log', { // disable logger
   red: _=>_,
});

test( `params should contan 'content' parameter`, t => {

   const params = {};
   const error = t.throws( _=> contentTransform( params ));
   t.deepEqual( error.code, 'EMPTY_CONTENT' );
});


test( `parameter 'content' must to be a string`, async t => {

   const params = { content: 1 };
   const error = t.throws( _=> contentTransform( params ));
   t.deepEqual( error.code, 'NOT_VALID_CONTENT' );
});


test( `params should contan 'transform' parameter`, t => {

   const params = { content: 'text tex t ext ex test es text' };
   const error = t.throws( _=> contentTransform( params ));
   t.deepEqual( error.code, 'EMPTY_TRANSFORM' );
});


test( `parameter 'transform' must to be a object or array`, async t => {

   const params = {

      content: 'text tex t ext ex test es text',
      transform: 1,
   };

   const error = t.throws( _=> contentTransform( params ));
   t.deepEqual( error.code, 'NOT_VALID_TRANSFORM' );
});


test( `'transform' object must contain 'find' and 'replace' properties`, async t => {

   const params = {

      content: 'text tex t ext ex test es text',
      transform: {},
   };

   const error = t.throws( _=> contentTransform( params ));
   t.deepEqual( error.code, 'NOT_VALID_FIND_REPLACE' );
});


test( `'transform' object parameters type`, async t => {

   const params = {

      content: 'text tex t ext ex test es text',
      transform: {

         find: 1,
         replace: 'text',
      },
   };

   let error = t.throws( _=> contentTransform( params ));
   t.deepEqual( error.code, 'NOT_VALID_FIND_REPLACE' );

   params.transform.find = 'test';
   params.transform.replace = 1;

   error = t.throws( _=> contentTransform( params ));
   t.deepEqual( error.code, 'NOT_VALID_FIND_REPLACE' );

   params.transform.find = 'test';
   params.transform.replace = 'test';
   t.notThrows( _=> contentTransform( params ));

   params.transform.find = new RegExp();
   t.notThrows( _=> contentTransform( params ));
});


test( `'transform' array must contain objects with 'find' and 'replace' properties`, async t => {

   const params = {

      content: 'text tex t ext ex test es text',
      transform: [],
   };

   const error = t.throws( _=> contentTransform( params ));
   t.deepEqual( error.code, 'NOT_VALID_FIND_REPLACE' );
});


test( `'transform' array parameters type`, async t => {

   const params = {

      content: 'text tex t ext ex test es text',
      transform: [{

         find: 1,
         replace: 'text',
      }],
   };

   let error = t.throws( _=> contentTransform( params ));
   t.deepEqual( error.code, 'NOT_VALID_FIND_REPLACE' );

   params.transform[ 0 ].find = 'test';
   params.transform[ 0 ].replace = 1;

   error = t.throws( _=> contentTransform( params ));
   t.deepEqual( error.code, 'NOT_VALID_FIND_REPLACE' );

   params.transform[ 0 ].find = 'test';
   params.transform[ 0 ].replace = 'test';
   t.notThrows( _=> contentTransform( params ));

   params.transform[ 0 ].find = new RegExp();
   t.notThrows( _=> contentTransform( params ));
});


test( `transform content`, async t => {

   const params = {

      content: 'text abc z ext xyz test and text',
      transform: {

         find: 'abc',
         replace: 'cba',
      },
   };

   t.deepEqual( params.content,              'text abc z ext xyz test and text' );
   t.deepEqual(  contentTransform( params ), 'text cba z ext xyz test and text' );
   params.transform = [{

      find: /test/g,
      replace: 'just',
   },{

      find: 'and',
      replace: 'not',
   }];
   t.deepEqual(  contentTransform( params ), 'text abc z ext xyz just not text' );
});
