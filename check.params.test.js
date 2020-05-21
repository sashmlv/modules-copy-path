'use strict';

const test = require( 'ava' ),
   rewire = require( 'rewire' ),
   mod = rewire( './index' ),
   {
      checkParams,
   } = mod;

mod.__set__( 'log', { // disable logger
   red: _=>_,
});

test( `'fields' must to be string or array`, t => {

   const fields = 1;

   const error = t.throws( _=> checkParams( fields ));
   t.deepEqual( error.code, 'NOT_VALID_FIELDS' );
});

test( `'params' must to be object`, t => {

   const fields = 'test',
      params = 1;

   const error = t.throws( _=> checkParams( fields, params ));
   t.deepEqual( error.code, 'NOT_VALID_PARAMS' );
});

test( `params should contan 'from' parameter`, t => {

   const fields = 'from',
      params = {};

   const error = t.throws( _=> checkParams( fields, params ));
   t.deepEqual( error.code, 'EMPTY_FROM' );
});

test( `parameter 'from' must to be a string`, t => {

   const fields = 'from',
      params = {

         from: [ 'data' ],
      };

   const error = t.throws( _=> checkParams( fields, params ));
   t.deepEqual( error.code, 'NOT_VALID_FROM' );
});

test( `params should contan 'to' parameter`, t => {

   const fields = 'to',
      params = {

         from: '/tmp',
      };

   const error = t.throws( _=> checkParams( fields, params ));
   t.deepEqual( error.code, 'EMPTY_TO' );
});

test( `parameter 'to' must to be a string`, t => {

   const fields = [ 'from', 'to', ],
      params = {

         from: 'data',
         to: [ 'data' ],
      };

   const error = t.throws( _=> checkParams( fields, params ));
   t.deepEqual( error.code, 'NOT_VALID_TO' );
});

test( `params should contan 'content' parameter`, t => {

   const fields = 'content',
      params = {};

   const error = t.throws( _=> checkParams( fields, params ));
   t.deepEqual( error.code, 'EMPTY_CONTENT' );
});

test( `parameter 'content' must to be a string`, t => {

   const fields = 'content',
      params = {

         content: 1,
      };

   const error = t.throws( _=> checkParams( fields, params ));
   t.deepEqual( error.code, 'NOT_VALID_CONTENT' );
});

test( `params should contan 'transform' parameter`, t => {

   const fields = [ 'content', 'transform', ],
      params = {

         content: 'text tex t ext ex test es text'
      };

   const error = t.throws( _=> checkParams( fields, params ));
   t.deepEqual( error.code, 'EMPTY_TRANSFORM' );
});

test( `parameter 'transform' must to be a object or array`, t => {

   const fields = 'transform',
      params = {

         transform: 1
      };

   const error = t.throws( _=> checkParams( fields, params ));
   t.deepEqual( error.code, 'NOT_VALID_TRANSFORM' );
});

test( `'transform' object must contain 'find' and 'replace' properties`, t => {

   const fields = 'transform',
      params = {

         transform: {}
      };

   const error = t.throws( _=> checkParams( fields, params ));
   t.deepEqual( error.code, 'NOT_VALID_FIND_REPLACE' );
});

test( `'transform' object parameters type`, t => {

   const fields = 'transform',
      params = {

         transform: {

            find: 1,
            replace: 'text',
         }
      };

   let error = t.throws( _=> checkParams( fields, params ));
   t.deepEqual( error.code, 'NOT_VALID_FIND_REPLACE' );

   params.transform.find = 'test';
   params.transform.replace = 1;

   error = t.throws( _=> checkParams( fields, params ));
   t.deepEqual( error.code, 'NOT_VALID_FIND_REPLACE' );

   params.transform.find = 'test';
   params.transform.replace = 'test';
   t.notThrows( _=> checkParams( fields, params ));

   params.transform.find = new RegExp();
   t.notThrows( _=> checkParams( fields, params ));
});

test( `'transform' array must contain objects with 'find' and 'replace' properties`, t => {

   const fields = 'transform',
      params = {

         transform: [],
      };

   const error = t.throws( _=> checkParams( fields, params ));
   t.deepEqual( error.code, 'NOT_VALID_FIND_REPLACE' );
});

test( `'transform' array parameters type`, t => {

   const fields = 'transform',
      params = {

         transform: [{

            find: 1,
            replace: 'text',
         }],
      };

   let error = t.throws( _=> checkParams( fields, params ));
   t.deepEqual( error.code, 'NOT_VALID_FIND_REPLACE' );

   params.transform[ 0 ].find = 'test';
   params.transform[ 0 ].replace = 1;

   error = t.throws( _=> checkParams( fields, params ));
   t.deepEqual( error.code, 'NOT_VALID_FIND_REPLACE' );

   params.transform[ 0 ].find = 'test';
   params.transform[ 0 ].replace = 'test';
   t.notThrows( _=> checkParams( fields, params ));

   params.transform[ 0 ].find = new RegExp();
   t.notThrows( _=> checkParams( fields, params ));
});
