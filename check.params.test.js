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

test( `'fields' must to be object`, t => {

   const fields = 1;

   const error = t.throws( _=> checkParams( fields ));
   t.deepEqual( error.code, 'NOT_VALID_FIELDS' );
});

test( `'fields' values must to be objects`, t => {

   const fields = {

      field: 1,
   };

   let error = t.throws( _=> checkParams( fields ));
   t.deepEqual( error.code, 'NOT_VALID_FIELDS_VALUES' );

   fields.field = {};

   error = t.throws( _=> checkParams( fields ));
   t.not( error.code, 'NOT_VALID_FIELDS_VALUES' );
});

test( `'fields' values contains right checks`, t => {

   const fields = {

      field: {

         badName: true
      },
   };

   let error = t.throws( _=> checkParams( fields ));
   t.deepEqual( error.code, 'NOT_VALID_FIELDS_CHECK' );

   delete fields.field.badName;
   fields.field.empty = true;

   error = t.throws( _=> checkParams( fields ));
   t.not( error.code, 'NOT_VALID_FIELDS_CHECK' );

   fields.field.empty = false;
   fields.field.type = true;

   error = t.throws( _=> checkParams( fields ));
   t.not( error.code, 'NOT_VALID_FIELDS_CHECK' );
});

test( `'params' must to be object`, t => {

   const fields = {},
      params = 1;

   const error = t.throws( _=> checkParams( fields, params ));
   t.deepEqual( error.code, 'NOT_VALID_PARAMS' );
});

test( `params should contan 'src' parameter`, t => {

   const fields = {

         src: {

            empty: true,
         }
      },
      params = {};

   const error = t.throws( _=> checkParams( fields, params ));
   t.deepEqual( error.code, 'EMPTY_SRC' );
});

test( `parameter 'src' must to be a string`, t => {

   const fields = {

         src: {

            empty: true,
            type: true,
         }
      },
      params = {

         src: [ 'data' ],
      };

   const error = t.throws( _=> checkParams( fields, params ));
   t.deepEqual( error.code, 'NOT_VALID_SRC' );
});

test( `params should contan 'dest' parameter`, t => {

   const fields = {

         dest: {

            empty: true,
         }
      },
      params = {

         src: '/tmp',
      };

   const error = t.throws( _=> checkParams( fields, params ));
   t.deepEqual( error.code, 'EMPTY_DEST' );
});

test( `parameter 'dest' must to be a string`, t => {

   const fields = {

         dest: {

            empty: true,
            type: true,
         }
      },
      params = {

         src: 'data',
         dest: [ 'data' ],
      };

   const error = t.throws( _=> checkParams( fields, params ));
   t.deepEqual( error.code, 'NOT_VALID_DEST' );
});

test( `params should contan 'content' parameter`, t => {

   const fields = {

         content: {

            empty: true,
         }
      },
      params = {};

   const error = t.throws( _=> checkParams( fields, params ));
   t.deepEqual( error.code, 'EMPTY_CONTENT' );
});

test( `parameter 'content' must to be a string`, t => {

   const fields = {

         content: {

            empty: true,
            type: true,
         }
      },
      params = {

         content: 1,
      };

   const error = t.throws( _=> checkParams( fields, params ));
   t.deepEqual( error.code, 'NOT_VALID_CONTENT' );
});

test( `params should contan 'change' parameter`, t => {

   const fields = {

         content: {

            empty: true,
            type: true,
         },
         change: {

            empty: true,
         },
      },
      params = {

         content: 'text tex t ext ex test es text'
      };

   const error = t.throws( _=> checkParams( fields, params ));
   t.deepEqual( error.code, 'EMPTY_CHANGE' );
});

test( `parameter 'change' must to be a object or array`, t => {

   const fields = {

         change: {

            empty: true,
            type: true,
         },
      },
      params = {

         change: 1
      };

   const error = t.throws( _=> checkParams( fields, params ));
   t.deepEqual( error.code, 'NOT_VALID_CHANGE' );
});

test( `'change' object must contain 'find' and 'replace' properties`, t => {

   const fields = {

         change: {

            type: true,
         },
      },
      params = {

         change: {}
      };

   const error = t.throws( _=> checkParams( fields, params ));
   t.deepEqual( error.code, 'NOT_VALID_FIND_REPLACE' );
});

test( `'change' object parameters type`, t => {

   const fields = {

         change: {

            type: true,
         },
      },
      params = {

         change: {

            find: 1,
            replace: 'text',
         }
      };

   let error = t.throws( _=> checkParams( fields, params ));
   t.deepEqual( error.code, 'NOT_VALID_FIND_REPLACE' );

   params.change.find = 'test';
   params.change.replace = 1;

   error = t.throws( _=> checkParams( fields, params ));
   t.deepEqual( error.code, 'NOT_VALID_FIND_REPLACE' );

   params.change.find = 'test';
   params.change.replace = 'test';
   t.notThrows( _=> checkParams( fields, params ));

   params.change.find = new RegExp();
   t.notThrows( _=> checkParams( fields, params ));
});

test( `'change' array must contain objects with 'find' and 'replace' properties`, t => {

   const fields = {

         change: {

            type: true,
         },
      },
      params = {

         change: [],
      };

   const error = t.throws( _=> checkParams( fields, params ));
   t.deepEqual( error.code, 'NOT_VALID_FIND_REPLACE' );
});

test( `'change' array parameters type`, t => {

   const fields = {

         change: {

            type: true,
         },
      },
      params = {

         change: [{

            find: 1,
            replace: 'text',
         }],
      };

   let error = t.throws( _=> checkParams( fields, params ));
   t.deepEqual( error.code, 'NOT_VALID_FIND_REPLACE' );

   params.change[ 0 ].find = 'test';
   params.change[ 0 ].replace = 1;

   error = t.throws( _=> checkParams( fields, params ));
   t.deepEqual( error.code, 'NOT_VALID_FIND_REPLACE' );

   params.change[ 0 ].find = 'test';
   params.change[ 0 ].replace = 'test';
   t.notThrows( _=> checkParams( fields, params ));

   params.change[ 0 ].find = new RegExp();
   t.notThrows( _=> checkParams( fields, params ));
});
