'use strict';

const fs = require( 'fs' ),
   util = require( 'util' ),
   path = require( 'path' ),
   { log, exists, getClass } = require( 'maintenance' ),
   ModuleError = require( 'module-error' ),
   copyFile  = util.promisify( fs.copyFile ),
   unlink    = util.promisify( fs.unlink ),
   rmdir     = util.promisify( fs.rmdir ),
   mkdir     = util.promisify( fs.mkdir ),
   readdir   = util.promisify( fs.readdir ),
   lstat     = util.promisify( fs.lstat ),
   readFile  = util.promisify( fs.readFile ),
   writeFile = util.promisify( fs.writeFile );

/**
 * Copy path
 * @param {object} params
 * @param {string} params.src
 * @param {string} params.dest
 * @param {regex|array|function} params.filter - filter for copying paths
 * @param {boolean} params.force - overwrite files
 * @param {object|array} params.change
 * @param {string|regex} params.change.find
 * @param {string} params.change.replace
 * @param {boolean} params.logging - copying log
 * @return {undefined} Return removed paths
 **/
async function copyPath( params = {}){

   try {

      checkParams({

         src: { empty: 1, type: 1, },
         dest: { empty: 1, type: 1, },
         change: { empty: 0, type: 1, },
      },

         params,
      );

      const { src, dest, filter, force, change, logging, } = params;

      switch( true ){

         case filter instanceof RegExp:

            if( ! filter.test( src )){

               return;
            }

            break;

         case Array.isArray( filter ):

            if( ! filter.find( f => f.test( src ))){

               return;
            };

            break;

         case typeof filter === 'function':

            if( ! filter( src )){

               return;
            }

            break;
      };

      let srcExists = await exists( src ),
         srcIsDir,
         srcIsFile,
         destExists = await exists( dest ),
         destIsDir,
         destIsFile,
         destHasLastSlash = ( typeof dest === 'string' ) && ( dest.slice( -1 ) === '/' );

      if( srcExists ){

         const srcStat = await lstat( src );
         srcIsDir  = srcStat.isDirectory();
         srcIsFile = srcStat.isFile();
      }

      if( destExists ){

         const destStat = await lstat( dest );
         destIsDir  = destStat.isDirectory();
         destIsFile = destStat.isFile();
      }

      switch ( true ){

         case ! srcExists:

            throw new ModuleError({ message: `Path 'src' not exists: ${ src }`, code: 'SRC_NOT_EXISTS', });

            break;

         case srcIsFile && destIsFile && ! force:

            throw new ModuleError({ message: `Destination file already exists: ${ dest }`, code: 'DEST_FILE_EXISTS', });

            break;

         case srcIsFile && destIsFile && force:

            await unlink( dest );
            logging && log.blue( `unlink ${ dest }` );
            await copyFileChange({ src, dest, change, logging, });

            break;

         case srcIsFile && destIsDir && ! force: {

            const destPath = path.resolve( `${ dest }/${ path.basename( src )}` );

            if( await exists( destPath )){

               throw new ModuleError({ message: `Destination already exists: ${ destPath }`, code: 'DEST_EXISTS', });
            };

            await copyFileChange({ src, dest: destPath, change, logging, });

            break;
         };

         case srcIsFile && destIsDir && force: {

            const destPath = path.resolve( `${ dest }/${ path.basename( src )}` );

            if( await exists( destPath )){

               const destPathStat = await lstat( destPath );

               if( destPathStat.isDirectory()){

                  await rmdir( destPath );
                  logging && log.blue( `rmdir ${ destPath }` );
               }
               else if( destPathStat.isFile()){

                  await unlink( destPath );
                  logging && log.blue( `unlink ${ destPath }` );
               };
            };

            await copyFileChange({ src, dest: destPath, change, logging, });

            break;
         };

         case srcIsFile && ! destExists && ! destHasLastSlash:

            await copyFileChange({ src, dest, change, logging, });

            break;

         case srcIsFile && ! destExists && destHasLastSlash: {

            const destPath = path.resolve( `${ dest }/${ path.basename( src )}` );
            await mkdir( dest, { recursive: true });
            logging && log.blue( `mkdir ${ dest }` );
            await copyFileChange({ src, dest: destPath, change, logging, });

            break;
         };

         case srcIsDir && destIsFile && ! force:

            throw new ModuleError({ message: `Destination already exists: ${ dest }`, code: 'DEST_EXISTS', });

            break;

         case srcIsDir && destIsFile && force: {

            await unlink( dest );
            logging && log.blue( `unlink ${ dest }` );
            await mkdir( dest, { recursive: true });
            logging && log.blue( `mkdir ${ dest }` );

            const paths = ( await readdir( src ))
               .map( v => path.resolve( `${ src }/${ v }` ));

            for( let i = 0; i < paths.length; i++ ){

               await copyPath( Object.assign({}, params, {

                  src: paths[ i ]
               }));
            };

            break;
         };

         case srcIsDir && destIsDir: {

            const paths = ( await readdir( src ))
               .map( v => path.resolve( `${ src }/${ v }` ));

            /* copy each path separately */
            for( let i = 0; i < paths.length; i++ ){

               const pathStat = await lstat( paths[ i ]),
                  destPath = pathStat.isDirectory() ?

                  /* for directory source add slash at end */
                  `${path.resolve( `${ dest }/${ path.basename( paths[ i ])}` )}${ path.sep }` :
                  dest;

               await copyPath( Object.assign({}, params, {

                  src: paths[ i ],
                  dest: destPath,
               }));
            };

            break;
         };
         case srcIsDir && ! destExists:

            await mkdir( dest, { recursive: true });
            logging && log.blue( `mkdir ${ dest }` );
            await copyPath( params );

            break;
      };
   }
   catch( e ){

      log.red( e );

      throw e;
   };
};

