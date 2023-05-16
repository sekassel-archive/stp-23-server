#!/usr/bin/env sh
# requires imagemagick
mogrify -gravity northwest -crop 384x96+0+0 +repage characters/*.png
