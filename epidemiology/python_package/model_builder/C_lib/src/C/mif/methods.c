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

#include "mif.h"

void get_submatrix_var_theta_mif(gsl_matrix *var_theta, struct s_best *p_best, struct s_data *p_data)
{
    /* get component that are not fitted with fixed lag smoothing
       (everything except IC and drift) */

    int i, j, k_i, k_j;
    int offset_i, offset_j;

    struct s_iterator *p_it = p_data->p_it_par_proc_par_obs_no_drift;
    struct s_router **routers = p_data->routers;

    offset_i = 0;
    for(i=0; i<p_it->length; i++) {
        for(k_i=0; k_i< routers[ p_it->ind[i] ]->n_gp; k_i++) {
            offset_j = 0;
            for(j=0; j<p_it->length; j++) {
                for(k_j=0; k_j< routers[ p_it->ind[j] ]->n_gp; k_j++) {
                    gsl_matrix_set(var_theta, offset_i, offset_j , gsl_matrix_get(p_best->var, p_it->offset[i]+k_i, p_it->offset[j]+k_j));
                    offset_j++;
                }
            }
            offset_i++;
        }
    }
}

void fill_theta_bart_and_Vt_mif(double **D_theta_bart, double **D_theta_Vt, struct s_best *p_best, struct s_data *p_data, int m)
{
    /*load theta_bart and theta_Vt for t0 and all subsequent time,
      we do this for time>t0 so that parameters that do not vary are
      printed correctly...*/
    int n, i, k;
    int offset;

    struct s_iterator *p_it = p_data->p_it_par_proc_par_obs_no_drift;
    struct s_router **routers = p_data->routers;

    for(n=0;n<=N_DATA_NONAN;n++) {
        offset = 0;
        for(i=0; i<p_it->length; i++) {
            for(k=0; k< routers[ p_it->ind[i] ]->n_gp; k++) {
                D_theta_bart[n][offset] = gsl_vector_get(p_best->mean, p_it->offset[i]+k);
                D_theta_Vt[n][offset] = 0.0;
                if(n == 0) {
                    D_theta_Vt[n][offset] += ( pow(MIF_b*FREEZE, 2)*gsl_matrix_get(p_best->var, p_it->offset[i]+k, p_it->offset[i]+k) );
                }
                offset++;
            }
        }
    }

}


void split_theta_mif(theta_t *proposed, gsl_vector *J_theta_j, double *J_IC_grouped_j, struct s_data *p_data)
{
    int i, k;
    int offset;

    struct s_iterator *p_it_par_proc_par_obs_no_drift = p_data->p_it_par_proc_par_obs_no_drift;
    struct s_iterator *p_it_par_sv_and_drift = p_data->p_it_par_sv_and_drift;
    struct s_router **routers = p_data->routers;

    offset = 0;
    for(i=0; i<p_it_par_sv_and_drift->length; i++) {
        for(k=0; k< routers[ p_it_par_sv_and_drift->ind[i] ]->n_gp; k++) {
            J_IC_grouped_j[offset] = gsl_vector_get(proposed, p_it_par_sv_and_drift->offset[i] + k);
            offset++;
        }
    }


    offset = 0;
    for(i=0; i<p_it_par_proc_par_obs_no_drift->length; i++) {
        for(k=0; k< routers[ p_it_par_proc_par_obs_no_drift->ind[i] ]->n_gp; k++) {
            gsl_vector_set(J_theta_j, offset, gsl_vector_get(proposed, p_it_par_proc_par_obs_no_drift->offset[i] + k));
            offset++;
        }
    }

}

