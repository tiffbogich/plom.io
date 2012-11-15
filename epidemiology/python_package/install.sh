#!/bin/bash

if [ -d "dist" ]; then
    rm -rf dist
fi

python setup.py sdist

cd dist
tar -zxvf plom-0.1.0.tar.gz
cd plom-0.1.0
python setup.py install
