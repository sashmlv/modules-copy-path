'use strict';

const test = require( 'ava' ),
   rewire = require( 'rewire' ),
   mod = rewire( './index' ),
   {
      contentChange,
   } = mod;

mod.__set__( 'log', { // disable logger
   red: _=>_,
});

test( `params should contan 'content' parameter`, t => {

   const params = {};
   const error = t.throws( _=> contentChange( params ));
   t.deepEqual( error.code, 'EMPTY_CONTENT' );
});

test( `params should contan 'change' parameter`, t => {

   const params = { content: 'text tex t ext ex test es text' };
   const error = t.throws( _=> contentChange( params ));
   t.deepEqual( error.code, 'EMPTY_CHANGE' );
});

test( `change content`, async t => {

   const params = {

      content: 'text abc z ext xyz test and text',
      change: {

         find: 'abc',
         replace: 'cba',
      },
   };

   t.deepEqual( params.content,          'text abc z ext xyz test and text' );
   t.deepEqual( contentChange( params ), 'text cba z ext xyz test and text' );
   params.change = [{

      find: /test/g,
      replace: 'just',
   },{

      find: 'and',
      replace: 'not',
   }];
   t.deepEqual( contentChange( params ), 'text abc z ext xyz just not text' );
});
