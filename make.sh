# Install docker: wget -qO- https://get.docker.com/ | sh

buildJS() {
	docker run -it --rm --name webdav-ui-build -v "$(pwd):/src" -w /src node:6.11.0 /bin/sh -c "npm install && npm run gulp"
}

buildImage() {
	IMAGE_NAME=mgoltzsche/file-service:latest
	docker build -t "$IMAGE_NAME" --rm .
}

case "$1" in
	npm)
		buildJS
		;;
	image)
		buildImage
		;;
	'')
		buildJS &&
		buildImage
		;;
	run)
		buildJS &&
		buildImage &&
		docker run -p 80:80 "$IMAGE_NAME"	
		;;
	*)
		echo "Usage: $0 [npm|image|run]"
		;;
esac