/**
 * Content change
 * @param {object} params
 * @param {string} params.content
 * @param {object|array} params.change
 * @param {string|regex} params.change.find
 * @param {string} params.change.replace
 * @return {string} Return changed content string
 **/
function contentChange( params ){

   try {

      checkParams({

         content: { empty: 1, type: 1, },
         change: { empty: 1, type: 1, },
      },

         params,
      );

      const { content, change, } = params;

      let result;

      /* replace */
      if( ! Array.isArray( change )){

         const { find, replace } = change;

         result = content.replace( find, replace );
      }
      else {

         result = content;

         for( let i = 0; i < change.length; i++ ) {

            const { find, replace } = change[ i ];

            result = result.replace( find, replace );
         }
      }

      return result;
   }
   catch ( e ) {

      log.red( e );

      throw e;
   }
};

/**
 * Copy file, optional content change
 * @param {object} params
 * @param {string} params.src
 * @param {string} params.dest
 * @param {object|array} params.change
 * @param {string|regex} params.change.find
 * @param {string} params.change.replace
 * @param {string} params.encoding
 * @param {boolean} params.logging - copying log
 * @return {undefined}
 **/
async function copyFileChange( params ){

   checkParams({

      src: { empty: 1, type: 1, },
      dest: { empty: 1, type: 1, },
      change: { empty: 0, type: 1, },
   },

      params
   );

   const {

      src,
      dest,
      change,
      encoding = 'utf8',
      logging,
   } = params;

   if( change ) {

      let content = await readFile( src, encoding );
      content = contentChange({ content, change });
      await writeFile( dest, content, encoding );
   }
   else {

      await copyFile( src, dest );
   };

   logging && log.blue( `copy src: ${ src }, dest: ${ dest }` );
};

/**
 * Check params
 * @param {string|array} fields
 * @param {object} params
 * @return {undefined}
 **/
