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

#include "simplex.h"

double f_simplex(const gsl_vector *x, void *params)
{
    /* function to **minimize** */
    int n, nn;
    double log_like_tmp, fitness;
    int t0, t1;

    /* syntax shortcuts */
    struct s_simplex *p_params_simplex = (struct s_simplex *) params;
    struct s_data *p_data = p_params_simplex->p_data;
    struct s_best *p_best = p_params_simplex->p_best;
    struct s_calc **calc = p_params_simplex->calc;
    struct s_par *p_par = p_params_simplex->p_par;
    struct s_X *p_X = p_params_simplex->p_X;

    transfer_estimated(p_best, x);

    back_transform_theta2par(p_par, p_best->mean, p_data->p_it_all, p_data);
    linearize_and_repeat(p_X, p_par, p_data, p_data->p_it_par_sv);
    prop2Xpop_size(p_X, p_data, 0);

    /* if the initial conditions do not respect the constraint we set
       the log likelihood to the smallest possible value:
       smallest_log_like */

    t0=0;
    fitness=0.0;

    if (check_IC(p_X, p_data) == 0) {
        for(n=0; n<N_DATA_NONAN; n++) {

            t1=p_data->times[n];

            /*we have to use this subloop to mimate equaly spaced time step and hence set the incidence to 0 every time unit...*/
            for(nn=t0 ; nn<t1 ; nn++) {
                store_state_current_n_nn(calc, n, nn);
                reset_inc(p_X); //reset incidence to 0
                f_prediction_ode_rk(p_X->proj, nn, (nn+1), p_par, calc[0]);
            }
            proj2obs(p_X, p_data);

            if (OPTION_LEAST_SQUARE) {
                fitness += get_sum_square(p_X, p_par, p_data, calc[0]);
            } else {
                log_like_tmp = get_log_likelihood(p_X, p_par, p_data, calc[0]);
                fitness += (log_like_tmp>=LOG_LIKE_MIN) ? log_like_tmp : LOG_LIKE_MIN;
            }

            t0=t1;

        } /*end of for loop on n*/
    }
    else { //new IC do not respect the constraint:
#if FLAG_VERBOSE
        print_err("IC constraint has not been respected: pop_IC>pop_size at t=0 minimal likelihood value has been assigned");
#endif
//	sanitize_IC(p_X->proj, p_data->pop_size_t0);
        if(OPTION_LEAST_SQUARE) {
            fitness = BIG_NUMBER*N_DATA_NONAN;
        } else {
            fitness = p_params_simplex->smallest_log_like;
        }
    }

    if(!OPTION_LEAST_SQUARE) {
        fitness = -fitness; //GSL simplex algo minimizes so we multiply by -1 in case of log likelihood
    }

    return fitness;
}
