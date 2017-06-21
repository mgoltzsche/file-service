# Install docker: wget -qO- https://get.docker.com/ | sh

IMAGE_NAME=mgoltzsche/file-service:latest

docker build -t "$IMAGE_NAME" --rm . || exit 1

if [ "$1" = run ]; then
	docker run -p 80:80 "$IMAGE_NAME"
fi
