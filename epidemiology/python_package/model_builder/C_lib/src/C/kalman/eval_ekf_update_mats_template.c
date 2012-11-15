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

int cac_drift_in_cac_ts(int cac_drift, int o, int ts_unique, struct s_obs2ts **obs2ts)
{
    /* helper function for fourth part of eval_jac computation:
       return 1 if cac_drift is in cac of the considered time serie (o, ts_unique) */

    int n_cac_ts, c_ts, ac_ts, cac_ts;

    for(n_cac_ts=0; n_cac_ts< obs2ts[o]->n_cac[ts_unique]; n_cac_ts++) {
        c_ts = obs2ts[o]->cac[ts_unique][n_cac_ts][0];
        ac_ts = obs2ts[o]->cac[ts_unique][n_cac_ts][1];
        cac_ts = c_ts*N_AC+ac_ts;

        if(cac_ts == cac_drift) {
            return 1;
        }
    }

    return 0;
}

void eval_jac(gsl_matrix *jac, const double *X, struct s_par *p_par, struct s_data *p_data, struct s_calc *p_calc, struct s_group ***compo_groups_drift_par_proc, double t)
{
    //X is p_X->proj

    int c, ac, cac, g, d;
    int ts, ts_unique, stream, n_cac;
    double sum_tmp;

    /*t is the current time in the unit of the data */

    //syntaxic shortcut
    struct s_obs2ts **obs2ts = p_data->obs2ts;
    struct s_router **routers = p_data->routers;  /* syntaxic shortcut */
    struct s_drift *p_drift =  p_data->p_drift;

    //the automaticaly generated code may need these variables
    const int nn = p_calc->current_nn;

    double **par = p_par->natural;
    double ***covar = p_data->par_fixed;

    //some terms are always 0: derivative of the ODE (excluding the observed variable) against the observed variable, derivative of the dynamic of the observed variable against the observed variables, derivative of the drift eq.
    gsl_matrix_set_zero(jac);

    //first non null part of the jacobian matrix: derivative of the ODE (excluding the observed variable) against the state variable only ( automaticaly generated code )
    {% for jac_i in jacobian.jac %}
    for(c=0; c<N_C; c++) {
        for(ac=0; ac<N_AC; ac++) {
            cac = c*N_AC+ac;
            {% for jac_ii in jac_i %}
            gsl_matrix_set(jac, {{ forloop.parentloop.counter0 }}*N_CAC+cac, {{ forloop.counter0 }}*N_CAC+cac, {{ jac_ii|safe }});
            {% endfor %}
        }
    }
    {% endfor %}


    //second non null part of the jacobian matrix: derivative of the dynamic of the observed variable against the state variable only ( automaticaly generated code )
    ts = 0;
    {% for jac_i in jacobian.jac_obs %}
    for(ts_unique=0; ts_unique < obs2ts[{{ forloop.counter0 }}]->n_ts_unique; ts_unique++) {
        for(stream=0; stream < obs2ts[{{ forloop.counter0 }}]->n_stream[ts_unique]; stream++) {
            {% for jac_ii in jac_i %}
            for(n_cac=0; n_cac< obs2ts[{{ forloop.parentloop.counter0 }}]->n_cac[ts_unique]; n_cac++) {
                c = obs2ts[{{ forloop.parentloop.counter0 }}]->cac[ts_unique][n_cac][0];
                ac = obs2ts[{{ forloop.parentloop.counter0 }}]->cac[ts_unique][n_cac][1];
                cac = c*N_AC+ac;
                gsl_matrix_set(jac, N_PAR_SV*N_CAC+ts, {{ forloop.counter0 }}*N_CAC+cac, {{ jac_ii|safe }});
            }
            {% endfor %}
            ts++;
        }
    }
    {% endfor %}

    //third non null part of the jacobian matrix: derivative of the ODE (excluding the observed variable) against the drift variable (automaticaly generated code)
    //non null only for 'cac' present in group of Xdrift: compo_groups_drift_par_proc gives these 'cac'
    {% for jac_i in jacobian.jac_drift %}
    d = 0;
    {% for jac_ii in jac_i %}
    for(g=0; g< routers[ p_drift->ind_par_Xdrift_applied[{{ forloop.counter0 }}] ]->n_gp; g++) {
        for(n_cac=0; n_cac< compo_groups_drift_par_proc[{{ forloop.counter0 }}][g]->size; n_cac++) {
            cac = compo_groups_drift_par_proc[{{ forloop.counter0 }}][g]->elements[n_cac];
            get_c_ac(cac, &c, &ac);
            gsl_matrix_set(jac, {{ forloop.parentloop.counter0 }}*N_CAC+cac, N_PAR_SV*N_CAC + N_TS + d, {{ jac_ii|safe }});
        }
        d++;
    }
    {% endfor %}
    {% endfor %}


    //fourth non null part of the jacobian matrix: derivative of N_TS agains drift (automaticaly generated code)
    //this is not optimal at all and will be slow as hell: we should cache the intersection of cac contained in an observation and cac contained in a group of X_drift.
    //anyone tempted ?
    ts = 0;
    {% for jac_i in jacobian.jac_obs_drift %}
    for(ts_unique=0; ts_unique < obs2ts[{{ forloop.counter0 }}]->n_ts_unique; ts_unique++) {
        for(stream=0; stream < obs2ts[{{ forloop.counter0 }}]->n_stream[ts_unique]; stream++) {
            d = 0;
            {% for jac_ii in jac_i %}
            for(g=0; g< routers[ p_drift->ind_par_Xdrift_applied[{{ forloop.counter0 }}] ]->n_gp; g++) {
                sum_tmp = 0.0;
                for(n_cac=0; n_cac< compo_groups_drift_par_proc[{{ forloop.counter0 }}][g]->size; n_cac++) {
                    cac = compo_groups_drift_par_proc[{{ forloop.counter0 }}][g]->elements[n_cac];
                    if(cac_drift_in_cac_ts(cac, {{ forloop.parentloop.counter0 }}, ts_unique, obs2ts)) {
                        get_c_ac(cac, &c, &ac);
                        sum_tmp += {{ jac_ii|safe }};
                    }
                }
                gsl_matrix_set(jac, N_PAR_SV*N_CAC + ts, N_PAR_SV*N_CAC + N_TS + d, sum_tmp);
                d++;
            }
            {% endfor %}
            ts++;
        }
    }
    {% endfor %}

}


