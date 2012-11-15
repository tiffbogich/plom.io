#!/bin/bash

cd ../C/core

sed -ie "s/#define FLAG_JSON \([0-9]*\)/#define FLAG_JSON 0/" simforence.h
sed -ie "s/#define FLAG_VERBOSE \([0-9]*\)/#define FLAG_VERBOSE 0/" simforence.h
sed -ie "s/#define FLAG_WARNING \([0-9]*\)/#define FLAG_WARNING 0/" simforence.h
sed -ie "s/#define FLAG_DEBUG \([0-9]*\)/#define FLAG_DEBUG 0/" simforence.h

make clean
make
make install

paths=( "../simplex" "../smc" "../worker" "../mif" "../pmcmc" "../simulation" "../kalman" )

for i in "${paths[@]}"
do
    echo compiling$i

    cd $i

    make clean
    make
    make install
done
