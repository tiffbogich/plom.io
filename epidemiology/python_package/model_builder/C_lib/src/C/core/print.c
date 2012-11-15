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


FILE *sfr_fopen(const char* path, const int general_id, const char* file_name, const char *mode, void (*header)(FILE*, struct s_data *), struct s_data *p_data)
{
#if FLAG_JSON
    return NULL;
#else
    char str[STR_BUFFSIZE];
    snprintf(str, STR_BUFFSIZE, "%s%s_%d.output", path, file_name, general_id);

    FILE *my_file = fopen(str, mode);
    if (header) {
        header(my_file, p_data);
    }
    return my_file;

#endif

}


void header_X(FILE *p_file, struct s_data *p_data)
{
    int i, g, ts, cac;

    struct s_drift *p_drift = p_data->p_drift;
    struct s_router **routers = p_data->routers;

    fprintf(p_file, "index\ttime\t");
    for(i=0; i<N_PAR_SV; i++) {
        const char *name = routers[i]->name;
        for(cac=0; cac < N_CAC; cac++) {
            const char *cac_name = p_data->cac_name[cac];
            fprintf(p_file,"%s:%s\t", name, cac_name);
        }
    }

    for(ts=0; ts<N_TS; ts++) {
        fprintf(p_file, "obs_mean:%s\t", p_data->ts_name[ts]);
    }

    for(i=0; i< (N_DRIFT_PAR_PROC + N_DRIFT_PAR_OBS) ; i++) {
        int ind_par_Xdrift_applied = p_drift->ind_par_Xdrift_applied[i];
        const char *name = routers[ind_par_Xdrift_applied]->name;
        for(g=0; g< routers[ ind_par_Xdrift_applied ]->n_gp; g++) {
            const char *group = routers[ind_par_Xdrift_applied]->group_name[g];
            fprintf(p_file, "drift:%s:%s\t", name, group);
        }
    }

    for(ts=0; ts<N_TS; ts++) {
        fprintf(p_file, "obs_real:%s\t", p_data->ts_name[ts]);
    }

    fprintf(p_file, "\n");
}


void header_prediction_residuals(FILE *p_file, struct s_data *p_data)
{
    int ts;

    fprintf(p_file, "time\t");

    for(ts=0; ts<N_TS; ts++) {
        fprintf(p_file, "mean:%s\tres:%s\t", p_data->ts_name[ts], p_data->ts_name[ts]);
    }

    fprintf(p_file, "ess\tlog_like_t\n");
}



void header_hat(FILE *p_file, struct s_data *p_data)
{
    int i, g, ts, cac;
    struct s_drift *p_drift = p_data->p_drift;
    struct s_router **routers = p_data->routers;

    fprintf(p_file, "time\t");

    /* par_sv */
    for(i=0; i<N_PAR_SV; i++) {
        const char *name = routers[i]->name;
        for(cac=0; cac < N_CAC; cac++) {
            const char *cac_name = p_data->cac_name[cac];
            fprintf(p_file, "low95:%s:%s\t%s:%s\thigh95:%s:%s\t", name, cac_name, name, cac_name, name, cac_name);
        }
    }

    /* ts */
    for(ts=0; ts<N_TS; ts++) {
        fprintf(p_file, "low95:%s\t%s\thigh95:%s\t", p_data->ts_name[ts], p_data->ts_name[ts], p_data->ts_name[ts]);
    }

    /* drift */
    for(i=0; i< (N_DRIFT_PAR_PROC + N_DRIFT_PAR_OBS) ; i++) {
        int ind_par_Xdrift_applied = p_drift->ind_par_Xdrift_applied[i];
        const char *name = routers[ind_par_Xdrift_applied]->name;
        for(g=0; g< routers[ ind_par_Xdrift_applied ]->n_gp; g++) {
            const char *group = routers[ind_par_Xdrift_applied]->group_name[g];
            fprintf(p_file, "low95:drift:%s:%s\tdrift:%s:%s\thigh95:drift:%s:%s\t", name, group, name, group, name, group);
        }
    }

    fprintf(p_file, "\n");

}


