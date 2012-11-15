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



//#define FLAG_TRAJ 1 set at compilation (if needed)

#define FREEZE (pow(MIF_a,m-1))

/*-------global variables--------*/
double MIF_a; /*cooling parameter of ionides 2006*/
double MIF_b; /*Ionides uses sqrt(20.0)*/
int L;  /*fixed lag for fixed lag smoothing (needed to infer the initial conditions)*/
int M; /*Number of MIF iterations*/
int SWITCH; /*number of the MIF iteration when we start to apply Ionides (2006) MIF update formulae instead of the simple mean accross particles */

int N_THETA_MIF; /* for the MIF, we exclude initial conditions and the drift parameters from theta because they are estimated with fixed lag smoothing  p_it_par_proc_par_obs_no_drift->nbtot */
int N_IC_MIF; /* p_mif->p_data->p_it_par_sv_and_drift->nbtot */

int OPTION_IC_ONLY; /**< only fixed lag smoothing */

struct s_mif
{
  /* from simforence core */
  struct s_data *p_data;
  struct s_calc **calc;
  struct s_best *p_best;

  struct s_X **J_p_X; /* [J] */
  struct s_X **J_p_X_tmp; /* [J] */
  struct s_par **J_p_par; /* [J][N_G] N_G is for par_sv, par_proc, par_obs */

  struct s_likelihood *p_like;

  /*MIF specific*/
  gsl_matrix *var_theta;
  gsl_vector **J_theta; /* [J][N_THETA_MIF] */
  gsl_vector **J_theta_tmp; /* [J][N_THETA_MIF] */

  double **J_IC_grouped; /* [J][N_IC_MIF] */
  double **J_IC_grouped_tmp; /* [J][N_IC_MIF] */

  double **D_theta_bart; /* [N_DATA+1][N_THETA_MIF] mean of theta at each time step, (N_DATA+1) because we keep values for every data point + initial condition */
  double **D_theta_Vt; /* [N_DATA+1][N_THETA_MIF] variance of theta at each time step */
};

/*function prototypes*/

/* methods.c */
void get_submatrix_var_theta_mif(gsl_matrix *var_theta, struct s_best *p_best, struct s_data *p_data);
void fill_theta_bart_and_Vt_mif(double **D_theta_bart, double **D_theta_Vt, struct s_best *p_best, struct s_data *p_data, int m);

void split_theta_mif(theta_t *proposed, gsl_vector *J_theta_j, double *J_IC_grouped_j, struct s_data *p_data);
void mean_var_theta_theoretical_mif(double *theta_bart_n, double *theta_Vt_n, gsl_vector **J_theta, gsl_matrix *var, struct s_likelihood *p_like, int m, double delta_t);
void print_mean_var_theta_theoretical_mif(FILE *p_file, double *theta_bart_n, double *theta_Vt_n, struct s_likelihood *p_like, int m, int time);
void header_mean_var_theoretical_mif(FILE *p_file, struct s_data *p_data);

void resample_and_mut_theta_mif(unsigned int *select, gsl_vector **J_theta, gsl_vector **J_theta_tmp, gsl_matrix *var_theta, struct s_calc **calc, double sd_fac);

void update_theta_best_stable_mif(struct s_best *p_best, double **D_theta_bart, struct s_data *p_data);
void update_theta_best_king_mif(struct s_best *p_best, double **D_theta_bart, double **D_theta_Vt, struct s_data *p_data, int m);
void back_transform_theta2par_mif(struct s_par *p_par, gsl_vector *theta_mif, struct s_data *p_data);

void fixed_lag_smoothing(theta_t *best_mean, struct s_likelihood *p_like, struct s_data *p_data, const struct s_iterator *p_it, double ***J_initial_cond, double ***J_initial_cond_tmp, int n, const int lag);
void resample_IC(struct s_likelihood *p_like,  double ***J_initial_cond, double ***J_initial_cond_tmp, int N_initial_cond, int n);
void update_IC(theta_t *best_mean, struct s_likelihood *p_like, double **J_initial_cond, struct s_data *p_data, const struct s_iterator *p_it);

void patch_likelihood_prior(struct s_likelihood *p_like, struct s_best *p_best, gsl_vector **J_theta, double ***J_IC_grouped, struct s_data *p_data, int n_max, int n, const int lag);

/* build.c */
struct s_mif *build_mif(int has_dt_be_specified, double dt_option, double prop_L_option);
void clean_mif(struct s_mif *p_mif);

/* mif.c */
void mif(struct s_calc **calc, struct s_data *p_data, struct s_best *p_best, struct s_X ***J_p_X, struct s_X ***J_p_X_tmp, struct s_par **J_p_par, struct s_likelihood *p_like, gsl_matrix *var_theta, gsl_vector **J_theta, gsl_vector **J_theta_tmp, double ***J_IC_grouped, double ***J_IC_grouped_tmp, double **D_theta_bart, double **D_theta_Vt);
