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


double get_smallest_log_likelihood(struct s_data_ind **data_ind)
{
  int n;
  double smallest_log_like = 0.0;

  for(n=0 ; n<N_DATA_NONAN; n++)
    smallest_log_like += data_ind[n]->n_nonan;

  return smallest_log_like * LOG_LIKE_MIN;
}


double get_sum_square(struct s_X *p_X, struct s_par *p_par, struct s_data *p_data, struct s_calc *p_calc)
{
    /* Return sum of square (used for least square). The sum is computed **only** on ts != NaN */

    int ts, ts_nonan;
    double ss = 0.0;

    /* syntax shortcuts */
    int n = p_calc->current_n;
    struct s_data_ind * p_data_ind_n = p_data->data_ind[n];

    for(ts=0; ts< p_data_ind_n->n_nonan; ts++) {
        ts_nonan = p_data_ind_n->ind_nonan[ts];
        ss += pow( p_data->data[p_calc->current_nn][ts_nonan] - obs_mean(p_X->obs[ts_nonan], p_par, p_data, p_calc, ts_nonan), 2);
    }

    return ss;
}


double get_log_likelihood(struct s_X *p_X, struct s_par *p_par, struct s_data *p_data, struct s_calc *p_calc)
{
  /* Return sum log likelihood. The sum is computed **only** on ts != NaN */

  int ts, ts_nonan;
  double loglike = 0.0;

  /* syntax shortcuts */
  int n = p_calc->current_n;
  struct s_data_ind * p_data_ind_n = p_data->data_ind[n];

  for(ts=0; ts< p_data_ind_n->n_nonan; ts++) {
      ts_nonan = p_data_ind_n->ind_nonan[ts];
      loglike += log(likelihood(p_X->obs[ts_nonan], p_par, p_data, p_calc, ts_nonan));
  }

  return loglike;

}

double likelihood(double x, struct s_par *p_par, struct s_data *p_data, struct s_calc *p_calc, int ts)
{
    /*x is the predicted value from the model that we contrast with a time serie ts.
      Note: user should not use this function but get_log_likelihood
     */

    int n, nn;
    double t;
    n = p_calc->current_n;
    nn = p_calc->current_nn;
    t = (double) p_data->times[n];

    struct s_router **routers = p_data->routers;

    double like; /* likelihood value */

    double y = p_data->data[nn][ts];

    double **par = p_par->natural;
    double ***covar = p_data->par_fixed;

    /*automaticaly generated code*/
    double gsl_mu = {{ proc_obs.mean|safe }};
    double gsl_sd = sqrt( {{ proc_obs.var|safe }} );

    if (y > 0.0) {
        like=gsl_cdf_gaussian_P(y+0.5-gsl_mu, gsl_sd)-gsl_cdf_gaussian_P(y-0.5-gsl_mu, gsl_sd);
    } else {
        like=gsl_cdf_gaussian_P(y+0.5-gsl_mu, gsl_sd);
    }

    return sanitize_likelihood(like);
}

/**
 *  checks for numerical issues...
 */
double sanitize_likelihood(double like)
{
    if ((isinf(like)==1) || (isnan(like)==1) || (like<0.0) ) { /*we avoid 0.0 to avoid nan when taking log*/
#if FLAG_VERBOSE
        char str[STR_BUFFSIZE];
        sprintf(str, "error likelihood computation, like=%g\n", like);
        print_err(str);
#endif
        like = LIKE_MIN;
    } else {

        if (like <= 0.0) { /*likelihood ==0.0 => create trouble when taking log.. we set to LIKE_MIN*/
            like = LIKE_MIN;
        }

    }
    return like;
}
