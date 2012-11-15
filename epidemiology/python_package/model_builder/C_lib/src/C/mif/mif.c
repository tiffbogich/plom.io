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

void mif(struct s_calc **calc, struct s_data *p_data, struct s_best *p_best, struct s_X ***J_p_X, struct s_X ***J_p_X_tmp, struct s_par **J_p_par, struct s_likelihood *p_like, gsl_matrix *var_theta, gsl_vector **J_theta, gsl_vector **J_theta_tmp, double ***J_IC_grouped, double ***J_IC_grouped_tmp, double **D_theta_bart, double **D_theta_Vt)
{

    int j;
    int m, n, nn, nnp1; /*m:filtering iteration index, n: indeces N_DATA and nn N_DATA_NONAN */
#if FLAG_VERBOSE
    char str[255];
    int64_t time_mif_begin, time_mif_end; /* to calculate the computational time of the MIF iteration */
#endif
    int t0, t1;
    int thread_id;

    int n_max;
    if(OPTION_IC_ONLY) {
        n_max = ((L+1) > N_DATA_NONAN) ? N_DATA_NONAN: L+1;
    } else {
        n_max = N_DATA_NONAN;
    }

    FILE *p_file_best = sfr_fopen(SFR_PATH, GENERAL_ID, "best", "w", header_best, p_data);

    FILE *p_file_mif;
    if (OPTION_TRAJ) {
        p_file_mif = sfr_fopen(SFR_PATH, GENERAL_ID, "mif", "w", header_mean_var_theoretical_mif, p_data);
    }

    print_best(p_file_best, 0, p_best, p_data, NAN);
#if ! FLAG_JSON
    fflush(p_file_best);
#endif

    for(m=1; m<=M; m++) {
#if FLAG_VERBOSE
        time_mif_begin = s_clock();
#endif
        fill_theta_bart_and_Vt_mif(D_theta_bart, D_theta_Vt, p_best, p_data, m);

        for(j=0; j<J; j++) {
            propose_safe_theta_and_load_X0(p_best->proposed, p_best, MIF_b*FREEZE, J_p_par[j], (*J_p_X)[j], p_data, calc[0], ran_proposal, COMMAND_STO);
            split_theta_mif(p_best->proposed, J_theta[j], (*J_IC_grouped)[j], p_data); // JD J_theta and J_IC, with corresponding intialisations!
        }

        t0=0; p_like->Llike_best = 0.0; p_like->n_all_fail = 0;

        for(n=0; n<n_max; n++) {

#if FLAG_JSON //for the webApp, we block at every iterations to prevent the client to be saturated with msg
            if(n % 10 == 0){
                block();
            }
#endif

            t1=p_data->times[n];

            for(j=0; j<J; j++) {
                back_transform_theta2par_mif(J_p_par[j],  J_theta[j], p_data);
            }

            /*we have to use this subloop to mimate equaly spaced time step and hence set the incidence to 0 every time unit...*/
            for(nn=t0 ; nn<t1 ; nn++) {
                store_state_current_n_nn(calc, n, nn);
                nnp1 = nn+1;

#pragma omp parallel for private(thread_id)
                for(j=0;j<J;j++) {
                    thread_id = omp_get_thread_num();
                    reset_inc((*J_p_X)[j]);
                    if (COMMAND_DETER) {
                        f_prediction_with_drift_deter((*J_p_X)[j], nn, nnp1, J_p_par[j], p_data, calc[thread_id]);
                    } else {
                        f_prediction_with_drift_sto((*J_p_X)[j], nn, nnp1, J_p_par[j], p_data, calc[thread_id]);
                    }
                    //round_inc((*J_p_X)[j]->proj);
                    proj2obs((*J_p_X)[j], p_data);
                    if(N_DRIFT_PAR_OBS) {
                        compute_drift((*J_p_X)[j], J_p_par[j], p_data, calc[thread_id], N_DRIFT_PAR_PROC, N_DRIFT_PAR_PROC+N_DRIFT_PAR_OBS, DT);
                    }
                    if(nnp1 == t1) {
                        p_like->weights[j] = exp(get_log_likelihood((*J_p_X)[j], J_p_par[j], p_data, calc[thread_id]));
                    }
                }
            } /* end for on nn */

            if (OPTION_PRIOR) {
                patch_likelihood_prior(p_like, p_best, J_theta, J_IC_grouped, p_data, n_max, n, L);
            }

            weight(p_like, n);
            mean_var_theta_theoretical_mif(D_theta_bart[n+1], D_theta_Vt[n+1], J_theta, var_theta, p_like, m, ((double) (t1-t0)));
            if (OPTION_TRAJ) {
                print_mean_var_theta_theoretical_mif(p_file_mif, D_theta_bart[n+1], D_theta_Vt[n+1], p_like, m, t1);
            }

            if(!p_like->all_fail) {
                systematic_sampling(p_like, calc[0], n);
            }

            resample_and_mut_theta_mif(p_like->select[n], J_theta, J_theta_tmp, var_theta, calc, FREEZE*sqrt(((double) (t1-t0))));
            resample_X(p_like->select[n], J_p_X, J_p_X_tmp, p_data);
            fixed_lag_smoothing(p_best->mean, p_like, p_data, p_data->p_it_par_sv_and_drift, J_IC_grouped, J_IC_grouped_tmp, n, L);

            t0=t1;

        } /*end of for loop on the time (n)*/

        /*we update theta_best*/
        (m<=SWITCH) ? update_theta_best_stable_mif(p_best, D_theta_bart, p_data) : update_theta_best_king_mif(p_best, D_theta_bart, D_theta_Vt, p_data, m);

#if FLAG_VERBOSE
        time_mif_end = s_clock();
        struct s_duration t_exec = time_exec(time_mif_begin, time_mif_end);
        sprintf(str, "iteration number:%d\t logV: %g\t n_all_fail: %d\t computed in:= %dd %dh %dm %gs", m, p_like->Llike_best, p_like->n_all_fail, t_exec.d, t_exec.h, t_exec.m, t_exec.s);
        print_log(str);
#endif

        print_best(p_file_best, m, p_best, p_data, p_like->Llike_best);
#if ! FLAG_JSON
        fflush(p_file_best);
#endif

    } /*end for on m*/

    sfr_fclose(p_file_best);

    if (OPTION_TRAJ) {
        sfr_fclose(p_file_mif);
    }
}
