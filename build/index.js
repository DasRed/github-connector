import esbuild from 'esbuild';
import clear from 'esbuild-plugin-clear';
import time from 'esbuild-plugin-time';
import {dirname} from 'path';
import {fileURLToPath} from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

await esbuild.build({
    entryPoints:   [__dirname + '/../src/index.js'],
    bundle:        true,
    minify:        false,
    platform:      'node',
    sourcemap:     false,
    target:        ['esnext'],
    format:        'esm',
    legalComments: 'none',
    outfile:       __dirname + '/../dist/index.mjs',
    plugins:       [
        clear(__dirname + '/../dist'),
        time(),
    ],
});
