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

#include "pmcmc.h"

void ran_proposal_sequential(gsl_vector *proposed, struct s_best *p_best, double sd_fac, struct s_calc *p_calc)
{
    int k;

    struct s_pmcmc_calc_data *p =  (struct s_pmcmc_calc_data *) p_calc->method_specific_shared_data;

    if (p_best->n_to_be_estimated > 0) { //due to the webApp all jump size can be 0.0...
        k = p_best->to_be_estimated[ p->cycle_id ];
        gsl_vector_set(proposed, k, gsl_vector_get(p_best->mean, k) + gsl_ran_gaussian(p_calc->randgsl, sd_fac*sqrt(gsl_matrix_get(p_best->var, k, k))));
    }

}


/**
 * recursive expression for the average so that it can be used in
 * real time by print_hat (zmq and co...)
 */
void compute_best_traj(struct s_hat **D_p_hat_best, struct s_hat **D_p_hat_prev, struct s_hat **D_p_hat_new, struct s_data *p_data, double alpha, double m)
{
    /* recursive expression for the average so that it can be used in
       real time by print_hat (zmq and co...) */

    int n, i, ts;

    for(n=0; n<N_DATA; n++) {
        //sv
        for(i=0 ; i<N_PAR_SV*N_CAC ; i++) {
            D_p_hat_best[n]->state[i] = ((m-1.0)/m)*D_p_hat_best[n]->state[i] + (1.0/m)*(alpha*D_p_hat_new[n]->state[i] + (1.0-alpha)*D_p_hat_prev[n]->state[i]);
            D_p_hat_best[n]->state_95[i][0] = ((m-1.0)/m)*D_p_hat_best[n]->state_95[i][0] + (1.0/m)*(alpha*D_p_hat_new[n]->state_95[i][0] + (1.0-alpha)*D_p_hat_prev[n]->state_95[i][0]);
            D_p_hat_best[n]->state_95[i][1] = ((m-1.0)/m)*D_p_hat_best[n]->state_95[i][1] + (1.0/m)*(alpha*D_p_hat_new[n]->state_95[i][1] + (1.0-alpha)*D_p_hat_prev[n]->state_95[i][1]);
        }

        //ts
        for(ts=0; ts< N_TS; ts++) {
            D_p_hat_best[n]->obs[ts] = ((m-1.0)/m)*D_p_hat_best[n]->obs[ts] + (1.0/m)*(alpha*D_p_hat_new[n]->obs[ts] + (1.0-alpha)*D_p_hat_prev[n]->obs[ts]);
            D_p_hat_best[n]->obs_95[ts][0] = ((m-1.0)/m)*D_p_hat_best[n]->obs_95[ts][0] + (1.0/m)*(alpha*D_p_hat_new[n]->obs_95[ts][0] + (1.0-alpha)*D_p_hat_prev[n]->obs_95[ts][0]);
            D_p_hat_best[n]->obs_95[ts][1] = ((m-1.0)/m)*D_p_hat_best[n]->obs_95[ts][1] + (1.0/m)*(alpha*D_p_hat_new[n]->obs_95[ts][1] + (1.0-alpha)*D_p_hat_prev[n]->obs_95[ts][1]);
        }

        //drift
        for(i=0; i< p_data->p_it_only_drift->nbtot; i++) {
            D_p_hat_best[n]->drift[i] = ((m-1.0)/m)*D_p_hat_best[n]->drift[i] + (1.0/m)*(alpha*D_p_hat_new[n]->drift[i] + (1.0-alpha)*D_p_hat_prev[n]->drift[i]);
            D_p_hat_best[n]->drift_95[i][0] = ((m-1.0)/m)*D_p_hat_best[n]->drift_95[i][0] + (1.0/m)*(alpha*D_p_hat_new[n]->drift_95[i][0] + (1.0-alpha)*D_p_hat_prev[n]->drift_95[i][0]);
            D_p_hat_best[n]->drift_95[i][1] = ((m-1.0)/m)*D_p_hat_best[n]->drift_95[i][1] + (1.0/m)*(alpha*D_p_hat_new[n]->drift_95[i][1] + (1.0-alpha)*D_p_hat_prev[n]->drift_95[i][1]);
        }
    }

}


