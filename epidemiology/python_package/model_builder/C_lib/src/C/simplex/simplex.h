/**************************************************************************
 *    This file is part of plom.
 *
 *    plom is free software: you can redistribute it and/or modify it
 *    under the terms of the GNU General Public License as published
 *    by the Free Software Foundation, either version 3 of the
 *    License, or (at your option) any later version.
 *
 *    plom is distributed in the hope that it will be useful, but
 *    WITHOUT ANY WARRANTY; without even the implied warranty of
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *    GNU General Public License for more details.
 *
 *    You should have received a copy of the GNU General Public
 *    License along with plom.  If not, see
 *    <http://www.gnu.org/licenses/>.
 *************************************************************************/

#include "plom.h"
#define BIG_NUMBER 1e20

int OPTION_LEAST_SQUARE;


struct s_simplex
{
  /* from simforence core */
  struct s_data *p_data;
  struct s_calc **calc;
  struct s_best *p_best;
  struct s_par *p_par; /* [N_G] */
  struct s_X *p_X;

  /*simplex specific*/
  double smallest_log_like;   /* if the initial conditions do not
                                 respect the constraint we set the log
                                 likelihood to the smallest possible
                                 value:
                                 smallest_log_like. smallest_log_like
                                 is computed by the function
                                 get_smallest_log_likelihood() */
};


/*function prototypes*/

/* methods.c */
double f_simplex(const gsl_vector *x, void *params);

/* build.c */
struct s_simplex *build_simplex(int general_id);
void clean_simplex(struct s_simplex *p_simplex);
