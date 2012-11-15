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

void swap_1d(double **A, double **tmp_A)
{
  /* swap pointers to double */

  double *tmp;

  tmp=*tmp_A;
  *tmp_A=*A;
  *A=tmp;
}


void swap_2d(double ***A, double ***tmp_A)
{
  /* swap array of pointers to double */

  double **tmp;
  tmp=*tmp_A;
  *tmp_A=*A;
  *A=tmp;
}


void swap_gsl_vector(gsl_vector **A, gsl_vector **tmp_A)
{
  /* swap pointers to gsl_vector */

  gsl_vector *tmp;

  tmp=*tmp_A;
  *tmp_A=*A;
  *A=tmp;
}

void swap_X(struct s_X ***X, struct s_X ***tmp_X)
{
  /* swap array of pointers of pointers to struct s_X */

  struct s_X **tmp;
  tmp=*tmp_X;
  *tmp_X=*X;
  *X=tmp;
}

void swap_D_p_hat(struct s_hat ***D_p_hat, struct s_hat ***tmp_D_p_hat)
{
  /* swap array of pointers to struct s_hat */

  struct s_hat **tmp;
  tmp = *tmp_D_p_hat;
  *tmp_D_p_hat = *D_p_hat;
  *D_p_hat = tmp;
}
