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
 * transform p_X to x_k: concatenation of non-overlapping components of:
 * - X->proj
 * - X->obs
 * - X->drift
 * @param xk the concatenated vector
 * @param p_X the X vector
 */
void X2xk(gsl_vector *xk, struct s_X *p_X, struct s_data *p_data)
{
    struct s_router **routers = p_data->routers;
    struct s_iterator *p_it = p_data->p_it_only_drift;

    // X->proj
    int i, k, offset;
    for(i=0; i<N_PAR_SV*N_CAC; i++)
        gsl_vector_set(xk, i, p_X->proj[i]);

    // X->obs
    for(i=0; i<N_TS; i++)
        gsl_vector_set(xk, N_PAR_SV*N_CAC + i, p_X->obs[i]);

    // X->drift
    offset = 0;
    for(i=0; i<p_it->length; i++) {
        for(k=0; k< routers[ p_it->ind[i] ]->n_gp; k++) {
            gsl_vector_set(xk, N_PAR_SV*N_CAC + N_TS + offset, p_X->drift[i][k]);
            offset++;
        }
    }
}

/**
 * reconstruct s_X from xk and set to 0.0 terms of proj that became negative due to Kalman.
 * Note that only N_PAR_SV*N_CAC of proj and drift are necessary. All the observed variable are useless here
 * @param p_X the X vector to be constructed
 * @param xk the concatenated vector
 */
void xk2X(struct s_X *p_X, gsl_vector *xk, struct s_data *p_data)
{
    struct s_router **routers = p_data->routers;
    struct s_iterator *p_it = p_data->p_it_only_drift;

    int i, k, offset;

    // X->proj
    for(i=0; i<N_PAR_SV*N_CAC; i++)
        p_X->proj[i] = (gsl_vector_get(xk, i) > 0.0) ? gsl_vector_get(xk, i) : 0.0 ;

    // X->drift
    offset = 0;
    for(i=0; i<p_it->length; i++) {
        for(k=0; k< routers[ p_it->ind[i] ]->n_gp; k++) {
            p_X->drift[i][k] = gsl_vector_get(xk, N_PAR_SV*N_CAC + N_TS + offset) ;
            offset++;
        }
    }
}

/**
 * copy a n*(n+1)/2 list into a n#n symetric matrix
 * (fill line by line the inferior triangle, and symetrize)
 * @param mat the target symetric matrix
 * @param vect the source list
 * @param offset the first index of the list to consider
 * @return an error code (0 if no error)
 */
int list2sym_matrix(gsl_matrix *mat, double *vect, int offset)
{
    int size = mat->size1;	// matrix size
    int row, col;		// matrix row and column indices
    int idx = 0;		// list index
    double data;		// current data

    // copy data
    for(row=0; row<size; row++) {
        for(col=0; col<=row; col++) {
            data = vect[idx+offset];
            gsl_matrix_set(mat, row, col, data);
            gsl_matrix_set(mat, col, row, data);
            //TODO errors
            idx++;
        }
    }
    return 0;
}


/**
 * copy line by line the inferior triangle of a n#n symetric matrix
 * into a n*(n+1)/2 list
 * @param vect the vectorized form to construct
 * @param mat the symetric matrix to be vectorized
 * @param offset the first index of the list to fill
 * @return an error code (0 for no error)
 */
int sym_matrix2list(double *vect, gsl_matrix *mat, int offset)
{
    int size = mat->size1;	// matrix size
    int row, col;		// matrix row and column indices
    int idx = 0;		// vector row index
    double data;		// current data

    // copy data
    for(row=0; row<size; row++) {
        for(col=0; col<=row; col++) {
            data = gsl_matrix_get(mat, row, col);
            vect[idx+offset] = data;
            // TODO errors
            idx++;
        }
    }
    return 0;
}

/**
 * find the indices of a matrix cell corresponding to the index of the
 * same cell in the vector form created by sym_matrix2vector function
 * @see sym_matrix2vector
 * @param cell the row and column to be found
 * @param idx the index in the vectorized form
 */
void find_cell_from_vector_form(int *cell, int idx)
{
    int row=0;
    int tn=0;	// row-th triangle number

    //find row
    while(tn<(idx-row)) {
        row++;
        tn+=row;
    }
    cell[0] = row;

    // find column
    cell[1] = idx-tn;
}

