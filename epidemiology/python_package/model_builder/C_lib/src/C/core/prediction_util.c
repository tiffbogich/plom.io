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
 * reset incidences to 0
 */
void reset_inc(struct s_X *p_X)
{
    double *X = p_X->proj;
    int oi;
    for (oi=0; oi<N_TS_INC_UNIQUE; oi++) {
        X[N_PAR_SV*N_CAC+oi]=0.0; /*incidence*/
    }
}

/**
 * round incidences
 */
void round_inc(struct s_X *p_X)
{
    double *X = p_X->proj;
    int oi;
    for (oi=0; oi<N_TS_INC_UNIQUE; oi++) {
        X[N_PAR_SV*N_CAC+oi]=round(X[N_PAR_SV*N_CAC+oi]); /*incidence*/
    }
}


/**
 * return the sum of the state variable of the composant @c proj of @c p_X for @c cac
 */

double sum_SV(const double *X_proj, int cac)
{
    int i;
    double current_p=0.0;

    for(i=0; i<N_PAR_SV; i++) {
        current_p += X_proj[i*N_CAC +cac];
    }

    return current_p;
}


/**
   used for euler multinomial integrarion. When duration of
   infection is close to the time step duration, the method becomes
   inacurate (the waiting time is geometric instead of
   exponential. So we ensure that the rate has the correct magnitude
   by correcting it
*/
double correct_rate(double rate)
{
    return -log(1.0-rate/DELTA_STO)*DELTA_STO;
}


/**
 *  take **grouped** initial condition contained in @c p_par and ungroup them in @c p_X
 */
void linearize_and_repeat(struct s_X *p_X, struct s_par *p_par, struct s_data *p_data, const struct s_iterator *p_it)
{
    double *expanded = p_X->proj;
    int i, k;
    struct s_router **routers = p_data->routers;
    int offset = 0;

    for(i=0; i< p_it->length; i++) {
        for(k=0; k< routers[ p_it->ind[i] ]->p; k++) {
            expanded[offset++] = p_par->natural[ p_it->ind[i] ][ routers[ p_it->ind[i] ]->map[k] ];
        }
    }
}

/**
   From proportion of initial conditons to population size.  If
   @c POP_SIZE_EQ_SUM_SV the last state is replaced by
   pop_size - sum_every_state_except_the_last.

   *Note that we round in case of stochastic models.*
*/
void prop2Xpop_size(struct s_X *p_X, struct s_data *p_data, int need_rounding)
{

    double *Xpop_size = p_X->proj;
    double *pop_size_t0 = p_data->pop_size_t0;
    int i, cac;

    for (i=0; i< N_PAR_SV ; i++) {
        for (cac=0; cac<N_CAC; cac++) {
            Xpop_size[i*N_CAC+cac] = Xpop_size[i*N_CAC+cac] * pop_size_t0[cac];
            if(need_rounding){
                Xpop_size[i*N_CAC+cac] = round(Xpop_size[i*N_CAC+cac]);
            }
        }
    }

    if (POP_SIZE_EQ_SUM_SV) {
        for (cac=0; cac<N_CAC; cac++) {
            Xpop_size[ (N_PAR_SV-1)*N_CAC + cac ] = pop_size_t0[cac] - (sum_SV(p_X->proj, cac)  - Xpop_size[ (N_PAR_SV-1)*N_CAC + cac ]);
        }
    }
}


/* load p_X->drift from drift IC (contained in p_best) */
void theta_driftIC2Xdrift(struct s_X *p_X, const theta_t *best_mean, struct s_data *p_data)
{
    double **Xdrift = p_X->drift;
    int i, k;
    struct s_iterator *p_it_only_drift = p_data->p_it_only_drift;
    struct s_router **routers = p_data->routers;

    for(i=0; i< p_it_only_drift->length; i++) {
        for(k=0; k< routers[ p_it_only_drift->ind[i] ]->n_gp; k++) {
            Xdrift[i][k] = gsl_vector_get(best_mean, p_it_only_drift->offset[i] +k );
        }
    }
}


void f_prediction_euler_multinomial(double *X, double t0, double t1, struct s_par *p_par, struct s_data *p_data, struct s_calc *p_calc)
{
    int k;

    for(k= (int) (t0*DELTA_STO) ; k< (int) (t1*DELTA_STO) ;k++) {
        step_euler_multinomial(X, (double) k/DELTA_STO, p_par, p_data, p_calc);
    }
}


