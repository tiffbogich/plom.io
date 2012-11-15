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

#include "simulation.h"

int has_failed(double *y)
{
    int failed = 0;
    int i;
    for (i=0; i<(N_PAR_SV*N_CAC); i++) {
        if (isnan(y[i]) || isinf(y[i]) ) {
            failed = 1;
        }
    }
    return failed;
}

int integrator(struct s_X *p_X, double *y0, double t0, double t_end, struct s_par *p_par, double abs_tol, double rel_tol, struct s_calc *p_calc)
{
    /*numerical integration from t0 to t_end, return 0 if success*/

    int status;
    int error=0;
    double t = t0;
    double h = DT; //h is the initial integration step size
    int i;
    double *y = p_X->proj;

    /* reset abs_tol and rel_to; */
    gsl_odeiv2_control_free(p_calc->control);
    p_calc->control = gsl_odeiv2_control_y_new(abs_tol, rel_tol); /*abs and rel error (eps_abs et eps_rel) */
    p_calc->p_par = p_par; //pass the ref to p_par so that it is available wihtin the function to integrate

    /* initialize with initial conditions and reset incidence */
    for (i=0; i< (N_PAR_SV*N_CAC) ; i++) {
        y[i]=y0[i];
    }

    /* tentative of numerical integration (with a precision of abs_tol et rel_tol) */
    while (t < t_end) {
        reset_inc(p_X);
        status = gsl_odeiv2_evolve_apply(p_calc->evolve, p_calc->control, p_calc->step, &(p_calc->sys), &t, t_end, &h, y);

        if ( (status != GSL_SUCCESS) ) { //more stringent: || has_failed(y)
            char str[STR_BUFFSIZE];
            sprintf(str, "integration failure (status: %d has_failed: %d)", status, has_failed(y));
            print_err(str);
            error=1;
            break;
        }
    }

    return error;
}


int integrate(struct s_X *p_X, double *y0, double t0, double t_end, struct s_par *p_par, double *abs_tol, double *rel_tol, struct s_calc *p_calc)
{
    /* recursive function that decreases abs_tol and rel_tol until integration success */

    int integration_error=1;

    while( integration_error && (*abs_tol>ABS_TOL_MIN) && (*rel_tol>REL_TOL_MIN)  ) {
        integration_error = integrator(p_X, y0, t0, t_end, p_par,  *abs_tol, *rel_tol, p_calc);
        if(integration_error) {
            *abs_tol /= 10.0;
            *rel_tol /= 10.0;
        }
    }

    return integration_error;
}


/**
 * Used for bifurcation analysis ONLY.  Diffusion are not taken into
 * account (makes no sense for bifurcations analysis which focus on
 * the attractor...)
 */
double **get_traj_obs(struct s_X *p_X, double *y0, double t0, double t_end, double t_transiant, struct s_par *p_par, struct s_data *p_data, struct s_calc *p_calc)
{
    /*
       fine grained integration (store trajectory every DT) to do bif analysis. NOTE that incidence is computed on DT.
       return traj_obs [N_TS][(t_end-t0)*DELTA_STO];
    */

    int i, ts, k;
    double **traj_obs = init2d_set0(N_TS, (int) (t_end-t0));

    FILE *p_file_X = sfr_fopen(SFR_PATH, GENERAL_ID, "X", "w", header_X, p_data);

    /* initialize with initial conditions and reset incidence */
    for (i=0; i< (N_PAR_SV*N_CAC) ; i++){
        p_X->proj[i]=y0[i];
    }

    for (k= (int) t0 ; k< (int) t_end ; k++) {


#if FLAG_JSON //for the webApp, we block at every iterations to prevent the client to be saturated with msg
        if (OPTION_TRAJ) {
            if(k % 10 == 0){
                block();
            }
        }
#endif

        //in bif analysis, we don't want effect of variable pop sizes or birth rates so with stick with nn0
        if ( t_transiant <= N_DATA ) {
            p_calc->current_nn= (k < N_DATA_PAR_FIXED) ? k : N_DATA_PAR_FIXED-1;
        }

        reset_inc(p_X);

        if (COMMAND_DETER) {
            f_prediction_ode_rk(p_X->proj, k, k+1, p_par, p_calc);
        } else {
            f_prediction_euler_multinomial(p_X->proj, k, k+1, p_par, p_data, p_calc);
        }

        proj2obs(p_X, p_data);

        for (ts=0; ts<N_TS; ts++) {
            traj_obs[ts][k- ((int) t0)] = p_X->obs[ts];
        }

        if (OPTION_TRAJ) {
            print_X(p_file_X, &p_par, &p_X, p_data, p_calc, k+1, 1, 0, 0);
        }
    }

    //if non traj version we print only the last point (used for continuation)
    if (!OPTION_TRAJ) {
        print_X(p_file_X, &p_par, &p_X, p_data, p_calc, k+1, 1, 0, 0);
    }

    sfr_fclose(p_file_X);

    return traj_obs;
}