/**
 * find the index of a cell in a vector created by sym_matrix2vector
 * function corresponding to a given cell in the matrix
 * @param row the row in the matrix
 * @param col the column in the matrix
 * @return the corresponding index in the vectorized form
 */
int find_cell_from_matrix_form(int row, int col)
{
    int cell;
    if(row >= col)
        cell = row*(row+1)/2+col;
    else
        cell = col*(col+1)/2+row;

    return cell;
}

/**
 * multiply a matrix by a vector form of a symetric matrix created by
 * sym_matrix2list, with an offset for the list
 * @param res the resulting matrix
 * @param mat the left matrix
 * @param vect the right list
 * @param offset the first index of the list to consider
 */
int matrix_times_list_form(gsl_matrix *res, gsl_matrix *mat, const double *vect, int offset)
{
    //TODO errors

    int row, col;	// indices in the matrix
    int k;		// local index (for partial sums)
    double sum;		// partial sum

    // rows loop
    for(row=0; row<mat->size1; row++) {
        // collumns loop
        for(col=0; col<mat->size2; col++) {
            // sum computation
            sum = 0;
            for(k=0; k<mat->size2; k++){
                sum += gsl_matrix_get(mat, row, k)
                    * vect[find_cell_from_matrix_form(k, col)+offset];
            }
            gsl_matrix_set(res, row, col, sum);
        }
    }

    return 0;
}

/**
 * concatenate X->proj and covariance matrix into an "xc" list
 * @param xc the concatenated list
 * @param p_X the X vector
 * @param Ct the covariance matrix
 * @return an error code (0 if no error)
 */
int X2xc(double *xc, struct s_X *p_X, gsl_matrix *Ct)
{
    int i;

    // copy X->proj in xc
    for(i=0; i<N_PAR_SV*N_CAC+N_TS_INC_UNIQUE; i++)
        xc[i] = p_X->proj[i];

    // copy Ct (vectorized) in xc
    sym_matrix2list(xc, Ct, i);

    // TODO errors
    return 0;
}

/**
 * get total population in SV
 * @param a list beginning by the state variables (X->proj, xk, xc...)
 * @return the total population
 */
double get_total_pop(double *X)
{
    int cac;
    double t_p = 0.0;
    for(cac=0;cac<N_CAC;cac++) {
        t_p += sum_SV(X, cac);
    }
    return t_p;
}


double log_transf_correc(gsl_vector *mean, gsl_matrix *var, struct s_router **routers)
{
    char str[STR_BUFFSIZE];
    int i, k;

    double p_tmp, Lp;
    p_tmp=0.0, Lp=0.0;

    int offset = 0;

    for(i=0; i<(N_PAR_SV+N_PAR_PROC+N_PAR_OBS); i++) {
        for(k=0; k<routers[i]->n_gp; k++) {
            if(gsl_matrix_get(var, offset, offset) >0.0) {

                p_tmp = 1./((*(routers[i]->f_derivative))(gsl_vector_get(mean, offset), routers[i]->multiplier_f, routers[i]->min[k], routers[i]->max[k]));

                //check for numerical issues
                if((isinf(p_tmp)==1) || (isnan(p_tmp)==1)) {
#if FLAG_VERBOSE
                    sprintf(str, "error prob_prior computation, p=%g\n", p_tmp);
                    print_err(str);
#endif
                    p_tmp=LIKE_MIN;
                } else if(p_tmp <= LIKE_MIN) {
                    p_tmp = LIKE_MIN ;
                }
                Lp += log(p_tmp);
            }
        }
        offset++;
    }

    return(Lp);
}

