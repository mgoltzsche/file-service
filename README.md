# file-service
Service to share and browse files using a JavaScript UI and WebDAV based on [nginx](http://nginx.org).

## Requirements

- Docker
- optional: [nodejs](https://nodejs.org/), [npm](https://www.npmjs.com/), [gulp](http://gulpjs.com/)


## Run

To build and run the service using docker run the following shell script:
```
./make.sh js image run
```
Note that everything is built in a container. Finally the service is run in a container too.


## UI

The UI is written in JavaScript using [React](https://facebook.github.io/react/) and built with [npm](https://www.npmjs.com/) and [gulp](http://gulpjs.com/).


## WebDAV

WebDAV is supported using nginx' [ngx_http_dav_module](http://nginx.org/en/docs/http/ngx_http_dav_module.html) and the extension [nginx-dav-ext-module](https://github.com/arut/nginx-dav-ext-module).


## Image transformations

Image transformations are supported by nginx' [ngx_http_image_filter_module](http://nginx.org/en/docs/http/ngx_http_image_filter_module.html).

To prevent the service from DOS attacks and to control cache growth a limited amount of supported image resolutions must be configured in nginx.
This can be done using container environment variables with the following name convention:
```
IMAGE_(RESIZE|CROP)_{WIDTH}_{HEIGHT}=true
```

For instance to serve resized images within a bounding box of 150x200 at `/image/resize/150x200/{IMAGEFILE}` set `IMAGE_RESIZE_150_200=true`.


## Pseudo streaming

HTTP pseudo streaming is supported for mp4 and flv files.


## Security

Per default this service runs without SSL and without any file access restrictions.
When the service is accessible in the internet authentication and authorization as well as SSL must be configured.

### SSL

This service's nginx installation can be configured to use SSL since it has been compiled with SSL (see comments in [nginx-conf/default.conf]).
However it is recommended to configure SSL in your proxy server or load balancer that passes traffic through to avoid useless SSL overhead.
Hence you do not need to enable SSL as long as you do not publish your server in a public network.

### Authentication & authorization approaches

- Configure basic auth using a .htaccess file (see comments in [nginx-conf/default.conf])
- Use a [Keycloak](http://www.keycloak.org/) based proxy to secure the service in a unified manner.

Earlier versions supported basic auth and authorization using LDAP.
To add LDAP support nginx must be compiled with the 3rd party module [nginx-auth-ldap](https://github.com/kvspb/nginx-auth-ldap).
This approach has been deprecated due conflicts between openssl-dev and openldap-dev in alpine >3.4 and in favour of the more complete keycloak solution mentioned above.

## TL;DR

I have built this service once as a platform to share files with my friends and to evaluate React and the nodejs ecosystem.
