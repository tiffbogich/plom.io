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
#include "pmcmc.h"

#define WORLD_POP 7.e9 // approx world population, used to detect divergences

/* global variables (used in case of simplex kalman) */
int M;
double CONVERGENCE_STOP_SIMPLEX;

// sizes
int N_KAL;  // N_PAR_SV*N_CAC + N_TS + iterator_only_drift.nbtot
int N_REAC; // number of reactions for demographic stochasticity computation

// options
int OPTION_TRANSF;  // add log_transf_correc to log_lik

/*
   To make things easier, vectors are in lower case letters, matrix in
   capital letters and scalar prefixed by sc_
*/


// method_specific_data (accessible via p_calc->method_specific_thread_safe_data) (after casting)
struct s_kalman_specific_data
{

  // only ref
  gsl_matrix *Q;  /* Dispersion matrix of the SDE approximated with by the EKF: dX_t = f(X_t,\theta)dt + Chol(Q)dB_t */
    gsl_matrix *Ft; /* Jacobian matrix of the drift f(X_t,\theta) of the SDE approximated with the EKF: dX_t = f(X_t,\theta)dt + Chol(Q)dB_t */

  struct s_group ***compo_groups_drift_par_proc;

  // need to be allocated, free
  gsl_matrix *FtCt;	// for Ft*Ct
  gsl_matrix *res;	// for Ft*Ct+Ct*Ft'+Q

  // for demographic stochasticity
  double *F;        /* Vector containing transition rates of the model: as many compenents as possible reactions */
  gsl_matrix *S;    /* Stoichiometric matrix containing in each column the reasult (+1 or -1 generally) of each reaction regarding each component : as many columns as reactions, as many rows as compartments*/
  gsl_matrix *SF;   // S*F for G computing
  gsl_matrix *G;    // Dispersion matrix specific to the demographic stochasticity: will be added to the global dispersion matrix Q
};


struct s_kal
{
  gsl_vector *xk;  /* [N_KAL]: concatenation of non-overlapping components of X->proj, X->obs and X->drift */

  gsl_matrix *Ct;  /* [N_KAL][N_KAL] Covariance matrix of the joint density p(X_t|y_{1:i}) if i<=t<i */ 
  gsl_matrix *Ft;  /* [N_KAL][N_KAL] Jacobian matrix of the drift f(X_t,\theta) of the SDE approximated with the EKF: dX_t = f(X_t,\theta)dt + Chol(Q)dB_t */

  gsl_vector *kt;  /* [N_KAL] Kalman Gain vector */

  double sc_st /* Innovation or residuak covariance */;
  double sc_pred_error /* Innovation or measurement residual */;
  double sc_rt /* observation process variance */;
};

struct s_common
{
  gsl_matrix *Q; /* [N_KAL][N_KAL] */
  gsl_vector *ht; /* [N_KAL] Gradient of the observation function */
};

struct s_kalman
{
  /* from simforence core */
  struct s_data *p_data;
  struct s_calc **calc;
  struct s_best *p_best;
  struct s_par *p_par;
  struct s_X *p_X;

  double smallest_log_like; /* used in simplex kalman (see simplex.h) */

  /* kalman specific */
  struct s_kal *p_kal;
  struct s_common *p_common;

  struct s_group ***compo_groups_drift_par_proc;
};

/* build.c */
struct s_kal *build_kal(void);
void clean_kal(struct s_kal *p_kal);
struct s_common *build_common(void);
void clean_common(struct s_common *p_common);
struct s_kalman *build_kalman(json_t *root, int is_bayesian);
void clean_kalman(struct s_kalman *p_kalman);

/* kalman.c */
double run_kalman(struct s_X *p_X, struct s_best *p_best, struct s_par *p_par, struct s_kal *p_kal, struct s_common *p_common, struct s_data *p_data, struct s_calc **calc, FILE *p_file_X, int m);
double f_simplex_kalman(const gsl_vector *x, void *params);
void reset_kalman(struct s_kal *p_kal, struct s_common *p_common);
void xk2X(struct s_X *p_X, gsl_vector *xk, struct s_data *p_data);
void X2xk(gsl_vector *xk, struct s_X *p_X, struct s_data *p_data);
int list2sym_matrix(gsl_matrix *mat, double *vect, int offset);
int sym_matrix2list(double *vect, gsl_matrix *mat, int offset);
void find_cell_from_vector_form(int *cell, int idx);
int find_cell_from_matrix_form(int row, int col);
int matrix_times_list_form(gsl_matrix *res, gsl_matrix *mat, const double *vect, int offset);
double get_total_pop(double *X);
double log_transf_correc(gsl_vector *mean, gsl_matrix *var, struct s_router **routers);

/* ekf.c */
void reset_inc_Cov(gsl_matrix *Ct);
void check_and_correct_Ct(gsl_matrix *Ct);
void ekf_propag_cov(double *proj, gsl_matrix *Ft, gsl_matrix *Ct, gsl_matrix *Q, struct s_par *p_par, struct s_group ***compo_groups_drift_par_proc, double t);

void ekf_gain_computation(double xk_t_ts, double data_t_ts, gsl_matrix *Ct, gsl_vector *ht, gsl_vector *kt, double sc_rt, double *sc_st, double *sc_pred_error);

double ekf_update(gsl_vector *xk, gsl_matrix *Ct, gsl_vector *ht, gsl_vector *kt, double sc_st, double sc_pred_error);

/* eval_ekf_update_mats */
int cac_drift_in_cac_ts(int cac_drift, int o, int ts_unique, struct s_obs2ts **obs2ts);
void eval_jac(gsl_matrix *jac, const double *X, struct s_par *p_par, struct s_data *p_data, struct s_calc *p_calc, struct s_group ***compo_groups_drift_par_proc, double t);

void eval_ht(gsl_vector *ht, gsl_vector *xk, struct s_par *p_par, struct s_data *p_data, struct s_calc *p_calc, int ts);

void eval_F(double *F, const double *X, struct s_par *p_par, struct s_data *p_data, struct s_calc *p_calc, struct s_group ***compo_groups_drift_par_proc, double t);
void eval_Q(gsl_matrix *Q, const double *proj, struct s_par *p_par, struct s_data *p_data, struct s_calc *p_calc, struct s_kalman_specific_data *p_kalman_specific_data, double t);
int eval_G(gsl_matrix *G, const double *X, struct s_par *p_par, struct s_data *p_data, struct s_calc *p_calc, struct s_kalman_specific_data *p_kalman_specific_data, double t);

int init_REAC(struct s_obs2ts **obs2ts);
void eval_S(gsl_matrix *S, struct s_obs2ts **obs2ts);

/* prediction.c */
int func_kal(double t, const double X[], double f[], void *params);

/* kmcmc.c */
void kmcmc(struct s_kalman *p_kalman, struct s_likelihood *p_like, struct s_pmcmc_calc_data *p_pmcmc_calc_data);
