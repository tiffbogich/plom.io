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


void transfer_estimated(struct s_best *p_best, const gsl_vector *x)
{
    /* transfer estimated parameters from x (required by the simplex algo) to p_best->mean */

    int k;
    for(k=0; k< p_best->n_to_be_estimated; k++){
        gsl_vector_set(p_best->mean,
                       p_best->to_be_estimated[k],
                       gsl_vector_get(x, k));
    }

}

void simplex(struct s_best *p_best, struct s_data *p_data, void *p_params_simplex, double (*f_simplex)(const gsl_vector *, void *), double CONVERGENCE_STOP_SIMPLEX, int M)
{
  /* simplex algo using GSL. Straightforward adaptation of the GSL doc
     example */

#if FLAG_VERBOSE
  char str[255];
#endif

  FILE *p_file_best = sfr_fopen(SFR_PATH, GENERAL_ID, "best", "w", header_best, p_data);

  double log_like;

  const gsl_multimin_fminimizer_type *T = gsl_multimin_fminimizer_nmsimplex2;
  gsl_multimin_fminimizer *simp = NULL;
  gsl_multimin_function minex_func;

  int iter = 0;
  int status;
  double size;

  gsl_vector *x = gsl_vector_alloc(p_best->n_to_be_estimated);
  gsl_vector *jump_sizes = gsl_vector_alloc(p_best->n_to_be_estimated);

  int k;
  for (k=0; k<p_best->n_to_be_estimated; k++) {
      gsl_vector_set(x, k, gsl_vector_get(p_best->mean, p_best->to_be_estimated[k]));
      gsl_vector_set(jump_sizes, k, sqrt(gsl_matrix_get(p_best->var, p_best->to_be_estimated[k], p_best->to_be_estimated[k]))); //note the sqrt !!
  }

  /* Initialize method and iterate */
  minex_func.n = p_best->n_to_be_estimated;
  minex_func.f = f_simplex;
  minex_func.params = p_params_simplex;

  simp = gsl_multimin_fminimizer_alloc(T, p_best->n_to_be_estimated );

  gsl_multimin_fminimizer_set(simp, &minex_func, x, jump_sizes);

  do
    {
#if FLAG_JSON //for the webApp, we block at every iterations to prevent the client to be saturated with msg
        block();
#endif

      iter++;
      status = gsl_multimin_fminimizer_iterate(simp);
      if (status) break;
      size = gsl_multimin_fminimizer_size(simp);
      status = gsl_multimin_test_size(size, CONVERGENCE_STOP_SIMPLEX);

      log_like = - gsl_multimin_fminimizer_minimum(simp);

#if FLAG_VERBOSE
      if (status == GSL_SUCCESS) {
        print_log ("converged to maximum !");
      }
      sprintf(str, "%5d logLike = %12.5f size = %.14f", iter, log_like, size);
      print_log(str);
#endif

      transfer_estimated(p_best, gsl_multimin_fminimizer_x(simp));
      print_best(p_file_best, iter-1, p_best, p_data, log_like);

    } while (status == GSL_CONTINUE && iter < M);

  sfr_fclose(p_file_best);

  gsl_multimin_fminimizer_free(simp);
  gsl_vector_free(x);
  gsl_vector_free(jump_sizes);
}
