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
 *  reset incidence-related rows and columns to 0
 */
void reset_inc_Cov(gsl_matrix *Ct)
{
    int oi,oii;
    for (oi=N_PAR_SV*N_CAC; oi<N_PAR_SV*N_CAC+N_TS_INC; oi++) {
        for (oii=0; oii<N_KAL; oii++) {
            gsl_matrix_set(Ct,oi,oii,0.0);	// set row to 0
            gsl_matrix_set(Ct,oii,oi,0.0);	// set column to 0
        }
    }
}

/**
 * Brings Ct back to being symetric and semi-definite positive,
 * in case numerical instabilities made it lose these properties.
 *
 * In theory the EKF shouldn't need this,
 * and there is no right way to bring back a wrong covariance matrix to being right,
 * but this is the most natural way to go as far as I know.
 * We shouldn't need this anymore with the Square-Root Unscented Kalman Filter.
 *
 *
 * This function could could be optimized, first making each operation quicker when possible,
 * then starting by computing the eigen values to check
 * if there is any problem and only running all the rest when needed
 */
void check_and_correct_Ct(gsl_matrix *Ct)
{
    char str[STR_BUFFSIZE];

    gsl_vector *eval = gsl_vector_alloc (N_KAL);		// to store the eigen values
    gsl_matrix *evec = gsl_matrix_alloc (N_KAL, N_KAL);         // to store the eigen vectors
    gsl_matrix *temp = gsl_matrix_calloc (N_KAL, N_KAL);        // temporary matrix
    gsl_matrix *temp2 = gsl_matrix_calloc (N_KAL, N_KAL);       // temporary matrix 2
    gsl_eigen_symmv_workspace *w = gsl_eigen_symmv_alloc (N_KAL); // gsl needs this work to compute the eigen values and vectors

    int i;
    int status;
    int cumstatus = 0;

    /////////////////////
    // STEP 1: SYMETRY //
    /////////////////////
    // Ct = (Ct + Ct')/2

    gsl_matrix_memcpy(temp, Ct);	// temp = Ct
    gsl_matrix_memcpy(temp2, Ct);	// temp2 = Ct
    gsl_matrix_transpose(temp2);	// temp2 = temp2'

    // temp = 0.5*temp
    status = gsl_matrix_scale (temp, 0.5);
    if (status) {
        sprintf(str, "error: %s\n", gsl_strerror (status));
        print_err(str);
        cumstatus = 1;
    }

    // temp2 = 0.5*temp2
    status = gsl_matrix_scale (temp2, 0.5);
    if (status) {
        sprintf(str, "error: %s\n", gsl_strerror (status));
        print_err(str);
        cumstatus = 1;
    }

    // temp2 += temp
    status = gsl_matrix_add (temp2 , temp);
    if (status) {
        sprintf(str, "error: %s\n", gsl_strerror (status));
        print_err(str);
        cumstatus = 1;
    }
    // Ct = temp2
    gsl_matrix_memcpy(Ct,temp2);

    ////////////////////////
    // STEP 2: POSITIVITY //
    ////////////////////////
    // Bringing negative eigen values of Ct back to zero

    // compute the eigen values and vectors of Ct
    status = gsl_eigen_symmv(Ct, eval, evec, w);
    if (status) {
        sprintf(str, "error: %s\n", gsl_strerror (status));
        print_err(str);
        cumstatus = 1;
    }
    gsl_eigen_symmv_free (w); // free the space w

    // temp = 0*temp
    status = gsl_matrix_scale (temp, 0.0);
    if (status) {
        sprintf(str, "error: %s\n", gsl_strerror (status));
        print_err(str);
        cumstatus = 1;
    }

    // eval = max(eval,0) and diag(eval)
    for (i=0;i<N_KAL;i++) {
        if (gsl_vector_get(eval,i)<0.0) {
            gsl_vector_set(eval, i, 0.0); // keeps bringing negative eigen values to 0
        }
        gsl_matrix_set(temp,i,i,gsl_vector_get(eval,i)); // puts the eigen values in the diagonal of temp
    }

    //////////////////
    // basis change //
    //////////////////
    // Ct = evec * temp * evec'

    // temp2 = 1.0*temp*t(evec) + 0.0*temp2
    status = gsl_blas_dgemm(CblasNoTrans, CblasTrans, 1.0, temp, evec, 0.0, temp2);
    if (status) {
        sprintf(str, "error: %s\n", gsl_strerror (status));
        print_err(str);
        cumstatus = 1;
    }

    // Ct = 1.0*evec*temp2 + 0.0*temp2;
    status = gsl_blas_dgemm(CblasNoTrans, CblasNoTrans, 1.0, evec, temp2, 0.0, Ct);
    if (status) {
        sprintf(str, "error: %s\n", gsl_strerror (status));
        print_err(str);
        cumstatus = 1;
    }

    // free temp matrices
    gsl_vector_free(eval);
    gsl_matrix_free(evec);
    gsl_matrix_free(temp);
    gsl_matrix_free(temp2);

    if (cumstatus) {
        print_err("Error in check_and_correct_Ct");
    }


}