void header_best(FILE *p_file, struct s_data *p_data)
{
    int i, g;
    struct s_router **routers = p_data->routers;

    fprintf(p_file, "index\t");

    for(i=0; i<(N_PAR_SV+N_PAR_PROC+N_PAR_OBS); i++) {
        const char *name = routers[i]->name;
        for(g=0; g<p_data->routers[i]->n_gp; g++) {
            const char *group = routers[i]->group_name[g];
            fprintf(p_file, "%s:%s\t", name, group);
        }
    }

    fprintf(p_file, "log_like\n");

}




void sfr_fclose(FILE *p_file)
{
#if ! FLAG_JSON
    fclose(p_file);
#endif
}

void print_log(char *msg)
{
#if FLAG_JSON

    json_t *root;
    root = json_pack("{s,s,s,s}", "flag", "log", "msg", msg);
    json_dumpf(root, stdout, 0); printf("\n");
    fflush(stdout);
    json_decref(root);

#else
    printf("%s\n", msg);
#endif
}


void print_warning(char *msg)
{
#if FLAG_JSON

    json_t *root;
    root = json_pack("{s,s,s,s}", "flag", "log", "msg", msg);
    json_dumpf(root, stdout, 0); printf("\n");
    fflush(stdout);
    json_decref(root);

#else
    printf("\033[93m%s\033[0m\n", msg);
#endif
}





void print_err(char *msg)
{
#if FLAG_JSON

    json_t *root;
    root = json_pack("{s,s,s,s}", "flag", "err", "msg", msg);
    json_dumpf(root, stderr, 0); fprintf(stderr,"\n");
    fflush(stderr);
    json_decref(root);

#else
    fprintf(stderr, "\033[91m%s\033[0m\n", msg);
#endif
}



void print_p_X(FILE *p_file, json_t *json_print, struct s_X *p_X, struct s_par *p_par, struct s_data *p_data, struct s_calc *p_calc, int j_or_m, double time)
{
    /* helper function for sample_traj_and_print and print_X */
    int i, k, ts;
    double x;

    struct s_drift *p_drift = p_data->p_drift;
    struct s_router **routers = p_data->routers;
    int ind_par_Xdrift_applied;

    /* makes sure that p_calc contains the natural values of the drifted obs process parameters */
    drift_par(p_calc, p_par, p_data,  p_X, N_DRIFT_PAR_PROC, N_DRIFT_PAR_PROC + N_DRIFT_PAR_OBS);


#if FLAG_JSON
    json_t *json_print_j = json_array();
    json_array_append_new(json_print_j, json_integer(j_or_m));
    json_array_append_new(json_print_j, json_real(time));
#else
    fprintf(p_file,"%d\t%g\t", j_or_m, time);
#endif

    for(i=0; i<(N_PAR_SV*N_CAC); i++) {
        x = p_X->proj[i];
#if FLAG_JSON
        json_array_append_new(json_print_j, json_real(x));
#else
        fprintf(p_file, "%g\t", x);
#endif
    }



    for(ts=0; ts<N_TS; ts++) {
        x = obs_mean(p_X->obs[ts], p_par, p_data, p_calc, ts);
#if FLAG_JSON
        json_array_append_new(json_print_j, json_real(x));
#else
        fprintf(p_file,"%g\t", x);
#endif
    }

    for(i=0; i< (N_DRIFT_PAR_PROC + N_DRIFT_PAR_OBS) ; i++) {
        ind_par_Xdrift_applied = p_drift->ind_par_Xdrift_applied[i];
        for(k=0; k< routers[ ind_par_Xdrift_applied ]->n_gp; k++) {
            x = (*(routers[ ind_par_Xdrift_applied ]->f_inv_print))( p_X->drift[i][k] , routers[ind_par_Xdrift_applied]->multiplier_f_inv_print, routers[ind_par_Xdrift_applied]->min[k], routers[ind_par_Xdrift_applied]->max[k]);
#if FLAG_JSON
            json_array_append_new(json_print_j, json_real(x));
#else
            fprintf(p_file,"%g\t", x);
#endif
        }
    }

    for(ts=0; ts<N_TS; ts++) {
        x = observation(p_X->obs[ts], p_par, p_data, p_calc, ts);
#if FLAG_JSON
        json_array_append_new(json_print_j, json_real(x));
#else
        fprintf(p_file,"%g\t", x);
#endif
    }

#if FLAG_JSON
    json_array_append_new(json_print, json_print_j);
#else
    fprintf(p_file, "\n");
#endif

}



