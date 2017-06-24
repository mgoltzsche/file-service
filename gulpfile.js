var pkg = require('./package.json');
var gulp = require('gulp');
var rename = require('gulp-rename');
var jshint = require('gulp-jshint');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var stylishReporter = require('jshint-stylish');
var uglify = require('gulp-uglify');
var browserify = require('browserify');
var babelify = require('babelify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var del = require('del');
var iconfont = require('gulp-iconfont');
var consolidate = require('gulp-consolidate');
var runTimestamp = Math.round(Date.now()/1000);
var distDir = 'dist/'

gulp.task('default', ['browserify', 'sass', 'iconfont', 'html'], function() {
	return gulp.src(['package.json', 'app/icons/favicon.png', 'app/icons/favicon.ico'])
		.pipe(gulp.dest(distDir));
});

gulp.task('sass', ['clean', 'iconfont'], function() {
	return gulp.src(['app/scss/webdav-client.scss'])
		.pipe(sourcemaps.init())
		.pipe(sass({outputStyle: 'compressed'}))
		.pipe(sourcemaps.write())
		.pipe(rename(pkg.name + '-' + pkg.version + '.min.css'))
		.pipe(gulp.dest(distDir + 'css'));
});

gulp.task('browserify', ['clean', 'lint'], function() {
	return browserify('app/js/main.js')
		.transform(babelify, {presets: [/*'es2015',*/ 'react']}) // compile with ECMA Script 6 and react
		.bundle()
		.pipe(source(pkg.name + '-' + pkg.version + '.min.js')) // converts to vinyl src with name
		.pipe(buffer())                     // converts to vinyl buffer obj
		.pipe(uglify())
		.pipe(gulp.dest(distDir + 'js'));
});

gulp.task('html', function() {
	gulp.src('app/index.html')
	.pipe(consolidate('lodash', {
		name: pkg.name,
		version: pkg.version
	}))
	.pipe(gulp.dest(distDir));
});

gulp.task('iconfont', function(){
	var fontName = pkg.name + '-' + pkg.version
	return gulp.src(['app/icons/*.svg'])
		.pipe(iconfont({
			fontName: fontName,
			prependUnicode: true,
			formats: ['ttf', 'eot', 'woff'], // default, 'woff2' and 'svg' are available
			timestamp: runTimestamp // recommended to get consistent builds when watching files
		}))
		.on('glyphs', function(glyphs, options) {
			gulp.src('app/scss/icons.scss.lodash')
			.pipe(consolidate('lodash', {
				glyphs: glyphs,
				fontName: fontName,
				fontPath: '../fonts/',
				className: 'dav'
			}))
			.pipe(rename("icons.generated.scss"))
			.pipe(gulp.dest(distDir));
		})
		.pipe(rename(function(path) {
			path.basename = fontName;
		}))
		.pipe(gulp.dest(distDir + 'fonts'));
});

gulp.task('lint', function() {
	//return gulp.src('app/js/**/*.js')
	/*	.pipe(jshint())
		.pipe(jshint.reporter(stylishReporter))
		.pipe(jshint.reporter('fail'));*/
});

gulp.task('clean', function() {
	return del.sync('app/dist');
});
