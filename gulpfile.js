var pkg = require('./package.json');
var gulp = require('gulp');
var babel = require('gulp-babel');
var jshint = require('gulp-jshint');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var stylishReporter = require('jshint-stylish');
var uglify = require('gulp-uglify');
var browserify = require('browserify');
var babelify = require('babelify');
var eslint = require('babel-eslint');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var del = require('del');

gulp.task('default', ['browserify', 'sass'], function() {
	return gulp.src('./package.json')
		.pipe(gulp.dest('${basedir}/target/web-distribution'));
});

gulp.task('babel', ['clean'], function() {
	return gulp.src('js/*.js')
		.pipe(babel({
			presets: ['es2015']
		}))
		.pipe(gulp.dest('js'));
});

gulp.task('sass', ['clean'], function() {
	return gulp.src(['${basedir}/src/main/css/webdav-client.scss'])
		.pipe(sourcemaps.init())
		.pipe(sass({outputStyle: 'compressed'}))
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('${basedir}/target/web-distribution/css'));
});

gulp.task('browserify', ['clean', 'lint'], function() {
	return browserify('js/main.js')
		.transform(babelify, {presets: [/*'es2015',*/ 'react']}) // compile with ECMA Script 6 and react
		.bundle()
		.pipe(source(pkg.name + '-' + pkg.version + '.min.js')) // converts to vinyl src with name
		.pipe(buffer())                     // converts to vinyl buffer obj
		.pipe(uglify()) 
		.pipe(gulp.dest('${basedir}/target/web-distribution/js'));
});

gulp.task('lint', function() {
//	return eslint(); // TODO: babel es6 lint
	//return gulp.src('${basedir}/src/main/javascript/**/*.js')
	/*	.pipe(jshint())
		.pipe(jshint.reporter(stylishReporter))
		.pipe(jshint.reporter('fail'));*/
});

gulp.task('clean', function() {
	return del.sync('./**.js');
});
