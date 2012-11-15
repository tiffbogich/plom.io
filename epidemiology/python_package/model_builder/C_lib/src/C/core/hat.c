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
 *  fill hat_95[2] with the 95% confidence interval (lower value in
 *  hat_95[0] and upper one in hat_95[1]). to_be_sorted is an array
 *  of the J particle to be sorted and weights their weights.

 * NOTE: if weights is NULL, 1.0/J will be assumed as a weight
 */

void get_CI95(double *hat_95, const double *to_be_sorted, size_t *index_sorted, double *weights)
{
    int k;
    double weight_cum;

    double invJ = 1.0/ ((double) J);

    //get the index of to_be_sorted.
    gsl_sort_index(index_sorted, to_be_sorted, 1, J); //to_be_sorted is not modified (i.e. not sorted in place), the index of the sorting are put in index_sorted.

    //cumulate sorted weight until we reach 5 % and take the corresponding value in to_be_sorted
    k=0;
    weight_cum = 0.0;
    while(weight_cum < 0.05) {
        weight_cum += (weights) ? weights[index_sorted[k]]: invJ;
        k++;
    }
    hat_95[0] = to_be_sorted[index_sorted[((k-1) <0) ? 0 : k-1]];

    //cumulate sorted weight until we reach 95 % and take the corresponding value in to_be_sorted
    k=0;
    weight_cum = 0.0;
    while(weight_cum < 0.95) {
        weight_cum += (weights) ? weights[index_sorted[k]]: invJ;
        k++;
    }
    hat_95[1] = to_be_sorted[index_sorted[((k-1) <0) ? 0 : k-1]];
}


/**
 *  compute estimation of the state variable (p_hat->state) and the
 *  observation (D_p_hat->obs). The 95% confidence interval (CI) are
 *  also computed and stored in D_p_hat->state_95 and
 *  D_p_hat->obs_95. Note that the estimations are computed by a
 *  weighted average (each value is weighted by it's likelihood
 *  value).
 *
 *  A potential issue is that when we have missing data for all the
 *  time series, we don't have the weights for these times... In this
 *  case this function assume equal weight for every particle
 *  (weight= 1.0/J) so we compute an empirical average.
 *
 *  Time indexes: ok this is pretty confusing. D_J_p_X is [N_DATA+1],
 *  D_p_hat->... are in [N_DATA] so we have to be carrefull!
 *
 *  This function should be rewritten to avoid excessive code
 *  duplication...
 */

