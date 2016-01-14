#!/bin/sh
HOST='192.168.122.209'
BUILD_VERSION='0.0.1'

if [ "$1" != 'deploy' ]; then
	mvn clean install
	if [ $? != 0 ]; then
		exit 1;
	fi
fi

rsync "target/webdav-client-$BUILD_VERSION-web.zip" $HOST:/home/max/webdav-client.zip &&
ssh $HOST "cd /tmp && rm -rf webdav-client-$BUILD_VERSION; \
	unzip /home/max/webdav-client.zip && \
	rm -rf /var/www/robin/ui && \
	mv webdav-client-$BUILD_VERSION /var/www/robin/ui"
