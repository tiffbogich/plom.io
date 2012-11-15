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

#define LOW_PASS_FILTER_ALPHA 0.9 //small value: more noise, large values increase time delay

int M; /*Number of pMCMC iterations*/
int JCHUNK;
int OPTION_PIPELINE; //0: false, 1: true
int OPTION_FULL_UPDATE;


struct s_pmcmc_calc_data
{
    double epsilon;  // epsilon factor
    double a;        // cooling rate
    int m_switch;    // number of iterations using empirical covariance
    int m_eps;       // number of iterations before tuning epsilon

    double global_acceptance_rate;
    int n_acceptance_rates; /* s_best->length */
    double *acceptance_rates; /* [ self.n_acceptance_rates ] parameter specific acceptance rates */

    //counters: note in the absence of the webApp we could avoid this and use the modulo operator. However when users change in real time self.n_to_be_estimated we need to resort on those counters.
    int has_cycled; /* boolean (have we iterated on all the component self.n_to_be_estimated component of theta) */
    int m_full_iteration; /*number of full iterations (one full iteration every self.n_to_be_estimated sub-iterations) */
    int cycle_id; /* position in the sub loop */
};

struct s_pmcmc
{
    /* from simforence core */
    struct s_data *p_data;
    struct s_calc **calc;
    struct s_best *p_best;

    struct s_X ***D_J_p_X; /* [N_DATA+1][J] +1 is for initial condition (one time step before first data) */
    struct s_X ***D_J_p_X_tmp; /* [N_DATA+1][J] */
    struct s_par *p_par;

    struct s_hat **D_p_hat_prev;
    struct s_hat **D_p_hat_new;
    struct s_hat **D_p_hat_best;

    struct s_likelihood *p_like;
};


/* pmcmc.c */
void copy_X_0(struct s_X ***D_J_p_X, struct s_data *p_data);
void run_propag(
                struct s_X ***D_J_p_X, struct s_X ***D_J_p_X_tmp, struct s_par *p_par, struct s_hat ***D_p_hat_new,
                struct s_likelihood *p_like, struct s_data *p_data, struct s_calc **calc,
                void *sender, void *receiver, void *controller);

void propose_new_theta_and_load_X0(double *sd_fac,
                                   struct s_best *p_best, struct s_X *p_X,
                                   struct s_par *p_par,
                                   struct s_data *p_data,
                                   struct s_pmcmc_calc_data *p_pmcmc_calc_data, struct s_calc *p_calc, int m);

void increment_iteration_counters(struct s_pmcmc_calc_data *p_pmcmc_calc_data, struct s_best *p_best, const int OPTION_FULL_UPDATE);

void pMCMC(struct s_best *p_best, struct s_X ***D_J_p_X, struct s_X ***D_J_p_X_tmp, struct s_par *p_par, struct s_hat ***D_p_hat_prev, struct s_hat ***D_p_hat_new, struct s_hat **D_p_hat_best, struct s_likelihood *p_like, struct s_data *p_data, struct s_calc **calc);

/* methods.c */
void ran_proposal_sequential(gsl_vector *proposed, struct s_best *p_best, double sd_fac, struct s_calc *p_calc);

void compute_best_traj(struct s_hat **D_p_hat_best, struct s_hat **D_p_hat_prev, struct s_hat **D_p_hat_new, struct s_data *p_data, double alpha, double m);
void print_acceptance_rates(struct s_pmcmc_calc_data *p, int m_full_iteration);
void compute_acceptance_rates(struct s_best *p_best, struct s_pmcmc_calc_data *p, double is_accepted, int m);

void print_covariance(FILE *p_file_cov, gsl_matrix *covariance);

/* build.c */
struct s_pmcmc_calc_data *build_pmcmc_calc_data(struct s_best *p_best, double a, int m_switch, int m_eps);
void clean_pmcmc_calc_data(struct s_pmcmc_calc_data *p_pmcmc_calc_data);

struct s_pmcmc *build_pmcmc(json_t *root, int has_dt_be_specified, double dt_option, double a, int m_switch, int m_eps);
void clean_pmcmc(struct s_pmcmc *p_pmcmc);