void compute_hat(struct s_X ***D_J_p_X, struct s_par *p_par, struct s_data *p_data, struct s_calc **calc, struct s_hat **D_p_hat, double *weights, int t0, int t1)
{

    //TODO weights = 1/J when no information

    int j, nn, i, k, ts;
    int thread_id;

    struct s_drift *p_drift = p_data->p_drift;
    struct s_router **routers = p_data->routers;

    /* par_sv */
#pragma omp parallel for private(thread_id, j, nn)
    for(i=0; i<(N_PAR_SV*N_CAC); i++) {
        thread_id = omp_get_thread_num();

        /* D_J_p_X[t1] contains the particles at t1 projected from
           t0. At t1 we have data so we know the weights hence we
           compute a weighted average */

        D_p_hat[t1-1]->state[i] = 0.0;
        for(j=0;j<J;j++) {
            calc[thread_id]->to_be_sorted[j] = D_J_p_X[t1][j]->proj[i]; //This sucks... gsl_sort_index requires an array to be sorted and our particles are in J_p_X[t1][j]->proj[i] so we use an helper array (calc[thread_id]->to_be_sorted)
            D_p_hat[t1-1]->state[i] += calc[thread_id]->to_be_sorted[j]*weights[j];
        }

        get_CI95(D_p_hat[t1-1]->state_95[i], calc[thread_id]->to_be_sorted, calc[thread_id]->index_sorted, weights);

        /* in between t0 and t1 (if t1-t0>1) there are no data (all ts
           are NaN) so there are no weights. In this case we compute an
           empirical average */
        for(nn=(t0+1); nn<t1; nn++) { //only if no data
            D_p_hat[nn-1]->state[i] = 0.0;
            for(j=0;j<J;j++) {
                calc[thread_id]->to_be_sorted[j] = D_J_p_X[nn][j]->proj[i]; //This sucks... gsl_sort_index requires an array to be sorted and our particles are in J_p_X[t1][j]->proj[i] so we use an helper array (calc[thread_id]->to_be_sorted)
                D_p_hat[nn-1]->state[i] += calc[thread_id]->to_be_sorted[j];
            }
            D_p_hat[nn-1]->state[i] /= ((double) J);

            get_CI95(D_p_hat[nn-1]->state_95[i], calc[thread_id]->to_be_sorted, calc[thread_id]->index_sorted, NULL);
        }

    } /* end for on i */


    /* obs [N_TS] same thing as for state except that we use obs_mean()
       on p_X->obs */
#pragma omp parallel for private(thread_id, j, nn)
    for(ts=0; ts<N_TS; ts++) {
        thread_id = omp_get_thread_num();

        /* weighted average */
        D_p_hat[t1-1]->obs[ts] = 0.0;
        for(j=0;j<J;j++) {

            /* makes sure that p_calc contains the natural values of the drifted obs process parameters */
            drift_par(calc[thread_id], p_par, p_data, D_J_p_X[t1][j], N_DRIFT_PAR_PROC, N_DRIFT_PAR_PROC + N_DRIFT_PAR_OBS);

            calc[thread_id]->to_be_sorted[j] = obs_mean(D_J_p_X[t1][j]->obs[ts], p_par, p_data, calc[thread_id], ts);
            D_p_hat[t1-1]->obs[ts] += calc[thread_id]->to_be_sorted[j]*weights[j];
        }

        get_CI95(D_p_hat[t1-1]->obs_95[ts], calc[thread_id]->to_be_sorted, calc[thread_id]->index_sorted, weights);

        /* empirical average */
        for(nn=(t0+1); nn<t1; nn++) { //only if no data
            D_p_hat[nn-1]->obs[ts] = 0.0;
            for(j=0;j<J;j++) {

                /* makes sure that p_calc contains the natural values of the drifted obs process parameters */
                drift_par(calc[thread_id], p_par, p_data, D_J_p_X[nn][j], N_DRIFT_PAR_PROC, N_DRIFT_PAR_PROC + N_DRIFT_PAR_OBS);

                calc[thread_id]->to_be_sorted[j] = obs_mean(D_J_p_X[nn][j]->obs[ts], p_par, p_data, calc[thread_id], ts);
                D_p_hat[nn-1]->obs[ts] += calc[thread_id]->to_be_sorted[j];
            }
            D_p_hat[nn-1]->obs[ts] /= ((double) J);

            get_CI95(D_p_hat[nn-1]->obs_95[ts], calc[thread_id]->to_be_sorted, calc[thread_id]->index_sorted, NULL);
        }
    } /* end for on ts */


    /* drift */
    int offset = 0;
    for (i=0; i< (N_DRIFT_PAR_PROC +N_DRIFT_PAR_OBS) ; i++) {
        int ind_par_Xdrift_applied = p_drift->ind_par_Xdrift_applied[i];

#pragma omp parallel for private(thread_id, j, nn) //we parallelize k and not i as in most cases there are only one single diffusion
        for (k=0; k< routers[ ind_par_Xdrift_applied ]->n_gp; k++) {
            thread_id = omp_get_thread_num();

            D_p_hat[t1-1]->drift[offset+k] = 0.0;

            for (j=0; j<J; j++) {
                calc[thread_id]->to_be_sorted[j] = (*(routers[ ind_par_Xdrift_applied ]->f_inv_print))( D_J_p_X[t1][j]->drift[i][k] , routers[ind_par_Xdrift_applied]->multiplier_f_inv_print,routers[ind_par_Xdrift_applied]->min[k],routers[ind_par_Xdrift_applied]->max[k]);
                D_p_hat[t1-1]->drift[offset+k] += calc[thread_id]->to_be_sorted[j]*weights[j];
            }
            get_CI95(D_p_hat[t1-1]->drift_95[offset+k], calc[thread_id]->to_be_sorted, calc[thread_id]->index_sorted, weights);

            /* in between t0 and t1 (if t1-t0>1) there are no data (all ts
               are NaN) so there are no weights. In this case we compute an
               empirical average */
            for (nn=(t0+1); nn<t1; nn++) { //only if no data

                D_p_hat[nn-1]->drift[offset+k] = 0.0;
                for(j=0; j<J; j++) {
                    calc[thread_id]->to_be_sorted[j] = (*(routers[ ind_par_Xdrift_applied ]->f_inv_print))( D_J_p_X[nn][j]->drift[i][k] , routers[ind_par_Xdrift_applied]->multiplier_f_inv_print, routers[ind_par_Xdrift_applied]->min[k], routers[ind_par_Xdrift_applied]->max[k]);
                    D_p_hat[nn-1]->drift[offset+k] += calc[thread_id]->to_be_sorted[j];
                }
                D_p_hat[nn-1]->drift[offset+k] /= ((double) J);

                get_CI95(D_p_hat[nn-1]->drift_95[offset+k], calc[thread_id]->to_be_sorted, calc[thread_id]->index_sorted, NULL);
            }
        }

        offset += routers[ ind_par_Xdrift_applied ]->n_gp;
    } /* end for on i */
}