function checkParams( fields, params ){

   /* check types */
   const checks = [

      'empty',
      'type',
   ];

   if( ! fields || ( getClass( fields ) !== 'object' )){

      throw new ModuleError({

         message: `Bad 'fields' parameter please provide object, provided: ${ getClass( fields )}`,
         code: 'NOT_VALID_FIELDS',
      });
   };

   /* check fields parameter */
   Object.keys( fields ).find( v => {

      if( getClass( fields[ v ]) !== 'object' ){

         throw new ModuleError({

            message: `Parameter 'fields' contain bad option, please provide object with allowed checks, provided: ${ fields[ v ]}`,
            code: 'NOT_VALID_FIELDS_VALUES',
         });
      }
      else {

         const keys = Object.keys( fields[ v ]);
         if( keys.find( v => ! checks.includes( v ))){

            throw new ModuleError({

               message: `'fields' contain option with bad check name, please provide allowed checks, provided: ${ fields[ v ]}`,
               code: 'NOT_VALID_FIELDS_CHECK',
            });
         };
      };
   });

   if( ! params || ( getClass( params ) !== 'object' )){

      throw new ModuleError({

         message: `Bad 'params' please provide object, provided: ${ getClass( fields )}`,
         code: 'NOT_VALID_PARAMS',
      });
   };

   const { change, src, dest, content, } = params;

   if( fields.src ){

      if( fields.src.empty && ! src ){

         throw new ModuleError({ message: `Please provide 'src' path, provided: ${ src }`, code: 'EMPTY_SRC', });
      }

      if( fields.src.type && src && ( typeof src !== 'string' )){

         throw new ModuleError({ message: `Parameter 'src' must to be a string, provided: ${ typeof src }`, code: 'NOT_VALID_SRC', });
      };
   };

   if( fields.dest ){

      if( fields.dest.empty && ! dest ){

         throw new ModuleError({ message: `Please provide 'dest' path, provided: ${ src }`, code: 'EMPTY_DEST', });
      };

      if( fields.dest.type && dest && ( typeof dest !== 'string' )){

         throw new ModuleError({ message: `Parameter 'dest' must to be a string, provided: ${ typeof dest }`, code: 'NOT_VALID_DEST', });
      };
   };

   if( fields.content ){

      if( fields.content.empty && ! content ){

         throw new ModuleError({

            message: `Please provide 'content' string, provided: ${ content }`,
            code: 'EMPTY_CONTENT',
         });
      }

      if( fields.content.type && content && ( typeof content !== 'string' )){

         throw new ModuleError({

            message: `Parameter 'content' must to be a string, provided: ${ typeof content }`,
            code: 'NOT_VALID_CONTENT',
         });
      };
   };

   if( fields.change ){

      if( fields.change.empty && ! change ){

         throw new ModuleError({

            message: `Please provide 'change' option, provided: ${ change }`,
            code: 'EMPTY_CHANGE',
         });
      };

      if( fields.change.type && change ){

         if( typeof change !== 'object' ){

            throw new ModuleError({

               message: `Parameter 'change' must to be object or array, provided: ${ typeof change }`,
               code: 'NOT_VALID_CHANGE',
            });
         };

         if( ! Array.isArray( change )){

            const emptyProp = ( ! change.find || ! change.replace );

            if( emptyProp ){

               throw new ModuleError({

                  message: `Change object must contain 'find' and 'replace' properties, provided: ${ change }`,
                  code: 'NOT_VALID_FIND_REPLACE',
               });
            };

            const badType = typeof change.find !== 'string' && ! ( change.find instanceof RegExp ) || typeof change.replace !== 'string';

            if( badType ){

               throw new ModuleError({

                  message: `Bad change options 'find' must be string or regex and 'replace' must be a string, provided: ${ change }`,
                  code: 'NOT_VALID_FIND_REPLACE',
               });
            };
         };

         if( Array.isArray( change )){

            const emptyProp = ! change.length || change.find( v => ! v || ! v.find || ! v.replace );

            if( emptyProp ){

               throw new ModuleError({

                  message: `Change array must contain objects with 'find' and 'replace' properties, provided: ${ change.find( v => ! v.find || ! v.replace )}`,
                  code: 'NOT_VALID_FIND_REPLACE',
               });
            };

            const badType = change.find(

               v => typeof v.find !== 'string' && ! ( v.find instanceof RegExp ) || typeof v.replace !== 'string'
            );

            if( badType ){

               throw new ModuleError({

                  message: `Bad change options 'find' must be string or regex and 'replace' must be a string, provided: ${ change.find(

               v => typeof v.find !== 'string' && ! ( v.find instanceof RegExp ) || typeof v.replace !== 'string'
            )}`,
                  code: 'NOT_VALID_FIND_REPLACE',
               });
            };
         };
      };
   };
};

module.exports = {

   copyPath,
   contentChange,
   copyFileChange,
   checkParams,
};
