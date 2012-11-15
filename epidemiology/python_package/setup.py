#!/usr/bin/env python

from distutils.core import setup

setup(name='plom',
      version='0.1.0',
      description='plom model builder for epidemiology',
      author='Sebastien Ballesteros',
      author_email='sebastien@plom.io',
      url='http://www.plom.io',
      packages=['plom'],
      package_dir={'plom': 'model_builder'},
      scripts=['scripts/plom', 'scripts/sfi'],
      package_data={'plom': ['C_lib/src/C/core/*',
                             'C_lib/src/C/kalman/*',
                             'C_lib/src/C/mif/*',
                             'C_lib/src/C/pmcmc/*',
                             'C_lib/src/C/simplex/*',
                             'C_lib/src/C/simulation/*',
                             'C_lib/src/C/smc/*',
                             'C_lib/src/C/worker/*',
                             'C_lib/doc/Doxyfile']}
)