void print_acceptance_rates(struct s_pmcmc_calc_data *p, int m_full_iteration)
{
    int k;

#if FLAG_JSON
    json_t *root;
    json_t *j_print = json_array();
#endif

#if FLAG_JSON
    json_array_append_new(j_print, json_integer(m_full_iteration));
#else
    printf("acceptance rate(s) at iteration %d: ", m_full_iteration);
#endif

    /* parameter specific acceptance rates */
    if (!OPTION_FULL_UPDATE) {
        for(k=0; k< (p->n_acceptance_rates); k++) {
#if FLAG_JSON
            json_array_append_new(j_print, json_real(p->acceptance_rates[k]));
#else
            printf("%g\t", p->acceptance_rates[k]);
#endif
        }
    }

    /* global acceptance rate */
#if FLAG_JSON
    json_array_append_new(j_print, json_real(p->global_acceptance_rate));

    root = json_pack("{s,s,s,o}", "flag", "pmcmc", "msg", j_print);
    json_dumpf(root, stdout, JSON_COMPACT); printf("\n");
    fflush(stdout);
    json_decref(root);
#else
    printf("%g\n", p->global_acceptance_rate);
#endif

}







/**
 * print empirical matrix of variance covariance
 */
void print_covariance(FILE *p_file_cov, gsl_matrix *covariance)
{

    int row, col;
    double x;
#if FLAG_JSON
    json_t *root;
    json_t *json_print = json_array();
    json_t *json_print_n;
#endif


    for(row=0; row<covariance->size1; row++) {

#if FLAG_JSON
        json_print_n = json_array();
#endif
        for(col=0; col<covariance->size2; col++) {
            x = gsl_matrix_get(covariance, row, col);
#if FLAG_JSON
            json_array_append_new(json_print_n, json_real(x));
#else
            fprintf(p_file_cov,"%g\t", x);
#endif
        }

#if FLAG_JSON
        json_array_append_new(json_print, json_print_n);
#else
        fprintf(p_file_cov,"\n");
#endif
    }


#if FLAG_JSON
    root = json_pack("{s,s,s,o}", "flag", "cov", "msg", json_print);
    json_dumpf(root, stdout, JSON_COMPACT); printf("\n");
    fflush(stdout);
    json_decref(root);
#endif

}



/**
 * Acceptance rate(s): we use an average filter for the local version.
 * For the webApp, we use a low pass filter to reflect live tunning of
 * the walk rates
 */
void compute_acceptance_rates(struct s_best *p_best, struct s_pmcmc_calc_data *p, double is_accepted, int m)
{

#if FLAG_JSON

    //low pass filter

    if (!OPTION_FULL_UPDATE) {
        if(p_best->n_to_be_estimated > 0) { //due to the webApp all jump size can be 0.0...
            int mm = p_best->to_be_estimated[ p->cycle_id ];
            p->acceptance_rates[mm] = LOW_PASS_FILTER_ALPHA * p->acceptance_rates[mm] + (1.0 -LOW_PASS_FILTER_ALPHA) * is_accepted;
        }
    }

    p->global_acceptance_rate = LOW_PASS_FILTER_ALPHA * p->global_acceptance_rate + (1.0 -LOW_PASS_FILTER_ALPHA) * is_accepted;

#else

    //average filter

    if (!OPTION_FULL_UPDATE) {
        if(p_best->n_to_be_estimated > 0) { //due to the webApp all jump size can be 0.0...
            int mm = p_best->to_be_estimated[ p->cycle_id ];
            p->acceptance_rates[mm] += ((is_accepted - p->acceptance_rates[mm])/ ((double) p->m_full_iteration));
        }
    }

    p->global_acceptance_rate += ( (is_accepted - p->global_acceptance_rate) / ((double) m) );

#endif

}
