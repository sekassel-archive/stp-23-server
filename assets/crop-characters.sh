#!/usr/bin/env sh
# requires imagemagick
frame=384x96
convert characters_originals/*.png \
  -set filename:fn '%[basename]' \
  -gravity northwest \
  -crop "$frame+0+0" \
  +repage \
  'characters/%[filename:fn].png'
