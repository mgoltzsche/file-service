# package openldap-dev conflicts with openssl-dev on alpine >3.4 (current: 3.6)
FROM alpine:3.4
MAINTAINER "Max Goltzsche" <max.goltzsche@gmail.com>
LABEL description="nginx-based WebDAV file service"

RUN addgroup www-data && adduser -S -D -G www-data www-data -H -s /sbin/nologin

ENV NGINX_VERSION 1.13.1
ENV NGINX_PCRE_VERSION 8.40
ENV NGINX_MOD_DAV_EXT_VERSION 0.0.3
# TODO: use concrete ldap plugin version when up-to-date: ENV NGINX_MOD_LDAP_VERSION 0.1

# Download, compile and install nginx
RUN set -x \
	&& BUILD_DEPS='gnupg gcc g++ make openssl-dev zlib-dev expat-dev gd-dev openldap-dev' \
	&& apk add --no-cache --update openssl expat zlib gd libldap $BUILD_DEPS \
	&& DOWNLOAD_DIR=$(mktemp -d) \
	&& cd $DOWNLOAD_DIR \
	&& wget -O nginx.tar.gz     https://nginx.org/download/nginx-$NGINX_VERSION.tar.gz \
	&& wget -O nginx.tar.gz.asc https://nginx.org/download/nginx-$NGINX_VERSION.tar.gz.asc \
	&& wget -O pcre.tar.bz2     ftp://ftp.csx.cam.ac.uk/pub/software/programming/pcre/pcre-$NGINX_PCRE_VERSION.tar.bz2 \
	&& wget -O pcre.tar.bz2.sig ftp://ftp.csx.cam.ac.uk/pub/software/programming/pcre/pcre-$NGINX_PCRE_VERSION.tar.bz2.sig \
	&& wget -O nginx-dav.tar.gz https://github.com/arut/nginx-dav-ext-module/archive/v$NGINX_MOD_DAV_EXT_VERSION.tar.gz \
	&& wget -O nginx-ldap.tar.gz https://github.com/kvspb/nginx-auth-ldap/archive/master.tar.gz \
	&& export GNUPGHOME=$(mktemp -d) \
	&& gpg --keyserver ha.pool.sks-keyservers.net --recv-keys A1C052F8 \
	&& gpg --batch --verify nginx.tar.gz.asc nginx.tar.gz \
	&& gpg --keyserver ha.pool.sks-keyservers.net --recv-keys FB0F43D8 \
	&& gpg --batch --verify pcre.tar.bz2.sig pcre.tar.bz2 \
	&& SRC_DIR=$(mktemp -d) \
	&& tar -xzf nginx.tar.gz -C $SRC_DIR \
	&& tar -xjf pcre.tar.bz2 -C $SRC_DIR \
	&& tar -xzf nginx-dav.tar.gz -C $SRC_DIR \
	&& tar -xzf nginx-ldap.tar.gz -C $SRC_DIR \
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
		--add-module=$SRC_DIR/nginx-auth-ldap-master \
	&& make \
	&& make install \
	&& ln -s /usr/local/lib/nginx/sbin/nginx /usr/local/bin/nginx \
	&& ln -s /usr/local/lib/nginx /usr/share/nginx \
	&& mkdir -pm 755 /etc/nginx/conf.d /var/www /var/cache/nginx /etc/nginx/ssl/private /etc/nginx/ssl/certs \
	&& rm -r $GNUPGHOME $DOWNLOAD_DIR $SRC_DIR \
	&& apk del --purge $BUILD_DEPS

EXPOSE 80 443

ADD nginx.conf /etc/nginx/
ADD default-vhost /etc/nginx/conf.d/default.conf

ENTRYPOINT ["/usr/local/bin/nginx"]
CMD ["-g", "daemon off; user www-data;"]
