const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const { minify } = require('html-minifier');
const { obfuscate } = require('javascript-obfuscator');

const base64_encode = file => `data:image/png;base64,${readFileSync(file, { encoding: 'base64' })}`;
const readFile = path => readFileSync(path, { encoding: 'utf8' });

if (!existsSync('./dist')) mkdirSync('dist');

console.log('Building...');
let html = readFile('./src/index.html')
    .replaceAll(/href=".\/img\/favicon.png"/g, () => `href="${base64_encode('./src/img/favicon.png')}"`)
    .replaceAll(/<script src="(.+?)"><\/script>/g, (_match, p1) => {
        console.log(`Adding script ${p1}...`);
        let file = readFile(`./src/${p1}`);

        file = file.replaceAll(/const IMAGES = {[\S\s]+?};/g, () => {
            const images = {};
            const regex = /'(.+?)': '(.+?)'/g;
            let match;
            console.log('Converting script images to base 64...');
            while ((match = regex.exec(file)) !== null)
                images[match[1]] = base64_encode(`./src/${match[2]}`);
            return `const IMAGES = Object.freeze(${JSON.stringify(images)});`;
        });

        console.log(`Obfuscating ${p1}...`);
        const timeNow = new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', timeZoneName: 'short', timeZone: 'America/Toronto' });
        file = obfuscate(`${file}${p1 === 'script.js' && `console.log('Built on ${timeNow}');`}`, {
            numbersToExpressions: true,
            stringArrayCallsTransform: true
        }).getObfuscatedCode();
        console.log(`Script ${p1} done!`);

        return `<script>${file}</script>`;
    })
    .replaceAll(/<link rel="stylesheet" href="(.+?)">/g, (_match, p1) => {
        console.log(`Adding stylesheet ${p1}...`);
        let file = readFile(`./src/${p1}`);

        file = file.replaceAll(/url\((.+?)\)/g, (_match, p1) => `url(${base64_encode(`./src/${p1.replaceAll("'", '')}`)})`);
        console.log(`Finished stylesheet ${p1}`);
        return `<style>${file}</style>`;
    })
    .replaceAll(/src="(.+?)"/g, (_match, p1) => {
        console.log(`Adding image ${p1}...`);
        return `src="${base64_encode(`./src/${p1}`)}"`;
    })
    .replaceAll(/<\/script>\s*<script>/g, '');

console.log('Minifying...');
html = minify(html, {
    minifyCSS: true,
    minifyJS: { mangle: { toplevel: true }},
    collapseWhitespace: true,
    removeComments: true,
    sortAttributes: true,
    sortClassName: true
});

console.log('Writing to file..');
writeFileSync('./dist/index.html', html, { encoding: 'utf8' });
console.log('Done!');
