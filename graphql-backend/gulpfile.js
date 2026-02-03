var gulp = require("gulp");
var concat = require("gulp-concat");
var replace = require("gulp-replace");

// Combine all types.ts files into spiriverse.ts
gulp.task('default', function () {
    // 1. Compile spiriverse.ts
    // Include types.ts and *-types.ts files (for personal-space sub-types)
    gulp.src(['src/graphql/**/types.ts', 'src/graphql/**/*-types.ts', 'src/services/**/types.ts'])
        .pipe(concat('spiriverse.ts'))
        .pipe(replace(/import\s+(type\s+)?.*?['|"].*?['|"].*;?/g, '')) // Remove import and import type lines
        .pipe(replace(/export\s+\*\s+from\s+['|"].*?['|"].*;?/g, '')) // Remove export * from lines
        .pipe(replace(/export\s+\{[^}]*\}\s+from\s+['|"].*?['|"].*;?/g, '')) // Remove export { } from lines
        .pipe(gulp.dest('./client'))
        .pipe(gulp.dest('../saas-frontend/src/utils/'));

    // 3. Copy email templates
    gulp.src('src/client/email_templates.ts')
        .pipe(gulp.dest('../saas-frontend/src/utils'));

    // 4. Copy .graphql files
    return gulp.src('src/graphql/**/*.graphql')
        .pipe(gulp.dest('dist/src/graphql'));
});
