#!/usr/bin/env sh

for dir in *
do
  if [ "`basename $0`" != "$dir" ]
  then
    mkdir -p $dir/oauth2/lib
    cp -r ../lib/ $dir/oauth2/lib/
    echo "Copied OAuth 2.0 library to $dir"
  fi
done
