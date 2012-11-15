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
#include <gsl/gsl_fft_real.h>

#define ABS_TOL_MIN 1e-20
#define REL_TOL_MIN 1e-20

#define SEUIL_LYAP 0.005

double PRECISION;
double DELTA_STO_PRINT;  //how many points to we print for one data unit (NOTE that the incidence is resetted to 0 every DELTA_STO_PRINT
int N_BLOC; //used for max and min determination. We check if the middle cell of N_BLOC is the max or min. => has to be an odd number

/* integrator.c */
int has_failed(double *y);
int integrator(struct s_X *p_X, double *y0, double t0, double t_end, struct s_par *p_par, double abs_tol, double rel_tol, struct s_calc *p_calc);
int integrate(struct s_X *p_X, double *y0, double t0, double t_end, struct s_par *p_par,  double *abs_tol, double *rel_tol, struct s_calc *p_calc);

double **get_traj_obs(struct s_X *p_X, double *y0, double t0, double t_end, double t_transiant, struct s_par *p_par, struct s_data *p_data, struct s_calc *p_calc);
void traj(struct s_X **J_p_X, double t0, double t_end, double t_transiant, struct s_par *p_par, struct s_data *p_data, struct s_calc **calc);
void compute_hat_nn(struct s_X **J_p_X, struct s_par *p_par, struct s_data *p_data, struct s_calc **calc, struct s_hat *p_hat);

/* bif.c */
double nextpow2(double x);
void fourrier_power_spectrum(double *traj_obs_ts, int length_traj_obs_ts, int ts);
void period_dynamical_system(double *traj_obs_ts, int length_traj_obs_ts, int ts);
double period(double *traj_obs_ts, int period, int length_traj_obs_ts);
void max_min(double *traj_obs_ts, struct s_par *p_par, struct s_data *p_data, struct s_calc *p_calc, double t0, int length_traj_obs_ts, int ts);
double b_max(double *bloc, int length_bloc);
double b_min(double *bloc, int length_bloc);
double get_min(double *tab, int length_tab);
double get_max(double *tab, int length_tab);

/* lyap.c */
int func_lyap (double t, const double y[], double f[], void *params);
void lyapunov(struct s_calc *p_calc, struct s_par *p_par, double *y0, double t0, double t_end, double abs_tol, double rel_tol);
void gram_schmidt_normalize(double *y, double *lyap);

void *jac_lyap;
