#!/bin/bash

if [ -d "plom" ]; then
    rm -rf plom
fi

R CMD BATCH package.r

cp DESCRIPTION plom/

R CMD build plom

R -q -e "install.packages('plom_0.1.tar.gz', type='source', repos=NULL)"
