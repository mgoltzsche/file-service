#!/bin/sh
if [ -z "$WEBDAV_DEPLOY_HOST" ]; then
	WEBDAV_DEPLOY_HOST='192.168.122.209'
fi
BUILD_VERSION=$(cat pom.xml | grep -Po '(?<=<version>)([^<]+)' | head -n 1)

if [ "$1" != 'deploy' ]; then
	mvn clean install
	if [ $? != 0 ]; then
		exit 1;
	fi
fi

rsync "target/webdav-client-$BUILD_VERSION-web.zip" $WEBDAV_DEPLOY_HOST:/home/max/webdav-client.zip &&
ssh $WEBDAV_DEPLOY_HOST "cd /tmp && rm -rf webdav-client-$BUILD_VERSION; \
	unzip /home/max/webdav-client.zip && \
	rm -rf /var/www/robin/web/ui && \
	mv webdav-client-$BUILD_VERSION /var/www/robin/web/ui && \
	chown -R max:www-data /var/www/robin/web/ui && \
	chmod -R 755 /var/www/robin/web/ui && \
	find /var/www/robin/web/ui/ -type f | xargs chmod 644"
