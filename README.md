# file-service
Service to share and browse files using a JavaScript UI and WebDAV based on [nginx](http://nginx.org).


## Requirements

- Docker
- optional: nodejs, npm, gulp


## Run

To build and run the service using docker run the following shell script:
```
./make.sh js image run
```


## UI

The UI is written in JavaScript using React and built with npm and gulp.


## WebDAV

WebDAV is supported using nginx' [ngx_http_dav_module](http://nginx.org/en/docs/http/ngx_http_dav_module.html) and the extension [nginx-dav-ext-module](https://github.com/arut/nginx-dav-ext-module).


## Image transformations

Image transformations are supported by nginx' [ngx_http_image_filter_module](http://nginx.org/en/docs/http/ngx_http_image_filter_module.html).

To prevent the service from DOS attacks and to control cache growth a limited amount of supported image resolutions must be configured in nginx.
This can be done using environment variables with the following name convention:
```
IMAGE_(RESIZE|CROP)_{WIDTH}_{HEIGHT}=true
```

For instance to support cropped images of size 150x200 set:
```IMAGE_CROP_150_200=true```


## Pseudo streaming

HTTP pseudo streaming is supported for mp4 and flv files.