/**
 * Computation of the EKF gain kt for observation data_t_ts and obs jacobian ht, given estimate xk_t_ts and current covariance Ct
 *	xk_t_ts:	(double) estimate at time t of the observed quantity
 *	data_t_ts:	(double) observed quantity
 *	Ct:		(N_KAL*N_KAL gsl_matrix) pointer to covariance matrix of the system at time t
 *	ht:		(N_KAL gsl_vector) pointer to observation process jacobian
 *	kt:		(N_KAL)  pointer to ekf gain, will be updated in this function erasing the previous value
 *	sc_rt:		(double) variance of the observation process
 *	sc_st:		(double) pointer to the ekf scaler sc_st, will be updated in this function erasing the previous value
 *	pred_error:	(double) pointer to the difference between obs and estimate, will be updated in this function erasing the previous value
 */
void ekf_gain_computation(double xk_t_ts, double data_t_ts, gsl_matrix *Ct, gsl_vector *ht, gsl_vector *kt, double sc_rt, double *sc_st, double *sc_pred_error)
{
    char str[STR_BUFFSIZE];

    int status;
    int cumstatus = 0;
    gsl_vector *workn = gsl_vector_calloc(N_KAL); // allocating space for a temporary work vector of size N_KAL, initialized to zero

    // pred_error = double data_t_ts - xk_t_ts
    *sc_pred_error = data_t_ts - xk_t_ts;

    // positivity and symetry could have been lost when propagating Ct
    check_and_correct_Ct(Ct);

    // sc_st = ht' * Ct * ht + sc_rt
    /*
     * here ht is a column vector to fit gsl standards,
     * rather than a row vector as it should be in theory,
     * which explains the slightly different formula we use
     */

    // workn = Ct*ht
    status = gsl_blas_dgemv(CblasNoTrans,1.0,Ct,ht,0.0,workn);
    if (status) {
        sprintf(str, "error: %s\n", gsl_strerror (status));
        print_err(str);
        cumstatus = 1;
    }

    // sc_st = ht' * workn;
    status = gsl_blas_ddot(ht,workn, sc_st);
    if (status) {
        sprintf(str, "error: %s\n", gsl_strerror (status));
        print_err(str);
        cumstatus = 1;
    }
    // sc_st = sc_st + sc_rt ;
    *sc_st += sc_rt;

    // kt = Ct * ht' * sc_st^-1
    double sc_stm1 = 1.0/ (*sc_st);
    status = gsl_blas_dgemv(CblasNoTrans,sc_stm1,Ct,ht,0.0,kt);
    if (status) {
        sprintf(str, "error: %s\n", gsl_strerror (status));
        print_err(str);
        cumstatus = 1;
    }

    // clear working variables:
    gsl_vector_free(workn);

    if (cumstatus) {
        print_err("Error in ekf_gain_computation");
    }

}


/**
 * Update of the state vector xt and covariance matrix Ct, for a given gain kt
 *	xk:		(N_KAL gsl_vector) pointer to full state vector at time t
 *	Ct:		(N_KALxN_KAL gsl_matrix) pointer to covariance matrix of the system at time t
 *	kt:		(N_KAL gsl_vector) pointer to the gain vector kt
 *	sc_st:		(double)
 *	pred_error:	(double) difference between obs and estimate
 */
double ekf_update(gsl_vector *xk, gsl_matrix *Ct, gsl_vector *ht, gsl_vector *kt, double sc_st, double sc_pred_error)
{
    char str[STR_BUFFSIZE];

    int status;
    int cumstatus = 0;

    gsl_vector *workn = gsl_vector_calloc(N_KAL); // allocating space for a temporary work vector of size N_KAL (dimension of the state vector), initialized to zero
    gsl_matrix *Workn1 = gsl_matrix_calloc(N_KAL, 1); // allocating space for a temporary work matrix of size N_KAL*1, initialized to zero
    gsl_matrix *Workn2 = gsl_matrix_calloc(N_KAL, 1); // allocating space for a temporary work matrix of size N_KAL*1, initialized to zero
    double like;

    //////////////////
    // state update //
    //////////////////
    // xk += kt * pred_error

    status = gsl_blas_daxpy(sc_pred_error, kt, xk);
    if (status) {
        sprintf(str, "error: %s\n", gsl_strerror (status));
        print_err(str);
        cumstatus = 1;
    }

    ///////////////////////
    // covariance update //
    ///////////////////////
    // Ct = Ct - kt * ht * Ct

    // workn = Ct' * ht
    status = gsl_blas_dgemv(CblasTrans,1.0,Ct,ht,0.0,workn);
    if (status) {
        sprintf(str, "error: %s\n", gsl_strerror (status));
        print_err(str);
        cumstatus = 1;
    }
    gsl_matrix_set_col(Workn1, 0, workn);	// copy vect workn into matrix Workn1
    gsl_matrix_set_col(Workn2, 0, kt);		// copy vect kt into matrix Workn2
    status = gsl_blas_dgemm(CblasNoTrans, CblasTrans, -1.0, Workn2, Workn1, 1.0, Ct); // Ct = Ct - Workn2*Workn1';
    if (status) {
        sprintf(str, "error: %s\n", gsl_strerror (status));
        print_err(str);
        cumstatus = 1;
    }

    // positivity and symetry could have been lost when updating Ct
    check_and_correct_Ct(Ct);

    // clear working variables:
    gsl_vector_free(workn);
    gsl_matrix_free(Workn1);
    gsl_matrix_free(Workn2);

    if (cumstatus) {
        sprintf(str, "Error in ekf_update");
        print_err(str);
    }

    like = gsl_ran_gaussian_pdf(sc_pred_error/sqrt(sc_st),1);

    return sanitize_likelihood(like);
}
