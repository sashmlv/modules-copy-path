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
 * TODO: copy with content transform
 * TODO: log and dry
 * @param {object} params
 * @param {string} params.from
 * @param {string} params.to
 * @param {regex|array|function} params.filter - filter for copying paths
 * @param {boolean} params.force - overwrite files
 * @param {object|array} params.transform
 * @param {string|regex} params.transform.find
 * @param {string} params.transform.replace
 * @param {boolean} params.log
 * @param {boolean} params.dry - do not copy files (for testing)
 * @return {undefined} Return removed paths
 **/
async function copyPath( params = {}){

   try {

      checkParams([ 'from', 'to', 'transform', ], params );

      const { from, to, filter, force, log, dry, } = params;

      switch( true ){

         case filter instanceof RegExp:

            if( ! filter.test( from )){

               return;
            }

            break;

         case Array.isArray( filter ):

            if( ! filter.find( f => f.test( from ))){

               return;
            };

            break;

         case typeof filter === 'function':

            if( ! filter( from )){

               return;
            }

            break;
      };

      let fromExists = await exists( from ),
         fromIsDir,
         fromIsFile,
         toExists   = await exists( to ),
         toIsDir,
         toIsFile,
         toHasLastSlash = ( typeof to === 'string' ) && ( to.slice( -1 ) === '/' );

      if( fromExists ){

         const fromStat = await lstat( from );
         fromIsDir  = fromStat.isDirectory();
         fromIsFile = fromStat.isFile();
      }

      if( toExists ){

         const toStat = await lstat( to );
         toIsDir  = toStat.isDirectory();
         toIsFile = toStat.isFile();
      }

      switch ( true ){

         case ! fromExists:

            throw new ModuleError({ message: `Path 'from' not exists: ${ from }`, code: 'FROM_NOT_EXISTS', });

            break;

         case fromIsFile && toIsFile && ! force:

            throw new ModuleError({ message: `Destination file already exists: ${ to }`, code: 'DEST_FILE_EXISTS', });

            break;

         case fromIsFile && toIsFile && force:

            await unlink( to );
            await copyFile( from, to );

            break;

         case fromIsFile && toIsDir && ! force: {

            const toPath = path.resolve( `${ to }/${ path.basename( from )}` );

            if( await exists( toPath )){

               throw new ModuleError({ message: `Destination already exists: ${ toPath }`, code: 'DEST_EXISTS', });
            };

            await copyFile( from, toPath );

            break;
         };

         case fromIsFile && toIsDir && force: {

            const toPath = path.resolve( `${ to }/${ path.basename( from )}` );

            if( await exists( toPath )){

               const toPathStat = await lstat( toPath );

               if( toPathStat.isDirectory()){

                  await rmdir( toPath );
               }
               else if( toPathStat.isFile()){

                  await unlink( toPath );
               };
            };

            await copyFile( from, toPath );

            break;
         };

         case fromIsFile && ! toExists && ! toHasLastSlash:

            await copyFile( from, to );

            break;

         case fromIsFile && ! toExists && toHasLastSlash: {

            const toPath = path.resolve( `${ to }/${ path.basename( from )}` );
            await mkdir( to, { recursive: true });
            await copyFile( from, toPath );

            break;
         };

         case fromIsDir && toIsFile && ! force:

            throw new ModuleError({ message: `Destination already exists: ${ to }`, code: 'DEST_EXISTS', });

            break;

         case fromIsDir && toIsFile && force: {

            await unlink( to );
            await mkdir( to, { recursive: true });

            const paths = ( await readdir( from ))
               .map( v => path.resolve( `${ from }/${ v }` ));

            for( let i = 0; i < paths.length; i++ ){

               await copyPath( Object.assign({}, params, {

                  from: paths[ i ]
               }));
            };

            break;
         };

         case fromIsDir && toIsDir: {

            const paths = ( await readdir( from ))
               .map( v => path.resolve( `${ from }/${ v }` ));

            /* copy each path separately */
            for( let i = 0; i < paths.length; i++ ){

               const pathStat = await lstat( paths[ i ]),
                  toPath = pathStat.isDirectory() ?

                  /* for directory source add slash at end */
                  `${path.resolve( `${ to }/${ path.basename( paths[ i ])}` )}${ path.sep }` :
                  to;

               await copyPath( Object.assign({}, params, {

                  from: paths[ i ],
                  to: toPath,
               }));
            };

            break;
         };
         case fromIsDir && ! toExists:

            await mkdir( to, { recursive: true });
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
 * Content transform
 * TODO: log option
 * @param {object} params
 * @param {string} params.content
 * @param {object|array} params.transform
 * @param {string|regex} params.transform.find
 * @param {string} params.transform.replace
 * @return {string} Return changed content string
 **/
function contentTransform( params ){

   try {

      checkParams([ 'content', 'transform', ], params );

      const { content, transform, } = params;

      let result;

      /* replace */
      if( ! Array.isArray( transform )){

         const { find, replace } = transform;

         result = content.replace( find, replace );
      }
      else {

         result = content;

         for( let i = 0; i < transform.length; i++ ) {

            const { find, replace } = transform[ i ];

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
 * Copy file, optional content transform
 * @param {object} params
 * @param {string} params.from
 * @param {string} params.to
 * @param {object|array} params.transform
 * @param {string|regex} params.transform.find
 * @param {string} params.transform.replace
 * @return {undefined}
 **/
async function copyFileTransform( params ){

   checkParams([ 'from', 'to', 'transform', ], params );

   const { from, to, transform } = params;

   // if( transform ) {

   //    let content = readFile(  );
   //    writeFile
   // }
   // else {

   //    await copyFile( from, to );
   // };

};

/**
 * Check params
 * @param {string|array} fields
 * @param {object} params
 * @return {undefined}
 **/
function checkParams( fields, params ){

   if( fields && ( typeof fields === 'string' )) {

      fields = [ fields ];
   };

   if( ! fields || ! Array.isArray( fields )){

         throw new ModuleError({

            message: `Bad 'field' parameter please provide string or [string], provided: ${ typeof fields }`,
            code: 'NOT_VALID_FIELDS',
         });
   };

   if( ! params || ( getClass( params ) !== 'object' )){

      throw new ModuleError({

         message: `Bad 'params' please provide object, provided: ${ getClass( fields )}`,
         code: 'NOT_VALID_PARAMS',
      });
   };

   const { transform, from, to, content, } = params;

   if( fields.includes( 'from' )){

      if( ! from ){

         throw new ModuleError({ message: `Please provide 'from' path, provided: ${ from }`, code: 'EMPTY_FROM', });
      }

      if( typeof from !== 'string' ){

         throw new ModuleError({ message: `Parameter 'from' must to be a string, provided: ${ typeof from }`, code: 'NOT_VALID_FROM', });
      };
   };

   if( fields.includes( 'to' )){

      if(! to ){

         throw new ModuleError({ message: `Please provide 'to' path, provided: ${ from }`, code: 'EMPTY_TO', });
      };

      if( typeof to !== 'string' ){

         throw new ModuleError({ message: `Parameter 'to' must to be a string, provided: ${ typeof to }`, code: 'NOT_VALID_TO', });
      };
   };

   if( fields.includes( 'content' )){

      if( ! content ){

         throw new ModuleError({

            message: `Please provide 'content' string, provided: ${ content }`,
            code: 'EMPTY_CONTENT',
         });
      }

      if( typeof content !== 'string' ){

         throw new ModuleError({

            message: `Parameter 'content' must to be a string, provided: ${ typeof content }`,
            code: 'NOT_VALID_CONTENT',
         });
      };
   };

   if( fields.includes( 'transform' )){

      if( ! transform ){

         throw new ModuleError({

            message: `Please provide 'transform' option, provided: ${ transform }`,
            code: 'EMPTY_TRANSFORM',
         });
      };

      if( typeof transform !== 'object' ){

         throw new ModuleError({

            message: `Parameter 'transform' must to be object or array, provided: ${ typeof transform }`,
            code: 'NOT_VALID_TRANSFORM',
         });
      };

      if( ! Array.isArray( transform )){

         const emptyProp = ( ! transform.find || ! transform.replace );

         if( emptyProp ){

            throw new ModuleError({

               message: `Transform object must contain 'find' and 'replace' properties, provided: ${ transform }`,
               code: 'NOT_VALID_FIND_REPLACE',
            });
         };

         const badType = typeof transform.find !== 'string' && ! ( transform.find instanceof RegExp ) || typeof transform.replace !== 'string';

         if( badType ){

            throw new ModuleError({

               message: `Bad transform options 'find' must be string or regex and 'replace' must be a string, provided: ${ transform }`,
               code: 'NOT_VALID_FIND_REPLACE',
            });
         };
      };

      if( Array.isArray( transform )){

         const emptyProp = ! transform.length || transform.find( v => ! v || ! v.find || ! v.replace );

         if( emptyProp ){

            throw new ModuleError({

               message: `Transform array must contain objects with 'find' and 'replace' properties, provided: ${ transform.find( v => ! v.find || ! v.replace )}`,
               code: 'NOT_VALID_FIND_REPLACE',
            });
         };

         const badType = transform.find(

            v => typeof v.find !== 'string' && ! ( v.find instanceof RegExp ) || typeof v.replace !== 'string'
         );

         if( badType ){

            throw new ModuleError({

               message: `Bad transform options 'find' must be string or regex and 'replace' must be a string, provided: ${ transform.find(

               v => typeof v.find !== 'string' && ! ( v.find instanceof RegExp ) || typeof v.replace !== 'string'
            )}`,
               code: 'NOT_VALID_FIND_REPLACE',
            });
         };
      };
   };
};

module.exports = {

   copyPath,
   contentTransform,
   copyFileTransform,
   checkParams,
};