/*
 * Fine grained integration (print trajectory every DT (by default DT=frequency)).
 *
 * NOTE that incidence is computed on DT.  return traj_obs
 * [N_TS][(t_end-t0)*DELTA_STO];
 */

void traj(struct s_X **J_p_X, double t0, double t_end, double t_transiant, struct s_par *p_par, struct s_data *p_data, struct s_calc **calc)
{

    int i, j, k, nn;
    int thread_id;

    FILE *p_file_X = sfr_fopen(SFR_PATH, GENERAL_ID, "X", "w", header_X, p_data);
    FILE *p_file_hat = sfr_fopen(SFR_PATH, GENERAL_ID, "hat", "w", header_hat, p_data);

    struct s_hat *p_hat = build_hat(p_data);

    //if deter, only the first particle was used to skip the transiant
    if (COMMAND_DETER && (t_transiant > 0.0) ) {
        for(j=1; j<J; j++) {  //load X_0 for the J-1 other particles
            memcpy(J_p_X[j]->proj, J_p_X[0]->proj, J_p_X[j]->size_proj * sizeof(double));
            for (i=0; i<p_data->p_it_only_drift->length; i++) {
                memcpy(J_p_X[j]->drift[i], J_p_X[0]->drift[i], p_data->routers[ p_data->p_it_only_drift->ind[i] ]->n_gp *sizeof(double) );
            }
        }
    }

    for (k= (int) t0 ; k< (int) t_end ; k++) {

#if FLAG_JSON //for the webApp, we block at every iterations to prevent the client to be saturated with msg
        if (OPTION_TRAJ) {
            if(k % 10 == 0){
                block();
            }
        }
#endif

        //in bif analysis, we don't want effect of variable pop sizes or birth rates so with stick with nn0
        if ( t_transiant <= N_DATA ) {
            nn= (k < N_DATA_PAR_FIXED) ? k : N_DATA_PAR_FIXED-1;
            store_state_current_n_nn(calc, nn, nn);
        }

#pragma omp parallel for private(thread_id)
        for(j=0;j<J;j++) {
            thread_id = omp_get_thread_num();
            reset_inc(J_p_X[j]);

            if (COMMAND_DETER) {
                f_prediction_with_drift_deter(J_p_X[j], k, k+1, p_par, p_data, calc[thread_id]);
            } else {
                f_prediction_with_drift_sto(J_p_X[j], k, k+1, p_par, p_data, calc[thread_id]);
            }

            proj2obs(J_p_X[j], p_data);

            if(N_DRIFT_PAR_OBS) {
                compute_drift(J_p_X[j], p_par, p_data, calc[thread_id], N_DRIFT_PAR_PROC, N_DRIFT_PAR_PROC + N_DRIFT_PAR_OBS, DT);
            }
        }

        compute_hat_nn(J_p_X, p_par, p_data, calc, p_hat);
        print_p_hat(p_file_hat, NULL, p_hat, p_data, k);

        if (OPTION_TRAJ && FLAG_JSON==0) {
            print_X(p_file_X, &p_par, J_p_X, p_data, calc[thread_id], k+1, 1, 0, 0);
        }
    }

    clean_hat(p_hat, p_data);

    sfr_fclose(p_file_X);
    sfr_fclose(p_file_hat);
}