/**
   run an extended Kalman filter and returns the log likelihood
*/
double run_kalman(struct s_X *p_X, struct s_best *p_best, struct s_par *p_par, struct s_kal *p_kal, struct s_common *p_common, struct s_data *p_data, struct s_calc **calc, FILE *p_file_X, int m)
{
    // loops indices
    int n, nn;		// data and nonan data indices
    double t0, t1;	// first and last times
    int ts, ts_nonan;	// time series indices

    // likelihoods
    double like;
    double log_lik;
    double log_lik_temp;

    struct s_data_ind **data_ind = p_data->data_ind;

    t0=0;
    log_lik = 0.0;

    //////////////////
    // for all data //
    //////////////////
    for(n=0; n<N_DATA_NONAN; n++) {

#if FLAG_JSON //for the webApp, we block at every iterations to prevent the client to be saturated with msg
        if (OPTION_TRAJ) {
            if(n % 10 == 0){
                block();
            }
        }
#endif

        t1=p_data->times[n];	// find corresponding time

        drift_par(calc[0], p_par, p_data, p_X, 0, p_data->p_it_only_drift->length);

        /////////////////////////
        // for every time unit //
        /////////////////////////
        /*
         * we have to use this subloop to mimate equaly spaced time step
         * and hence set the incidence to 0 every time unit...
         */
        for(nn=t0; nn<t1; nn++) {
            store_state_current_n_nn(calc, n, nn);

            reset_inc(p_X);	// reset incidence to 0
            reset_inc_Cov(p_kal->Ct);	// reset incidence covariance to 0

            // create xc for propagation: contains X->proj and Ct as a list
            double xc[N_PAR_SV*N_CAC+N_TS_INC_UNIQUE + N_KAL*(N_KAL+1)/2];
            X2xc(xc, p_X, p_kal->Ct);

            // propagate xc (X->proj and Ct) if populations not exploding
            if (get_total_pop(xc)<WORLD_POP) {
                f_prediction_ode_rk(xc, nn, nn+1, p_par, calc[0]);
            } else {
                print_err("total_pop(xc)>=WORLD_POP");
            }

            // get p_X->proj and Ct from xc
            int i;
            for (i=0; i<N_PAR_SV*N_CAC+N_TS_INC_UNIQUE; i++) {
                p_X->proj[i]  = xc[i];
            }
            list2sym_matrix(p_kal->Ct, xc, i);

            proj2obs(p_X, p_data);

            // append to X output file
            if (OPTION_TRAJ) {
                print_X(p_file_X, &p_par, &p_X, p_data, calc[0], nn+1, 1, 1, m);
            }
        } // end of for loop on nn

        // transform p_X to x_k
        X2xk(p_kal->xk, p_X, p_data);
        /*
         * from here we work only with xk. xk is a gsl_vector containing
         * state variable + observed variable (N_PAR_SV*N_CAC + N_TS)
         */

        p_kal->sc_rt = 0.0;
        log_lik_temp = 0.0;
        for(ts=0; ts< data_ind[n]->n_nonan; ts++) {

            ts_nonan = data_ind[n]->ind_nonan[ts];
            p_kal->sc_rt = obs_var(gsl_vector_get(p_kal->xk, N_PAR_SV*N_CAC + ts_nonan), p_par, p_data, calc[0], ts_nonan);

            eval_ht(p_common->ht, p_kal->xk, p_par, p_data, calc[0], ts_nonan);

            // compute gain
            ekf_gain_computation(obs_mean(gsl_vector_get(p_kal->xk, N_PAR_SV*N_CAC +ts_nonan), p_par, p_data, calc[0], ts_nonan),
                                 p_data->data[calc[0]->current_nn][ts_nonan],
                                 p_kal->Ct, p_common->ht, p_kal->kt, p_kal->sc_rt,
                                 &(p_kal->sc_st), &(p_kal->sc_pred_error)); //scalar sc_st and sc_pred_error will be modified so we pass their address

            like = ekf_update(p_kal->xk, p_kal->Ct, p_common->ht, p_kal->kt, p_kal->sc_st, p_kal->sc_pred_error);
            log_lik_temp += log(like);
        }

        //echo back the change on xk to p_X->proj and p_X->drift
        xk2X(p_X, p_kal->xk, p_data);

        log_lik += log_lik_temp;
        t0=t1;

    } // end of for loop on n

    if (OPTION_PRIOR) {
        log_lik += log_prob_prior(p_best, p_best->mean, p_data);
    }

    if (OPTION_TRANSF) {
        log_lik += log_transf_correc(p_best->mean, p_best->var, p_data->routers);
    }

    return log_lik;
}


/**
   we reset everything to 0 (needed for simplex_kalman as
   simplex_kalman calls multiple times kalman
*/
void reset_kalman(struct s_kal *p_kal, struct s_common *p_common)
{
    gsl_matrix_set_zero(p_kal->Ct);
    gsl_matrix_set_zero(p_kal->Ft);
    gsl_vector_set_zero(p_kal->kt);
    p_kal->sc_st = 0.0;
    p_kal->sc_pred_error = 0.0;
    p_kal->sc_rt = 0.0;

    gsl_matrix_set_zero(p_common->Q);
    gsl_vector_set_zero(p_common->ht);
}