void f_prediction_ode_rk(double *y, double t0, double t1, struct s_par *p_par,  struct s_calc *p_calc)
{
    double t=t0;
    double h = DT; //h is the initial integration step size
    double h_min = DT/10.0;
    int status;
    p_calc->p_par = p_par; //pass the ref to p_par so that it is available wihtin the function to integrate

    while (t < t1) {
        status = gsl_odeiv2_evolve_apply (p_calc->evolve, p_calc->control, p_calc->step, &(p_calc->sys), &t, t1, &h, y);
        if (status != GSL_SUCCESS) {
            char str[STR_BUFFSIZE];
            sprintf(str, "error (%d) integration time step is too large to match desired precision", status);
            print_err(str);
            exit(EXIT_FAILURE);
        }

        if (h< h_min) { //to avoid wasting a long time when integration is hard we finish with a fixed time step...
            char str[STR_BUFFSIZE];
            sprintf(str, "h = %g is lower than h_min (%g) trying to finish the integration from t=%g to t=%g with a fixed time step", h, h_min, t, t1);
            print_warning(str);

            status = gsl_odeiv2_step_apply (p_calc->step, t, (t1-t), y, p_calc->yerr, NULL, NULL, &(p_calc->sys));
            if (status != GSL_SUCCESS) {
                sprintf(str, "error (%d) unable to compute the requested step", status);
                print_err(str);
                exit(EXIT_FAILURE);
            } else {
                break;
            }
        }
    }
}


void f_prediction_with_drift_deter(struct s_X *p_X, double t0, double t1, struct s_par *p_par, struct s_data *p_data, struct s_calc *p_calc)
{
    int k;
    double t;

    p_calc->p_par = p_par; //pass the ref to p_par so that it is available wihtin the function to integrate

    for(k= (int) (t0*DELTA_STO) ; k< (int) (t1*DELTA_STO) ;k++) {
        t = (double) k/DELTA_STO;

        if(N_DRIFT_PAR_PROC) {
            compute_drift(p_X, p_par, p_data, p_calc, 0, N_DRIFT_PAR_PROC, DT);
            drift_par(p_calc, p_par, p_data, p_X, 0, N_DRIFT_PAR_PROC);
        }

        f_prediction_ode_rk(p_X->proj, t, t+DT, p_par,  p_calc);
    }

}


void f_prediction_with_drift_sto(struct s_X *p_X, double t0, double t1, struct s_par *p_par, struct s_data *p_data, struct s_calc *p_calc)
{
    int k;
    double t;

    for (k= (int) (t0*DELTA_STO) ; k< (int) (t1*DELTA_STO) ;k++) {
        t = (double) k/DELTA_STO;

        if (N_DRIFT_PAR_PROC) {
            compute_drift(p_X, p_par, p_data, p_calc, 0, N_DRIFT_PAR_PROC, DT);
            drift_par(p_calc, p_par, p_data, p_X, 0, N_DRIFT_PAR_PROC);
        }

        step_euler_multinomial(p_X->proj, t, p_par, p_data, p_calc);
    }

}


/**
 * Modified version of gsl_ran_multinomial to avoid a loop. We avoid
 * to recompute the total sum of p (called norm in GSL) as it will
 * always be 1.0 with simforence (no rounding error by construction)
 * @see step_euler_multinomial.
 */
void sfr_ran_multinomial (const gsl_rng * r, const size_t K, unsigned int N, const double p[], unsigned int n[])
{
    size_t k;
    double sum_p = 0.0;

    unsigned int sum_n = 0;

    for (k = 0; k < K; k++) {
        if (p[k] > 0.0) {
            n[k] = gsl_ran_binomial (r, p[k] / (1.0 - sum_p), N - sum_n);
        }
        else {
            n[k] = 0;
        }

        sum_p += p[k];
        sum_n += n[k];
    }
}





/**
   computes sum mij*Ij for model with age classes.
   X_c is X[i*N_CAC + c*N_AC]
   waifw_ac is p_data->waifw_ac[ac]
*/
double foi(double *X_c, double *waifw_ac)
{
    int ac;
    double sum = 0.0;

    for (ac=0; ac< N_AC; ac++) {
        sum += waifw_ac[ac] * X_c[ac];
    }

    return sum;
}
