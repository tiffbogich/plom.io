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

/**
   euleur maruyama
   ind_drift_start and ind_drift_end are used to separate (if needed) in between drift on par_proc and drift on par_obs
*/

void compute_drift(struct s_X *p_X, struct s_par *p_par, struct s_data *p_data, struct s_calc *p_calc, int ind_drift_start, int ind_drift_end, double delta_t)
{

    int i, k;

    struct s_drift *p_drift = p_data->p_drift;
    struct s_router **routers = p_data->routers;

    for(i=ind_drift_start; i<ind_drift_end; i++) {
        int ind_par_Xdrift_applied = p_drift->ind_par_Xdrift_applied[i];
        int ind_volatility_Xdrift = p_drift->ind_volatility_Xdrift[i];
        for(k=0; k< routers[ind_par_Xdrift_applied]->n_gp; k++) {
            p_X->drift[i][k] += p_par->natural[ ind_volatility_Xdrift ][k]*sqrt(delta_t)*gsl_ran_ugaussian(p_calc->randgsl);
        }
    }
}

/**
   apply drift on par
*/

void drift_par(struct s_calc *p_calc, struct s_par *p_par, struct s_data *p_data, struct s_X *p_X, int ind_drift_start, int ind_drift_end)
{

    int i, k;
    struct s_drift *p_drift = p_data->p_drift;
    struct s_router **routers = p_data->routers;

    for(i=ind_drift_start; i<ind_drift_end; i++) {
        int ind_par_Xdrift_applied = p_drift->ind_par_Xdrift_applied[i];
        for(k=0; k< routers[ind_par_Xdrift_applied]->n_gp; k++) {
            p_calc->natural_drifted_safe[i][k] = (*(routers[ind_par_Xdrift_applied]->f_inv))( p_X->drift[i][k] , routers[ind_par_Xdrift_applied]->multiplier_f_inv,routers[ind_par_Xdrift_applied]->min[k],routers[ind_par_Xdrift_applied]->max[k]);
        }
    }
}