void eval_ht(gsl_vector *ht, gsl_vector *xk, struct s_par *p_par, struct s_data *p_data, struct s_calc *p_calc, int ts)
{
    /* derivative of the mean of the observation process against state variables and observed variables */

    double x;
    struct s_router **routers = p_data->routers;  /* syntaxic shortcut */


    //the automaticaly generated code may need these variables
    int n, nn;
    n = p_calc->current_n;
    nn = p_calc->current_nn;
    double t;
    t = (double) p_data->times[n];

    double **par = p_par->natural;
    double ***covar = p_data->par_fixed;

    gsl_vector_set_zero(ht);
    //derivative against state variable are always nul so we focus on the derivative against the observed variable

    x = gsl_vector_get(xk, N_PAR_SV*N_CAC +ts); //the derivative are templated (automaticaly generated code) and are a function of "x". we link "x" to the right observed variable.
    gsl_vector_set(ht, N_PAR_SV*N_CAC +ts, {{ jac_proc_obs|safe }});

}


/**
 * get the total number of reactions
 * ie. size of F
 */
int init_REAC(struct s_obs2ts **obs2ts)
{
    return N_CAC*{{ stoichiometric.rnb }};
}


/**
 * evaluate stoichiometric matrix
 */
void eval_S(gsl_matrix *S, struct s_obs2ts **obs2ts)
{
    int c, ac, cac;
    int ts, ts_unique, stream, n_cac;


    //////////////////
    // dynamic part //
    //////////////////

    {% for S_i in stoichiometric.S_sv %}
    for(c=0; c<N_C; c++) {
        for(ac=0; ac<N_AC; ac++) {
            cac = c*N_AC+ac;

            {% for S_ii in S_i %}
            gsl_matrix_set(S, {{ forloop.parentloop.counter0 }}*N_CAC+cac, {{ forloop.counter0 }}*N_CAC+cac, {{ S_ii|safe }});
            {% endfor %}
        }
    }
    {% endfor %}

    //////////////////////
    // observation part //
    //////////////////////

    ts = 0;
    {% for S_i in stoichiometric.S_ov %}
    for(ts_unique=0; ts_unique < obs2ts[{{ forloop.counter0 }}]->n_ts_unique; ts_unique++) {
        for(stream=0; stream < obs2ts[{{ forloop.counter0 }}]->n_stream[ts_unique]; stream++) {
            {% for S_ii in S_i %}
            for(n_cac=0; n_cac< obs2ts[{{ forloop.parentloop.counter0 }}]->n_cac[ts_unique]; n_cac++) {
                c = obs2ts[{{ forloop.parentloop.counter0 }}]->cac[ts_unique][n_cac][0];
                ac = obs2ts[{{ forloop.parentloop.counter0 }}]->cac[ts_unique][n_cac][1];
                cac = c*N_AC+ac;
                gsl_matrix_set(S, N_PAR_SV*N_CAC+ts, {{ forloop.counter0 }}*N_CAC+cac, {{ S_ii|safe }});
            }
            {% endfor %}
            ts++;
        }
    }
    {% endfor %}
}


/**
 * evaluate normalized force of infection matrix
 */
