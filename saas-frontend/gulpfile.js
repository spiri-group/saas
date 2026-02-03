const gulp = require('gulp');
const fs = require('fs');
const fsExtra = require('fs-extra');
const replace = require('gulp-replace');
const rename = require('gulp-rename');
const simpleGit = require('simple-git');
const path = require('path');
const { parse } = require('csv-parse/sync'); // <-- csv parser
const Fuse = require('fuse.js'); // <-- fuse.js for fuzzy search

// ===== Your default task (unchanged) =====
gulp.task('default', function() {
    const componentsJson = JSON.parse(fs.readFileSync('components.json'));
    const globalCssPath = componentsJson['tailwind']['css'];
    const globalCssDebugPath = globalCssPath.replace('.css', '-debug.css');
    const pathFolder = globalCssPath.replace('globals.css', '');

    return gulp.src(globalCssDebugPath)
        .pipe(replace(/rgba?\((\d+),\s*(\d+),\s*(\d+)(,\s*[\d\.]+)?\)/g, (match, r, g, b) => `${r} ${g} ${b}`))
        .pipe(replace(/(--background:.*?;)/, '$1\n    --background-image: none;'))
        .pipe(replace(/(--panel-foreground:.*?;)/, '$1\n    --panel-transparency: 1;'))
        .pipe(rename({ basename: 'globals' }))
        .pipe(gulp.dest(pathFolder));
});

// ===== New update-hs-codes task =====

// Function to format HS Code with dots
function formatHsCode(raw) {
    if (!raw) return '';
    if (raw.length === 6) {
        return `${raw.slice(0,2)}.${raw.slice(2,4)}.${raw.slice(4,6)}`;
    } else if (raw.length === 4) {
        return `${raw.slice(0,2)}.${raw.slice(2,4)}`;
    } else if (raw.length === 2) {
        return raw;
    }
    return raw; // fallback if unexpected
}

gulp.task('update-hs-codes', async function() {
    const repoUrl = 'https://github.com/datasets/harmonized-system.git';

    const findDirectory = (baseDir, targetDir) => {
        const items = fs.readdirSync(baseDir, { withFileTypes: true });
        for (const item of items) {
            const fullPath = path.join(baseDir, item.name);
            if (item.isDirectory()) {
                if (item.name === path.basename(targetDir)) {
                    return fullPath;
                }
                const found = findDirectory(fullPath, targetDir);
                if (found) {
                    return found;
                }
            }
        }
        return null;
    };

    const baseDir = path.resolve('./'); // Start searching from the project root
    const targetDir = 'services/harmonized-system';
    const cloneDir = findDirectory(baseDir, targetDir);

    if (!cloneDir) {
        throw new Error(`Directory '${targetDir}' not found in the project structure.`);
    }

    const repoSubFolder = path.join(cloneDir, 'repo'); // Subfolder for cloning the repository
    const dataSubFolder = path.join(cloneDir, 'data'); // Subfolder for storing raw data and fuse index

    if (!fs.existsSync(repoSubFolder)) {
        fsExtra.mkdirpSync(repoSubFolder);
    }

    if (!fs.existsSync(dataSubFolder)) {
        fsExtra.mkdirpSync(dataSubFolder);
    }

    const outputJson = path.join(dataSubFolder, 'harmonized_system_clean.json'); // Save JSON in the data subfolder

    console.log(`⏳ Starting HS Codes update process...`);

    try {
        console.log(`Cleaning directory: ${repoSubFolder}`);
        await fsExtra.emptyDir(repoSubFolder);

        console.log(`Cloning repository into: ${repoSubFolder}`);
        await simpleGit().clone(repoUrl, repoSubFolder);

        const csvFilePath = path.join(repoSubFolder, 'data', 'harmonized-system.csv');
        console.log(`Reading CSV file from: ${csvFilePath}`);
        const csvData = fs.readFileSync(csvFilePath, 'utf-8');

        console.log(`Parsing CSV data...`);
        const records = parse(csvData, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        console.log(`Processing ${records.length} records...`);
        const reducedData = records.map(entry => ({
            hsCode: entry.hscode,
            formattedHsCode: formatHsCode(entry.hscode),
            description: entry.description
        })).filter(item => item.hsCode && item.description);

        console.log(`Saving cleaned JSON data to: ${outputJson}`);
        await fsExtra.outputJson(outputJson, reducedData, { spaces: 2 });

        console.log(`Creating Fuse index...`);
        const fuseOptions = {
            keys: ['hsCode', 'formattedHsCode', 'description'],
            includeScore: true,
            includeMatches: true,
            useExtendedSearch: true,
            threshold: 0.3,
        };

        const fuse = new Fuse(reducedData, fuseOptions);
        const fuseIndexOutput = path.join(dataSubFolder, 'fuse_index.json'); // Save Fuse index in the data subfolder

        console.log(`Saving Fuse index to: ${fuseIndexOutput}`);
        await fsExtra.outputJson(fuseIndexOutput, fuse, { spaces: 2 });

        console.log(`✔ HS Codes update completed successfully.`);

        console.log(`Cleaning up repository folder: ${repoSubFolder}`);
        await fsExtra.remove(repoSubFolder);
    } catch (error) {
        console.error(`❌ An error occurred during the update process:`, error);
    }
});
