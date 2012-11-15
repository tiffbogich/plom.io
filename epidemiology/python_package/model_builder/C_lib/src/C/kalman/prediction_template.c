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

#include "kalman.h"


/**
 * the function used by f_prediction_ode_rk:
 * dX/dt = f(t, X, params)
 *
 * it is an expanded copy of core/prediction.c/func
 */
int func_kal(double t, const double X[], double f[], void *params)
{

    struct s_calc *p_calc = (struct s_calc *) params;
    struct s_par *p_par = p_calc->p_par;  /* syntaxic shortcut */
    struct s_data *p_data = p_calc->p_data;
    struct s_obs2ts **obs2ts = p_data->obs2ts;		/* syntaxic shortcut */
    struct s_router **routers = p_data->routers;	/* syntaxic shortcut */

    struct s_kalman_specific_data *p_kalman_specific_data = (struct s_kalman_specific_data *) p_calc->method_specific_thread_safe_data;

    gsl_matrix *Ft = p_kalman_specific_data->Ft;
    gsl_matrix *Q = p_kalman_specific_data->Q;
    gsl_matrix *S = p_kalman_specific_data->S;
    struct s_group ***compo_groups_drift_par_proc = p_kalman_specific_data->compo_groups_drift_par_proc;
    gsl_matrix *FtCt = p_kalman_specific_data->FtCt;
    gsl_matrix *res = p_kalman_specific_data->res;

    int c, ac, cac, n_cac, ts, o;
    double sum_inc = 0.0;
    int offset;

    const int nn = p_calc->current_nn;
    double **par = p_par->natural;
    double ***covar = p_data->par_fixed;


    {% if current_p %}
    for(c=0;c<N_C;c++)
        {
            for(ac=0;ac<N_AC;ac++)
                p_par->current_p[c][ac]=get_current_pop_size(X,c,ac);
        }
    {% endif %}


    for(c=0;c<N_C;c++)
        {
            for(ac=0; ac<N_AC; ac++)
                {
                    cac = c*N_AC+ac;

                    {{ print_ode|safe }}
                }
        }

    /*automaticaly generated code:*/
    /*compute incidence:integral between t and t+1*/

    offset=0;
    {% for eq in eq_obs_inc_ode %}
    o = {{ eq.true_ind_obs|safe }};

    for(ts=0; ts<obs2ts[o]->n_ts_unique; ts++)
        {
            sum_inc = 0.0;
            for(n_cac=0; n_cac<obs2ts[o]->n_cac[ts]; n_cac++)
                {
                    c = obs2ts[o]->cac[ts][n_cac][0];
                    ac = obs2ts[o]->cac[ts][n_cac][1];
                    cac = c*N_AC+ac;

                    sum_inc += {{ eq.right_hand_side|safe }};
                }

            {{ eq.left_hand_side|safe }} = sum_inc;
            offset++;
        }
    {% endfor %}

    ////////////////
    // covariance //
    ////////////////

    offset = N_PAR_SV*N_CAC + N_TS_INC_UNIQUE;
    int row, col;
    double data;


    // evaluate Q and jacobian
    eval_Q(Q, X, p_par, p_data, p_calc, p_kalman_specific_data, t);
    eval_jac(Ft, X, p_par, p_data, p_calc, compo_groups_drift_par_proc, t);

    // compute Ft*Ct+Ct*Ft'+Q
    matrix_times_list_form(FtCt, Ft, X, offset);	// compute Ft*Ct (find Ct from X[offset])
    for(row=0; row<N_KAL; row++)			// compute Ft*Ct+Ct*Ft'+Q
        {
            for(col=0; col<=row; col++)			// only fill inferior triangle (symetric matrix)
                {
                    data = gsl_matrix_get(FtCt, row, col)	// Ft*Ct
                        +gsl_matrix_get(FtCt, col, row)		// Ct*Ft'
                        +gsl_matrix_get(Q, row, col);		// Q
                    gsl_matrix_set(res, row, col, data);	// fill res
                }
        }

    // fill f
    sym_matrix2list(f, res, offset);


    return GSL_SUCCESS;

}
