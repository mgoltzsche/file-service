#!/bin/sh
HOST='192.168.122.209'
BUILD_VERSION='0.0.1'
mvn clean install &&
rsync "target/webdav-client-$BUILD_VERSION-web.zip" $HOST:/home/max/webdav-client.zip &&
ssh $HOST "cd /tmp && rm -rf webdav-client-$BUILD_VERSION; \
	unzip /home/max/webdav-client.zip && \
	rm -rf /var/www/robin/js && \
	rm -rf /var/www/robin/css && \
	rm -rf /var/www/robin/index.html && \
	cp -r webdav-client-$BUILD_VERSION/js /var/www/robin/js && \
	cp -r webdav-client-$BUILD_VERSION/css /var/www/robin/css && \
	cp webdav-client-$BUILD_VERSION/index.html /var/www/robin/index.html"
