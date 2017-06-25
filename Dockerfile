FROM alpine:3.6
MAINTAINER "Max Goltzsche" <max.goltzsche@gmail.com>
LABEL description="nginx-based WebDAV file service"

RUN addgroup www-data && adduser -S -D -G www-data www-data -H -s /sbin/nologin

ENV NGINX_VERSION 1.13.1
ENV NGINX_PCRE_VERSION 8.40
ENV NGINX_MOD_DAV_EXT_VERSION 0.0.3

# Download, compile and install nginx
RUN set -x \
	&& BUILD_DEPS='gnupg gcc g++ make openssl-dev zlib-dev expat-dev gd-dev' \
	&& apk add --no-cache --update openssl expat zlib gd $BUILD_DEPS \
	&& DOWNLOAD_DIR=$(mktemp -d) \
	&& cd $DOWNLOAD_DIR \
	&& wget -O nginx.tar.gz     https://nginx.org/download/nginx-$NGINX_VERSION.tar.gz \
	&& wget -O nginx.tar.gz.asc https://nginx.org/download/nginx-$NGINX_VERSION.tar.gz.asc \
	&& wget -O pcre.tar.bz2     ftp://ftp.csx.cam.ac.uk/pub/software/programming/pcre/pcre-$NGINX_PCRE_VERSION.tar.bz2 \
	&& wget -O pcre.tar.bz2.sig ftp://ftp.csx.cam.ac.uk/pub/software/programming/pcre/pcre-$NGINX_PCRE_VERSION.tar.bz2.sig \
	&& wget -O nginx-dav.tar.gz https://github.com/arut/nginx-dav-ext-module/archive/v$NGINX_MOD_DAV_EXT_VERSION.tar.gz \
	&& export GNUPGHOME=$(mktemp -d) \
	&& gpg --keyserver ha.pool.sks-keyservers.net --recv-keys A1C052F8 FB0F43D8 \
	&& gpg --batch --verify nginx.tar.gz.asc nginx.tar.gz \
	&& gpg --batch --verify pcre.tar.bz2.sig pcre.tar.bz2 \
	&& SRC_DIR=$(mktemp -d) \
	&& tar -xzf nginx.tar.gz -C $SRC_DIR \
	&& tar -xjf pcre.tar.bz2 -C $SRC_DIR \
	&& tar -xzf nginx-dav.tar.gz -C $SRC_DIR \
	&& cd $SRC_DIR/nginx-$NGINX_VERSION \
	&& ./configure \
		--prefix=/usr/local/lib/nginx \
		--user=nginx \
		--group=nginx \
		--pid-path=/var/run/nginx.pid \
		--conf-path=/etc/nginx/nginx.conf \
		--error-log-path=stderr \
		--http-log-path=/dev/stdout \
		--http-client-body-temp-path=/var/nginx-client-body \
		--with-http_ssl_module \
		--with-pcre-jit \
		--with-http_gzip_static_module \
		--with-http_image_filter_module \
		--with-http_flv_module \
		--with-http_mp4_module \
		--with-http_gunzip_module \
		--with-http_dav_module \
		--with-pcre=$SRC_DIR/pcre-$NGINX_PCRE_VERSION \
		--add-module=$SRC_DIR/nginx-dav-ext-module-$NGINX_MOD_DAV_EXT_VERSION \
	&& make \
	&& make install \
	&& ln -s /usr/local/lib/nginx/sbin/nginx /usr/local/bin/nginx \
	&& mkdir -pm 755 /etc/nginx/conf.d /var/www /etc/nginx/ssl/private /etc/nginx/ssl/certs \
	&& rm -rf $GNUPGHOME $DOWNLOAD_DIR $SRC_DIR \
	&& apk del --purge $BUILD_DEPS

ENV NGINX_IMAGE_FILTER_JPEG_QUALITY 80
ENV NGINX_IMAGE_FILTER_WEBP_QUALITY 80
ENV NGINX_IMAGE_FILTER_TRANSPARENCY on
ENV NGINX_IMAGE_FILTER_INTERLACE off
ENV NGINX_IMAGE_FILTER_SHARPEN 0
ENV NGINX_IMAGE_FILTER_BUFFER 4m


COPY dist/ /var/www/html

RUN chmod -R ugo-w /var/www \
	&& mkdir -pm 770 /var/www/files \
	&& chown root:www-data /var/www/files

EXPOSE 80 443

VOLUME /var/www/files

ADD nginx-conf/nginx.conf /etc/nginx/
ADD nginx-conf/default.conf /etc/nginx/conf.d/
ADD nginx-conf/image-api-help.html /var/www/index.html
ADD entrypoint.sh /

ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/local/bin/nginx", "-g", "daemon off; user root;"]
