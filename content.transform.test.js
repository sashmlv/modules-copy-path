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

test( `params should contan 'transform' parameter`, t => {

   const params = { content: 'text tex t ext ex test es text' };
   const error = t.throws( _=> contentTransform( params ));
   t.deepEqual( error.code, 'EMPTY_TRANSFORM' );
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
