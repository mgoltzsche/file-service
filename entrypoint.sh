#!/bin/sh

##
# Container entrypoint.
# Generates environment variable based nginx image server.
##

generateImageServerConfig() {
	INFO_JSON=
	LOCATIONS=
	for TRANSFORM_ENV in $(set | grep -E "^IMAGE_(RESIZE|CROP)_[1-9][0-9]*_[1-9][0-9]*='true'$" | sed -E "s/(^IMAGE_)|=.*//g"); do
		TRANSFORM=$(echo $TRANSFORM_ENV | cut -d _ -f 1 | tr '[:upper:]' '[:lower:]')
		WIDTH=$(echo $TRANSFORM_ENV | cut -d _ -f 2)
		HEIGHT=$(echo $TRANSFORM_ENV | cut -d _ -f 3)
		LOCATIONS="$LOCATIONS"$'\n\n'"$(generateLocation $TRANSFORM $WIDTH $HEIGHT)"
		INFO_JSON="$INFO_JSON,{\"transformation\":\"$TRANSFORM\",\"width\":$WIDTH,\"height\":$HEIGHT}"
	done
	INFO_JSON="$(echo "$INFO_JSON" | sed -E 's/^,//')"
	INFO_JSON="{\"transformations\": [$INFO_JSON]}"
	cat > /etc/nginx/image-transform.generated <<-EOF
		image_filter_jpeg_quality $NGINX_IMAGE_FILTER_JPEG_QUALITY;
		image_filter_webp_quality $NGINX_IMAGE_FILTER_WEBP_QUALITY;
		image_filter_transparency $NGINX_IMAGE_FILTER_TRANSPARENCY;
		image_filter_interlace    $NGINX_IMAGE_FILTER_INTERLACE;
		image_filter_sharpen      $NGINX_IMAGE_FILTER_SHARPEN;
		image_filter_buffer       $NGINX_IMAGE_FILTER_BUFFER;

		location = /image/info {
		  return 200 '$INFO_JSON';
		  add_header Content-Type application/json;
		}

		$LOCATIONS
	EOF
	[ $? -eq 0 ] || return 1
}

# Generates an nginx configuration location entry for a given image transformation.
# Args: TRANSFORMATION WIDTH HEIGHT
generateLocation() {
	cat <<-EOF
		location /image/${1}/${2}x${3}/ {
		  alias \$file_dir/;
		  image_filter $1 $2 $3;
		}
	EOF
}

terminateGracefully() {
	trap : SIGHUP SIGINT SIGQUIT SIGTERM # Disable termination call on signal to avoid infinite recursion
	kill $NGINX_PID
	for TIMES in 1 1 1 1 1 1 1 1 1 1; do
		if ! kill -0 $NGINX_PID >/dev/null 2>/dev/null; then
			exit 0
		fi
		sleep 1
	done
	kill -9 $NGINX_PID
	exit 1
}

generateImageServerConfig &&
trap terminateGracefully SIGHUP SIGINT SIGQUIT SIGTERM &&
"$@" &
NGINX_PID=$!
wait