/**
 * Compute hat at nn
 */
void compute_hat_nn(struct s_X **J_p_X, struct s_par *p_par, struct s_data *p_data, struct s_calc **calc, struct s_hat *p_hat)
{
    int j, i, k, ts;
    int thread_id;

    struct s_drift *p_drift = p_data->p_drift;
    struct s_router **routers = p_data->routers;

    /* par_sv */
#pragma omp parallel for private(thread_id, j)
    for(i=0; i<(N_PAR_SV*N_CAC); i++) {
        thread_id = omp_get_thread_num();

        p_hat->state[i] = 0.0;
        for(j=0;j<J;j++) {
            calc[thread_id]->to_be_sorted[j] = J_p_X[j]->proj[i]; //This sucks... gsl_sort_index requires an array to be sorted and our particles are in J_p_X[t1][j]->proj[i] so we use an helper array (calc[thread_id]->to_be_sorted)
            p_hat->state[i] += calc[thread_id]->to_be_sorted[j];
        }
        p_hat->state[i] /= ((double) J);

        get_CI95(p_hat->state_95[i], calc[thread_id]->to_be_sorted, calc[thread_id]->index_sorted, NULL);

    } /* end for on i */

    /* obs [N_TS] same thing as for state except that we use obs_mean()
       on p_X->obs */
#pragma omp parallel for private(thread_id, j)
    for(ts=0; ts<N_TS; ts++) {
        thread_id = omp_get_thread_num();

        /* empirical average */
        p_hat->obs[ts] = 0.0;
        for(j=0;j<J;j++) {

            /* makes sure that p_calc contains the natural values of the drifted obs process parameters */
            drift_par(calc[thread_id], p_par, p_data, J_p_X[j], N_DRIFT_PAR_PROC, N_DRIFT_PAR_PROC + N_DRIFT_PAR_OBS);

            calc[thread_id]->to_be_sorted[j] = obs_mean(J_p_X[j]->obs[ts], p_par, p_data, calc[thread_id], ts);
            p_hat->obs[ts] += calc[thread_id]->to_be_sorted[j];
        }
        p_hat->obs[ts] /= ((double) J);

        get_CI95(p_hat->obs_95[ts], calc[thread_id]->to_be_sorted, calc[thread_id]->index_sorted, NULL);

    } /* end for on ts */

    /* drift */
    int offset = 0;
    for (i=0; i< (N_DRIFT_PAR_PROC +N_DRIFT_PAR_OBS) ; i++) {
        int ind_par_Xdrift_applied = p_drift->ind_par_Xdrift_applied[i];

#pragma omp parallel for private(thread_id, j) //we parallelize k and not i as in most cases there are only one single diffusion
        for (k=0; k< routers[ ind_par_Xdrift_applied ]->n_gp; k++) {
            thread_id = omp_get_thread_num();

            p_hat->drift[offset+k] = 0.0;
            for(j=0; j<J; j++) {
                calc[thread_id]->to_be_sorted[j] = (*(routers[ ind_par_Xdrift_applied ]->f_inv_print))( J_p_X[j]->drift[i][k] , routers[ind_par_Xdrift_applied]->multiplier_f_inv_print, routers[ind_par_Xdrift_applied]->min[k], routers[ind_par_Xdrift_applied]->max[k]);
                p_hat->drift[offset+k] += calc[thread_id]->to_be_sorted[j];
            }
            p_hat->drift[offset+k] /= ((double) J);

            get_CI95(p_hat->drift_95[offset+k], calc[thread_id]->to_be_sorted, calc[thread_id]->index_sorted, NULL);
        }

        offset += routers[ ind_par_Xdrift_applied ]->n_gp;
    } /* end for on i */
}