void mean_var_theta_theoretical_mif(double *theta_bart_n, double *theta_Vt_n, gsl_vector **J_theta, gsl_matrix *var, struct s_likelihood *p_like, int m, double delta_t)
{
    /* Compute filtered mean and predeiction var of particles at time
       n. We take weighted averages with "weights" for the filtered
       mean (in order to reduce monte-carlo variability) and use a numericaly stable
       online algo for the variance.*/

    int j,k;

    double kn, M2, avg, delta; //for variance computations

    for(k=0; k<N_THETA_MIF; k++) {
        if(gsl_matrix_get(var, k, k)>0.0) {
            theta_bart_n[k]=0.0;

            kn=0.0;
            avg=0.0;
            M2=0.0;

            for(j=0 ; j<J ; j++) {

                //variance computation
                kn += 1.0;
                delta = gsl_vector_get(J_theta[j], k) - avg;
                avg += (delta / kn);
                M2 += delta*(gsl_vector_get(J_theta[j], k) - avg);

                //weighted average for filtered mean
                theta_bart_n[k] += p_like->weights[j]*gsl_vector_get(J_theta[j], k);
            }
            theta_Vt_n[k] = M2/(kn -1.0);

            if( (theta_Vt_n[k]<0.0) || (isinf(theta_Vt_n[k])==1) || (isnan(theta_Vt_n[k])==1)) {
                theta_Vt_n[k]=0.0;
#if FLAG_VERBOSE
                print_err("error in variance computation");
#endif
            }
            /*we add theoretical variance corresponding to mutation of theta
              to reduce Monte Carlo variability*/
            theta_Vt_n[k] += delta_t*pow(FREEZE, 2)*gsl_matrix_get(var, k, k);
        }
    }
}


void print_mean_var_theta_theoretical_mif(FILE *p_file, double *theta_bart_n, double *theta_Vt_n, struct s_likelihood *p_like, int m, int time)
{
    int k;

#if FLAG_JSON
    json_t *root;
    json_t *json_print = json_array();
#endif

#if FLAG_JSON
    json_array_append_new(json_print, json_integer(m));
    json_array_append_new(json_print, json_integer(time));
#else
    fprintf(p_file,"%d\t%d\t", m, time);
#endif

    for(k=0; k<N_THETA_MIF; k++) {
#if FLAG_JSON
        json_array_append_new(json_print, json_real(theta_bart_n[k]));
        json_array_append_new(json_print, json_real(theta_Vt_n[k]));
#else
        fprintf(p_file, "%g\t%g\t", theta_bart_n[k], theta_Vt_n[k]);
#endif
    }

    /* ess */
#if FLAG_JSON
    json_array_append_new(json_print, isnan(p_like->ess_n) ? json_null() : json_real(p_like->ess_n));
#else
    fprintf(p_file, "%g\n", p_like->ess_n);
#endif

#if FLAG_JSON
    root = json_pack("{s,s,s,o}", "flag", "mif", "msg", json_print);
    json_dumpf(root, stdout, JSON_COMPACT); printf("\n");
    fflush(stdout);
    json_decref(root);
#endif

}


void header_mean_var_theoretical_mif(FILE *p_file, struct s_data *p_data)
{
    int i, g;
    struct s_iterator *p_it = p_data->p_it_par_proc_par_obs_no_drift;
    struct s_router **routers = p_data->routers;

    fprintf(p_file,"index\ttime\t");
    for(i=0; i<p_it->length; i++) {
        const char *name = routers[p_it->ind[i]]->name;
        for(g=0; g< routers[p_it->ind[i]]->n_gp; g++) {
            const char *group = routers[p_it->ind[i]]->group_name[g];
            fprintf(p_file, "mean:%s:%s\tvar:%s:%s\t", name, group, name, group);
        }
    }
    fprintf(p_file,"ess\n");

}



void resample_and_mut_theta_mif(unsigned int *select, gsl_vector **J_theta, gsl_vector **J_theta_tmp, gsl_matrix *var_theta, struct s_calc **calc, double sd_fac)
{
    int j, k;
    int thread_id;

//#pragma omp parallel for private(k) //parallelisation is not efficient here
    for(j=0; j<J; j++) {
        for(k=0; k<N_THETA_MIF; k++) {
            gsl_vector_set(J_theta_tmp[j], k, gsl_vector_get(J_theta[select[j]], k));
        }
    }

#pragma omp parallel for private(thread_id, k)
    for(j=0; j<J; j++) {

        thread_id = omp_get_thread_num();

        for (k=0; k< N_THETA_MIF ; k++) {
            gsl_vector_set(J_theta[j],
                           k,
                           gsl_vector_get(J_theta_tmp[j], k) + gsl_ran_gaussian(calc[thread_id]->randgsl, sd_fac*sqrt(gsl_matrix_get(var_theta, k, k))));
        }
    }
}