void print_X(FILE *p_file_X, struct s_par **J_p_par, struct s_X **J_p_X, struct s_data *p_data, struct s_calc *p_calc, double time, int is_p_par_cst, int is_m, int m)
{
    /* print trajectory
       2 versions are possible: all the particles have the same
       parameters (J of J_p_par=1, is_p_par_cst=1) or the particles have
       different parameters values (J of J_p_par =J, is_p_par_cst=0).

       is_m : we print the iteration id (m) instead of the particles id (j).
    */

#if FLAG_JSON
    json_t *root;
    json_t *json_print = json_array();
#else
    json_t *json_print = NULL;
#endif

#if FLAG_JSON //print only first particle
    print_p_X(p_file_X, json_print, J_p_X[0], J_p_par[0], p_data, p_calc, (is_m ==1) ? m: 0, time);
#else
    int j;
    int zero = 0;
    int *fake_j = (is_p_par_cst) ? &zero : &j;

    if (is_m) {
        print_p_X(p_file_X, json_print, J_p_X[0], J_p_par[0], p_data, p_calc, m, time);
    } else {
        for(j=0;j<J;j++) {
            print_p_X(p_file_X, json_print, J_p_X[j], J_p_par[ *fake_j ], p_data, p_calc, j, time);
        }
    }
#endif

#if FLAG_JSON
    root = json_pack("{s,s,s,o}", "flag", "X", "msg", json_print);
    json_dumpf(root, stdout, JSON_COMPACT); printf("\n");
    fflush(stdout);
    json_decref(root);
#endif

}


void print_best(FILE *p_file_best, int m, struct s_best *p_best, struct s_data *p_data, double log_like)
{
    int i, k;
    int offset = 0;
    double x;

#if FLAG_JSON
    json_t *root;
    json_t *json_print = json_array();
#endif

#if FLAG_JSON
    json_array_append_new(json_print, json_integer(m));
#else
    fprintf(p_file_best, "%d\t", m);
#endif

    for(i=0; i<(N_PAR_SV+N_PAR_PROC+N_PAR_OBS); i++) {
        for(k=0; k<p_data->routers[i]->n_gp; k++) {
            x = (*(p_data->routers[i]->f_inv_print))(gsl_vector_get(p_best->mean, offset), p_data->routers[i]->multiplier_f_inv_print, p_data->routers[i]->min[k], p_data->routers[i]->max[k]);
#if FLAG_JSON
            json_array_append_new(json_print, json_real(x));
#else
            fprintf(p_file_best,"%g\t", x);
#endif
            offset++;
        }
    }

#if FLAG_JSON
    json_array_append_new(json_print, isnan(log_like) ? json_null() : json_real(log_like));
#else
    fprintf(p_file_best,"%.6f\n", log_like);
#endif

#if FLAG_JSON
    root = json_pack("{s,s,s,o}", "flag", "best", "msg", json_print);
    json_dumpf(root, stdout, JSON_COMPACT); printf("\n");
    fflush(stdout);
    json_decref(root);
#endif

}

/**
 * if json_print is NULL, send the hat msg otherwise put it into json_print array
 */
