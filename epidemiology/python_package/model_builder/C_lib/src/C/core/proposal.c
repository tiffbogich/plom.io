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
   generate a new value of theta that respects the constraints on
   the initial conditions.
*/
void propose_safe_theta_and_load_X0(theta_t *proposed, struct s_best *p_best, double sd_fac, struct s_par *p_par, struct s_X *p_X, struct s_data *p_data, struct s_calc *p_calc,
                                    void (*ran_proposal) (theta_t *proposed, struct s_best *p_best, double sd_fac, struct s_calc *p_calc),
                                    int need_rounding)
{
    do
        {
            (*ran_proposal)(proposed, p_best, sd_fac, p_calc);

            //load_X0 (p_X->proj)
            back_transform_theta2par(p_par, proposed, p_data->p_it_par_sv, p_data);
            linearize_and_repeat(p_X, p_par, p_data, p_data->p_it_par_sv);
            prop2Xpop_size(p_X, p_data, need_rounding); //If POP_SIZE_EQ_SUM_SV the last state is replaced by pop_size-sum_every_state_except_the_last.
        }
    while (check_IC(p_X, p_data) > 0);

    //load p_X->drift
    theta_driftIC2Xdrift(p_X, proposed, p_data);
}


void ran_proposal(theta_t *proposed, struct s_best *p_best, double sd_fac, struct s_calc *p_calc)
{
    /* generate a randam vector proposed. proposed is drawn from a MVN
       law with mean "p_best->mean" and var "p_best->var" */

    //here we assume a diagonal sigma_proposal so we draw iid gaussians. mvn case is a straight extension (see mvn.c)

    int k;

    for (k=0; k< proposed->size ; k++) {
        gsl_vector_set(proposed, k, gsl_vector_get(p_best->mean, k) + gsl_ran_gaussian(p_calc->randgsl, sd_fac*sqrt(gsl_matrix_get(p_best->var, k, k))));
    }
}


int check_IC(struct s_X *p_X, struct s_data *p_data)
{
    /*return the number of errors (=number of cac where the intitial
      population size is not respected)*/

    double *pop_size_t0 = p_data->pop_size_t0;

    int cac;
    double pop_IC_cac = 0;
    int cnt_error = 0;

    for (cac=0; cac<N_CAC; cac++) {
        pop_IC_cac = sum_SV(p_X->proj, cac);

        if(pop_IC_cac > pop_size_t0[cac]) {
            cnt_error++;
        }
    }
    return cnt_error;
}


double log_prob_proposal(struct s_best *p_best, theta_t *proposed, theta_t *mean, double sd_fac, struct s_data *p_data, int is_mvn)
{
    gsl_matrix *var = p_best->var;
    struct s_router **routers = p_data->routers;

    char str[STR_BUFFSIZE];
    int i, k;

    double p_tmp, Lp;
    p_tmp=0.0, Lp=0.0;

    int offset = 0;

    if (is_mvn) {
        p_tmp = sfr_dmvnorm(p_best, proposed, mean, sd_fac);
    }

    for(i=0; i<(N_PAR_SV+N_PAR_PROC+N_PAR_OBS); i++) {
        for(k=0; k<routers[i]->n_gp; k++) {
            if(gsl_matrix_get(var, offset, offset) >0.0) {

                if (!is_mvn) {
                    p_tmp = gsl_ran_gaussian_pdf((gsl_vector_get(proposed, offset)-gsl_vector_get(mean, offset))/sd_fac*sqrt(gsl_matrix_get(var, offset, offset)),1);
                }

                p_tmp /= (*(routers[i]->f_derivative))(gsl_vector_get(proposed, offset), routers[i]->multiplier_f_derivative, routers[i]->min[k], routers[i]->max[k]);

                //check for numerical issues
                if((isinf(p_tmp)==1) || (isnan(p_tmp)==1)) {
#if FLAG_VERBOSE
                    sprintf(str, "error prob_prior computation, p=%g", p_tmp);
                    print_err(str);
#endif
                    p_tmp=LIKE_MIN;
                } else{
                    if(p_tmp <= LIKE_MIN) {
                        p_tmp = LIKE_MIN ;
                    }
                }
                Lp += log(p_tmp);
            }
            offset++;
        }
    }

    return(Lp);
}