void eval_F(double *F, const double *X, struct s_par *p_par, struct s_data *p_data, struct s_calc *p_calc, struct s_group ***compo_groups_drift_par_proc, double t)
{
    // X is p_X->proj
    // t is the current time in the unit of the data


    int c, ac, cac;
    int ts, ts_unique, stream, n_cac;

    // syntaxic shortcuts
    struct s_obs2ts **obs2ts = p_data->obs2ts;
    struct s_router **routers = p_data->routers;
    struct s_drift *p_drift = p_data->p_drift;


    //the automaticaly generated code may need these variables
    const int nn = p_calc->current_nn;

    double **par = p_par->natural;
    double ***covar = p_data->par_fixed;


    // fill F
    for(c=0; c<N_C; c++) {
        for(ac=0; ac<N_AC; ac++) {
            cac = c*N_AC+ac;

            {% for F_i in stoichiometric.F %}
            F[{{ forloop.counter0 }}*N_CAC+cac] = ({{ F_i|safe }});
            {% endfor %}
        }
    }
}


/**
 * evaluate demographic stochasticity bloc of Q (so-called G)
 */
int eval_G(gsl_matrix *G, const double *X, struct s_par *p_par, struct s_data *p_data, struct s_calc *p_calc, struct s_kalman_specific_data *p_kalman_specific_data, double t)
{

    // matrices initializations
    double *F = p_kalman_specific_data->F;
    gsl_matrix *S = p_kalman_specific_data->S;
    gsl_matrix *SF = p_kalman_specific_data->SF;

    ////////////
    // eval F //
    ////////////

    struct s_group ***compo_groups_drift_par_proc = p_kalman_specific_data->compo_groups_drift_par_proc;
    eval_F(F, X, p_par, p_data, p_calc, compo_groups_drift_par_proc, t);

    //////////////
    // eval S*F //
    //////////////

    int row, col; // cell indices
    for(row=0; row<N_KAL; row++) {
        for(col=0; col<N_REAC; col++) {
            gsl_matrix_set(SF, row, col, gsl_matrix_get(S, row, col)*F[col]);
        }
    }

    ///////////////////////
    // eval G = S*F*t(S) //
    ///////////////////////

    int status = gsl_blas_dgemm(CblasNoTrans, CblasTrans, 1.0, SF, S, 0.0, G);
#if FLAG_VERBOSE
    if(status) {
        fprintf(stderr, "error: %s\n", gsl_strerror (status));
    }
#endif

    return status;
}

void eval_Q(gsl_matrix *Q, const double *proj, struct s_par *p_par, struct s_data *p_data, struct s_calc *p_calc, struct s_kalman_specific_data *p_kalman_specific_data, double t)
{

    struct s_router **routers = p_data->routers;
    struct s_iterator *p_it = p_data->p_it_only_drift;

    int i, k, cac, offset;

    double **par = p_par->natural;

    // reset Q
    gsl_matrix_set_zero(Q);

    ////////////////
    // drift term //
    ////////////////

    offset = 0;
    for(i=0; i<p_it->length; i++) {
        for(k=0; k< routers[ p_it->ind[i] ]->n_gp; k++) {
            // set volatility^2 on diagonal
            gsl_matrix_set(Q, N_PAR_SV*N_CAC + N_TS + offset, N_PAR_SV*N_CAC + N_TS + offset, pow(par[ p_data->p_drift->ind_volatility_Xdrift[i] ][k],2) );
            offset++;
        }
    }

    ///////////////////////////////
    // non-correlated noise term //
    ///////////////////////////////

    {% if noise_Q %}
    for (cac=0; cac<N_CAC; cac++) {

        {% for x in noise_Q %}
        gsl_matrix_set(Q,
                       {{ x.from }} * N_CAC + cac,
                       {{ x.to }} * N_CAC + cac,
                       -pow({{ x.prod_sd|safe }} , 2));

        gsl_matrix_set(Q,
                       {{ x.to }} * N_CAC + cac,
                       {{ x.from }} * N_CAC + cac,
                       -pow({{ x.prod_sd|safe }} , 2));

        gsl_matrix_set(Q,
                       {{ x.to }} * N_CAC + cac,
                       {{ x.to }} * N_CAC + cac,
                       pow({{ x.prod_sd|safe }} , 2));

        gsl_matrix_set(Q,
                       {{ x.from }} * N_CAC + cac,
                       {{ x.from }} * N_CAC + cac,
                       pow({{ x.prod_sd|safe }} , 2));

        {% endfor %}
    }
    {% endif %}


    ////////////////////////////////////
    // demographic stochasticity term //
    ////////////////////////////////////

    // if demographic stochasticity is taken into account
    if(!COMMAND_DETER) {
        gsl_matrix *G = p_kalman_specific_data->G;
        eval_G(G, proj, p_par, p_data, p_calc, p_kalman_specific_data, t);
        gsl_matrix_add(Q, G); // Q <- Q+G
    }
}
