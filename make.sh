# Install docker: wget -qO- https://get.docker.com/ | sh

IMAGE_NAME=mgoltzsche/file-service:latest
# TODO: let JS read resolutions from server API
RESOLUTIONS='-e IMAGE_CROP_27_23=true -e IMAGE_RESIZE_1898_1024=true -e IMAGE_RESIZE_1344_968=true -e IMAGE_RESIZE_618_584=true'

buildJS() {
	docker run -it --rm --name webdav-ui-build -v "$(pwd):/src" -w /src node:6.11.0 /bin/sh -c "npm install && npm run gulp"
}

buildImage() {
	docker build -t "$IMAGE_NAME" --rm .
}

if [ $# -eq 0 ]; then
	buildJS &&
	buildImage
	exit $?
fi

while [ $# -gt 0 ]; do
	case "$1" in
		js)
			buildJS
			;;
		image)
			buildImage
			;;
		run)
			docker run --rm --name webdav-service $RESOLUTIONS -p 80:80 "$IMAGE_NAME"
			;;
		work)
			docker run --rm --name webdav-service $RESOLUTIONS -p 80:80 -v "$(pwd)/dist:/var/www/html" "$IMAGE_NAME"
			;;
		*)
			echo "Usage: $0 [js|image|run|work]"
			;;
	esac
	shift
done
