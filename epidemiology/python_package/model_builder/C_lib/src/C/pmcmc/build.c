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

#include "pmcmc.h"

struct s_pmcmc_calc_data *build_pmcmc_calc_data(struct s_best *p_best, double a, int m_switch, int m_eps)
{
    /* which parameters have to be estimated (parameters with jump_size > 0.0) */
    char str[STR_BUFFSIZE];
    int k;

    struct s_pmcmc_calc_data *p_pmcmc_calc_data;
    p_pmcmc_calc_data = malloc(sizeof(struct s_pmcmc_calc_data));
    if(p_pmcmc_calc_data==NULL) {
        sprintf(str, "Allocation impossible in file :%s line : %d",__FILE__,__LINE__);
        print_err(str);
        exit(EXIT_FAILURE);
    }

    p_pmcmc_calc_data->n_acceptance_rates = p_best->length;
    p_pmcmc_calc_data->acceptance_rates = init1d_set0(p_pmcmc_calc_data->n_acceptance_rates);

    //start with 1.0 (for non fitted parameters it will stay at 1.0 (in a way, non fitted parameters are always accepted)
    for(k=0; k< (p_pmcmc_calc_data->n_acceptance_rates); k++) {
        p_pmcmc_calc_data->acceptance_rates[k] = 1.0;
    }
    p_pmcmc_calc_data->global_acceptance_rate = 1.0;


    p_pmcmc_calc_data->has_cycled = 1;
    p_pmcmc_calc_data->m_full_iteration = 0;
    p_pmcmc_calc_data->cycle_id = p_best->n_to_be_estimated -1;

    p_pmcmc_calc_data->epsilon = 1.0;
    p_pmcmc_calc_data->a = a;

    // iteration to swith between initial and empirical covariances
    int min_switch = 5*p_best->n_to_be_estimated*p_best->n_to_be_estimated;
    if(m_switch<0) {
        m_switch = min_switch;
    }
    if (m_switch<min_switch) {
        sprintf(str, "attention: covariance switching iteration (%i) is smaller than proposed one (%i)\n", m_switch, min_switch);
        print_log(str);
    }
    p_pmcmc_calc_data->m_switch = m_switch;

    p_pmcmc_calc_data->m_eps = m_eps;

    return (p_pmcmc_calc_data);
}


void clean_pmcmc_calc_data(struct s_pmcmc_calc_data *p_pmcmc_calc_data)
{
    FREE(p_pmcmc_calc_data->acceptance_rates);
    FREE(p_pmcmc_calc_data);
}


struct s_pmcmc *build_pmcmc(json_t *root, int has_dt_be_specified, double dt_option, double a, int m_switch, int m_eps)
{
    char str[STR_BUFFSIZE];

    int nt;

    if (has_dt_be_specified) {
        DT = dt_option;
    }

    //IMPORTANT: update DELTA_STO so that DT = 1.0/DELTA_STO
    DELTA_STO = round(1.0/DT);
    DT = 1.0/ ((double) DELTA_STO);

    N_THREADS = sanitize_n_threads(N_THREADS, J);
    omp_set_num_threads(N_THREADS); //set number of threads

    if (OPTION_PIPELINE) {
        //be sure that J is a multiple of JCHUNK
        int newJ = (int) ceil(((double) J)/ ((double) JCHUNK))*JCHUNK;
        if(newJ != J) {
            snprintf(str, STR_BUFFSIZE, "J (%d) has been set to (%d) to be a multiple of Jchunck (%d)", J, newJ, JCHUNK );
            print_log(str);
            J = newJ;
        }
    }

    struct s_pmcmc *p_pmcmc;
    p_pmcmc = malloc(sizeof(struct s_pmcmc));
    if(p_pmcmc==NULL) {
        sprintf(str, "Allocation impossible in file :%s line : %d",__FILE__,__LINE__);
        print_err(str);
        exit(EXIT_FAILURE);
    }

    p_pmcmc->p_data = build_data(root, 1); //also build obs2ts
    p_pmcmc->calc = build_calc(GENERAL_ID, N_PAR_SV*N_CAC +N_TS_INC_UNIQUE, func, p_pmcmc->p_data);
    p_pmcmc->p_best = build_best(p_pmcmc->p_data, root);

    p_pmcmc->D_J_p_X = build_D_J_p_X(p_pmcmc->p_data);
    p_pmcmc->D_J_p_X_tmp = build_D_J_p_X(p_pmcmc->p_data);
    p_pmcmc->p_par = build_par(p_pmcmc->p_data);
    p_pmcmc->D_p_hat_new = build_D_p_hat(p_pmcmc->p_data);
    p_pmcmc->D_p_hat_prev = build_D_p_hat(p_pmcmc->p_data);
    p_pmcmc->D_p_hat_best = build_D_p_hat(p_pmcmc->p_data);

    p_pmcmc->p_like = build_likelihood();

    struct s_pmcmc_calc_data *p_pmcmc_calc_data = build_pmcmc_calc_data(p_pmcmc->p_best, a, m_switch, m_eps);
    //store the ref for each element of calc
    for (nt=0; nt<N_THREADS; nt++) {
        p_pmcmc->calc[nt]->method_specific_shared_data = p_pmcmc_calc_data;
    }

    sprintf(str, "Starting Simforence-pmcmc with the following options: i = %d, J = %d, LIKE_MIN = %g, M = %d, DT = %g, DELTA_STO = %g N_THREADS = %d SWITCH = %d a = %g", GENERAL_ID, J, LIKE_MIN, M, DT, DELTA_STO, N_THREADS, p_pmcmc_calc_data->m_switch, p_pmcmc_calc_data->a);
    print_log(str);

    return p_pmcmc;
}


void clean_pmcmc(struct s_pmcmc *p_pmcmc)
{
    clean_best(p_pmcmc->p_best);

    clean_par(p_pmcmc->p_par);

    clean_D_J_p_X(p_pmcmc->D_J_p_X);
    clean_D_J_p_X(p_pmcmc->D_J_p_X_tmp);

    clean_D_p_hat(p_pmcmc->D_p_hat_new, p_pmcmc->p_data);
    clean_D_p_hat(p_pmcmc->D_p_hat_prev, p_pmcmc->p_data);
    clean_D_p_hat(p_pmcmc->D_p_hat_best, p_pmcmc->p_data);

    clean_likelihood(p_pmcmc->p_like);

    clean_pmcmc_calc_data((struct s_pmcmc_calc_data *) p_pmcmc->calc[0]->method_specific_shared_data);
    clean_data(p_pmcmc->p_data);
    clean_calc(p_pmcmc->calc);

    FREE(p_pmcmc);
}
