Plom-population-based
===========================

Population level methods used by http://www.plom.io

NOTE: This README is dedicated to Plom developers.  If you are
interested in using Plom please go to http://www.plom.io/
where you will find appropriate documentation.

plom.io/epidemiology contains:
- plom command line tools. This code lives in script/
- Python code to generate model in plain C. This code lives in model_builder/
- C code to run models. This code lives in model_builder/C_lib/src/C/ The C code contain generic part and model specific part that are rendered using model_builder
- R code to plot the results. This code lives in R_package

##Dependencies

C:
- gsl: http://www.gnu.org/software/gsl/
- zmq: http://www.zeromq.org/
- jansson: http://www.digip.org/jansson/
- openMP: http://openmp.org/

Python:
- Python 2.7.x: www.python.org/
- Django: https://www.djangoproject.com/
- SymPy: http://sympy.org/
- NumPy: http://numpy.scipy.org/

R:
- RJSONIO: http://cran.r-project.org/web/packages/RJSONIO/index.html
- mgcv: http://cran.r-project.org/web/packages/mgcv/index.html


##Creating and installing plom python package (containing the C code as package data)

At the root of the repo run:

    ./install.sh

(see source for details)


##Creating and installing plom R package

In the directory R_package:

    ./install.sh

This script will generate the R package and install it (see source for details). 
**Be sure to have the R package ```roxygen2``` installed before running ```./install.sh```**

##Building and installing plom C library (libplom)

In model_builder/C_lib/src/C/core/

    make; make install


##Usage

See http://www.plom.io/doc/modeler/intro


##Contributing to the C library

First generate the documentation for the C code:
in model_builder/C_lib/doc/ run: ```doxygen Doxyfile``` and open model_builder/C_lib/doc/html/index.html with
a web browser.

After having learned the basic structures involved in ```core```, we
recommend to use call and caller graphs as an entry point to the
sources.