void update_theta_best_stable_mif(struct s_best *p_best, double **D_theta_bart, struct s_data *p_data)
{
    /*update theta_best*/

    int i, k;
    struct s_iterator *p_it = p_data->p_it_par_proc_par_obs_no_drift;
    struct s_router **routers = p_data->routers;

    int n;
    double tmp;

    int offset = 0;

    for(i=0; i<p_it->length; i++) {
        for(k=0; k< routers[ p_it->ind[i] ]->n_gp; k++) {
            if(gsl_matrix_get(p_best->var, p_it->offset[i]+k, p_it->offset[i]+k) >0.0) {
                tmp = 0.0;
                for(n=1; n<=N_DATA_NONAN; n++){
                    tmp += D_theta_bart[n][offset];
                }

                gsl_vector_set(p_best->mean, p_it->offset[i]+k, tmp / ((double) N_DATA_NONAN) );
            }
            offset++;
        }
    }

}

void update_theta_best_king_mif(struct s_best *p_best, double **D_theta_bart, double **D_theta_Vt, struct s_data *p_data, int m)
{
    /*update theta_best Ionides et al 2006 PNAS */

    int i, k;
    struct s_iterator *p_it = p_data->p_it_par_proc_par_obs_no_drift;
    struct s_router **routers = p_data->routers;

    int n;
    double tmp;

    int offset = 0;

    for(i=0; i<p_it->length; i++) {
        for(k=0; k< routers[ p_it->ind[i] ]->n_gp; k++) {
            if(gsl_matrix_get(p_best->var, p_it->offset[i]+k, p_it->offset[i]+k) >0.0) {
                tmp=0.0;
                for(n=1; n<=N_DATA_NONAN; n++) {
                    tmp += ( (D_theta_bart[n][offset]-D_theta_bart[n-1][offset]) / D_theta_Vt[n][offset] );
                }

                gsl_vector_set(p_best->mean,
                               p_it->offset[i]+k,
                               (gsl_vector_get(p_best->mean, p_it->offset[i]+k) + ((1.0+MIF_b*MIF_b)*FREEZE*FREEZE*gsl_matrix_get(p_best->var, p_it->offset[i]+k, p_it->offset[i]+k)*tmp) ) ); //1.0 is p_data->times[0]
            }
            offset++;
        }
    }

}


void back_transform_theta2par_mif(struct s_par *p_par, gsl_vector *theta_mif, struct s_data *p_data)
{
    int i, k;
    int offset;

    struct s_iterator *p_it = p_data->p_it_par_proc_par_obs_no_drift;
    struct s_router **routers = p_data->routers;

    offset = 0;
    for(i=0; i<p_it->length; i++){
        for(k=0; k< routers[ p_it->ind[i] ]->n_gp; k++){
            p_par->natural[ p_it->ind[i] ][k] = (*(routers[ p_it->ind[i] ]->f_inv))( gsl_vector_get(theta_mif, offset), routers[ p_it->ind[i] ]->multiplier_f_inv, routers[ p_it->ind[i] ]->min[k], routers[ p_it->ind[i] ]->max[k]);
            offset++;
        }
    }

}


/**
   fixed lag smoothing for the component of p_best present in p_it
*/
void fixed_lag_smoothing(theta_t *best_mean, struct s_likelihood *p_like, struct s_data *p_data, const struct s_iterator *p_it, double ***J_initial_cond, double ***J_initial_cond_tmp, int n, const int lag)
{
    if ( n < lag ) {
        resample_IC(p_like,  J_initial_cond, J_initial_cond_tmp, p_it->nbtot, n);
    } else if (n==lag) {
        update_IC(best_mean, p_like, *J_initial_cond, p_data, p_it);
    }
}

/**
   resample the IC for fixed lag smoothing
*/
void resample_IC(struct s_likelihood *p_like,  double ***J_initial_cond, double ***J_initial_cond_tmp, int N_initial_cond, int n)
{
    unsigned int *select = p_like->select[n];
    int j, k;

    //#pragma omp parallel for private(k) //parallelisation is not efficient here
    for(j=0;j<J;j++) {
        for(k=0; k<N_initial_cond; k++) {
            (*J_initial_cond_tmp)[j][k] = (*J_initial_cond)[select[j]][k];
        }
    }

    swap_2d(J_initial_cond, J_initial_cond_tmp);
}

