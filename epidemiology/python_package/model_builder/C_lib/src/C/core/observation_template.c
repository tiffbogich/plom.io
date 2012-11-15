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


double obs_mean(double x, struct s_par *p_par, struct s_data *p_data, struct s_calc *p_calc, int ts)
{
  /*x is the predicted value from the model that we contrast with a time serie ts*/
  struct s_router **routers = p_data->routers;

  double mu;
  int n, nn;
  double t;
  n = p_calc->current_n;
  nn = p_calc->current_nn;
  t = (double) (nn+1);

  double **par = p_par->natural;
  double ***covar = p_data->par_fixed;

  /*automaticaly generated code*/
  mu = {{ proc_obs.mean|safe }};

  return mu;
}

double obs_var(double x, struct s_par *p_par, struct s_data *p_data, struct s_calc *p_calc, int ts)
{
  /*x is the predicted value from the model that we contrast with a time serie ts*/
  struct s_router **routers = p_data->routers;

  double var;
  int n, nn;
  double t;
  n = p_calc->current_n;
  nn = p_calc->current_nn;
  t = (double) (nn+1);

  double **par = p_par->natural;
  double ***covar = p_data->par_fixed;

  /*automaticaly generated code*/
  var = {{ proc_obs.var|safe }};

  return var;
}


double observation(double x, struct s_par *p_par, struct s_data *p_data, struct s_calc *p_calc, int ts)
{
  /*x is the predicted value from the model that we contrast with a time serie ts*/
  struct s_router **routers = p_data->routers;

  int n, nn;
  double t;
  n = p_calc->current_n;
  nn = p_calc->current_nn;
  t = (double) (nn+1);

  double **par = p_par->natural;
  double ***covar = p_data->par_fixed;

  /*return an observation of the process model*/

  /*automaticaly generated code*/
  double gsl_mu= {{ proc_obs.mean|safe }};
  double gsl_sd=sqrt({{ proc_obs.var|safe }});

  double yobs= gsl_mu+gsl_ran_gaussian(p_calc->randgsl, gsl_sd);

  return (yobs >0) ? yobs : 0.0;

}
