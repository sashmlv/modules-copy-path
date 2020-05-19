'use strict';

const fs    = require( 'fs' ),
   util  = require( 'util' ),
   path  = require( 'path' ),
   { log, exists } = require( 'maintenance' ),
   ModuleError = require( 'module-error' ),
   copyFile = util.promisify( fs.copyFile ),
   unlink = util.promisify( fs.unlink ),
   rmdir = util.promisify( fs.rmdir ),
   mkdir = util.promisify( fs.mkdir ),
   readdir = util.promisify( fs.readdir ),
   lstat = util.promisify( fs.lstat );

/**
 * Copy path
 * TODO: content transform
 * TODO: from and dist not absolute path
 * TODO: log and dry
 * @param {object} opts
 * @param {string} opts.from
 * @param {string} opts.to
 * @param {regex|array|function} opts.filter - filter for copying paths
 * @param {boolean} opts.force - overwrite files
 * @param {object|array} opts.transform
 * @param {boolean} opts.log
 * @param {boolean} opts.dry - do not copy files (for testing)
 * @return {undefined} Return removed paths
 **/
async function copyPath( opts = {}){

   try {

      const { from, to, filter, force, log, dry, } = opts;

      /* check params */
      switch ( true ){

         case ! from:

            throw new ModuleError({ message: `Please provide 'from' path, provided: ${ from }`, code: 'EMPTY_FROM', });

         case typeof from !== 'string':

            throw new ModuleError({ message: `Parameter 'from' must to be a string, provided: ${ typeof from }`, code: 'NOT_VALID_FROM', });

         case ! to:

            throw new ModuleError({ message: `Please provide 'to' path, provided: ${ from }`, code: 'EMPTY_TO', });

         case typeof to !== 'string':

            throw new ModuleError({ message: `Parameter 'to' must to be a string, provided: ${ typeof to }`, code: 'NOT_VALID_TO', });

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
      }

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

      /* module logic */
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

               await copyPath( Object.assign({}, opts, {

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

               await copyPath( Object.assign({}, opts, {

                  from: paths[ i ],
                  to: toPath,
               }));
            };
            break;
         };
         case fromIsDir && ! toExists:

            await mkdir( to, { recursive: true });
            await copyPath( opts );
      }
   }
   catch( e ){

      log.red( e );

      throw e;
   }
}

/**
 * Content transform
 * TODO: log option
 * @param {object} opts
 * @param {string} opts.content
 * @param {object|array} opts.transform
 * @param {string|regex} opts.transform.find
 * @param {string} opts.transform.replace
 * @return {string} Return changed content string
 **/
function contentTransform( opts = {}){

   try {

      const { content, transform, } = opts;

      /* check params */
      switch ( true ){

         case ! content:

            throw new ModuleError({

               message: `Please provide 'content' string, provided: ${ content }`,
               code: 'EMPTY_CONTENT',
            });

         case typeof content !== 'string':

            throw new ModuleError({

               message: `Parameter 'content' must to be a string, provided: ${ typeof content }`,
               code: 'NOT_VALID_CONTENT',
            });

         case ! transform:

            throw new ModuleError({

               message: `Please provide 'transform' option, provided: ${ transform }`,
               code: 'EMPTY_TRANSFORM',
            });

         case typeof transform !== 'object':

            throw new ModuleError({

               message: `Parameter 'transform' must to be object or array, provided: ${ typeof transform }`,
               code: 'NOT_VALID_TRANSFORM',
            });

         case ! Array.isArray( transform ): {

            const emptyProp = ( ! transform.find || ! transform.replace );

            if( emptyProp ){

               throw new ModuleError({

                  message: `Transform object must contain 'find' and 'replace' properties, provided: ${ transform }`,
                  code: 'NOT_VALID_FIND_REPLACE',
               });
            };

            const badType = typeof transform.find !== 'string' && ! ( transform.find instanceof RegExp ) || typeof transform.replace !== 'string'

            if( badType ){

               throw new ModuleError({

                  message: `Bad transform options 'find' must be string or regex and 'replace' must be a string, provided: ${ transform }`,
                  code: 'NOT_VALID_FIND_REPLACE',
               });
            };
            break;
         };
         case Array.isArray( transform ): {

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
            break;
         };
      };

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

module.exports = {

   copyPath,
   contentTransform,
};