void print_p_hat(FILE *p_file, json_t *json_print, struct s_hat *p_hat, struct s_data *p_data, int n)
{
    int i;
    double x;

#if FLAG_JSON
    json_t *json_print_n = json_array();
    json_array_append_new(json_print_n, json_integer(n+1));
#else
    fprintf(p_file, "%d\t", n+1);
#endif

    /* par_sv */
    for(i=0; i< N_PAR_SV*N_CAC; i++) {
        x = p_hat->state_95[i][0];
#if FLAG_JSON
        json_array_append_new(json_print_n, json_real(x));
#else
        fprintf(p_file,"%g\t", x);
#endif

        x = p_hat->state[i];
#if FLAG_JSON
        json_array_append_new(json_print_n, json_real(x));
#else
        fprintf(p_file,"%g\t", x);
#endif

        x = p_hat->state_95[i][1];
#if FLAG_JSON
        json_array_append_new(json_print_n, json_real(x));
#else
        fprintf(p_file,"%g\t", x);
#endif
    }


    /* ts */
    for(i=0; i< N_TS; i++) {
        x = p_hat->obs_95[i][0];
#if FLAG_JSON
        json_array_append_new(json_print_n, json_real(x));
#else
        fprintf(p_file,"%g\t", x);
#endif

        x = p_hat->obs[i];
#if FLAG_JSON
        json_array_append_new(json_print_n, json_real(x));
#else
        fprintf(p_file,"%g\t", x);
#endif

        x = p_hat->obs_95[i][1];
#if FLAG_JSON
        json_array_append_new(json_print_n, json_real(x));
#else
        fprintf(p_file,"%g\t", x);
#endif
    }

    /* drift */
    for(i=0; i< p_data->p_it_only_drift->nbtot; i++) {
        x = p_hat->drift_95[i][0];
#if FLAG_JSON
        json_array_append_new(json_print_n, json_real(x));
#else
        fprintf(p_file,"%g\t", x);
#endif

        x = p_hat->drift[i];
#if FLAG_JSON
        json_array_append_new(json_print_n, json_real(x));
#else
        fprintf(p_file,"%g\t", x);
#endif

        x = p_hat->drift_95[i][1];
#if FLAG_JSON
        json_array_append_new(json_print_n, json_real(x));
#else
        fprintf(p_file,"%g\t", x);
#endif
    }

#if FLAG_JSON
    if (json_print) {
        json_array_append_new(json_print, json_print_n);
    } else {
        json_t *root = json_pack("{s,s,s,o}", "flag", "hat", "msg", json_print_n);
        json_dumpf(root, stdout, JSON_COMPACT); printf("\n");
        fflush(stdout);
        json_decref(root);
    }
#else
    fprintf(p_file, "\n");
#endif

}



void print_hat(FILE *p_file, struct s_hat **D_p_hat, struct s_data *p_data)
{
    /* print trajectory
       2 versions are possible: all the particles have the same
       parameters (J of J_p_par=1, is_p_par_cst=1) or the particles have
       different parameters values (J of J_p_par =J, is_p_par_cst=0).

       is_m : we print the iteration id (m) instead of the particles id (j).
    */
    int n;

#if FLAG_JSON
    json_t *root;
    json_t *json_print = json_array();
#else
    json_t *json_print = NULL;
#endif

    for(n=0; n<N_DATA; n++) {
        print_p_hat(p_file, json_print, D_p_hat[n], p_data, n);
    }

#if FLAG_JSON
    root = json_pack("{s,s,s,o}", "flag", "hat", "msg", json_print);
    json_dumpf(root, stdout, JSON_COMPACT); printf("\n");
    fflush(stdout);
    json_decref(root);
#endif

}




void print_par(struct s_par *p_par, struct s_data *p_data)
{
    /* for debugging purposes */

    int i, k;

    for(i=0; i<(N_PAR_SV+N_PAR_PROC+N_PAR_OBS); i++) {
        for(k=0; k<p_data->routers[i]->n_gp; k++) {
            printf("%g\t", p_par->natural[i][k]);
        }
        printf("\n");
    }

}

/**
 * computes standardized prediction residuals
 * res = (data-one_set_ahead_pred)/sqrt(var_one_step_ahead +var_obs)
 *
 * AND print log likelihood at time t and effective sample size.
 *
 * Note that this function is designed to be called only N_DATA
 * times by opposed to N_DATA_NONAN (ie when there is information)
 */