/**
   update the component of best_mean present in p_it
 */
void update_IC(theta_t *best_mean, struct s_likelihood *p_like, double **J_initial_cond, struct s_data *p_data, const struct s_iterator *p_it)
{
    double *weights = p_like->weights;

    int i, j, k;
    struct s_router **routers = p_data->routers;

    int ind_initial_cond = 0;

    for(i=0; i<p_it->length; i++) {
        for(k=0; k< routers[ p_it->ind[i] ]->n_gp; k++) {
            gsl_vector_set(best_mean, p_it->offset[i]+k, 0.0);
            for(j=0;j<J;j++) {
                gsl_vector_set(best_mean, p_it->offset[i]+k, gsl_vector_get(best_mean, p_it->offset[i]+k) + J_initial_cond[j][ind_initial_cond]*weights[j]);
            }
            ind_initial_cond++;
        }
    }
}


/**
 * The MIF can be used to find modes of the posterior density before
 * launching a pmcmc or kmcmc. This is controled with the
 * --prior option, just like with the ksimplex function.
 *
 * This function multiply the loglikelihood weight of particle j at
 * observation i by 1/NbObs * logprior(theta_i^j)
 */
void patch_likelihood_prior(struct s_likelihood *p_like, struct s_best *p_best, gsl_vector **J_theta, double ***J_IC_grouped, struct s_data *p_data, int n_max, int n, const int lag)
{
    int i, j, k;
    struct s_router **routers = p_data->routers;
    struct s_router *p_router;
    struct s_iterator *p_it_mif = p_data->p_it_par_proc_par_obs_no_drift; //parameters fitted with MIF (as opposed to fixed lag smoothing)
    struct s_iterator *p_it_fls = p_data->p_it_par_sv_and_drift; //parameters fitted with fixed lag smoothing (fls)

    gsl_matrix *var = p_best->var;

    double back_transformed_print; //prior are on the natural scale with an intuitive time unit (not necessarily the data unit), so we transform the parameter into this unit...
    double p_tmp;

    int offset_best;
    int offset = 0;

    // weights are multiplied by prior(theta_j)^(1/n_max) for proc parameters fitted with MIF (as opposed to fixed lag smoothing)
    for(i=0; i<p_it_mif->length; i++) {
        p_router = routers[p_it_mif->ind[i]];
        for(k=0; k< p_router->n_gp; k++) {

            offset_best = p_it_mif->offset[i]+k;

            if (gsl_matrix_get(var, offset_best, offset_best) > 0.0) { //only for the parameter that we want to estimate
                for(j=0; j<J; j++) {
                    back_transformed_print = (*(p_router->f_inv_print))(gsl_vector_get( J_theta[j], offset), p_router->multiplier_f_inv_print, p_router->min[k], p_router->max[k]);
                    p_tmp = (*(p_best->prior[offset_best]))(back_transformed_print, p_best->par_prior[offset_best][0], p_best->par_prior[offset_best][1]);
                    p_tmp = sanitize_likelihood(p_tmp);

                    p_like->weights[j] *= pow(p_tmp, 1.0/n_max);
                }
            }

            offset++;
        }
    }


    // weights are multiplied by prior(theta_j)^(1/lag) for parameters fitted with fixed lag smoothing
    if(n<lag){
        offset = 0;
        for(i=0; i<p_it_fls->length; i++) {
            p_router = routers[p_it_fls->ind[i]];
            for(k=0; k< p_router->n_gp; k++) {

                offset_best = p_it_fls->offset[i]+k;

                if (gsl_matrix_get(var, offset_best, offset_best) > 0.0) {
                    for(j=0; j<J; j++) {
                        back_transformed_print = (*(p_router->f_inv_print))((*J_IC_grouped)[j][offset], p_router->multiplier_f_inv_print, p_router->min[k], p_router->max[k]);
                        p_tmp = (*(p_best->prior[offset_best]))(back_transformed_print, p_best->par_prior[offset_best][0], p_best->par_prior[offset_best][1]);
                        p_tmp = sanitize_likelihood(p_tmp);

                        p_like->weights[j] *= pow(p_tmp, 1.0/lag);
                    }
                }

                offset++;
            }
        }
    }
}
