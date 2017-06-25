# Install docker: wget -qO- https://get.docker.com/ | sh

buildJS() {
	docker run -it --rm --name webdav-ui-build -v "$(pwd):/src" -w /src node:6.11.0 /bin/sh -c "npm install && npm run gulp"
}

buildImage() {
	IMAGE_NAME=mgoltzsche/file-service:latest
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
			docker run --rm --name webdav-service -e IMAGE_CROP_27_23=true -e IMAGE_RESIZE_100_100=true -p 80:80 "$IMAGE_NAME"
			;;
		work)
			docker run --rm --name webdav-service -p 80:80 -v "$(pwd)/dist:/var/www/html" "$IMAGE_NAME"
			;;
		*)
			echo "Usage: $0 [js|image|run|work]"
			;;
	esac
	shift
done