void print_prediction_residuals(FILE *p_file_pred_res, struct s_par **J_p_par, struct s_data *p_data, struct s_calc *p_calc, struct s_X **J_p_X, double llike_t, double ess_t, int time, int is_p_par_cst)
{
    int ts,j;
    int zero = 0;
    int *fake_j = (is_p_par_cst) ? &zero : &j;

    double mean_state;
    double var_obs;
    double var_state;

    double kn;
    double M2;
    double delta;
    double x, y;
    double res;

#if FLAG_JSON
    json_t *root;
    json_t *json_print = json_array();
#endif

#if FLAG_JSON
    json_array_append_new(json_print, json_integer(time));
#else
    fprintf(p_file_pred_res,"%d\t", time);
#endif

    for(ts=0; ts<N_TS; ts++) {
        kn=0.0;
        mean_state=0.0;
        var_obs=0.0;
        M2=0.0;

        for(j=0;j<J;j++) {

            /* makes sure that p_calc contains the natural values of the drifted obs process parameters */
            drift_par(p_calc, J_p_par[*fake_j], p_data, J_p_X[j], N_DRIFT_PAR_PROC, N_DRIFT_PAR_PROC + N_DRIFT_PAR_OBS);

            kn += 1.0;
            x = obs_mean(J_p_X[j]->obs[ts], J_p_par[*fake_j], p_data, p_calc, ts);

            delta = x - mean_state;
            mean_state += delta/kn;
            M2 += delta*(x - mean_state);
            var_obs += obs_var(J_p_X[j]->obs[ts], J_p_par[*fake_j], p_data, p_calc, ts);
        }

        var_state = M2/(kn - 1.0);
        var_obs /= ((double) J);

        y = p_data->data[ p_calc->current_nn ][ts];

        res = (y - mean_state)/sqrt(var_state + var_obs);

#if FLAG_JSON
        json_array_append_new(json_print, json_real(mean_state));
        json_array_append_new(json_print, json_real(res));
#else
        fprintf(p_file_pred_res,"%g\t%g\t", mean_state, res);
#endif
    }


#if FLAG_JSON
    json_array_append_new(json_print, json_real(ess_t));
    json_array_append_new(json_print, json_real(llike_t));
#else
    fprintf(p_file_pred_res,"%g\t%g\n", ess_t, llike_t);
#endif


#if FLAG_JSON
    root = json_pack("{s,s,s,o}", "flag", "pred_res", "msg", json_print);
    json_dumpf(root, stdout, JSON_COMPACT); printf("\n");
    json_decref(root);
#endif


}


void sample_traj_and_print(FILE *p_file, struct s_X ***D_J_p_X, struct s_par *p_par, struct s_data *p_data, unsigned int **select, double *weights, unsigned int *times, struct s_calc *p_calc, int m)
{

    int j_sel;
    int n, nn;

    double ran, cum_weights;

    struct s_X *p_X_sel;

#if FLAG_JSON
    json_t *root;
    json_t *json_print = json_array();
#else
    json_t *json_print = NULL;
#endif

    ran=gsl_ran_flat(p_calc->randgsl, 0.0, 1.0);

    j_sel=0;
    cum_weights=weights[0];

    while (cum_weights < ran) {
        cum_weights += weights[++j_sel];
    }

    //print traj of ancestors of particle j;

    p_X_sel = D_J_p_X[ times[N_DATA_NONAN-1] ][j_sel];

    print_p_X(p_file, json_print, p_X_sel, p_par, p_data, p_calc, m, times[N_DATA_NONAN-1]);

    //missing value for data
    for(nn=(times[N_DATA_NONAN-1]-1); nn>times[N_DATA_NONAN-2]; nn--) {
        p_X_sel = D_J_p_X[ nn ][j_sel];
        print_p_X(p_file, json_print, p_X_sel, p_par, p_data, p_calc, m, nn);
    }

    for(n=(N_DATA_NONAN-1); n>=2; n--) {
        j_sel = select[n][j_sel];
        p_X_sel = D_J_p_X[ times[n-1] ][j_sel];
        print_p_X(p_file, json_print, p_X_sel, p_par, p_data, p_calc, m, times[n-1]);

        for(nn=(times[n-1]-1); nn>(times[n-2]); nn--) {
            p_X_sel = D_J_p_X[ nn ][j_sel];
            print_p_X(p_file, json_print, p_X_sel, p_par, p_data, p_calc, m, nn);
        }
    }

    for(n=1; n>=0; n--) {
        j_sel = select[n][j_sel];
        //works because times[0] has to be equal to 1
        p_X_sel = D_J_p_X[ n ][j_sel];
        print_p_X(p_file, json_print, p_X_sel, p_par, p_data, p_calc, m, n);
    }

#if FLAG_JSON
    root = json_pack("{s,s,s,o}", "flag", "X", "msg", json_print);
    json_dumpf(root, stdout, JSON_COMPACT); printf("\n");
    json_decref(root);
#endif

}
