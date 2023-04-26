#!/usr/bin/env sh
# requires imagemagick
size=128
convert 'monsters_originals/*.png' \
  -set filename:fn '%[basename]' \
  -filter Point \
  -resize "${size}x${size}>" \
  -background transparent \
  -gravity South \
  -extent "${size}x${size}" \
  'monsters/%[filename:fn].png'
